from django.db import models
from core.models import User
from marketplace.models import PaymentMethod
from datetime import timedelta
from django.utils import timezone

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
    )

    BADGE_CHOICES = (
        ('NONE', 'None'),
        ('POPULAR', 'Popular'),
        ('BEST_VALUE', 'Best Value'),
        ('RECOMMENDED', 'Recommended'),
        ('LIMITED_OFFER', 'Limited Offer'),
    )

    name = models.CharField(max_length=255)
    description = models.TextField()
    duration = models.IntegerField()
    duration_unit = models.CharField(max_length=20, choices=DURATION_UNIT_CHOICES, default='DAYS')
    
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Discount percentage")
    
    badge = models.CharField(max_length=20, choices=BADGE_CHOICES, default='NONE')
    
    # Feature access configuration
    features = models.JSONField(default=list, blank=True, help_text="List of string feature keys this plan unlocks")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
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
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    start_date = models.DateTimeField()
    expiry_date = models.DateTimeField()
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.username} - {self.plan.name} ({self.status})"
        
    @property
    def is_active(self):
        return self.status == 'ACTIVE' and self.expiry_date > timezone.now()

class SubscriptionPayment(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscription_payments')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscription_payments')
    subscription = models.OneToOneField(Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment')
    
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT, related_name='subscription_payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=255, unique=True)
    
    screenshot = models.ImageField(upload_to='subscriptions/payment_proofs/')
    note = models.TextField(blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True)
    
    submitted_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_subscription_payments')

    def __str__(self):
        return f"{self.student.username} - {self.plan.name} - {self.status}"

class Notification(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_notifications')
    type = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_id = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"To {self.student.username}: {self.title}"

class Invoice(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices')
    payment = models.OneToOneField(SubscriptionPayment, on_delete=models.CASCADE, related_name='invoice')
    receipt_number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.receipt_number
