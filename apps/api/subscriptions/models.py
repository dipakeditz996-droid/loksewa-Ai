from django.db import models
from core.models import User
from marketplace.models import PaymentMethod
from datetime import timedelta
from django.utils import timezone
from core.upload_validators import validate_image_size_5mb, validate_image_extension

class SubscriptionPlan(models.Model):
    DURATION_UNIT_CHOICES = (
        ('DAYS', 'Days'),
        ('WEEKS', 'Weeks'),
        ('MONTHS', 'Months'),
        ('YEAR', 'Year'),
    )

    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('ARCHIVED', 'Archived'),
    )

    BADGE_CHOICES = (
        ('NONE', 'None'),
        ('POPULAR', 'Popular'),
        ('BEST_VALUE', 'Best Value'),
        ('RECOMMENDED', 'Recommended'),
        ('LIMITED_OFFER', 'Limited Offer'),
    )

    PACKAGE_TYPE_CHOICES = (
        ('SINGLE', 'Single Preparation'),
        ('MULTI', 'Multi Preparation'),
        ('BUNDLE', 'Bundle'),
        ('ALL_ACCESS', 'All Access'),
    )

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True, null=True, unique=True)
    description = models.TextField(blank=True)
    
    # Validity & Expiry: optional rather than mandatory day-based expiry
    has_expiry = models.BooleanField(default=True, help_text="If False, package is quota-based or lifetime without mandatory day-based expiration.")
    duration = models.IntegerField(null=True, blank=True, default=30)
    duration_unit = models.CharField(max_length=20, choices=DURATION_UNIT_CHOICES, default='DAYS', null=True, blank=True)

    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Discount percentage")

    badge = models.CharField(max_length=20, choices=BADGE_CHOICES, default='NONE')
    display_badge = models.CharField(max_length=50, blank=True, default='')

    # Feature access configuration
    features = models.JSONField(default=list, blank=True, help_text="List of string feature keys this plan unlocks")

    # Which course this plan grants enrollment access to (optional)
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='subscription_plans',
        help_text='Legacy/Single: The Course this plan grants enrollment access to. When payment is approved, student is enrolled in this course.'
    )

    package_type = models.CharField(max_length=20, choices=PACKAGE_TYPE_CHOICES, default='SINGLE', help_text="Type of package dictating the access rules.")
    course_access_type = models.CharField(
        max_length=20,
        choices=(
            ('NONE', 'No Course Access'),
            ('SELECTED', 'Selected Courses'),
            ('BUNDLE', 'Course Bundle'),
            ('ALL_ACCESS', 'All Access'),
        ),
        default='SELECTED',
        help_text="Course access entitlement rule"
    )
    
    eligible_courses = models.ManyToManyField(
        'courses.Course', 
        blank=True, 
        related_name='eligible_plans',
        help_text="Courses this package can grant access to. Used for MULTI and BUNDLE types."
    )

    # Flexible Preparation Pricing
    allowed_preparation_count = models.IntegerField(default=1, help_text="Number of preparations allowed for this plan (used for MULTI packages)")
    is_flexible = models.BooleanField(default=False, help_text="Deprecated: Use package_type='MULTI'. If true, the student can pick up to `allowed_preparation_count` courses.")

    # Examination Quotas & Free Mock Tests
    # Format: {'past_year': {'enabled': True, 'attempts': 10}, 'model': {'enabled': True, 'attempts': 5}, 'live': {'enabled': True, 'attempts': 2}, 'topicwise': {'enabled': True, 'attempts': -1}} (-1 = unlimited)
    exam_quotas = models.JSONField(
        default=dict, blank=True,
        help_text="Configured attempts per category. -1 represents Unlimited."
    )
    free_mock_exams = models.ManyToManyField(
        'exams.Examination',
        blank=True,
        related_name='free_for_plans',
        help_text="Specific Mock Exams that are free for subscribers of this package."
    )
    free_mock_attempts = models.IntegerField(default=0, help_text="Free mock exam attempts allowance (-1 for unlimited).")

    # Notes & Study Materials Access
    notes_access_type = models.CharField(
        max_length=20,
        choices=(
            ('NONE', 'No Notes Access'),
            ('COURSE_NOTES', 'Included Course Notes'),
            ('ALL', 'All Eligible Notes'),
        ),
        default='COURSE_NOTES'
    )
    can_download_notes = models.BooleanField(default=False)

    # Practice Allowance
    practice_enabled = models.BooleanField(default=True)
    practice_question_limit = models.IntegerField(default=-1, help_text="Practice questions quota (-1 for unlimited).")

    # AI Tutor
    ai_tutor_enabled = models.BooleanField(default=True)
    ai_credits = models.IntegerField(default=0, help_text="AI Tutor tokens/credits allowance (-1 for unlimited).")
    ai_daily_limit = models.IntegerField(default=0, help_text="Daily AI limit (0 for unlimited).")
    ai_monthly_limit = models.IntegerField(default=0, help_text="Monthly AI limit (0 for unlimited).")

    # Quota Resets & Lifecycle
    reset_frequency = models.CharField(
        max_length=20,
        choices=(
            ('NEVER', 'Lifetime / Never'),
            ('DAILY', 'Daily'),
            ('WEEKLY', 'Weekly'),
            ('MONTHLY', 'Monthly'),
        ),
        default='NEVER'
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    is_published = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    terms = models.TextField(blank=True, default='')
    display_order = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.price}"


class Subscription(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('EXPIRED', 'Expired'),
        ('CANCELLED', 'Cancelled'),
    )
    SOURCE_CHOICES = (
        ('CUSTOMER_PAYMENT', 'Customer Payment'),
        ('ADMIN_GRANT', 'Admin Grant'),
    )
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='CUSTOMER_PAYMENT')
    admin_grant_reason = models.TextField(blank=True, default='')
    granted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='granted_subscriptions'
    )
    start_date = models.DateTimeField(default=timezone.now)
    expiry_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.username} - {self.plan.name} ({self.status}) [{self.source}]"
        
    @property
    def is_active(self):
        if self.status != 'ACTIVE':
            return False
        if self.expiry_date:
            return self.expiry_date > timezone.now()
        # Quota-only / lifetime packages remain active until explicitly cancelled or exhausted
        return True

    @property
    def has_expiry(self):
        return self.expiry_date is not None


class StudentEntitlement(models.Model):
    """
    Authoritative balance and granted quota record per student and feature.
    Updated atomically using transactions and F() expressions.
    """
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='entitlements')
    subscription = models.ForeignKey(
        Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='entitlements'
    )
    feature = models.CharField(max_length=64, db_index=True)
    total_allowed = models.IntegerField(default=-1, help_text="-1 indicates Unlimited allowance.")
    consumed = models.IntegerField(default=0)
    reserved = models.IntegerField(default=0)
    reset_frequency = models.CharField(max_length=20, default='NEVER')
    last_reset_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'feature')

    @property
    def is_unlimited(self):
        return self.total_allowed == -1

    @property
    def remaining(self):
        if self.is_unlimited:
            return -1
        return max(0, self.total_allowed - (self.consumed + self.reserved))

    def __str__(self):
        rem = 'Unlimited' if self.is_unlimited else f"{self.remaining} left"
        return f"{self.student.username} -> {self.feature} ({rem})"


class UsageLedger(models.Model):
    """
    Append-only auditable ledger of all quota allocations, reservations,
    settlements, releases, and admin adjustments.
    """
    EVENT_CHOICES = (
        ('GRANT', 'Initial / Package Grant'),
        ('RESERVE', 'Attempt Reservation'),
        ('CONSUME', 'Attempt / Feature Consumption'),
        ('RELEASE', 'Reservation Release'),
        ('RESET', 'Quota Reset'),
        ('ADMIN_ADJUST', 'Admin Quota Adjustment'),
        ('REVERSAL', 'Reversal'),
    )

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='usage_ledger_entries')
    subscription = models.ForeignKey(
        Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='usage_entries'
    )
    feature = models.CharField(max_length=64, db_index=True)
    event_type = models.CharField(max_length=32, choices=EVENT_CHOICES)
    amount = models.IntegerField(default=0)
    reference_id = models.CharField(max_length=255, blank=True, db_index=True)
    idempotency_key = models.CharField(max_length=255, blank=True, null=True, unique=True)
    reason = models.TextField(blank=True)
    admin_user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='admin_quota_adjustments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.created_at}] {self.student.username} {self.event_type} {self.amount} ({self.feature})"

class SubscriptionPayment(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )
    
    VERIFICATION_STATUS_CHOICES = (
        ('NOT_VERIFIED', 'Not Verified'),
        ('VERIFICATION_IN_PROGRESS', 'Verification In Progress'),
        ('VERIFIED_CONFIDENT', 'Verified - Confident'),
        ('VERIFIED_UNCERTAIN', 'Verified - Uncertain (Awaiting Manual Review)'),
        ('VERIFICATION_FAILED', 'Verification Failed'),
    )
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscription_payments')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscription_payments')
    subscription = models.OneToOneField(Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment')
    
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT, related_name='subscription_payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=255)
    
    screenshot = models.ImageField(
        upload_to='subscriptions/payment_proofs/',
        validators=[validate_image_size_5mb, validate_image_extension],
        max_length=500,
    )
    note = models.TextField(blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True)
    
    # AI/OCR verification state and results
    verification_status = models.CharField(
        max_length=30,
        choices=VERIFICATION_STATUS_CHOICES,
        default='NOT_VERIFIED',
        help_text='Tracks AI/OCR verification progress and confidence level'
    )
    verification_result = models.JSONField(
        default=dict,
        blank=True,
        help_text='Stores AI/OCR verification metadata: detected_amount, confidence_score, detected_transaction_id, error_message, etc.'
    )
    ai_verification_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when AI verification was performed'
    )
    
    submitted_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_subscription_payments')

    def __str__(self):
        return f"{self.student.username} - {self.plan.name} - {self.status}"


class Invoice(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices')
    payment = models.OneToOneField(SubscriptionPayment, on_delete=models.CASCADE, related_name='invoice')
    receipt_number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.receipt_number


class SubscriptionCourseSelection(models.Model):
    """
    Records exactly which Course(s) a student selected for a
    MULTI/BUNDLE-type SubscriptionPlan.
    Supports both normal customer payments (linked to SubscriptionPayment)
    and admin-granted access (linked directly to Subscription).
    """
    payment = models.ForeignKey(
        SubscriptionPayment,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='course_selections',
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='course_selections',
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='subscription_selections',
    )
    selected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['selected_at']
        constraints = [
            models.UniqueConstraint(
                fields=['payment', 'course'],
                condition=models.Q(payment__isnull=False),
                name='unique_payment_course_selection'
            ),
            models.UniqueConstraint(
                fields=['subscription', 'course'],
                condition=models.Q(subscription__isnull=False),
                name='unique_subscription_course_selection'
            ),
        ]

    def __str__(self):
        user_str = self.subscription.student.username if self.subscription else (self.payment.student.username if self.payment else "Unknown")
        ref_str = f"sub #{self.subscription_id}" if self.subscription_id else f"payment #{self.payment_id}"
        return f"{user_str} → {self.course.title} ({ref_str})"
