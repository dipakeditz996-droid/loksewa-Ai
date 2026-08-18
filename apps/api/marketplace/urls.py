from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminProductViewSet, AdminPaymentMethodViewSet, AdminPaymentSubmissionViewSet, AdminPurchaseViewSet,
    StudentProductViewSet, StudentPaymentMethodViewSet, StudentPaymentSubmissionViewSet, StudentPurchaseViewSet
)

# Admin routers
admin_router = DefaultRouter()
admin_router.register(r'products', AdminProductViewSet, basename='admin-products')
admin_router.register(r'payment-methods', AdminPaymentMethodViewSet, basename='admin-payment-methods')
admin_router.register(r'payment-submissions', AdminPaymentSubmissionViewSet, basename='admin-payment-submissions')
admin_router.register(r'purchases', AdminPurchaseViewSet, basename='admin-purchases')

# Student routers
student_router = DefaultRouter()
student_router.register(r'products', StudentProductViewSet, basename='student-products')
student_router.register(r'payment-methods', StudentPaymentMethodViewSet, basename='student-payment-methods')
student_router.register(r'payment-submissions', StudentPaymentSubmissionViewSet, basename='student-payment-submissions')
student_router.register(r'purchases', StudentPurchaseViewSet, basename='student-purchases')

urlpatterns = [
    path('admin/', include(admin_router.urls)),
    path('student/', include(student_router.urls)),
]
