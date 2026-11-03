import logging
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import (
    StudentWallet,
    WalletTransaction,
    CoinTopUpSetting,
    XPConversionSetting,
    XPConversionLog,
    CoinRewardRule,
    CoinRewardClaim,
    ContentCoinPricing,
    ContentEntitlement
)
from gamification.models import GamificationProfile

logger = logging.getLogger(__name__)


class WalletError(Exception):
    """Base exception for wallet operations."""
    pass


class WalletLockedError(WalletError):
    """Raised when an operation is attempted on a locked wallet."""
    pass


class InsufficientCoinsError(WalletError):
    """Raised when a debit is attempted with insufficient balance."""
    def __init__(self, available, requested):
        self.available = available
        self.requested = requested
        super().__init__(f"Insufficient coin balance. Available: {available}, Required: {requested}")


class DuplicateTransactionError(WalletError):
    """Raised when an idempotency conflict occurs."""
    pass


class WalletService:
    """
    Central authoritative service for all coin balance operations.
    Enforces atomic transactions, row-level locking (select_for_update),
    strict non-negative balance invariants, idempotency, and ledger immutability.
    """

    @classmethod
    def get_or_create_wallet(cls, user):
        """
        Retrieves or creates the StudentWallet for the given user.
        """
        wallet, created = StudentWallet.objects.get_or_create(user=user)
        return wallet

    @classmethod
    def get_wallet_balance(cls, user):
        """
        Returns the spendable coin balance for the user.
        """
        wallet = cls.get_or_create_wallet(user)
        return wallet.balance

    @classmethod
    def credit_wallet(
        cls,
        user,
        amount,
        reference_type,
        reference_id='',
        description='',
        idempotency_key=None,
        metadata=None
    ):
        """
        Safely credits coins to the user's wallet.
        Creates an immutable CREDIT ledger transaction.
        Synchronizes the legacy GamificationProfile.coins read field.
        """
        if amount <= 0:
            raise ValidationError("Credit amount must be strictly greater than 0.")

        with transaction.atomic():
            # Check idempotency first if key provided
            if idempotency_key:
                existing_tx = WalletTransaction.objects.filter(idempotency_key=idempotency_key).first()
                if existing_tx:
                    if existing_tx.wallet.user != user:
                        raise DuplicateTransactionError("Idempotency conflict: Key belongs to another user.")
                    if existing_tx.transaction_type != 'CREDIT' or existing_tx.amount != amount:
                        raise DuplicateTransactionError("Idempotency conflict: Request parameters do not match existing transaction.")
                    logger.info("Idempotent credit skipped for key: %s", idempotency_key)
                    return existing_tx

            # Lock the wallet row
            wallet, _ = StudentWallet.objects.select_for_update().get_or_create(user=user)

            if wallet.is_locked:
                raise WalletLockedError(f"Wallet is locked by administration ({wallet.lock_reason or 'No reason provided'}). No credits permitted.")

            balance_before = wallet.balance
            wallet.balance += amount
            wallet.total_credited += amount
            wallet.save(update_fields=['balance', 'total_credited', 'updated_at'])

            tx = WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type='CREDIT',
                amount=amount,
                balance_before=balance_before,
                balance_after=wallet.balance,
                reference_type=reference_type,
                reference_id=str(reference_id),
                idempotency_key=idempotency_key,
                description=description or f"Credited {amount} Coins ({reference_type})",
                metadata=metadata or {}
            )

            # Sync legacy profile field
            GamificationProfile.objects.filter(user=user).update(coins=wallet.balance)

            return tx

    @classmethod
    def debit_wallet(
        cls,
        user,
        amount,
        reference_type,
        reference_id='',
        description='',
        idempotency_key=None,
        metadata=None
    ):
        """
        Safely debits coins from the user's wallet.
        Guarantees non-negative balance via row lock.
        Creates an immutable DEBIT ledger transaction.
        Synchronizes the legacy GamificationProfile.coins read field.
        """
        if amount <= 0:
            raise ValidationError("Debit amount must be strictly greater than 0.")

        with transaction.atomic():
            # Check idempotency first if key provided
            if idempotency_key:
                existing_tx = WalletTransaction.objects.filter(idempotency_key=idempotency_key).first()
                if existing_tx:
                    if existing_tx.wallet.user != user:
                        raise DuplicateTransactionError("Idempotency conflict: Key belongs to another user.")
                    if existing_tx.transaction_type != 'DEBIT' or existing_tx.amount != amount:
                        raise DuplicateTransactionError("Idempotency conflict: Request parameters do not match existing transaction.")
                    logger.info("Idempotent debit skipped for key: %s", idempotency_key)
                    return existing_tx

            # Lock the wallet row
            wallet, _ = StudentWallet.objects.select_for_update().get_or_create(user=user)

            if wallet.is_locked:
                raise WalletLockedError(f"Wallet is locked by administration ({wallet.lock_reason or 'No reason provided'}). No spending permitted.")

            if wallet.balance < amount:
                raise InsufficientCoinsError(available=wallet.balance, requested=amount)

            balance_before = wallet.balance
            wallet.balance -= amount
            wallet.total_debited += amount
            wallet.save(update_fields=['balance', 'total_debited', 'updated_at'])

            tx = WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type='DEBIT',
                amount=amount,
                balance_before=balance_before,
                balance_after=wallet.balance,
                reference_type=reference_type,
                reference_id=str(reference_id),
                idempotency_key=idempotency_key,
                description=description or f"Debited {amount} Coins ({reference_type})",
                metadata=metadata or {}
            )

            # Sync legacy profile field
            GamificationProfile.objects.filter(user=user).update(coins=wallet.balance)

            return tx

    @classmethod
    def refund_wallet(cls, transaction_id, reason='', admin_user=None):
        """
        Refunds a prior DEBIT transaction.
        Credits the full amount back and creates a REFUND transaction.
        Database-enforced idempotency via idempotency_key=f"refund_tx_{orig_tx.pk}".
        """
        with transaction.atomic():
            orig_tx = WalletTransaction.objects.select_for_update().get(pk=transaction_id)
            if orig_tx.transaction_type != 'DEBIT':
                raise ValidationError("Only DEBIT transactions can be refunded.")

            idempotency_key = f"refund_tx_{orig_tx.pk}"
            already_refunded = WalletTransaction.objects.filter(idempotency_key=idempotency_key).exists()
            if already_refunded:
                raise ValidationError(f"Transaction #{transaction_id} has already been refunded.")

            wallet = StudentWallet.objects.select_for_update().get(pk=orig_tx.wallet_id)
            balance_before = wallet.balance
            wallet.balance += orig_tx.amount
            wallet.total_credited += orig_tx.amount
            wallet.save(update_fields=['balance', 'total_credited', 'updated_at'])

            refund_tx = WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type='REFUND',
                amount=orig_tx.amount,
                balance_before=balance_before,
                balance_after=wallet.balance,
                reference_type='REFUND',
                reference_id=str(orig_tx.pk),
                idempotency_key=idempotency_key,
                description=reason or f"Refund of transaction #{orig_tx.pk} ({orig_tx.description})",
                metadata={
                    'original_transaction_id': orig_tx.pk,
                    'refunded_by': admin_user.username if admin_user else 'system',
                    'reason': reason
                }
            )

            GamificationProfile.objects.filter(user=wallet.user).update(coins=wallet.balance)
            return refund_tx

    @classmethod
    def reverse_transaction(cls, transaction_id, reason='', admin_user=None):
        """
        Reverses an erroneous CREDIT transaction.
        Debits the credited amount back with transaction_type='REVERSAL'.
        Database-enforced idempotency via idempotency_key=f"reversal_tx_{orig_tx.pk}".
        """
        with transaction.atomic():
            orig_tx = WalletTransaction.objects.select_for_update().get(pk=transaction_id)
            if orig_tx.transaction_type != 'CREDIT':
                raise ValidationError("Only CREDIT transactions can be reversed.")

            idempotency_key = f"reversal_tx_{orig_tx.pk}"
            already_reversed = WalletTransaction.objects.filter(idempotency_key=idempotency_key).exists()
            if already_reversed:
                raise ValidationError(f"Transaction #{transaction_id} has already been reversed.")

            wallet = StudentWallet.objects.select_for_update().get(pk=orig_tx.wallet_id)
            if wallet.balance < orig_tx.amount:
                raise InsufficientCoinsError(
                    available=wallet.balance,
                    requested=orig_tx.amount
                )

            balance_before = wallet.balance
            wallet.balance -= orig_tx.amount
            wallet.total_debited += orig_tx.amount
            wallet.save(update_fields=['balance', 'total_debited', 'updated_at'])

            rev_tx = WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type='REVERSAL',
                amount=orig_tx.amount,
                balance_before=balance_before,
                balance_after=wallet.balance,
                reference_type='REVERSAL',
                reference_id=str(orig_tx.pk),
                idempotency_key=idempotency_key,
                description=reason or f"Reversal of credit transaction #{orig_tx.pk}",
                metadata={
                    'original_transaction_id': orig_tx.pk,
                    'reversed_by': admin_user.username if admin_user else 'system',
                    'reason': reason
                }
            )

            GamificationProfile.objects.filter(user=wallet.user).update(coins=wallet.balance)
            return rev_tx

    @classmethod
    def admin_adjust_wallet(
        cls,
        user,
        amount,
        adjustment_type,
        reason,
        admin_user=None,
        idempotency_key=None
    ):
        """
        Administrative balance adjustment (CREDIT or DEBIT) with mandatory reason.
        Audit logged with admin username in metadata.
        """
        if not reason or not reason.strip():
            raise ValidationError("A specific administrative reason is strictly mandatory for manual wallet adjustments.")
        if adjustment_type not in ('CREDIT', 'DEBIT'):
            raise ValidationError("Adjustment type must be either 'CREDIT' or 'DEBIT'.")

        metadata = {
            'adjusted_by': admin_user.username if admin_user else 'system',
            'adjusted_by_id': admin_user.pk if admin_user else None,
            'reason': reason.strip()
        }

        if adjustment_type == 'CREDIT':
            return cls.credit_wallet(
                user=user,
                amount=amount,
                reference_type='ADMIN_ADJUSTMENT',
                description=f"Admin credit: {reason.strip()}",
                idempotency_key=idempotency_key,
                metadata=metadata
            )
        else:
            return cls.debit_wallet(
                user=user,
                amount=amount,
                reference_type='ADMIN_ADJUSTMENT',
                description=f"Admin debit: {reason.strip()}",
                idempotency_key=idempotency_key,
                metadata=metadata
            )

    @classmethod
    def get_wallet_history(cls, user, limit=50, offset=0):
        """
        Returns recent ledger transactions for the user's wallet.
        """
        wallet = cls.get_or_create_wallet(user)
        return wallet.transactions.all()[offset:offset + limit]

    @classmethod
    def migrate_legacy_coins(cls, user):
        """
        Safely initializes the student's authoritative wallet from legacy GamificationProfile.coins.
        Guarantees single execution via LEGACY_MIGRATION reference and idempotency key.
        """
        with transaction.atomic():
            profile = GamificationProfile.objects.select_for_update().filter(user=user).first()
            if not profile or profile.coins <= 0:
                return None

            wallet = cls.get_or_create_wallet(user)

            # Check if already migrated
            already_migrated = WalletTransaction.objects.filter(
                wallet=wallet,
                reference_type='LEGACY_MIGRATION'
            ).exists()
            if already_migrated:
                return None

            idempotency_key = f"legacy_migration_user_{user.id}"
            tx = cls.credit_wallet(
                user=user,
                amount=profile.coins,
                reference_type='LEGACY_MIGRATION',
                reference_id=f"profile_{profile.id}",
                description="Opening balance migration from legacy gamification profile",
                idempotency_key=idempotency_key,
                metadata={'migrated_profile_id': profile.id, 'legacy_coins': profile.coins}
            )
            return tx
