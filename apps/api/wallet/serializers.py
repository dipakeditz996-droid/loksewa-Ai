from decimal import Decimal
from rest_framework import serializers
from django.utils import timezone
from .models import (
    StudentWallet,
    WalletTransaction,
    CoinTopUpSetting,
    CoinTopUp,
    XPConversionSetting,
    XPConversionLog,
    CoinRewardRule,
    CoinRewardClaim,
    ContentCoinPricing,
    ContentEntitlement
)
from marketplace.models import PaymentMethod
from gamification.models import GamificationProfile


class StudentWalletSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()
    last_transaction_at = serializers.SerializerMethodField()

    class Meta:
        model = StudentWallet
        fields = [
            'id',
            'username',
            'email',
            'full_name',
            'balance',
            'total_credited',
            'total_debited',
            'is_locked',
            'lock_reason',
            'last_transaction_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        name = obj.user.get_full_name()
        return name if name else obj.user.username

    def get_last_transaction_at(self, obj):
        last_tx = obj.transactions.first()
        return last_tx.created_at if last_tx else None


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = [
            'id',
            'transaction_type',
            'amount',
            'balance_before',
            'balance_after',
            'reference_type',
            'reference_id',
            'idempotency_key',
            'description',
            'metadata',
            'created_at'
        ]
        read_only_fields = fields


class ActivePaymentMethodSerializer(serializers.ModelSerializer):
    qr_image = serializers.SerializerMethodField()

    class Meta:
        model = PaymentMethod
        fields = [
            'id',
            'method_type',
            'display_name',
            'account_name',
            'account_number',
            'bank_name',
            'branch',
            'qr_image'
        ]

    def get_qr_image(self, obj):
        if obj.qr_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_image.url)
            return obj.qr_image.url
        return None


class CoinTopUpSettingSerializer(serializers.ModelSerializer):
    payment_methods = serializers.SerializerMethodField()

    class Meta:
        model = CoinTopUpSetting
        fields = [
            'enabled',
            'npr_to_coin_rate',
            'min_topup_npr',
            'max_topup_npr',
            'bonus_percentage',
            'instructions',
            'payment_methods',
            'updated_at'
        ]

    def get_payment_methods(self, obj):
        methods = PaymentMethod.objects.filter(is_active=True)
        return ActivePaymentMethodSerializer(methods, many=True, context=self.context).data


class CoinTopUpSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    student_details = serializers.SerializerMethodField()
    total_coins = serializers.IntegerField(read_only=True)
    verified_by_username = serializers.CharField(source='verified_by.username', read_only=True, default=None)
    payment_method_display = serializers.CharField(source='payment_method.display_name', read_only=True, default='')
    receipt_image = serializers.SerializerMethodField()

    # OCR and verification analysis fields for Admin Review
    extracted_amount = serializers.SerializerMethodField()
    extracted_transaction_id = serializers.SerializerMethodField()
    detected_provider = serializers.SerializerMethodField()
    ocr_confidence = serializers.SerializerMethodField()
    provider_verification_result = serializers.SerializerMethodField()
    duplicate_warnings = serializers.SerializerMethodField()
    failure_reasons = serializers.SerializerMethodField()
    is_duplicate_transaction = serializers.SerializerMethodField()
    is_duplicate_image = serializers.SerializerMethodField()

    class Meta:
        model = CoinTopUp
        fields = [
            'id',
            'user_username',
            'user_email',
            'student_details',
            'amount_npr',
            'coins_expected',
            'bonus_coins',
            'total_coins',
            'payment_method',
            'payment_method_name',
            'payment_method_display',
            'payment_reference',
            'receipt_image',
            'status',
            'verification_status',
            'verification_result',
            'ai_verification_at',
            'verified_at',
            'verified_by_username',
            'rejection_reason',
            'verification_notes',
            'wallet_transaction',
            'idempotency_key',
            'extracted_amount',
            'extracted_transaction_id',
            'detected_provider',
            'ocr_confidence',
            'provider_verification_result',
            'duplicate_warnings',
            'failure_reasons',
            'is_duplicate_transaction',
            'is_duplicate_image',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields

    def get_receipt_image(self, obj):
        if obj.receipt_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt_image.url)
            return obj.receipt_image.url
        return None

    def get_student_details(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'email': obj.user.email,
            'full_name': obj.user.get_full_name() or obj.user.username,
        }

    def get_extracted_amount(self, obj):
        res = obj.verification_result or {}
        return res.get('detected_amount')

    def get_extracted_transaction_id(self, obj):
        res = obj.verification_result or {}
        return res.get('detected_transaction_id')

    def get_detected_provider(self, obj):
        res = obj.verification_result or {}
        return res.get('detected_provider')

    def get_ocr_confidence(self, obj):
        res = obj.verification_result or {}
        vdata = res.get('verification_data') or {}
        return vdata.get('ocr_confidence')

    def get_provider_verification_result(self, obj):
        res = obj.verification_result or {}
        return {
            'detected_provider': res.get('detected_provider'),
            'provider_detected': res.get('detected_provider') is not None,
            'detected_status': res.get('detected_status'),
            'receiver_matches': res.get('receiver_matches', False),
            'detected_recipient': res.get('detected_recipient'),
            'bank_name': res.get('detected_bank_name'),
            'receiver_bank': res.get('detected_receiver_bank'),
        }

    def get_duplicate_warnings(self, obj):
        res = obj.verification_result or {}
        return [r for r in res.get('failure_reasons', []) if 'duplicate' in r.lower() or 'already' in r.lower()]

    def get_failure_reasons(self, obj):
        res = obj.verification_result or {}
        return res.get('failure_reasons', [])

    def get_is_duplicate_transaction(self, obj):
        res = obj.verification_result or {}
        return res.get('is_duplicate_transaction', False)

    def get_is_duplicate_image(self, obj):
        res = obj.verification_result or {}
        return res.get('is_duplicate_image', False)


class CoinTopUpRequestCreateSerializer(serializers.Serializer):
    amount_npr = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('1.00'))
    payment_method_id = serializers.IntegerField(required=False, allow_null=True)
    idempotency_key = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def validate_amount_npr(self, value):
        settings = CoinTopUpSetting.get_settings()
        if not settings.enabled:
            raise serializers.ValidationError("Coin top-up purchases are currently disabled.")
        if value < settings.min_topup_npr:
            raise serializers.ValidationError(f"Minimum top-up amount is NPR {settings.min_topup_npr}.")
        if value > settings.max_topup_npr:
            raise serializers.ValidationError(f"Maximum top-up amount is NPR {settings.max_topup_npr}.")
        return value


class CoinTopUpSubmitPaymentSerializer(serializers.Serializer):
    payment_method_id = serializers.IntegerField(required=True)
    payment_reference = serializers.CharField(max_length=100, required=True, min_length=3)
    receipt_image = serializers.FileField(required=False, allow_null=True)

    def validate_payment_reference(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("A valid payment reference / transaction ID is required.")
        return cleaned

    def validate_receipt_image(self, value):
        if value:
            from core.upload_validators import validate_receipt_file, validate_receipt_size_10mb
            from django.core.exceptions import ValidationError as DjangoValidationError
            try:
                validate_receipt_size_10mb(value)
                validate_receipt_file(value)
            except DjangoValidationError as err:
                raise serializers.ValidationError(getattr(err, 'message', str(err)))
        return value


class XPConversionSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = XPConversionSetting
        fields = [
            'enabled',
            'xp_required',
            'coins_awarded',
            'conversion_mode',
            'daily_conversion_limit',
            'minimum_xp',
            'maximum_xp',
            'updated_at'
        ]

    def validate(self, data):
        xp_required = data.get('xp_required', getattr(self.instance, 'xp_required', 100))
        coins_awarded = data.get('coins_awarded', getattr(self.instance, 'coins_awarded', 10))
        if xp_required <= 0:
            raise serializers.ValidationError({"xp_required": "XP required must be strictly greater than 0."})
        if coins_awarded <= 0:
            raise serializers.ValidationError({"coins_awarded": "Coins awarded must be strictly greater than 0."})
        return data


class XPConversionLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = XPConversionLog
        fields = [
            'id',
            'username',
            'xp_converted',
            'coins_awarded',
            'conversion_rate_snapshot',
            'wallet_transaction',
            'idempotency_key',
            'created_at'
        ]
        read_only_fields = fields


class XPConversionSubmitSerializer(serializers.Serializer):
    xp_amount = serializers.IntegerField(min_value=1)
    idempotency_key = serializers.CharField(max_length=120, required=False, allow_blank=True)


class AdminWalletAdjustmentSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1)
    adjustment_type = serializers.ChoiceField(choices=['CREDIT', 'DEBIT'])
    reason = serializers.CharField(max_length=255, required=True)
    idempotency_key = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def validate_reason(self, value):
        cleaned = value.strip()
        if len(cleaned) < 5:
            raise serializers.ValidationError("A descriptive administrative reason (at least 5 characters) is required.")
        return cleaned


class AdminWalletLockSerializer(serializers.Serializer):
    is_locked = serializers.BooleanField(required=True)
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate(self, data):
        if data.get('is_locked') and not (data.get('reason') or '').strip():
            raise serializers.ValidationError({"reason": "A mandatory reason must be provided when locking a wallet."})
        return data


class AdminTopUpActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['APPROVE', 'REJECT', 'REQUEST_CLEARER_RECEIPT'])
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, data):
        action = data.get('action')
        reason = (data.get('reason') or '').strip()
        if action in ('REJECT', 'REQUEST_CLEARER_RECEIPT') and not reason:
            action_label = "rejecting a top-up" if action == 'REJECT' else "requesting a clearer receipt"
            raise serializers.ValidationError({"reason": f"A specific reason is strictly required when {action_label}."})
        return data


class CoinRewardClaimSerializer(serializers.ModelSerializer):
    activity_type = serializers.CharField(source='rule.activity_type', read_only=True)
    activity_name = serializers.CharField(source='rule.get_activity_type_display', read_only=True)

    class Meta:
        model = CoinRewardClaim
        fields = [
            'id',
            'activity_type',
            'activity_name',
            'activity_reference',
            'coins_awarded',
            'xp_awarded',
            'wallet_transaction',
            'claimed_at'
        ]
        read_only_fields = fields


class ContentEntitlementSerializer(serializers.ModelSerializer):
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    is_valid = serializers.BooleanField(source='is_currently_valid', read_only=True)
    is_permanent = serializers.SerializerMethodField()
    content_title = serializers.SerializerMethodField()
    content_description = serializers.SerializerMethodField()

    class Meta:
        model = ContentEntitlement
        fields = [
            'id',
            'content_type',
            'content_type_display',
            'content_id',
            'content_title',
            'content_description',
            'coins_spent',
            'wallet_transaction',
            'purchased_at',
            'expires_at',
            'is_permanent',
            'status',
            'is_valid'
        ]
        read_only_fields = fields

    def get_is_permanent(self, obj):
        return obj.expires_at is None

    def get_content_title(self, obj):
        from .access_service import ContentAccessService
        info = ContentAccessService.get_content_info(obj.content_type, obj.content_id)
        return info.get('title')

    def get_content_description(self, obj):
        from .access_service import ContentAccessService
        info = ContentAccessService.get_content_info(obj.content_type, obj.content_id)
        return info.get('description', '')


class ContentCoinPricingSerializer(serializers.ModelSerializer):
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    monetization_mode_display = serializers.CharField(source='get_monetization_mode_display', read_only=True)
    content_title = serializers.SerializerMethodField()
    total_purchases = serializers.SerializerMethodField()
    total_coins_earned = serializers.SerializerMethodField()
    active_entitlements_count = serializers.SerializerMethodField()

    class Meta:
        model = ContentCoinPricing
        fields = [
            'id',
            'content_type',
            'content_type_display',
            'content_id',
            'content_title',
            'coin_price',
            'access_duration_days',
            'monetization_mode',
            'monetization_mode_display',
            'is_enabled',
            'total_purchases',
            'total_coins_earned',
            'active_entitlements_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'content_type_display',
            'monetization_mode_display',
            'content_title',
            'total_purchases',
            'total_coins_earned',
            'active_entitlements_count',
            'created_at',
            'updated_at'
        ]

    def get_content_title(self, obj):
        from .access_service import ContentAccessService
        info = ContentAccessService.get_content_info(obj.content_type, obj.content_id)
        return info.get('title')

    def get_total_purchases(self, obj):
        return ContentEntitlement.objects.filter(
            content_type=obj.content_type,
            content_id=obj.content_id
        ).count()

    def get_total_coins_earned(self, obj):
        from django.db.models import Sum
        val = ContentEntitlement.objects.filter(
            content_type=obj.content_type,
            content_id=obj.content_id
        ).aggregate(total=Sum('coins_spent'))['total']
        return val or 0

    def get_active_entitlements_count(self, obj):
        from django.utils import timezone
        from django.db.models import Q
        return ContentEntitlement.objects.filter(
            content_type=obj.content_type,
            content_id=obj.content_id,
            status='ACTIVE'
        ).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())).count()

