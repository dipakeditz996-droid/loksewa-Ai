from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from core.upload_validators import (
    validate_image_size_5mb,
    validate_image_extension,
    validate_receipt_size_10mb,
    validate_receipt_file
)


class StudentWallet(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wallet'
    )
    balance = models.PositiveIntegerField(default=0)
    total_credited = models.PositiveIntegerField(default=0)
    total_debited = models.PositiveIntegerField(default=0)
    is_locked = models.BooleanField(
        default=False,
        help_text="If locked, debit and credit transactions are rejected."
    )
    lock_reason = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Administrative reason why this wallet was locked."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Student Wallet"
        verbose_name_plural = "Student Wallets"

    def __str__(self):
        return f"Wallet({self.user.username}): {self.balance} Coins"


class ImmutableTransactionQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError("WalletTransaction ledger entries are strictly immutable and cannot be updated.")

    def delete(self):
        raise ValidationError("WalletTransaction ledger entries are strictly immutable and cannot be deleted.")


class ImmutableTransactionManager(models.Manager):
    def get_queryset(self):
        return ImmutableTransactionQuerySet(self.model, using=self._db)


class WalletTransaction(models.Model):
    TRANSACTION_TYPE_CHOICES = (
        ('CREDIT', 'Credit'),
        ('DEBIT', 'Debit'),
        ('REFUND', 'Refund'),
        ('REVERSAL', 'Reversal'),
        ('ADMIN_ADJUSTMENT', 'Admin Adjustment'),
    )

    REFERENCE_TYPE_CHOICES = (
        ('TOPUP', 'Top-up'),
        ('XP_CONVERSION', 'XP Conversion'),
        ('REWARD', 'Activity Reward'),
        ('CONTENT_PURCHASE', 'Content Purchase'),
        ('REFUND', 'Refund'),
        ('REVERSAL', 'Reversal'),
        ('ADMIN_ADJUSTMENT', 'Admin Adjustment'),
        ('LEGACY_MIGRATION', 'Legacy Balance Migration'),
    )

    wallet = models.ForeignKey(
        StudentWallet,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.PositiveIntegerField()
    balance_before = models.PositiveIntegerField()
    balance_after = models.PositiveIntegerField()
    reference_type = models.CharField(max_length=50, choices=REFERENCE_TYPE_CHOICES)
    reference_id = models.CharField(max_length=100, blank=True, default='')
    idempotency_key = models.CharField(
        max_length=120,
        null=True,
        blank=True,
        unique=True,
        db_index=True
    )
    description = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = ImmutableTransactionManager()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['wallet', '-created_at'], name='wallet_tx_w_dt_idx'),
            models.Index(fields=['reference_type', 'reference_id'], name='wallet_tx_ref_idx'),
        ]

    def save(self, *args, **kwargs):
        # Transactions are strictly immutable once saved
        if self.pk:
            existing = WalletTransaction.objects.filter(pk=self.pk).exists()
            if existing:
                raise ValidationError("WalletTransaction records are strictly immutable and cannot be updated.")
        if self.amount <= 0:
            raise ValidationError("Transaction amount must be strictly greater than zero.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("WalletTransaction ledger entries are strictly immutable and cannot be deleted.")

    def __str__(self):
        return f"{self.transaction_type} {self.amount} Coins -> {self.wallet.user.username} (Bal: {self.balance_after})"


@receiver(pre_delete, sender=WalletTransaction)
def prevent_wallet_transaction_deletion(sender, instance, **kwargs):
    raise ValidationError("WalletTransaction records cannot be deleted.")


class CoinTopUpSetting(models.Model):
    enabled = models.BooleanField(default=True)
    npr_to_coin_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('1.00'),
        help_text="Coins per 1 NPR (e.g. 1.00 means 100 NPR = 100 Coins)"
    )
    min_topup_npr = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('50.00'),
        help_text="Minimum top-up amount in NPR"
    )
    max_topup_npr = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('50000.00'),
        help_text="Maximum top-up amount in NPR"
    )
    bonus_percentage = models.PositiveIntegerField(
        default=0,
        help_text="Optional percentage bonus coins (e.g. 10 for 10% bonus)"
    )
    instructions = models.TextField(
        blank=True,
        default="Transfer to our verified eSewa / Khalti / Bank account and submit the transaction code and voucher screenshot."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Coin Top-up Setting"
        verbose_name_plural = "Coin Top-up Settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def calculate_coins(self, amount_npr: Decimal) -> tuple[int, int]:
        """
        Calculates base coins and bonus coins given an NPR amount.
        """
        base_coins = int(amount_npr * self.npr_to_coin_rate)
        bonus_coins = 0
        if self.bonus_percentage > 0:
            bonus_coins = int(base_coins * self.bonus_percentage / 100)
        return base_coins, bonus_coins

    def __str__(self):
        return f"TopUp Rate: 1 NPR = {self.npr_to_coin_rate} Coins (Min: NPR {self.min_topup_npr})"


class XPConversionSetting(models.Model):
    MODE_CHOICES = (
        ('MANUAL', 'Manual (Student-initiated)'),
        ('AUTO', 'Automatic'),
        ('BOTH', 'Both Manual and Automatic'),
    )

    enabled = models.BooleanField(default=True)
    xp_required = models.PositiveIntegerField(
        default=100,
        help_text="Amount of XP required per conversion unit (e.g. 100 XP)"
    )
    coins_awarded = models.PositiveIntegerField(
        default=10,
        help_text="Coins awarded per conversion unit (e.g. 10 Coins for 100 XP)"
    )
    conversion_mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='MANUAL')
    daily_conversion_limit = models.PositiveIntegerField(
        default=1000,
        help_text="Maximum XP that can be converted per day per student (0 = unlimited)"
    )
    minimum_xp = models.PositiveIntegerField(
        default=100,
        help_text="Minimum redeemable XP required before conversion is permitted"
    )
    maximum_xp = models.PositiveIntegerField(
        default=10000,
        help_text="Maximum XP convertible in a single transaction"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "XP Conversion Setting"
        verbose_name_plural = "XP Conversion Settings"

    def save(self, *args, **kwargs):
        self.pk = 1  # Singleton pattern
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"XP Conversion ({self.xp_required} XP = {self.coins_awarded} Coins)"


class XPConversionLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='xp_conversions'
    )
    xp_converted = models.PositiveIntegerField()
    coins_awarded = models.PositiveIntegerField()
    conversion_rate_snapshot = models.CharField(max_length=100)
    wallet_transaction = models.ForeignKey(
        WalletTransaction,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='xp_conversion'
    )
    idempotency_key = models.CharField(
        max_length=120,
        unique=True,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} converted {self.xp_converted} XP -> {self.coins_awarded} Coins"


class CoinRewardRule(models.Model):
    ACTIVITY_CHOICES = (
        ('LESSON_COMPLETED', 'Lesson / Note Completed'),
        ('PRACTICE_COMPLETED', 'Practice Set Completed'),
        ('MOCK_EXAM_COMPLETED', 'Mock Exam Completed'),
        ('STREAK_MILESTONE', 'Streak Milestone Reached'),
        ('REFERRAL_QUALIFIED', 'Referral Qualified'),
    )

    activity_type = models.CharField(max_length=50, choices=ACTIVITY_CHOICES, unique=True)
    xp_reward = models.PositiveIntegerField(default=0)
    coin_reward = models.PositiveIntegerField(default=0)
    daily_limit = models.PositiveIntegerField(
        default=0,
        help_text="Maximum times a student can claim this per day. 0 = unlimited."
    )
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Reward Rule [{self.get_activity_type_display()}]: +{self.coin_reward} Coins / +{self.xp_reward} XP"


class CoinRewardClaim(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='coin_reward_claims'
    )
    rule = models.ForeignKey(
        CoinRewardRule,
        on_delete=models.CASCADE,
        related_name='claims'
    )
    activity_reference = models.CharField(
        max_length=120,
        help_text="Unique event / exam attempt / lesson session ID to prevent duplicate rewards"
    )
    coins_awarded = models.PositiveIntegerField(default=0)
    xp_awarded = models.PositiveIntegerField(default=0)
    wallet_transaction = models.ForeignKey(
        WalletTransaction,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reward_claim'
    )
    claimed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'rule', 'activity_reference')
        ordering = ['-claimed_at']

    def __str__(self):
        return f"{self.user.username} claimed {self.coins_awarded} Coins for {self.rule.activity_type} ({self.activity_reference})"


class CoinTopUp(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending Payment'),
        ('SUBMITTED', 'Submitted / Awaiting Verification'),
        ('VERIFIED', 'Verified & Credited'),
        ('REJECTED', 'Rejected'),
        ('REFUNDED', 'Refunded'),
    )

    VERIFICATION_STATUS_CHOICES = (
        ('NOT_VERIFIED', 'Not Verified'),
        ('VERIFICATION_IN_PROGRESS', 'Verification in Progress'),
        ('VERIFIED_CONFIDENT', 'Confident Match (Auto-Verified)'),
        ('VERIFIED_UNCERTAIN', 'Uncertain (Needs Manual Review)'),
        ('VERIFICATION_FAILED', 'Verification Failed'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='coin_topups'
    )
    amount_npr = models.DecimalField(max_digits=10, decimal_places=2)
    coins_expected = models.PositiveIntegerField()
    bonus_coins = models.PositiveIntegerField(default=0)
    payment_method = models.ForeignKey(
        'marketplace.PaymentMethod',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='coin_topups'
    )
    payment_method_name = models.CharField(max_length=50, blank=True, default='')
    payment_reference = models.CharField(max_length=100, blank=True, default='')
    receipt_image = models.FileField(
        upload_to='wallet/topup_receipts/',
        null=True,
        blank=True,
        validators=[validate_receipt_size_10mb, validate_receipt_file],
        max_length=500
    )
    idempotency_key = models.CharField(
        max_length=120,
        unique=True,
        null=True,
        blank=True
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    verification_status = models.CharField(
        max_length=30,
        choices=VERIFICATION_STATUS_CHOICES,
        default='NOT_VERIFIED',
        help_text='Tracks AI/OCR verification status'
    )
    verification_result = models.JSONField(
        default=dict,
        blank=True,
        help_text='Stores OCR verification output and audit data'
    )
    ai_verification_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when OCR verification was executed'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_topups'
    )
    rejection_reason = models.TextField(blank=True, default='')
    verification_notes = models.TextField(blank=True, default='')
    wallet_transaction = models.ForeignKey(
        WalletTransaction,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='topup_origin'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['payment_reference'],
                condition=~models.Q(payment_reference='') & ~models.Q(status__in=['REJECTED', 'REFUNDED']),
                name='unique_active_topup_payment_reference'
            ),
        ]

    @property
    def student(self):
        return self.user

    @property
    def screenshot(self):
        return self.receipt_image

    @property
    def transaction_id(self):
        return self.payment_reference

    @property
    def amount(self):
        return self.amount_npr

    @property
    def total_coins(self):
        return self.coins_expected + self.bonus_coins

    def __str__(self):
        return f"TopUp #{self.pk} - {self.user.username}: NPR {self.amount_npr} -> {self.total_coins} Coins [{self.status}]"


class ContentCoinPricing(models.Model):
    CONTENT_TYPES = (
        ('STUDY_MATERIAL', 'Study Material / Note'),
        ('EXAMINATION', 'Examination'),
        ('QUESTION_SET', 'Question Set'),
    )

    MONETIZATION_MODES = (
        ('FREE', 'Free'),
        ('PACKAGE_ONLY', 'Package Only'),
        ('COIN_PURCHASE', 'Coin Purchase Only'),
        ('PACKAGE_OR_COINS', 'Package or Coins'),
    )

    content_type = models.CharField(max_length=30, choices=CONTENT_TYPES)
    content_id = models.PositiveIntegerField()
    coin_price = models.PositiveIntegerField(default=0)
    monetization_mode = models.CharField(
        max_length=20,
        choices=MONETIZATION_MODES,
        default='PACKAGE_OR_COINS',
        help_text="Monetization access mode"
    )
    access_duration_days = models.IntegerField(
        default=0,
        help_text="Access duration in days. 0 = permanent lifetime access."
    )
    is_enabled = models.BooleanField(
        default=True,
        help_text="If false, this item cannot currently be purchased with coins."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('content_type', 'content_id')
        verbose_name = "Content Coin Pricing"
        verbose_name_plural = "Content Coin Pricing Rules"

    def __str__(self):
        duration = f"{self.access_duration_days} days" if self.access_duration_days > 0 else "Lifetime"
        return f"{self.content_type} #{self.content_id}: {self.coin_price} Coins ({duration})"


class ContentEntitlement(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('EXPIRED', 'Expired'),
        ('REVOKED', 'Revoked'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='content_entitlements'
    )
    content_type = models.CharField(max_length=30, choices=ContentCoinPricing.CONTENT_TYPES)
    content_id = models.PositiveIntegerField()
    wallet_transaction = models.ForeignKey(
        WalletTransaction,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='content_entitlements'
    )
    coins_spent = models.PositiveIntegerField(default=0)
    purchased_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Null indicates permanent lifetime access."
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'content_type', 'content_id'],
                condition=models.Q(status='ACTIVE'),
                name='unique_active_content_entitlement'
            )
        ]
        indexes = [
            models.Index(fields=['user', 'content_type', 'content_id', 'status'], name='content_entitlement_idx'),
        ]

    @property
    def is_currently_valid(self):
        if self.status != 'ACTIVE':
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True

    def __str__(self):
        return f"{self.user.username} Entitled to {self.content_type} #{self.content_id} [{self.status}]"
