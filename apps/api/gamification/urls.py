from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'admin/motivations', views.MotivationAdminViewSet, basename='admin-motivations')

urlpatterns = [
    path('', include(router.urls)),

    path('referrals/validate/', views.validate_referral_code, name='validate-referral'),
    path('referrals/me/', views.student_referral_dashboard, name='student-referral-dashboard'),
    path('referrals/history/', views.student_referral_history, name='student-referral-history'),

    path('settings/referrals/', views.admin_referral_settings, name='admin-referral-settings'),
    path('analytics/referrals/', views.admin_referral_analytics, name='admin-referral-analytics'),
    path('admin/referrals/', views.admin_referrals_list, name='admin-referrals-list'),
    path('admin/referrals/<int:pk>/approve/', views.admin_manual_approve, name='admin-manual-approve'),

    # Both paths registered: legacy + frontend-expected
    path('daily-motivation/', views.daily_motivation, name='daily-motivation'),
    path('motivation/daily/', views.daily_motivation, name='motivation-daily'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
]
