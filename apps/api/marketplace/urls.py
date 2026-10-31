from django.urls import path, re_path, include
from rest_framework.routers import DefaultRouter
from .views import (
    # Admin
    AdminProductViewSet,
    AdminPaymentMethodViewSet,
    AdminPaymentSubmissionViewSet,
    AdminPurchaseViewSet,
    AdminOrderViewSet,
    AdminDeliveryFeeRuleViewSet,
    AdminMarketplaceSettingsView,
    AdminListingReportViewSet,
    AdminReviewViewSet,
    AdminDisputeViewSet,
    AdminPayoutViewSet,
    # Admin Courier & NCM Management
    AdminNCMConfigurationView,
    AdminNCMTestConnectionView,
    AdminNCMBranchesView,
    AdminNCMWebhookManagementView,
    AdminCourierOverviewView,
    AdminCourierShipmentViewSet,
    AdminCourierSyncTriggerView,
    AdminCODRemittanceViewSet,
    # Student
    StudentProductViewSet,
    StudentPaymentMethodViewSet,
    StudentPaymentSubmissionViewSet,
    StudentPurchaseViewSet,
    CartViewSet,
    CartItemDetailView,
    OrderViewSet,
    SellerListingViewSet,
    SellerSalesViewSet,
    MarketplacePricingPolicyView,
    StudentDeliveryAddressViewSet,
    StudentListingReportViewSet,
    StudentReviewViewSet,
    StudentDisputeViewSet,
    StudentPayoutAccountViewSet,
    StudentPayoutViewSet,
    # Public
    PublicProductListView,
    # Webhooks
    NCMWebhookView,
)

# Admin routers
admin_router = DefaultRouter()
admin_router.register(r'products', AdminProductViewSet, basename='admin-products')
admin_router.register(r'payment-methods', AdminPaymentMethodViewSet, basename='admin-payment-methods')
admin_router.register(r'payment-submissions', AdminPaymentSubmissionViewSet, basename='admin-payment-submissions')
admin_router.register(r'purchases', AdminPurchaseViewSet, basename='admin-purchases')
admin_router.register(r'orders', AdminOrderViewSet, basename='admin-orders')
admin_router.register(r'delivery-fees', AdminDeliveryFeeRuleViewSet, basename='admin-delivery-fees')
admin_router.register(r'listing-reports', AdminListingReportViewSet, basename='admin-listing-reports')
admin_router.register(r'reviews', AdminReviewViewSet, basename='admin-reviews')
admin_router.register(r'disputes', AdminDisputeViewSet, basename='admin-disputes')
admin_router.register(r'payouts', AdminPayoutViewSet, basename='admin-payouts')
admin_router.register(r'courier/shipments', AdminCourierShipmentViewSet, basename='admin-courier-shipments')
admin_router.register(r'courier/cod-remittance', AdminCODRemittanceViewSet, basename='admin-cod-remittance')

# Student routers
student_router = DefaultRouter()
student_router.register(r'products', StudentProductViewSet, basename='student-products')
student_router.register(r'payment-methods', StudentPaymentMethodViewSet, basename='student-payment-methods')
student_router.register(r'payment-submissions', StudentPaymentSubmissionViewSet, basename='student-payment-submissions')
student_router.register(r'purchases', StudentPurchaseViewSet, basename='student-purchases')
student_router.register(r'cart', CartViewSet, basename='student-cart')
student_router.register(r'delivery-addresses', StudentDeliveryAddressViewSet, basename='student-delivery-addresses')
student_router.register(r'orders', OrderViewSet, basename='student-orders')
student_router.register(r'my-listings', SellerListingViewSet, basename='student-listings')
student_router.register(r'my-sales', SellerSalesViewSet, basename='student-sales')
student_router.register(r'listing-reports', StudentListingReportViewSet, basename='student-listing-reports')
student_router.register(r'reviews', StudentReviewViewSet, basename='student-reviews')
student_router.register(r'disputes', StudentDisputeViewSet, basename='student-disputes')
student_router.register(r'payout-accounts', StudentPayoutAccountViewSet, basename='student-payout-accounts')
student_router.register(r'payouts', StudentPayoutViewSet, basename='student-payouts')

urlpatterns = [
    path('public/products/', PublicProductListView.as_view(), name='public-products'),
    path('webhooks/ncm/', NCMWebhookView.as_view(), name='ncm-webhook'),
    path('admin/settings/', AdminMarketplaceSettingsView.as_view(), name='admin-marketplace-settings'),
    re_path(r'^admin/courier/settings/?$', AdminNCMConfigurationView.as_view(), name='admin-ncm-configuration'),
    re_path(r'^admin/courier/test-connection/?$', AdminNCMTestConnectionView.as_view(), name='admin-ncm-test-connection'),
    re_path(r'^admin/courier/branches/?$', AdminNCMBranchesView.as_view(), name='admin-ncm-branches'),
    re_path(r'^admin/courier/webhook-management/?$', AdminNCMWebhookManagementView.as_view(), name='admin-ncm-webhook-management'),
    re_path(r'^admin/courier/overview/?$', AdminCourierOverviewView.as_view(), name='admin-courier-overview'),
    re_path(r'^admin/courier/sync/?$', AdminCourierSyncTriggerView.as_view(), name='admin-courier-sync-trigger'),
    path('admin/', include(admin_router.urls)),
    path('student/cart/items/<int:pk>/', CartItemDetailView.as_view(), name='student-cart-item-detail'),
    path('student/pricing-policy/', MarketplacePricingPolicyView.as_view(), name='student-pricing-policy'),
    path('student/delivery-addresses/profile-address/', StudentDeliveryAddressViewSet.as_view({'get': 'profile_address'}), name='student-profile-address-direct'),
    path('student/', include(student_router.urls)),
]
