import logging
from datetime import timedelta
from typing import Optional, Dict, Any, Tuple
from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from rest_framework.exceptions import ValidationError, PermissionDenied

from .models import (
    StudentWallet,
    WalletTransaction,
    ContentCoinPricing,
    ContentEntitlement
)
from .services import (
    WalletService,
    InsufficientCoinsError,
    WalletLockedError,
    DuplicateTransactionError
)

logger = logging.getLogger(__name__)


class ContentAccessService:
    """
    Centralized Access Decision System for LoksewaAI Content Monetization.
    
    Evaluates access in strict priority order:
    1. Is the content publicly / free accessible?
    2. Does the student have an active free trial that grants access?
    3. Does the student have an active subscription / package that includes this content?
    4. Does the student already own a valid, unexpired coin-based entitlement?
    5. If none apply, is this content configured for coin purchase?
    6. If coin purchase is unavailable, show the existing applicable subscription/package purchase option.
    """

    @classmethod
    def get_content_object(cls, content_type: str, content_id: int):
        """Resolves the canonical content instance."""
        if content_type == 'STUDY_MATERIAL':
            from notes.models import StudyMaterial
            return StudyMaterial.objects.filter(id=content_id).first()
        elif content_type == 'EXAMINATION':
            from exams.models import Examination
            return Examination.objects.filter(id=content_id).first()
        elif content_type == 'QUESTION_SET':
            from exams.models import QuestionSet
            return QuestionSet.objects.filter(id=content_id).first()
        return None

    @classmethod
    def get_content_info(cls, content_type: str, content_id: int) -> Dict[str, Any]:
        """Returns normalized display title and details for the content."""
        obj = cls.get_content_object(content_type, content_id)
        if not obj:
            return {
                'id': content_id,
                'content_type': content_type,
                'title': f"{content_type.replace('_', ' ').title()} #{content_id}",
                'description': '',
                'exists': False,
            }
        
        title = getattr(obj, 'title', None) or getattr(obj, 'name', None) or f"{content_type} #{content_id}"
        description = getattr(obj, 'description', '') or ''
        return {
            'id': content_id,
            'content_type': content_type,
            'title': title,
            'description': description,
            'exists': True,
            'status': getattr(obj, 'status', 'published'),
        }

    @classmethod
    def has_active_entitlement(cls, user, content_type: str, content_id: int) -> Tuple[bool, Optional[ContentEntitlement]]:
        """
        Step 4 check: Returns (has_valid_entitlement, entitlement_instance).
        """
        if not user or not user.is_authenticated:
            return False, None

        now = timezone.now()
        entitlement = ContentEntitlement.objects.filter(
            user=user,
            content_type=content_type,
            content_id=content_id,
            status='ACTIVE'
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        ).first()

        if entitlement:
            return True, entitlement
        return False, None

    @classmethod
    def evaluate_access(cls, user, content_type: str, content_id: int) -> Dict[str, Any]:
        """
        Authoritative 6-step access priority evaluation.
        """
        now = timezone.now()
        content_info = cls.get_content_info(content_type, content_id)
        content_obj = cls.get_content_object(content_type, content_id)

        pricing = ContentCoinPricing.objects.filter(
            content_type=content_type,
            content_id=content_id
        ).first()

        pricing_data = None
        if pricing:
            pricing_data = {
                'coin_price': pricing.coin_price,
                'access_duration_days': pricing.access_duration_days,
                'monetization_mode': pricing.monetization_mode,
                'is_enabled': pricing.is_enabled,
                'is_permanent': pricing.access_duration_days == 0
            }

        # Wallet info for authenticated user
        wallet_balance = 0
        wallet_locked = False
        if user and user.is_authenticated:
            try:
                wallet = StudentWallet.objects.filter(user=user).first()
                if wallet:
                    wallet_balance = wallet.balance
                    wallet_locked = wallet.is_locked
            except Exception:
                pass

        # Privileged staff always have full access
        from courses.services.course_access_service import CourseAccessService
        if user and user.is_authenticated and CourseAccessService.is_privileged(user):
            return {
                'has_access': True,
                'access_type': 'FREE',
                'reason': 'Staff privileged access',
                'can_purchase_with_coins': False,
                'package_purchase_required': False,
                'pricing': pricing_data,
                'content': content_info,
                'wallet_balance': wallet_balance,
                'entitlement': None
            }

        # -------------------------------------------------------------
        # 1. Is the content publicly / free accessible?
        # -------------------------------------------------------------
        is_public_free = False
        if pricing and (pricing.monetization_mode == 'FREE' or (pricing.is_enabled and pricing.coin_price == 0)):
            is_public_free = True
        elif content_type == 'STUDY_MATERIAL' and content_obj:
            if getattr(content_obj, 'access_type', None) == 'free' and getattr(content_obj, 'course_id', None) is None:
                is_public_free = True
        elif content_type == 'EXAMINATION' and content_obj:
            if getattr(content_obj, 'is_free', False) or (getattr(content_obj, 'course_id', None) is None and not getattr(content_obj, 'category_id', None) and not getattr(content_obj, 'subject_id', None)):
                # If marked free explicitly
                if getattr(content_obj, 'is_free', False):
                    is_public_free = True

        if is_public_free:
            return {
                'has_access': True,
                'access_type': 'FREE',
                'reason': 'Public free content',
                'can_purchase_with_coins': False,
                'package_purchase_required': False,
                'pricing': pricing_data,
                'content': content_info,
                'wallet_balance': wallet_balance,
                'entitlement': None
            }

        if not user or not user.is_authenticated:
            # Anonymous users without free access cannot access
            can_purchase = bool(pricing and pricing.is_enabled and pricing.coin_price > 0 and pricing.monetization_mode in ('COIN_PURCHASE', 'PACKAGE_OR_COINS'))
            return {
                'has_access': False,
                'access_type': None,
                'reason': 'Authentication required',
                'can_purchase_with_coins': can_purchase,
                'package_purchase_required': not can_purchase,
                'pricing': pricing_data,
                'content': content_info,
                'wallet_balance': 0,
                'entitlement': None
            }

        # -------------------------------------------------------------
        # 2. Does student have an active free trial that grants access?
        # -------------------------------------------------------------
        from subscriptions.models import Subscription
        active_trial_sub = Subscription.objects.filter(
            student=user,
            status='ACTIVE'
        ).filter(
            Q(expiry_date__isnull=True) | Q(expiry_date__gt=now)
        ).filter(
            Q(source='FREE_PLAN') | Q(plan__price__lte=0) | Q(plan__is_default_free=True)
        ).select_related('plan').first()

        if active_trial_sub:
            trial_grants_access = False
            if content_type == 'STUDY_MATERIAL' and content_obj:
                trial_grants_access = CourseAccessService.has_note_access(user, content_obj)
            elif content_type == 'EXAMINATION' and content_obj:
                trial_grants_access = CourseAccessService.has_examination_access(user, content_obj)
            elif content_type == 'QUESTION_SET':
                trial_grants_access = True

            if trial_grants_access:
                return {
                    'has_access': True,
                    'access_type': 'TRIAL',
                    'reason': f'Active free trial access ({active_trial_sub.plan.name})',
                    'can_purchase_with_coins': False,
                    'package_purchase_required': False,
                    'pricing': pricing_data,
                    'content': content_info,
                    'wallet_balance': wallet_balance,
                    'entitlement': None
                }

        # -------------------------------------------------------------
        # 3. Does student have an active subscription/package that includes this content?
        # -------------------------------------------------------------
        # Check active paid packages (or admin grants)
        package_grants_access = False
        # If monetization_mode is strictly COIN_PURCHASE, it is excluded from standard package access
        mode = pricing.monetization_mode if pricing else 'PACKAGE_OR_COINS'
        if mode != 'COIN_PURCHASE':
            from subscriptions.access import has_active_subscription
            if has_active_subscription(user):
                if content_type == 'STUDY_MATERIAL' and content_obj:
                    package_grants_access = CourseAccessService.has_note_access(user, content_obj)
                elif content_type == 'EXAMINATION' and content_obj:
                    package_grants_access = CourseAccessService.has_examination_access(user, content_obj)

        if package_grants_access:
            return {
                'has_access': True,
                'access_type': 'PACKAGE',
                'reason': 'Included in active subscription package',
                'can_purchase_with_coins': False,
                'package_purchase_required': False,
                'pricing': pricing_data,
                'content': content_info,
                'wallet_balance': wallet_balance,
                'entitlement': None
            }

        # -------------------------------------------------------------
        # 4. Does student already own a valid coin-based entitlement?
        # -------------------------------------------------------------
        has_ent, ent = cls.has_active_entitlement(user, content_type, content_id)
        if has_ent and ent:
            ent_data = {
                'id': ent.id,
                'coins_spent': ent.coins_spent,
                'purchased_at': ent.purchased_at.isoformat() if ent.purchased_at else None,
                'expires_at': ent.expires_at.isoformat() if ent.expires_at else None,
                'is_permanent': ent.expires_at is None,
                'status': ent.status,
            }
            return {
                'has_access': True,
                'access_type': 'ENTITLEMENT',
                'reason': 'Unlocked with coins',
                'can_purchase_with_coins': False,
                'package_purchase_required': False,
                'pricing': pricing_data,
                'content': content_info,
                'wallet_balance': wallet_balance,
                'entitlement': ent_data
            }

        # -------------------------------------------------------------
        # 5. If none apply, is this content configured for coin purchase?
        # -------------------------------------------------------------
        if pricing and pricing.is_enabled and pricing.coin_price > 0 and pricing.monetization_mode in ('COIN_PURCHASE', 'PACKAGE_OR_COINS'):
            can_afford = wallet_balance >= pricing.coin_price
            return {
                'has_access': False,
                'access_type': None,
                'reason': 'Content locked. Available for purchase with coins.',
                'can_purchase_with_coins': True,
                'package_purchase_required': False,
                'pricing': pricing_data,
                'content': content_info,
                'wallet_balance': wallet_balance,
                'wallet_locked': wallet_locked,
                'can_afford': can_afford,
                'coin_shortage': max(0, pricing.coin_price - wallet_balance),
                'remaining_balance_after_purchase': wallet_balance - pricing.coin_price if can_afford else 0,
                'entitlement': None
            }

        # -------------------------------------------------------------
        # 6. If coin purchase is unavailable, require subscription / package purchase
        # -------------------------------------------------------------
        return {
            'has_access': False,
            'access_type': None,
            'reason': 'This content requires an active course package or subscription.',
            'can_purchase_with_coins': False,
            'package_purchase_required': True,
            'pricing': pricing_data,
            'content': content_info,
            'wallet_balance': wallet_balance,
            'wallet_locked': wallet_locked,
            'entitlement': None
        }

    @classmethod
    def purchase_content(
        cls,
        user,
        content_type: str,
        content_id: int,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Purchases content using coins atomically with row-level locks and idempotency protection.
        
        1. Authenticate student.
        2. Resolve canonical content ID & type.
        3. Server-side check if student already has valid access.
        4. Load active admin-configured coin price.
        5. Verify wallet not locked and balance sufficient.
        6. Debit coins atomically using WalletService.
        7. Create ContentEntitlement.
        8. Return updated wallet balance and entitlement.
        """
        if not user or not user.is_authenticated:
            raise PermissionDenied("Authentication required to purchase content.")

        if content_type not in ('STUDY_MATERIAL', 'EXAMINATION', 'QUESTION_SET'):
            raise ValidationError(f"Invalid content type: {content_type}")

        content_obj = cls.get_content_object(content_type, content_id)
        if not content_obj:
            raise ValidationError(f"Content not found: {content_type} #{content_id}")

        content_info = cls.get_content_info(content_type, content_id)

        # Idempotency check before lock
        if idempotency_key:
            existing_tx = WalletTransaction.objects.filter(idempotency_key=idempotency_key).first()
            if existing_tx:
                if existing_tx.wallet.user != user:
                    raise DuplicateTransactionError("Idempotency conflict: Key belongs to another user.")
                # Retrieve associated entitlement
                ent = ContentEntitlement.objects.filter(wallet_transaction=existing_tx).first()
                if ent and ent.is_currently_valid:
                    return {
                        'success': True,
                        'idempotent_replay': True,
                        'message': 'Purchase already processed successfully.',
                        'entitlement_id': ent.id,
                        'coins_spent': ent.coins_spent,
                        'wallet_balance': existing_tx.wallet.balance,
                        'expires_at': ent.expires_at.isoformat() if ent.expires_at else None,
                        'is_permanent': ent.expires_at is None,
                        'content': content_info
                    }

        with transaction.atomic():
            # Check 1: Does student already have access? (Prevent double charge)
            access_eval = cls.evaluate_access(user, content_type, content_id)
            if access_eval['has_access']:
                return {
                    'success': False,
                    'already_owned': True,
                    'message': f"You already have access to this content ({access_eval['reason']}).",
                    'access_type': access_eval['access_type'],
                    'wallet_balance': access_eval.get('wallet_balance', 0),
                    'content': content_info
                }

            # Check 2: Load active coin price from db
            pricing = ContentCoinPricing.objects.select_for_update().filter(
                content_type=content_type,
                content_id=content_id
            ).first()

            if not pricing or not pricing.is_enabled:
                raise ValidationError("This content is not currently available for coin purchase.")

            if pricing.monetization_mode not in ('COIN_PURCHASE', 'PACKAGE_OR_COINS'):
                raise ValidationError(f"This content cannot be unlocked with coins (Mode: {pricing.monetization_mode}).")

            coin_price = pricing.coin_price
            if coin_price <= 0:
                raise ValidationError("This item has zero coin price and should be accessed for free.")

            # Check 3: Lock student wallet and verify balance
            wallet, _ = StudentWallet.objects.select_for_update().get_or_create(user=user)
            if wallet.is_locked:
                raise WalletLockedError(f"Your wallet is locked: {wallet.lock_reason or 'Contact administration'}.")

            if wallet.balance < coin_price:
                raise InsufficientCoinsError(available=wallet.balance, requested=coin_price)

            # Check 4: Check if an active entitlement already exists under lock
            existing_ent = ContentEntitlement.objects.select_for_update().filter(
                user=user,
                content_type=content_type,
                content_id=content_id,
                status='ACTIVE'
            ).first()
            if existing_ent and existing_ent.is_currently_valid:
                return {
                    'success': False,
                    'already_owned': True,
                    'message': 'You already hold an active entitlement for this content.',
                    'wallet_balance': wallet.balance,
                    'content': content_info
                }

            # Calculate expiry date
            expires_at = None
            if pricing.access_duration_days > 0:
                expires_at = timezone.now() + timedelta(days=pricing.access_duration_days)

            # Generate idempotency key if none provided
            actual_idempotency_key = idempotency_key or f"coin_purchase_{user.id}_{content_type}_{content_id}_{int(timezone.now().timestamp())}"

            # Step 5: Debit coins atomically using WalletService
            desc = f"Unlocked {content_type.replace('_', ' ').title()}: {content_info['title']}"
            tx = WalletService.debit_wallet(
                user=user,
                amount=coin_price,
                reference_type='CONTENT_PURCHASE',
                reference_id=f"{content_type}_{content_id}",
                description=desc,
                idempotency_key=actual_idempotency_key,
                metadata={
                    'content_type': content_type,
                    'content_id': content_id,
                    'access_duration_days': pricing.access_duration_days,
                    'content_title': content_info['title']
                }
            )

            # If there was a previous expired or revoked entitlement row, update or archive it
            if existing_ent:
                existing_ent.status = 'EXPIRED'
                existing_ent.save(update_fields=['status'])

            # Step 6: Create exactly one ContentEntitlement
            entitlement = ContentEntitlement.objects.create(
                user=user,
                content_type=content_type,
                content_id=content_id,
                wallet_transaction=tx,
                coins_spent=coin_price,
                expires_at=expires_at,
                status='ACTIVE'
            )

            # Refresh wallet to get exact final balance
            wallet.refresh_from_db()

            logger.info(
                "Content purchased successfully: User %s bought %s #%s for %s coins. New balance: %s",
                user.username, content_type, content_id, coin_price, wallet.balance
            )

            return {
                'success': True,
                'already_owned': False,
                'message': f"Successfully unlocked {content_info['title']} for {coin_price} Coins!",
                'entitlement_id': entitlement.id,
                'coins_spent': coin_price,
                'wallet_balance': wallet.balance,
                'expires_at': entitlement.expires_at.isoformat() if entitlement.expires_at else None,
                'is_permanent': entitlement.expires_at is None,
                'content': content_info,
                'transaction_id': tx.id
            }
