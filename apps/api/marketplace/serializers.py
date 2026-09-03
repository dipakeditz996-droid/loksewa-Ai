# pyrefly: ignore [missing-import]
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
    """
    final_price = serializers.ReadOnlyField()
    is_seller_listing = serializers.ReadOnlyField()
    images = ProductImageSerializer(many=True, read_only=True)
    seller_details = serializers.SerializerMethodField()
    condition_display = serializers.SerializerMethodField()
    listing_status_display = serializers.SerializerMethodField()

    class Meta:
        model = Product
        exclude = ()
        read_only_fields = (
            'seller', 'is_published', 'listing_status', 'rejection_reason',
            'created_at', 'updated_at',
        )

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
        seller = self.context['request'].user
        my_items = obj.items.filter(product__seller=seller)
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
