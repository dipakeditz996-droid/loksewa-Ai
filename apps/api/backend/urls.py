from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from core.views import UserMeView, AdminLoginView, AuthLogoutView, ForgotPasswordView, StudentSignupView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', UserMeView.as_view(), name='auth_me'),
    path('api/auth/signup/', StudentSignupView.as_view(), name='auth_student_signup'),
    path('api/auth/admin-login/', AdminLoginView.as_view(), name='auth_admin_login'),
    path('api/auth/logout/', AuthLogoutView.as_view(), name='auth_logout'),
    path('api/auth/forgot-password/', ForgotPasswordView.as_view(), name='auth_forgot_password'),

    path('api/', include('exams.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/notes/', include('notes.urls')),
    path('api/marketplace/', include('marketplace.urls')),
    path('api/games/', include('games.urls')),
    path('api/study-plan/', include('study_plan.urls')),
    path('api/admin/', include('administration.urls')),
    path('api/tutor/', include('ai_tutor.urls')),
    path('api/support/', include('support.urls')),
    path('api/subscriptions/', include('subscriptions.urls')),
    path('api/gamification/', include('gamification.urls')),
    path('api/', include('courses.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
