# pyrefly: ignore [missing-import]
from django.db import models
# pyrefly: ignore [missing-import]
from django.core.validators import MinValueValidator, MaxValueValidator
from core.models import User
from exams.models import Exam
from core.upload_validators import validate_image_size_5mb, validate_image_extension


class Product(models.Model):
    PRODUCT_TYPES = (
        ('NEW_BOOK', 'New Book'),
        ('USED_BOOK', 'Used Book'),
        ('REFERENCE_BOOK', 'Reference Book'),
        ('GUIDE_BOOK', 'Guide Book'),
        ('GENERAL_KNOWLEDGE', 'General Knowledge'),
        ('CONSTITUTION_LAW', 'Constitution / Law'),
        ('CURRENT_AFFAIRS', 'Current Affairs'),
        ('STATIONERY', 'Stationery'),
    )

    CONDITION_CHOICES = (
        ('NEW', 'New'),
        ('LIKE_NEW', 'Like New'),
        ('VERY_GOOD', 'Very Good'),
        ('GOOD', 'Good'),
        ('FAIR', 'Fair'),
        ('ACCEPTABLE', 'Acceptable'),
    )

    LISTING_STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('PENDING_REVIEW', 'Pending Review'),
        ('ACTIVE', 'Active'),
        ('REJECTED', 'Rejected'),
        ('SOLD', 'Sold'),
        ('SUSPENDED', 'Suspended'),
        ('ARCHIVED', 'Archived'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField()
    features = models.JSONField(default=list, blank=True, help_text="List of features included")
    category = models.CharField(max_length=50, choices=PRODUCT_TYPES)

    # Physical / Used Book fields
    seller = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='marketplace_listings'
    )
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, null=True, blank=True)
    # Detailed physical condition notes (S2S used books)
    condition_details = models.JSONField(
        default=dict, blank=True,
        help_text=(
            "Structured physical condition info. Keys: highlighting (bool), "
            "writing_notes (bool), page_damage (bool), cover_condition (str), "
            "missing_pages (bool), water_damage (bool), binding_condition (str), extra_notes (str)"
        )
    )
    stock = models.IntegerField(default=1)
    listing_status = models.CharField(
        max_length=20, choices=LISTING_STATUS_CHOICES, default='PENDING_REVIEW'
    )
    negotiable = models.BooleanField(default=False)
    location = models.CharField(max_length=255, blank=True)
    author = models.CharField(max_length=255, blank=True)
    publisher = models.CharField(max_length=255, blank=True)
    isbn = models.CharField(max_length=20, blank=True)
    edition = models.CharField(max_length=50, blank=True)
    publication_year = models.CharField(max_length=4, blank=True)
    brand = models.CharField(max_length=255, blank=True)

    target_exam = models.ForeignKey(
        Exam, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='marketplace_products'
    )
    target_position = models.CharField(max_length=255, blank=True)

    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    cover_image = models.ImageField(
        upload_to='marketplace/covers/', null=True, blank=True,
        validators=[validate_image_size_5mb, validate_image_extension],
    )

    is_published = models.BooleanField(default=False)

    # Admin → seller communication on rejection
    rejection_reason = models.TextField(
        blank=True,
        help_text="Admin-written reason shown to the seller when a listing is rejected."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    @property
    def final_price(self):
        return self.discount_price if self.discount_price is not None else self.price

    @property
    def is_seller_listing(self):
        """True when this product was listed by a student seller (not platform stock)."""
        return self.seller is not None


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

    qr_image = models.ImageField(
        upload_to='marketplace/payment_qrs/', null=True, blank=True,
        validators=[validate_image_size_5mb, validate_image_extension],
    )
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
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payment_submissions'
    )
    order = models.ForeignKey(
        'Order', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payment_submissions'
    )
    payment_method = models.ForeignKey(
        PaymentMethod, on_delete=models.PROTECT, related_name='submissions'
    )

    transaction_id = models.CharField(max_length=255, unique=True)
    expected_amount = models.DecimalField(max_digits=10, decimal_places=2)
    submitted_amount = models.DecimalField(max_digits=10, decimal_places=2)

    screenshot = models.ImageField(
        upload_to='marketplace/payment_proofs/',
        validators=[validate_image_size_5mb, validate_image_extension],
    )
    note = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True)

    submitted_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='verified_payments'
    )

    def __str__(self):
        ref = self.product.title if self.product else f"Order #{self.order_id}"
        return f"{self.student.username} - {ref} - {self.status}"


class Purchase(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('REVOKED', 'Revoked'),
    )

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='purchases')
    payment_submission = models.OneToOneField(
        PaymentSubmission, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase'
    )

    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'product')

    def __str__(self):
        return f"{self.student.username} bought {self.product.title}"


class ProductImage(models.Model):
    IMAGE_LABEL_CHOICES = (
        ('front_cover', 'Front Cover'),
        ('back_cover', 'Back Cover'),
        ('spine', 'Spine'),
        ('inside_pages', 'Inside Pages'),
        ('damage', 'Visible Damage'),
        ('other', 'Other'),
    )

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(
        upload_to='marketplace/product_images/',
        validators=[validate_image_size_5mb, validate_image_extension],
    )
    label = models.CharField(
        max_length=20, choices=IMAGE_LABEL_CHOICES, default='other', blank=True
    )
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_label_display()} for {self.product.title}"


class DeliveryAddress(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='delivery_addresses')
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    province = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    municipality = models.CharField(max_length=100)
    ward_number = models.CharField(max_length=10)
    tole_area = models.CharField(max_length=255)
    street_landmark = models.CharField(max_length=255, blank=True)
    delivery_note = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.full_name} - {self.district}, {self.province}"


class Cart(models.Model):
    student = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart of {self.student.username}"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.quantity} x {self.product.title} in {self.cart.student.username}'s cart"


class Order(models.Model):
    STATUS_CHOICES = (
        ('PENDING_PAYMENT', 'Pending Payment'),
        ('PAYMENT_SUBMITTED', 'Payment Submitted'),
        ('PAYMENT_VERIFICATION', 'Payment Verification'),
        ('CONFIRMED', 'Confirmed'),
        ('PROCESSING', 'Processing'),
        ('SHIPPED', 'Shipped'),
        ('OUT_FOR_DELIVERY', 'Out for Delivery'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
        ('REFUNDED', 'Refunded'),
    )

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='marketplace_orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING_PAYMENT')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # Store a snapshot of the shipping address as text
    shipping_address = models.TextField(blank=True)
    contact_number = models.CharField(max_length=20, blank=True)

    delivery_address_ref = models.ForeignKey(
        DeliveryAddress, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='orders'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} by {self.student.username} - {self.status}"


class OrderItem(models.Model):
    FULFILLMENT_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    )

    PAYOUT_CHOICES = (
        ('PENDING', 'Pending'),
        ('ON_HOLD', 'On Hold'),
        ('ELIGIBLE', 'Eligible'),
        ('PROCESSING', 'Processing'),
        ('PAID', 'Paid'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Price at the time of purchase")

    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    seller_earning = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    fulfillment_status = models.CharField(max_length=20, choices=FULFILLMENT_CHOICES, default='PENDING')
    payout_status = models.CharField(max_length=20, choices=PAYOUT_CHOICES, default='PENDING')
    
    snapshot_product_name = models.CharField(max_length=255, blank=True)
    snapshot_seller_name = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.quantity} x {self.product.title} (Order #{self.order.id})"


class DeliveryFeeRule(models.Model):
    name = models.CharField(max_length=255, help_text="E.g., Global Default, Kathmandu Valley")
    province = models.CharField(max_length=100, blank=True, help_text="Leave blank for global rule")
    district = models.CharField(max_length=100, blank=True, help_text="Leave blank to apply to entire province")
    municipality = models.CharField(max_length=100, blank=True, help_text="Leave blank to apply to entire district")

    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=0, help_text="Higher priority rules override lower ones if both match")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', '-created_at']

    def __str__(self):
        return f"{self.name} - Rs. {self.fee}"


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    previous_status = models.CharField(max_length=50, blank=True)
    new_status = models.CharField(max_length=50)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.order.id} status changed to {self.new_status}"


# ---------------------------------------------------------------------------
# S2S Marketplace Extensions
# ---------------------------------------------------------------------------

class MarketplaceSettings(models.Model):
    """Singleton table for platform-wide marketplace configuration."""

    platform_commission_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=5.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Platform fee deducted from seller earnings (%). 0 = no fee."
    )
    max_listing_images = models.PositiveIntegerField(
        default=6,
        help_text="Maximum number of images a seller can upload per listing."
    )
    allow_student_listings = models.BooleanField(
        default=True,
        help_text="When off, students cannot create new listings (existing ones unaffected)."
    )
    minimum_payout_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=500.00,
        help_text="Minimum available balance required to request a payout."
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Marketplace Settings"
        verbose_name_plural = "Marketplace Settings"

    def __str__(self):
        return "Marketplace Settings"

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class MarketplaceListingReport(models.Model):
    """A student's report/flag against a published listing."""

    REASON_CHOICES = (
        ('fake_book', 'Fake or Incorrect Book'),
        ('wrong_condition', 'Condition Does Not Match Description'),
        ('misleading_images', 'Misleading Images'),
        ('wrong_price', 'Wrong or Manipulated Price'),
        ('spam', 'Spam or Duplicate Listing'),
        ('prohibited', 'Prohibited Item'),
        ('other', 'Other'),
    )

    STATUS_CHOICES = (
        ('PENDING', 'Pending Review'),
        ('REVIEWED', 'Reviewed'),
        ('DISMISSED', 'Dismissed'),
    )

    listing = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='reports'
    )
    reporter = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='listing_reports'
    )
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    description = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    admin_response = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_reports')

    class Meta:
        # One reporter can only submit one report per listing
        unique_together = ('listing', 'reporter')
        ordering = ['-created_at']

    def __str__(self):
        return f"Report on '{self.listing.title}' by {self.reporter.username} — {self.status}"


class Review(models.Model):
    STATUS_CHOICES = (
        ('PUBLISHED', 'Published'),
        ('HIDDEN', 'Hidden'),
        ('FLAGGED', 'Flagged'),
    )

    order_item = models.OneToOneField(OrderItem, on_delete=models.CASCADE, related_name='review')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
    
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    review_text = models.TextField(blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PUBLISHED')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.rating} star by {self.buyer.username} for {self.product.title}"


class Dispute(models.Model):
    STATUS_CHOICES = (
        ('OPEN', 'Open'),
        ('UNDER_REVIEW', 'Under Review'),
        ('RESOLVED', 'Resolved'),
        ('REJECTED', 'Rejected'),
    )

    REASON_CHOICES = (
        ('not_arrived', 'Book never arrived'),
        ('different', 'Significantly different from description'),
        ('damaged', 'Damaged book'),
        ('missing_pages', 'Missing pages'),
        ('wrong_item', 'Wrong book received'),
        ('delivery_issue', 'Delivery problem'),
        ('other', 'Other'),
    )

    order_item = models.OneToOneField(OrderItem, on_delete=models.CASCADE, related_name='dispute')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='disputes_raised')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='disputes_received')
    
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    description = models.TextField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    resolution = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_disputes')
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Dispute #{self.id} for OrderItem #{self.order_item.id}"


class DisputeEvidence(models.Model):
    dispute = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name='evidence')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ImageField(
        upload_to='marketplace/dispute_evidence/',
        validators=[validate_image_size_5mb, validate_image_extension],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Evidence for Dispute #{self.dispute.id}"


# ---------------------------------------------------------------------------
# S2S Payouts
# ---------------------------------------------------------------------------

class PayoutAccount(models.Model):
    METHOD_CHOICES = (
        ('ESEWA', 'eSewa'),
        ('KHALTI', 'Khalti'),
        ('BANK', 'Bank Transfer'),
    )

    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payout_accounts')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    account_name = models.CharField(max_length=255)
    account_identifier = models.CharField(max_length=255, help_text="eSewa ID, Khalti ID, or Bank Account Number")
    
    # Specific to bank
    bank_name = models.CharField(max_length=255, blank=True)
    branch = models.CharField(max_length=255, blank=True)

    is_verified = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_method_display()} - {self.account_identifier} ({self.seller.username})"


class SellerPayout(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('PROCESSING', 'Processing'),
        ('PAID', 'Paid'),
        ('REJECTED', 'Rejected'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    )

    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payouts')
    payout_account = models.ForeignKey(PayoutAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='payouts')
    requested_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    admin_note = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    transaction_reference = models.CharField(max_length=255, blank=True)
    
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_payouts')
    processed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payout #{self.id} for {self.seller.username} - {self.status}"
