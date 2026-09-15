# pyrefly: ignore [missing-import]
from decimal import Decimal
from rest_framework import serializers
from .models import (
    Product, PaymentMethod, PaymentSubmission, Purchase, ProductImage,
    Cart, CartItem, Order, OrderItem, DeliveryAddress, DeliveryFeeRule,
    OrderStatusHistory, MarketplaceSettings, MarketplaceListingReport,
    Review, Dispute, DisputeEvidence, PayoutAccount, SellerPayout,
)
from core.models import User
from exams.models import Exam


class DeliveryAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryAddress
        fields = '__all__'
        read_only_fields = ('student', 'created_at', 'updated_at')


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('id', 'product', 'image', 'label', 'is_primary', 'created_at')
        read_only_fields = ('created_at',)


class SafeSellerSerializer(serializers.ModelSerializer):
    """Public-safe seller info: never exposes email, phone, address."""
    member_since = serializers.SerializerMethodField()
    average_rating = serializers.FloatField(read_only=True, required=False)
    total_reviews = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'first_name', 'member_since', 'average_rating', 'total_reviews')

    def get_member_since(self, obj):
        return obj.date_joined.strftime('%b %Y') if obj.date_joined else None


class ProductSerializer(serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True, default='')
    final_price = serializers.ReadOnlyField()
    is_seller_listing = serializers.ReadOnlyField()
    images = ProductImageSerializer(many=True, read_only=True)
    seller_details = serializers.SerializerMethodField()
    condition_display = serializers.SerializerMethodField()
    category_display = serializers.SerializerMethodField()
    listing_status_display = serializers.SerializerMethodField()
    average_rating = serializers.FloatField(read_only=True, required=False)
    total_reviews = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Product
        exclude = ()
        read_only_fields = ('created_at', 'updated_at')

    def get_seller_details(self, obj):
        if obj.seller:
            return {
                'id': obj.seller.id,
                'first_name': obj.seller.first_name,
                'member_since': obj.seller.date_joined.strftime('%b %Y') if obj.seller.date_joined else None,
            }
        return None

    def get_condition_display(self, obj):
        return obj.get_condition_display() if obj.condition else None

    def get_category_display(self, obj):
        return obj.get_category_display()

    def get_listing_status_display(self, obj):
        return obj.get_listing_status_display()


class SellerListingSerializer(serializers.ModelSerializer):
    """
    Serializer for student sellers — strips fields that only admins/platform
    should control (is_published, listing_status, seller, rejection_reason).
    Images are handled separately via the view.

    Pricing rule (client requirement): a used book's asking price
    (`price`) must not exceed `max_used_book_price_percent` (default 65%,
    admin-configurable via MarketplaceSettings) of its `marked_price` (the
    price printed on the book). This is the authoritative check - the
    frontend's live calculator is a convenience, not the enforcement point,
    so a direct API call can't bypass it.
    """
    description = serializers.CharField(required=False, allow_blank=True, default='')
    final_price = serializers.ReadOnlyField()
    is_seller_listing = serializers.ReadOnlyField()
    images = ProductImageSerializer(many=True, read_only=True)
    seller_details = serializers.SerializerMethodField()
    condition_display = serializers.SerializerMethodField()
    listing_status_display = serializers.SerializerMethodField()

    # Both re-declared as required + > 0: the model allows price=0/marked_price=null
    # for other product flows (e.g. admin-entered platform stock), but a
    # student listing must always state both to make the 65% rule meaningful.
    marked_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=True,
        min_value=Decimal('0.01'),
        error_messages={'min_value': 'Marked price must be greater than 0.'},
    )
    price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=True,
        min_value=Decimal('0.01'),
        error_messages={'min_value': 'Offer price must be greater than 0.'},
    )

    class Meta:
        model = Product
        exclude = ()
        read_only_fields = (
            'seller', 'is_published', 'listing_status', 'rejection_reason',
            'created_at', 'updated_at',
        )

    def validate(self, data):
        # On PATCH, a field not included in this request falls back to the
        # existing instance value so partial updates still get checked
        # against the real current pair, not a missing one.
        marked_price = data.get('marked_price', getattr(self.instance, 'marked_price', None))
        price = data.get('price', getattr(self.instance, 'price', None))

        if marked_price is not None and price is not None:
            # Same str()-roundtrip as OrderViewSet's commission calculation
            # (marketplace/views.py) - MarketplaceSettings fields can come
            # back as a plain float (e.g. right after get_or_create() applies
            # the model's Python-level default, before any DB round-trip
            # coerces it), and Decimal * float raises TypeError.
            max_percent = Decimal(str(MarketplaceSettings.get_settings().max_used_book_price_percent))
            max_allowed = (marked_price * max_percent / Decimal('100')).quantize(Decimal('0.01'))
            if price > max_allowed:
                raise serializers.ValidationError({
                    'price': [
                        f"Offer price cannot exceed {max_percent.normalize()}% of the marked price "
                        f"(maximum allowed: Rs. {max_allowed})."
                    ]
                })
        return data

    def get_seller_details(self, obj):
        if obj.seller:
            return {
                'id': obj.seller.id,
                'first_name': obj.seller.first_name,
                'member_since': obj.seller.date_joined.strftime('%b %Y') if obj.seller.date_joined else None,
            }
        return None

    def get_condition_display(self, obj):
        return obj.get_condition_display() if obj.condition else None

    def get_listing_status_display(self, obj):
        return obj.get_listing_status_display()


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = '__all__'
        read_only_fields = ('updated_at',)


class StudentBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class PaymentSubmissionSerializer(serializers.ModelSerializer):
    student_details = StudentBasicSerializer(source='student', read_only=True)
    product_details = ProductSerializer(source='product', read_only=True)
    payment_method_details = PaymentMethodSerializer(source='payment_method', read_only=True)

    class Meta:
        model = PaymentSubmission
        fields = '__all__'
        read_only_fields = (
            'student', 'status', 'rejection_reason', 'submitted_at', 'verified_at',
            'verified_by', 'expected_amount', 'submitted_amount',
        )

    def validate_transaction_id(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Transaction ID cannot be empty.")
        if len(value) > 255:
            raise serializers.ValidationError("Transaction ID is too long.")
        return value


class PaymentSubmissionAdminReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentSubmission
        fields = ['status', 'rejection_reason']


class PurchaseSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)
    payment_submission_details = PaymentSubmissionSerializer(source='payment_submission', read_only=True)

    class Meta:
        model = Purchase
        fields = '__all__'
        read_only_fields = ('student', 'created_at', 'approved_at', 'status', 'amount_paid')


class CartItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = CartItem
        fields = '__all__'
        read_only_fields = ('cart', 'created_at', 'updated_at')


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = '__all__'
        read_only_fields = ('student', 'created_at', 'updated_at')


class OrderItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = OrderItem
        fields = '__all__'
        read_only_fields = ('order',)


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = '__all__'

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.username
        return "System"


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    delivery_address_details = DeliveryAddressSerializer(source='delivery_address_ref', read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ('student', 'total_amount', 'delivery_fee', 'status', 'created_at', 'updated_at')


class DeliveryFeeRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryFeeRule
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


# ---------------------------------------------------------------------------
# S2S: Seller sales view — a safe view of orders containing seller's products
# ---------------------------------------------------------------------------

class SellerOrderItemSerializer(serializers.ModelSerializer):
    """Order item serializer for the seller's sales view — only exposes
    the seller's own product; does NOT expose other order items."""
    product_details = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            'id', 'product', 'product_details', 'quantity', 'price',
            'commission_amount', 'seller_earning', 
            'fulfillment_status', 'payout_status', 'snapshot_product_name'
        )

    def get_product_details(self, obj):
        return {
            'id': obj.product.id,
            'title': obj.product.title,
            'cover_image': (
                self.context['request'].build_absolute_uri(obj.product.cover_image.url)
                if obj.product.cover_image else None
            ),
        }


class SellerSaleSerializer(serializers.ModelSerializer):
    """Order summary for the seller dashboard — hides buyer private data."""
    my_items = serializers.SerializerMethodField()
    buyer_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            'id', 'status', 'total_amount', 'delivery_fee',
            'my_items', 'buyer_display', 'created_at', 'updated_at',
        )

    def get_my_items(self, obj):
        # Filtering in Python off the prefetched obj.items.all() cache -
        # obj.items.filter(...) would build a new queryset that bypasses the
        # view's prefetch_related('items__product'), re-querying once per
        # order row in a seller's sales list.
        seller = self.context['request'].user
        my_items = [item for item in obj.items.all() if item.product.seller_id == seller.id]
        return SellerOrderItemSerializer(my_items, many=True, context=self.context).data

    def get_buyer_display(self, obj):
        # We expose the shipping address to the seller so they can fulfill the order,
        # but we strictly DO NOT expose email, user ID, or other private profile data.
        return {
            "name": obj.student.first_name or "Buyer",
            "shipping_address": obj.shipping_address
        }


# ---------------------------------------------------------------------------
# Marketplace Settings
# ---------------------------------------------------------------------------

class MarketplaceSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketplaceSettings
        fields = '__all__'
        read_only_fields = ('updated_at',)


class MarketplacePricingPolicySerializer(serializers.ModelSerializer):
    """
    Read-only, student-facing subset of MarketplaceSettings - just the two
    fields a seller needs to price a used-book listing honestly: the real
    configured commission rate and the real 65%-style price cap. Deliberately
    excludes admin-only settings (allow_student_listings, minimum_payout_amount,
    etc.) that AdminMarketplaceSettingsView exposes.
    """
    class Meta:
        model = MarketplaceSettings
        fields = ('platform_commission_percentage', 'max_used_book_price_percent')


# ---------------------------------------------------------------------------
# Listing Report
# ---------------------------------------------------------------------------

class MarketplaceListingReportSerializer(serializers.ModelSerializer):
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = MarketplaceListingReport
        fields = '__all__'
        read_only_fields = (
            'reporter', 'status', 'admin_response', 'created_at', 'updated_at',
            'resolved_at', 'resolved_by',
        )


# ---------------------------------------------------------------------------
# Trust & Safety
# ---------------------------------------------------------------------------

class ReviewSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source='buyer.first_name', read_only=True)

    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ('buyer', 'seller', 'product', 'status', 'created_at', 'updated_at')


class DisputeEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DisputeEvidence
        fields = '__all__'
        read_only_fields = ('uploaded_by', 'created_at')


class DisputeSerializer(serializers.ModelSerializer):
    evidence = DisputeEvidenceSerializer(many=True, read_only=True)
    product_title = serializers.CharField(source='order_item.product.title', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Dispute
        fields = '__all__'
        read_only_fields = (
            'buyer', 'seller', 'status', 'resolution', 'admin_notes', 
            'resolved_by', 'resolved_at', 'created_at', 'updated_at'
        )


# ---------------------------------------------------------------------------
# Payouts
# ---------------------------------------------------------------------------

class PayoutAccountSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source='get_method_display', read_only=True)

    class Meta:
        model = PayoutAccount
        fields = '__all__'
        read_only_fields = ('seller', 'is_verified', 'created_at', 'updated_at')


class SellerPayoutSerializer(serializers.ModelSerializer):
    payout_account_details = PayoutAccountSerializer(source='payout_account', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SellerPayout
        fields = '__all__'
        read_only_fields = (
            'seller', 'status', 'admin_note', 'rejection_reason', 
            'transaction_reference', 'processed_by', 'processed_at', 
            'created_at', 'updated_at'
        )

class AdminSellerPayoutSerializer(SellerPayoutSerializer):
    seller_name = serializers.CharField(source='seller.get_full_name', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.get_full_name', read_only=True)


class SellerBalanceSerializer(serializers.Serializer):
    total_earnings = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_payouts = serializers.DecimalField(max_digits=10, decimal_places=2)
    paid_out = serializers.DecimalField(max_digits=10, decimal_places=2)
    available_balance = serializers.DecimalField(max_digits=10, decimal_places=2)
    minimum_payout_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
