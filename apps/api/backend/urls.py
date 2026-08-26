from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from core.serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

from core.views import UserMeView, AdminLoginView, AuthLogoutView, ForgotPasswordView, StudentSignupView, StudentDashboardView, SocialLoginView
from core.teacher_views import (
    TeacherProfileView,
    TeacherAvatarUploadView,
    TeacherChangePasswordView,
    TeacherPreferencesView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', UserMeView.as_view(), name='auth_me'),
    path('api/auth/signup/', StudentSignupView.as_view(), name='auth_student_signup'),
    path('api/auth/social/', SocialLoginView.as_view(), name='auth_social_login'),
    path('api/auth/admin-login/', AdminLoginView.as_view(), name='auth_admin_login'),
    path('api/auth/logout/', AuthLogoutView.as_view(), name='auth_logout'),
    path('api/auth/forgot-password/', ForgotPasswordView.as_view(), name='auth_forgot_password'),
    path('api/dashboard/', StudentDashboardView.as_view(), name='student_dashboard'),

    # Teacher self-service settings
    path('api/auth/teacher/profile/', TeacherProfileView.as_view(), name='teacher_profile'),
    path('api/auth/teacher/avatar/', TeacherAvatarUploadView.as_view(), name='teacher_avatar'),
    path('api/auth/teacher/change-password/', TeacherChangePasswordView.as_view(), name='teacher_change_password'),
    path('api/auth/teacher/preferences/', TeacherPreferencesView.as_view(), name='teacher_preferences'),

    path('api/', include('exams.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/notes/', include('notes.urls')),
    path('api/marketplace/', include('marketplace.urls')),
    path('api/games/', include('games.urls')),
    path('api/study-plan/', include('study_plan.urls')),
    path('api/admin/', include('administration.urls')),
    path('api/tutor/', include('ai_tutor.urls')),
    path('api/support/', include('support.urls')),
    path('api/student/', include('support.student_urls')),
    path('api/subscriptions/', include('subscriptions.urls')),
    path('api/gamification/', include('gamification.urls')),
    path('api/', include('courses.urls')),
    path('api/notifications/', include('core.notification_urls')),
    path('api/', include('subscriptions.public_urls')),
    path('api/', include('analytics.public_urls')),
    path('api/', include('core.public_urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
