from decimal import Decimal
from django.db import transaction, models, IntegrityError
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import views, status, permissions
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import (
    StudentWallet,
    WalletTransaction,
    CoinTopUpSetting,
    CoinTopUp,
    XPConversionSetting,
    XPConversionLog,
    CoinRewardClaim,
    ContentEntitlement,
    ContentCoinPricing
)
from .serializers import (
    StudentWalletSerializer,
    WalletTransactionSerializer,
    CoinTopUpSettingSerializer,
    CoinTopUpSerializer,
    CoinTopUpRequestCreateSerializer,
    CoinTopUpSubmitPaymentSerializer,
    XPConversionSettingSerializer,
    XPConversionLogSerializer,
    XPConversionSubmitSerializer,
    AdminWalletAdjustmentSerializer,
    AdminWalletLockSerializer,
    AdminTopUpActionSerializer,
    CoinRewardClaimSerializer,
    ContentEntitlementSerializer,
    ContentCoinPricingSerializer
)
from .services import (
    WalletService,
    WalletLockedError,
    InsufficientCoinsError,
    DuplicateTransactionError
)
from gamification.models import GamificationProfile
from marketplace.models import PaymentMethod


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ==============================================================================
# STUDENT WALLET ENDPOINTS
# ==============================================================================

class StudentWalletView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet = WalletService.get_or_create_wallet(request.user)
        serializer = StudentWalletSerializer(wallet)
        return Response(serializer.data)


class StudentWalletSummaryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet = WalletService.get_or_create_wallet(request.user)
        profile, _ = GamificationProfile.objects.get_or_create(user=request.user)
        recent_txs = wallet.transactions.all()[:5]

        pending_topups = CoinTopUp.objects.filter(
            user=request.user,
            status__in=['PENDING', 'SUBMITTED']
        ).count()

        return Response({
            'wallet': StudentWalletSerializer(wallet).data,
            'gamification': {
                'lifetime_xp': profile.xp,
                'redeemable_xp': profile.redeemable_xp,
                'converted_xp': profile.converted_xp,
                'level': profile.level,
            },
            'pending_topups_count': pending_topups,
            'recent_transactions': WalletTransactionSerializer(recent_txs, many=True).data
        })


class StudentWalletTransactionsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet = WalletService.get_or_create_wallet(request.user)
        queryset = wallet.transactions.all()

        tx_type = request.query_params.get('type')
        if tx_type:
            queryset = queryset.filter(transaction_type=tx_type.upper())

        ref_type = request.query_params.get('reference_type')
        if ref_type:
            queryset = queryset.filter(reference_type=ref_type.upper())

        start_date = request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)

        end_date = request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(description__icontains=search) |
                models.Q(reference_id__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = WalletTransactionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class StudentWalletTransactionDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        wallet = WalletService.get_or_create_wallet(request.user)
        tx = get_object_or_404(WalletTransaction, pk=pk, wallet=wallet)
        serializer = WalletTransactionSerializer(tx)
        return Response(serializer.data)


# ==============================================================================
# SECURE COIN TOP-UP ENDPOINTS
# ==============================================================================

class TopUpConfigView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        setting = CoinTopUpSetting.get_settings()
        serializer = CoinTopUpSettingSerializer(setting, context={'request': request})
        return Response(serializer.data)


class TopUpRequestCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CoinTopUpRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        amount_npr = serializer.validated_data['amount_npr']
        idempotency_key = serializer.validated_data.get('idempotency_key') or f"topup_req_{request.user.id}_{int(timezone.now().timestamp()*1000)}"
        payment_method_id = serializer.validated_data.get('payment_method_id')

        # Idempotency check for existing request
        if idempotency_key:
            existing = CoinTopUp.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                if existing.user != request.user:
                    return Response({"detail": "Idempotency key collision."}, status=status.HTTP_409_CONFLICT)
                return Response(CoinTopUpSerializer(existing, context={'request': request}).data)

        settings = CoinTopUpSetting.get_settings()
        base_coins, bonus_coins = settings.calculate_coins(amount_npr)

        payment_method = None
        if payment_method_id:
            payment_method = get_object_or_404(PaymentMethod, pk=payment_method_id, is_active=True)

        topup = CoinTopUp.objects.create(
            user=request.user,
            amount_npr=amount_npr,
            coins_expected=base_coins,
            bonus_coins=bonus_coins,
            payment_method=payment_method,
            payment_method_name=payment_method.method_type if payment_method else '',
            idempotency_key=idempotency_key,
            status='PENDING'
        )

        return Response(CoinTopUpSerializer(topup, context={'request': request}).data, status=status.HTTP_201_CREATED)


class TopUpSubmitPaymentView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        topup = get_object_or_404(CoinTopUp, pk=pk, user=request.user)

        if topup.status == 'VERIFIED':
            return Response(
                {"detail": f"TopUp #{pk} is already verified and credited."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CoinTopUpSubmitPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_method_id = serializer.validated_data['payment_method_id']
        payment_reference = serializer.validated_data['payment_reference']
        receipt_image = serializer.validated_data.get('receipt_image')

        payment_method = get_object_or_404(PaymentMethod, pk=payment_method_id, is_active=True)

        # Cross-workflow duplicate reference check across all verified/approved payments
        ref_clean = payment_reference.strip()

        # 1. CoinTopUp check across active/submitted/verified top-ups
        duplicate_topup = CoinTopUp.objects.filter(
            payment_reference__iexact=ref_clean
        ).exclude(pk=topup.pk).exclude(status__in=['REJECTED', 'REFUNDED']).first()
        if duplicate_topup:
            if duplicate_topup.status == 'VERIFIED':
                msg = "This payment reference code has already been credited to another top-up."
            else:
                msg = "This payment reference code has already been submitted to an active top-up."
            return Response(
                {"detail": msg},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. SubscriptionPayment check
        from subscriptions.models import SubscriptionPayment
        duplicate_sub = SubscriptionPayment.objects.filter(
            transaction_id__iexact=ref_clean,
            status='APPROVED'
        ).exists()
        if duplicate_sub:
            return Response(
                {"detail": "This payment reference code has already been credited to a course subscription."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Marketplace PaymentSubmission check
        from marketplace.models import PaymentSubmission
        duplicate_market = PaymentSubmission.objects.filter(
            transaction_id__iexact=ref_clean,
            status='APPROVED'
        ).exists()
        if duplicate_market:
            return Response(
                {"detail": "This payment reference code has already been credited to a marketplace order."},
                status=status.HTTP_400_BAD_REQUEST
            )

        topup.payment_method = payment_method
        topup.payment_method_name = payment_method.method_type
        topup.payment_reference = ref_clean
        if receipt_image:
            topup.receipt_image = receipt_image
        topup.status = 'SUBMITTED'
        topup.verification_status = 'VERIFICATION_IN_PROGRESS'
        topup.rejection_reason = ''
        topup.verified_at = None
        topup.verified_by = None
        current_res = topup.verification_result or {}
        if topup.pk:
            current_res['is_resubmission'] = True
        topup.verification_result = current_res

        try:
            with transaction.atomic():
                topup.save()
        except IntegrityError:
            return Response(
                {"detail": "This payment reference code has already been submitted to an active top-up."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Trigger existing verification OCR engine asynchronously or eager in tests
        from .tasks import enqueue_topup_verification
        enqueue_topup_verification(topup.id)

        topup.refresh_from_db()
        return Response(CoinTopUpSerializer(topup, context={'request': request}).data)


class TopUpStatusView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        topup = get_object_or_404(CoinTopUp, pk=pk, user=request.user)
        return Response(CoinTopUpSerializer(topup, context={'request': request}).data)


class StudentTopUpHistoryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = CoinTopUp.objects.filter(user=request.user).order_by('-created_at')
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = CoinTopUpSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


# ==============================================================================
# XP CONVERSION ENDPOINTS
# ==============================================================================

class XPConversionEligibilityView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        settings = XPConversionSetting.get_settings()
        profile, _ = GamificationProfile.objects.get_or_create(user=request.user)

        # Calculate XP converted today by this user
        today = timezone.localdate()
        conversions_today = XPConversionLog.objects.filter(
            user=request.user,
            created_at__date=today
        ).aggregate(total=models.Sum('xp_converted'))['total'] or 0

        daily_limit = settings.daily_conversion_limit
        remaining_today = max(0, daily_limit - conversions_today) if daily_limit > 0 else 999999

        is_eligible = (
            settings.enabled and
            settings.conversion_mode in ('MANUAL', 'BOTH') and
            profile.redeemable_xp >= settings.minimum_xp and
            (daily_limit == 0 or remaining_today >= settings.xp_required)
        )

        return Response({
            'enabled': settings.enabled,
            'conversion_mode': settings.conversion_mode,
            'current_rate': {
                'xp_required': settings.xp_required,
                'coins_awarded': settings.coins_awarded
            },
            'lifetime_xp': profile.xp,
            'redeemable_xp': profile.redeemable_xp,
            'converted_xp': profile.converted_xp,
            'minimum_xp': settings.minimum_xp,
            'maximum_xp': settings.maximum_xp,
            'daily_conversion_limit': daily_limit,
            'converted_today': conversions_today,
            'remaining_today': remaining_today,
            'is_eligible': is_eligible
        })


class XPConversionPreviewView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        xp_amount = request.data.get('xp_amount')
        if not xp_amount:
            return Response({"detail": "xp_amount is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            xp_amount = int(xp_amount)
        except (ValueError, TypeError):
            return Response({"detail": "xp_amount must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        if xp_amount <= 0:
            return Response({"detail": "xp_amount must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

        settings = XPConversionSetting.get_settings()
        units = xp_amount // settings.xp_required
        coins_awarded = units * settings.coins_awarded

        profile, _ = GamificationProfile.objects.get_or_create(user=request.user)
        remaining_redeemable = max(0, profile.redeemable_xp - xp_amount)

        return Response({
            'xp_requested': xp_amount,
            'xp_effective_converted': units * settings.xp_required,
            'coins_awarded': coins_awarded,
            'current_redeemable_xp': profile.redeemable_xp,
            'projected_redeemable_xp': remaining_redeemable,
            'conversion_rate': f"{settings.xp_required} XP = {settings.coins_awarded} Coins"
        })


class XPConversionSubmitView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = XPConversionSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        xp_amount = serializer.validated_data['xp_amount']
        idempotency_key = serializer.validated_data.get('idempotency_key')

        settings = XPConversionSetting.get_settings()
        if not settings.enabled:
            return Response({"detail": "XP to coin conversion is currently disabled."}, status=status.HTTP_400_BAD_REQUEST)

        if settings.conversion_mode not in ('MANUAL', 'BOTH'):
            return Response({"detail": "Manual student XP conversion is disabled by administration."}, status=status.HTTP_400_BAD_REQUEST)

        if xp_amount < settings.minimum_xp:
            return Response(
                {"detail": f"Minimum XP required for conversion is {settings.minimum_xp}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if xp_amount > settings.maximum_xp:
            return Response(
                {"detail": f"Maximum XP convertible in a single transaction is {settings.maximum_xp}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if xp_amount % settings.xp_required != 0:
            return Response(
                {"detail": f"XP amount must be an exact multiple of {settings.xp_required}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Idempotency check on XPConversionLog
        if idempotency_key:
            existing_log = XPConversionLog.objects.filter(idempotency_key=idempotency_key).first()
            if existing_log:
                if existing_log.user != request.user:
                    return Response({"detail": "Idempotency key collision."}, status=status.HTTP_409_CONFLICT)
                return Response(XPConversionLogSerializer(existing_log).data)

        units = xp_amount // settings.xp_required
        coins_awarded = units * settings.coins_awarded
        rate_snapshot = f"{settings.xp_required} XP = {settings.coins_awarded} Coins"

        with transaction.atomic():
            profile = GamificationProfile.objects.select_for_update().get(user=request.user)

            if profile.redeemable_xp < xp_amount:
                return Response(
                    {"detail": f"Insufficient redeemable XP. You have {profile.redeemable_xp} XP, but requested {xp_amount}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Daily limit validation
            if settings.daily_conversion_limit > 0:
                today = timezone.localdate()
                conversions_today = XPConversionLog.objects.filter(
                    user=request.user,
                    created_at__date=today
                ).aggregate(total=models.Sum('xp_converted'))['total'] or 0

                if conversions_today + xp_amount > settings.daily_conversion_limit:
                    remaining = max(0, settings.daily_conversion_limit - conversions_today)
                    return Response(
                        {"detail": f"Daily conversion limit exceeded. You can convert at most {remaining} more XP today."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Deduct redeemable XP and record converted XP; LIFETIME XP AND LEVEL REMAIN UNTOUCHED
            profile.redeemable_xp -= xp_amount
            profile.converted_xp += xp_amount
            profile.save(update_fields=['redeemable_xp', 'converted_xp'])

            tx_key = f"xp_conv_tx_{idempotency_key}" if idempotency_key else None
            wallet_tx = WalletService.credit_wallet(
                user=request.user,
                amount=coins_awarded,
                reference_type='XP_CONVERSION',
                description=f"XP conversion: {xp_amount} XP -> {coins_awarded} Coins",
                idempotency_key=tx_key,
                metadata={
                    'xp_converted': xp_amount,
                    'rate': rate_snapshot
                }
            )

            log = XPConversionLog.objects.create(
                user=request.user,
                xp_converted=xp_amount,
                coins_awarded=coins_awarded,
                conversion_rate_snapshot=rate_snapshot,
                wallet_transaction=wallet_tx,
                idempotency_key=idempotency_key
            )

        return Response({
            'conversion': XPConversionLogSerializer(log).data,
            'wallet_balance': WalletService.get_wallet_balance(request.user),
            'remaining_redeemable_xp': profile.redeemable_xp,
            'lifetime_xp': profile.xp
        }, status=status.HTTP_201_CREATED)


class XPConversionHistoryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = XPConversionLog.objects.filter(user=request.user).order_by('-created_at')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = XPConversionLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


# ==============================================================================
# ADMIN WALLET & TOP-UP MANAGEMENT ENDPOINTS
# ==============================================================================

class AdminWalletStatsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        total_wallets = StudentWallet.objects.count()
        wallet_agg = StudentWallet.objects.aggregate(
            coins_held=models.Sum('balance'),
            coins_credited=models.Sum('total_credited'),
            coins_debited=models.Sum('total_debited'),
        )
        total_coins_held = wallet_agg['coins_held'] or 0
        total_coins_credited = wallet_agg['coins_credited'] or 0
        total_coins_debited = wallet_agg['coins_debited'] or 0

        pending_topups = CoinTopUp.objects.filter(status='PENDING').count()
        submitted_topups = CoinTopUp.objects.filter(status='SUBMITTED').count()
        auto_verified_topups = CoinTopUp.objects.filter(
            status='VERIFIED',
            verified_by__isnull=True
        ).count()
        manual_approved_topups = CoinTopUp.objects.filter(
            status='VERIFIED',
            verified_by__isnull=False
        ).count()
        verified_topups = CoinTopUp.objects.filter(status='VERIFIED').count()
        rejected_topups = CoinTopUp.objects.filter(status='REJECTED').count()
        refunded_topups = CoinTopUp.objects.filter(status='REFUNDED').count()
        total_topups = CoinTopUp.objects.count()

        return Response({
            'total_wallets': total_wallets,
            'total_coins_held': total_coins_held,
            'total_coins_credited': total_coins_credited,
            'total_coins_debited': total_coins_debited,
            'pending_topups': pending_topups,
            'awaiting_review_topups': submitted_topups,
            'auto_verified_topups': auto_verified_topups,
            'manual_approved_topups': manual_approved_topups,
            'verified_topups': verified_topups,
            'rejected_topups': rejected_topups,
            'refunded_topups': refunded_topups,
            'total_topups': total_topups,
        })


class AdminWalletListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        queryset = StudentWallet.objects.select_related('user').all().order_by('-balance')

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(user__username__icontains=search) |
                models.Q(user__email__icontains=search) |
                models.Q(user__first_name__icontains=search) |
                models.Q(user__last_name__icontains=search)
            )

        is_locked = request.query_params.get('is_locked')
        if is_locked is not None and is_locked != '':
            queryset = queryset.filter(is_locked=is_locked.lower() in ('true', '1'))

        min_bal = request.query_params.get('min_balance')
        if min_bal is not None and min_bal != '':
            queryset = queryset.filter(balance__gte=int(min_bal))

        max_bal = request.query_params.get('max_balance')
        if max_bal is not None and max_bal != '':
            queryset = queryset.filter(balance__lte=int(max_bal))

        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = StudentWalletSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminWalletDetailView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, pk):
        wallet = get_object_or_404(StudentWallet.objects.select_related('user'), pk=pk)
        transactions = wallet.transactions.all()[:100]
        topups = CoinTopUp.objects.filter(user=wallet.user).select_related('payment_method', 'verified_by')[:50]
        xp_conversions = XPConversionLog.objects.filter(user=wallet.user)[:50]
        reward_claims = CoinRewardClaim.objects.filter(user=wallet.user).select_related('rule')[:50]
        content_entitlements = ContentEntitlement.objects.filter(user=wallet.user)[:50]

        return Response({
            'wallet': StudentWalletSerializer(wallet).data,
            'user_profile': {
                'id': wallet.user.id,
                'username': wallet.user.username,
                'email': wallet.user.email,
                'full_name': wallet.user.get_full_name() or wallet.user.username,
                'date_joined': wallet.user.date_joined,
                'is_active': wallet.user.is_active,
            },
            'recent_transactions': WalletTransactionSerializer(transactions, many=True).data,
            'topups': CoinTopUpSerializer(topups, many=True, context={'request': request}).data,
            'xp_conversions': XPConversionLogSerializer(xp_conversions, many=True).data,
            'reward_claims': CoinRewardClaimSerializer(reward_claims, many=True).data,
            'content_entitlements': ContentEntitlementSerializer(content_entitlements, many=True).data,
        })


class AdminWalletLockView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        wallet = get_object_or_404(StudentWallet, pk=pk)
        serializer = AdminWalletLockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_locked = serializer.validated_data['is_locked']
        reason = serializer.validated_data.get('reason', '').strip()

        wallet.is_locked = is_locked
        wallet.lock_reason = reason if is_locked else ""
        wallet.save(update_fields=['is_locked', 'lock_reason', 'updated_at'])

        action_str = "locked" if is_locked else "unlocked"
        return Response({
            'detail': f"Wallet for {wallet.user.username} successfully {action_str}.",
            'wallet': StudentWalletSerializer(wallet).data
        })


class AdminWalletAdjustView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        wallet = get_object_or_404(StudentWallet, pk=pk)
        serializer = AdminWalletAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        amount = serializer.validated_data['amount']
        adj_type = serializer.validated_data['adjustment_type']
        reason = serializer.validated_data['reason']
        idempotency_key = serializer.validated_data.get('idempotency_key')

        try:
            tx = WalletService.admin_adjust_wallet(
                user=wallet.user,
                amount=amount,
                adjustment_type=adj_type,
                reason=reason,
                admin_user=request.user,
                idempotency_key=idempotency_key
            )
        except (WalletLockedError, InsufficientCoinsError, DuplicateTransactionError, DjangoValidationError) as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        wallet.refresh_from_db()
        return Response({
            'transaction': WalletTransactionSerializer(tx).data,
            'wallet': StudentWalletSerializer(wallet).data
        }, status=status.HTTP_201_CREATED)


class AdminTopUpListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        queryset = CoinTopUp.objects.select_related('user', 'payment_method', 'verified_by').order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        verification_status = request.query_params.get('verification_status')
        if verification_status:
            queryset = queryset.filter(verification_status=verification_status.upper())

        auto_verified = request.query_params.get('auto_verified')
        if auto_verified is not None and auto_verified != '':
            if auto_verified.lower() in ('true', '1'):
                queryset = queryset.filter(status='VERIFIED', verified_by__isnull=True)
            elif auto_verified.lower() in ('false', '0'):
                queryset = queryset.filter(status='VERIFIED', verified_by__isnull=False)

        method = request.query_params.get('method')
        if method:
            queryset = queryset.filter(payment_method_name__iexact=method)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(user__username__icontains=search) |
                models.Q(user__email__icontains=search) |
                models.Q(payment_reference__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = CoinTopUpSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


class AdminTopUpDetailView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, pk):
        topup = get_object_or_404(
            CoinTopUp.objects.select_related('user', 'payment_method', 'verified_by', 'wallet_transaction'),
            pk=pk
        )
        return Response(CoinTopUpSerializer(topup, context={'request': request}).data)


class AdminTopUpActionView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        serializer = AdminTopUpActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data['action']
        reason = serializer.validated_data.get('reason', '').strip()
        notes = serializer.validated_data.get('notes', '').strip()

        with transaction.atomic():
            topup = CoinTopUp.objects.select_for_update().get(pk=pk)

            if topup.status == 'VERIFIED':
                return Response(
                    {"detail": f"TopUp #{pk} is already verified and credited."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if action == 'APPROVE':
                total_coins = topup.coins_expected + topup.bonus_coins
                clean_ref = (topup.payment_reference or "").strip().upper()
                tx_key = f"topup_ref_{clean_ref}" if clean_ref else f"topup_credit_{topup.id}"

                wallet_tx = WalletService.credit_wallet(
                    user=topup.user,
                    amount=total_coins,
                    reference_type='TOPUP',
                    reference_id=str(topup.id),
                    description=f"Coin Top-up #{topup.id} verified (NPR {topup.amount_npr})",
                    idempotency_key=tx_key,
                    metadata={
                        'topup_id': topup.id,
                        'amount_npr': str(topup.amount_npr),
                        'payment_reference': topup.payment_reference,
                        'verified_by': request.user.username,
                        'notes': notes
                    }
                )

                topup.status = 'VERIFIED'
                topup.verification_status = 'VERIFIED_CONFIDENT'
                topup.verified_at = timezone.now()
                topup.verified_by = request.user
                topup.wallet_transaction = wallet_tx
                topup.verification_notes = notes

                current_res = topup.verification_result or {}
                current_res['admin_decision'] = {
                    'action': 'approved',
                    'admin_id': request.user.id,
                    'admin_name': request.user.username,
                    'decided_at': topup.verified_at.isoformat(),
                    'notes': notes
                }
                topup.verification_result = current_res
                topup.save()

                try:
                    from core.notification_service import NotificationService
                    NotificationService.notify_student_payment_approved(
                        student=topup.user,
                        title_ref=f"{total_coins} Coins Top-up",
                        action_url='/student/wallet'
                    )
                except Exception as n_err:
                    pass

                return Response({
                    'detail': f"TopUp #{pk} approved. Credited {total_coins} coins to {topup.user.username}.",
                    'topup': CoinTopUpSerializer(topup, context={'request': request}).data
                })

            elif action == 'REJECT':
                topup.status = 'REJECTED'
                topup.verification_status = 'VERIFICATION_FAILED'
                topup.rejection_reason = reason
                topup.verification_notes = notes

                current_res = topup.verification_result or {}
                current_res['admin_decision'] = {
                    'action': 'rejected',
                    'admin_id': request.user.id,
                    'admin_name': request.user.username,
                    'decided_at': timezone.now().isoformat(),
                    'reason': reason,
                    'notes': notes
                }
                topup.verification_result = current_res
                topup.save()

                try:
                    from core.notification_service import NotificationService
                    NotificationService.notify_student_payment_rejected(
                        student=topup.user,
                        title_ref=f"Coin Top-up #{topup.id}",
                        reason=reason,
                        action_url='/student/wallet'
                    )
                except Exception as n_err:
                    pass

                return Response({
                    'detail': f"TopUp #{pk} rejected.",
                    'topup': CoinTopUpSerializer(topup, context={'request': request}).data
                })

            elif action == 'REQUEST_CLEARER_RECEIPT':
                topup.status = 'SUBMITTED'
                topup.verification_status = 'VERIFIED_UNCERTAIN'
                topup.rejection_reason = f"Clearer receipt requested: {reason}"
                topup.verification_notes = notes or reason

                current_res = topup.verification_result or {}
                current_res['admin_decision'] = {
                    'action': 'request_clearer_receipt',
                    'admin_id': request.user.id,
                    'admin_name': request.user.username,
                    'decided_at': timezone.now().isoformat(),
                    'reason': reason,
                    'notes': notes
                }
                topup.verification_result = current_res
                topup.save()

                try:
                    from core.notification_service import NotificationService
                    NotificationService.notify_student_payment_manual_review(
                        student=topup.user,
                        title_ref=f"Coin Top-up #{topup.id} (Clearer receipt requested)",
                        action_url='/student/wallet'
                    )
                except Exception as n_err:
                    pass

                return Response({
                    'detail': f"Clearer receipt requested for TopUp #{pk}.",
                    'topup': CoinTopUpSerializer(topup, context={'request': request}).data
                })


class AdminXPSettingsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        setting = XPConversionSetting.get_settings()
        return Response(XPConversionSettingSerializer(setting).data)

    def put(self, request):
        setting = XPConversionSetting.get_settings()
        serializer = XPConversionSettingSerializer(setting, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminTopUpSettingsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        setting = CoinTopUpSetting.get_settings()
        return Response(CoinTopUpSettingSerializer(setting, context={'request': request}).data)

    def put(self, request):
        setting = CoinTopUpSetting.get_settings()
        serializer = CoinTopUpSettingSerializer(setting, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ContentAccessCheckView(views.APIView):
    """
    GET /api/wallet/content/access-check/?content_type=...&content_id=...
    Evaluates 6-step access priority for the content.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        content_type = request.query_params.get('content_type', '').strip().upper()
        content_id_raw = request.query_params.get('content_id')

        if not content_type or not content_id_raw:
            return Response(
                {'detail': 'Both content_type and content_id query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            content_id = int(content_id_raw)
        except (ValueError, TypeError):
            return Response(
                {'detail': 'Invalid content_id parameter.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .access_service import ContentAccessService
        result = ContentAccessService.evaluate_access(
            request.user if request.user.is_authenticated else None,
            content_type,
            content_id
        )
        return Response(result)


class ContentPurchaseView(views.APIView):
    """
    POST /api/wallet/content/purchase/
    Debits coins atomically and grants ContentEntitlement.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        content_type = str(request.data.get('content_type', '')).strip().upper()
        content_id_raw = request.data.get('content_id')
        idempotency_key = request.data.get('idempotency_key')

        if not content_type or content_id_raw is None:
            return Response(
                {'detail': 'content_type and content_id are required fields.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            content_id = int(content_id_raw)
        except (ValueError, TypeError):
            return Response(
                {'detail': 'Invalid content_id.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .access_service import ContentAccessService
        try:
            result = ContentAccessService.purchase_content(
                user=request.user,
                content_type=content_type,
                content_id=content_id,
                idempotency_key=idempotency_key
            )
            http_status = status.HTTP_200_OK if result.get('success') else status.HTTP_400_BAD_REQUEST
            return Response(result, status=http_status)
        except InsufficientCoinsError as err:
            return Response(
                {
                    'detail': str(err),
                    'code': 'insufficient_coins',
                    'available_coins': err.available,
                    'required_coins': err.requested,
                    'shortage': max(0, err.requested - err.available)
                },
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        except WalletLockedError as err:
            return Response(
                {'detail': str(err), 'code': 'wallet_locked'},
                status=status.HTTP_423_LOCKED
            )
        except DuplicateTransactionError as err:
            return Response(
                {'detail': str(err), 'code': 'duplicate_transaction'},
                status=status.HTTP_409_CONFLICT
            )
        except (DjangoValidationError, Exception) as err:
            return Response(
                {'detail': str(err), 'code': 'purchase_error'},
                status=status.HTTP_400_BAD_REQUEST
            )


class StudentPurchasedContentView(views.APIView):
    """
    GET /api/wallet/content/purchased/
    Lists student's purchased content entitlements.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        content_type = request.query_params.get('content_type')
        status_filter = request.query_params.get('status', 'ALL').upper()

        qs = ContentEntitlement.objects.filter(user=request.user).order_by('-purchased_at')

        if content_type:
            qs = qs.filter(content_type=content_type.strip().upper())

        if status_filter == 'ACTIVE':
            now = timezone.now()
            qs = qs.filter(status='ACTIVE').filter(models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now))
        elif status_filter == 'EXPIRED':
            now = timezone.now()
            qs = qs.filter(models.Q(status='EXPIRED') | (models.Q(status='ACTIVE') & models.Q(expires_at__lte=now)))
        elif status_filter in ('REVOKED',):
            qs = qs.filter(status=status_filter)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ContentEntitlementSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminContentPricingView(views.APIView):
    """
    GET /api/wallet/admin/content-pricing/
    POST /api/wallet/admin/content-pricing/
    Manages coin pricing rules for notes, examinations, and question sets.
    """
    permission_classes = [permissions.IsAdminUser]

    @staticmethod
    def _ensure_content_pricing_records():
        from notes.models import StudyMaterial
        from exams.models import Examination, QuestionSet

        existing = set(ContentCoinPricing.objects.values_list('content_type', 'content_id'))
        new_records = []

        for mid in StudyMaterial.objects.values_list('id', flat=True):
            if ('STUDY_MATERIAL', mid) not in existing:
                new_records.append(ContentCoinPricing(
                    content_type='STUDY_MATERIAL',
                    content_id=mid,
                    coin_price=50,
                    access_duration_days=0,
                    monetization_mode='PACKAGE_OR_COINS',
                    is_enabled=True
                ))
                existing.add(('STUDY_MATERIAL', mid))

        for eid in Examination.objects.values_list('id', flat=True):
            if ('EXAMINATION', eid) not in existing:
                new_records.append(ContentCoinPricing(
                    content_type='EXAMINATION',
                    content_id=eid,
                    coin_price=60,
                    access_duration_days=0,
                    monetization_mode='PACKAGE_OR_COINS',
                    is_enabled=True
                ))
                existing.add(('EXAMINATION', eid))

        for qid in QuestionSet.objects.values_list('id', flat=True):
            if ('QUESTION_SET', qid) not in existing:
                new_records.append(ContentCoinPricing(
                    content_type='QUESTION_SET',
                    content_id=qid,
                    coin_price=30,
                    access_duration_days=0,
                    monetization_mode='PACKAGE_OR_COINS',
                    is_enabled=True
                ))
                existing.add(('QUESTION_SET', qid))

        if new_records:
            ContentCoinPricing.objects.bulk_create(new_records)

    def get(self, request):
        self._ensure_content_pricing_records()
        qs = ContentCoinPricing.objects.all().order_by('-updated_at')

        content_type = request.query_params.get('content_type')
        if content_type and content_type != 'ALL':
            qs = qs.filter(content_type=content_type.strip().upper())

        monetization_mode = request.query_params.get('monetization_mode')
        if monetization_mode and monetization_mode != 'ALL':
            qs = qs.filter(monetization_mode=monetization_mode.strip().upper())

        is_enabled = request.query_params.get('is_enabled')
        if is_enabled is not None:
            qs = qs.filter(is_enabled=is_enabled.lower() in ('true', '1', 'yes'))

        search = request.query_params.get('search')
        if search:
            from notes.models import StudyMaterial
            from exams.models import Examination, QuestionSet
            
            search_str = search.strip()
            material_ids = list(StudyMaterial.objects.filter(title__icontains=search_str).values_list('id', flat=True))
            exam_ids = list(Examination.objects.filter(title__icontains=search_str).values_list('id', flat=True))
            qset_ids = list(QuestionSet.objects.filter(name__icontains=search_str).values_list('id', flat=True))

            qs = qs.filter(
                (models.Q(content_type='STUDY_MATERIAL') & models.Q(content_id__in=material_ids)) |
                (models.Q(content_type='EXAMINATION') & models.Q(content_id__in=exam_ids)) |
                (models.Q(content_type='QUESTION_SET') & models.Q(content_id__in=qset_ids))
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ContentCoinPricingSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        content_type = request.data.get('content_type')
        content_id = request.data.get('content_id')
        coin_price = request.data.get('coin_price', 0)
        access_duration_days = request.data.get('access_duration_days', 0)
        monetization_mode = request.data.get('monetization_mode', 'PACKAGE_OR_COINS')
        is_enabled = request.data.get('is_enabled', True)

        if not content_type or content_id is None:
            return Response(
                {'detail': 'content_type and content_id are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        pricing, _created = ContentCoinPricing.objects.update_or_create(
            content_type=content_type,
            content_id=content_id,
            defaults={
                'coin_price': int(coin_price),
                'access_duration_days': int(access_duration_days),
                'monetization_mode': monetization_mode,
                'is_enabled': bool(is_enabled),
            }
        )

        serializer = ContentCoinPricingSerializer(pricing)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminContentPricingBulkView(views.APIView):
    """
    POST /api/wallet/admin/content-pricing/bulk-update/
    Bulk update pricing rules. Supports both category-wide update and per-item array update.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        items = request.data.get('items', [])
        target_content_type = request.data.get('content_type')

        # Mode A: Category-wide bulk update (e.g. from Bulk Pricing Update modal)
        if target_content_type and not items:
            coin_price = int(request.data.get('coin_price', 50))
            access_duration_days = int(request.data.get('access_duration_days', 0))
            monetization_mode = request.data.get('monetization_mode', 'PACKAGE_OR_COINS')
            is_enabled = bool(request.data.get('is_enabled', True))

            types_to_update = []
            if target_content_type == 'ALL':
                types_to_update = ['STUDY_MATERIAL', 'EXAMINATION', 'QUESTION_SET']
            else:
                types_to_update = [target_content_type]

            updated_count = 0
            with transaction.atomic():
                for ctype in types_to_update:
                    ids = []
                    if ctype == 'STUDY_MATERIAL':
                        from notes.models import StudyMaterial
                        ids = list(StudyMaterial.objects.values_list('id', flat=True))
                    elif ctype == 'EXAMINATION':
                        from exams.models import Examination
                        ids = list(Examination.objects.values_list('id', flat=True))
                    elif ctype == 'QUESTION_SET':
                        from exams.models import QuestionSet
                        ids = list(QuestionSet.objects.values_list('id', flat=True))

                    for cid in ids:
                        ContentCoinPricing.objects.update_or_create(
                            content_type=ctype,
                            content_id=cid,
                            defaults={
                                'coin_price': coin_price,
                                'access_duration_days': access_duration_days,
                                'monetization_mode': monetization_mode,
                                'is_enabled': is_enabled,
                            }
                        )
                        updated_count += 1

            return Response({
                'detail': f"Successfully updated pricing for {updated_count} items.",
                'updated_count': updated_count
            })

        # Mode B: Explicit items array update
        if not items:
            return Response({'detail': 'items list or content_type is required.'}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = 0
        with transaction.atomic():
            for item in items:
                ctype = item.get('content_type')
                cid = item.get('content_id')
                if not ctype or cid is None:
                    continue
                ContentCoinPricing.objects.update_or_create(
                    content_type=ctype,
                    content_id=cid,
                    defaults={
                        'coin_price': int(item.get('coin_price', 0)),
                        'access_duration_days': int(item.get('access_duration_days', 0)),
                        'monetization_mode': item.get('monetization_mode', 'PACKAGE_OR_COINS'),
                        'is_enabled': bool(item.get('is_enabled', True)),
                    }
                )
                updated_count += 1

        return Response({
            'detail': f"Successfully updated pricing for {updated_count} items.",
            'updated_count': updated_count
        })


class AdminMonetizationAnalyticsView(views.APIView):
    """
    GET /api/wallet/admin/monetization-analytics/
    Monetization revenue, purchases count, and top-selling content.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from .access_service import ContentAccessService
        now = timezone.now()

        total_purchases = ContentEntitlement.objects.count()
        total_coins_earned = ContentEntitlement.objects.aggregate(total=models.Sum('coins_spent'))['total'] or 0
        active_entitlements = ContentEntitlement.objects.filter(status='ACTIVE').filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)
        ).count()

        # Breakdown by content type
        by_type = list(
            ContentEntitlement.objects.values('content_type')
            .annotate(
                count=models.Count('id'),
                total_coins=models.Sum('coins_spent')
            )
            .order_by('-total_coins')
        )

        # Top purchased content
        top_purchased_raw = list(
            ContentEntitlement.objects.values('content_type', 'content_id')
            .annotate(
                purchase_count=models.Count('id'),
                coins_earned=models.Sum('coins_spent')
            )
            .order_by('-purchase_count')[:10]
        )

        top_purchased = []
        for item in top_purchased_raw:
            info = ContentAccessService.get_content_info(item['content_type'], item['content_id'])
            top_purchased.append({
                'content_type': item['content_type'],
                'content_id': item['content_id'],
                'title': info.get('title'),
                'purchase_count': item['purchase_count'],
                'coins_earned': item['coins_earned'],
            })

        return Response({
            'total_purchases': total_purchases,
            'total_coins_earned': total_coins_earned,
            'active_entitlements': active_entitlements,
            'by_type': by_type,
            'top_purchased': top_purchased
        })
