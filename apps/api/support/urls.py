from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StudentProfileView, ProfilePhotoView, ChangePasswordView,
    NotificationPreferenceView,
    SupportTicketViewSet, FAQViewSet, HelpCategoryView,
    AccountDeactivateView, AccountDeleteView,
)

router = DefaultRouter()
router.register(r'support/tickets', SupportTicketViewSet, basename='support-ticket')
router.register(r'help/faqs', FAQViewSet, basename='faq')

urlpatterns = [
    # Profile
    path('profile/', StudentProfileView.as_view(), name='student-profile'),
    path('profile/photo/', ProfilePhotoView.as_view(), name='student-profile-photo'),

    # Security
    path('password/', ChangePasswordView.as_view(), name='student-password'),

    # Notifications
    path('notifications/', NotificationPreferenceView.as_view(), name='student-notifications'),

    # Help
    path('help/categories/', HelpCategoryView.as_view(), name='help-categories'),

    # Account management
    path('account/deactivate/', AccountDeactivateView.as_view(), name='account-deactivate'),
    path('account/delete/', AccountDeleteView.as_view(), name='account-delete'),

    # Router-based
    path('', include(router.urls)),
]
