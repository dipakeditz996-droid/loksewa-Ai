from django.db import models
from core.models import User
from exams.models import Exam

class Product(models.Model):
    PRODUCT_TYPES = (
        ('PDF', 'PDF'),
        ('STUDY_MATERIAL', 'Study Material'),
        ('QUESTION_COLLECTION', 'Question Collection'),
        ('QUESTION_SET', 'Question Set'),
        ('VIDEO', 'Video'),
        ('COURSE', 'Course'),
        ('BUNDLE', 'Bundle'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField()
    features = models.JSONField(default=list, blank=True, help_text="List of features included")
    category = models.CharField(max_length=50, choices=PRODUCT_TYPES)
    
    target_exam = models.ForeignKey(Exam, on_delete=models.SET_NULL, null=True, blank=True, related_name='marketplace_products')
    target_position = models.CharField(max_length=255, blank=True)
    
    is_free = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    cover_image = models.ImageField(upload_to='marketplace/covers/', null=True, blank=True)
    product_file = models.FileField(upload_to='marketplace/materials/', null=True, blank=True, help_text="Secure digital file to provide after purchase")
    
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    @property
    def final_price(self):
        if self.is_free:
            return 0
        return self.discount_price if self.discount_price is not None else self.price

class PaymentMethod(models.Model):
    METHOD_CHOICES = (
        ('ESEWA', 'eSewa'),
        ('KHALTI', 'Khalti'),
        ('BANK', 'Bank Transfer'),
    )
    
    method_type = models.CharField(max_length=20, choices=METHOD_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    
    account_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=255)
    
    # Specific to bank
    bank_name = models.CharField(max_length=255, blank=True)
    branch = models.CharField(max_length=255, blank=True)
    
    qr_image = models.ImageField(upload_to='marketplace/payment_qrs/', null=True, blank=True)
    instructions = models.TextField(blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.display_name

class PaymentSubmission(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_submissions')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='payment_submissions')
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT, related_name='submissions')
    
    transaction_id = models.CharField(max_length=255, unique=True)
    expected_amount = models.DecimalField(max_digits=10, decimal_places=2)
    submitted_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    screenshot = models.ImageField(upload_to='marketplace/payment_proofs/')
    note = models.TextField(blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True)
    
    submitted_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_payments')

    def __str__(self):
        return f"{self.student.username} - {self.product.title} - {self.status}"

class Purchase(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('REVOKED', 'Revoked'),
    )
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='purchases')
    payment_submission = models.OneToOneField(PaymentSubmission, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase')
    
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'product')

    def __str__(self):
        return f"{self.student.username} bought {self.product.title}"
