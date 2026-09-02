from django.contrib import admin
from .models import (
    Product, ProductImage, PaymentMethod, PaymentSubmission, Purchase,
    Order, OrderItem, OrderStatusHistory, DeliveryAddress, DeliveryFeeRule,
    Cart, CartItem, MarketplaceSettings, MarketplaceListingReport,
)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'category', 'condition', 'price', 'listing_status',
        'is_published', 'seller', 'stock', 'created_at'
    )
    list_filter = ('category', 'listing_status', 'is_published', 'condition')
    search_fields = ('title', 'author', 'isbn', 'seller__username', 'seller__email')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ProductImageInline]
    actions = ['approve_listings', 'reject_listings']

    def approve_listings(self, request, queryset):
        updated = queryset.filter(listing_status='PENDING_REVIEW').update(
            listing_status='ACTIVE', is_published=True
        )
        self.message_user(request, f"{updated} listing(s) approved.")
    approve_listings.short_description = "Approve selected listings"

    def reject_listings(self, request, queryset):
        updated = queryset.filter(listing_status__in=['PENDING_REVIEW', 'ACTIVE']).update(
            listing_status='REJECTED', is_published=False
        )
        self.message_user(request, f"{updated} listing(s) rejected.")
    reject_listings.short_description = "Reject selected listings"


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'method_type', 'is_active', 'account_number')
    list_filter = ('method_type', 'is_active')


@admin.register(PaymentSubmission)
class PaymentSubmissionAdmin(admin.ModelAdmin):
    list_display = ('student', 'product', 'payment_method', 'submitted_amount', 'status', 'submitted_at')
    list_filter = ('status', 'payment_method', 'submitted_at')
    search_fields = ('transaction_id', 'student__username', 'product__title')
    readonly_fields = ('submitted_at', 'verified_at', 'verified_by')


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('student', 'product', 'amount_paid', 'status', 'approved_at')
    list_filter = ('status', 'approved_at')
    search_fields = ('student__username', 'product__title')
    readonly_fields = ('created_at', 'approved_at')


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'price')


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ('previous_status', 'new_status', 'changed_by', 'note', 'created_at')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'status', 'total_amount', 'delivery_fee', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('student__username', 'student__email', 'contact_number')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [OrderItemInline, OrderStatusHistoryInline]


@admin.register(DeliveryAddress)
class DeliveryAddressAdmin(admin.ModelAdmin):
    list_display = ('student', 'full_name', 'district', 'province', 'is_default')
    list_filter = ('province', 'district')
    search_fields = ('student__username', 'full_name', 'phone_number')


@admin.register(DeliveryFeeRule)
class DeliveryFeeRuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'province', 'district', 'municipality', 'fee', 'priority', 'is_active')
    list_filter = ('is_active', 'province')


@admin.register(MarketplaceSettings)
class MarketplaceSettingsAdmin(admin.ModelAdmin):
    list_display = ('platform_commission_percentage', 'max_listing_images', 'allow_student_listings', 'updated_at')
    readonly_fields = ('updated_at',)

    def has_add_permission(self, request):
        # Singleton — disallow adding more than one row
        return not MarketplaceSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(MarketplaceListingReport)
class MarketplaceListingReportAdmin(admin.ModelAdmin):
    list_display = ('listing', 'reporter', 'reason', 'status', 'created_at')
    list_filter = ('status', 'reason')
    search_fields = ('listing__title', 'reporter__username')
    readonly_fields = ('listing', 'reporter', 'reason', 'description', 'created_at', 'updated_at')
