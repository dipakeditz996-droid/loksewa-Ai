from django.contrib import admin
from .models import Product, PaymentMethod, PaymentSubmission, Purchase

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'is_free', 'price', 'is_published')
    list_filter = ('category', 'is_free', 'is_published')
    search_fields = ('title', 'target_position')

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
