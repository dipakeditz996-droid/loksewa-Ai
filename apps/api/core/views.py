import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.contrib.auth import authenticate
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from django.contrib.auth.models import update_last_login
from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from datetime import timedelta
from .models import User

logger = logging.getLogger(__name__)


def _access_token_for(user):
    """Mints an access token whose lifetime comes from
    AdminSettings.session_timeout_minutes (Admin Settings > Security),
    for the views here that mint tokens manually instead of going through
    CustomTokenObtainPairSerializer."""
    from .models import AdminSettings
    minutes = AdminSettings.get_settings().session_timeout_minutes
    access = AccessToken.for_user(user)
    access.set_exp(lifetime=timedelta(minutes=minutes))
    return str(access)

class StudentSignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        referral_code = request.data.get('ref', '').strip()
        plan_id = request.data.get('plan_id')
        course_id = request.data.get('course_id')

        if not username or not email or not password:
            return Response({'error': 'Please provide username, email, and password.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            django_validate_password(password)
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        # Validate Referral Code BEFORE creating user
        if referral_code:
            from gamification.models import GamificationProfile
            if not GamificationProfile.objects.filter(referral_code=referral_code).exists():
                return Response({'error': 'Invalid referral code.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                user = User.objects.create_user(username=username, email=email, password=password, role='student')
                
                # Explicitly create required related profiles
                from support.models import StudentProfile, NotificationPreference
                StudentProfile.objects.create(user=user)
                NotificationPreference.objects.create(user=user)

                # Register Referral and gamification profile
                if referral_code:
                    from gamification.services import register_referral
                    register_referral(user, referral_code)
                else:
                    from gamification.models import GamificationProfile
                    GamificationProfile.objects.create(user=user)

                from core.notification_service import NotificationService
                NotificationService.notify_admins(
                    notif_type='new_registration',
                    title='New Student Registered',
                    message=f"{username} ({email}) just created a new student account.",
                    action_url='/admin-dashboard/students',
                )

                # Process Course/Package Application if plan_id or course_id is provided.
                if plan_id or course_id:
                    payment = None
                    if plan_id:
                        from subscriptions.models import SubscriptionPlan, SubscriptionPayment
                        from marketplace.models import PaymentMethod
                        
                        plan = SubscriptionPlan.objects.get(id=plan_id)
                        payment_method, _ = PaymentMethod.objects.get_or_create(
                            method_type='ESEWA',
                            defaults={
                                'display_name': 'eSewa',
                                'account_name': 'LoksewaAI Default',
                                'account_number': '0000000000',
                                'is_active': True,
                            }
                        )
                        
                        import uuid
                        payment = SubscriptionPayment.objects.create(
                            student=user,
                            plan=plan,
                            payment_method=payment_method,
                            amount=plan.price,
                            transaction_id=str(uuid.uuid4())[:20],
                            status='PENDING',
                            note='Auto-generated from registration.'
                        )
                    
                    if course_id:
                        from courses.models import Course, CourseApplication
                        course = Course.objects.get(id=course_id)
                        CourseApplication.objects.create(
                            student=user,
                            course=course,
                            subscription_payment=payment,
                            status='pending'
                        )

                        from core.notification_service import NotificationService
                        NotificationService.notify_admins(
                            notif_type='course_application',
                            title='New Course Application',
                            message=f"New student {username} applied for '{course.title}' during registration.",
                            action_url='/admin-dashboard/applications',
                        )
        except Exception as e:
            logger.exception("Failed to process registration for email=%s", email)
            return Response({'error': 'Registration failed due to an internal error. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': _access_token_for(user),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
            }
        }, status=status.HTTP_201_CREATED)


class UserMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'email': user.email,
            'role': user.role,
            'is_active': user.is_active,
            'avatar': user.avatar,
        })


class AdminLoginView(APIView):
    """
    Admin-specific login endpoint.
    Validates credentials AND verifies the user has an admin role.
    Returns JWT tokens only for admin/super-admin users.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response(
                {'detail': 'Please provide both username/email and password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .account_lockout import (
            find_user_by_username_or_email, is_locked, lockout_remaining_minutes,
            record_failed_attempt, record_successful_login,
        )

        looked_up_user = find_user_by_username_or_email(username)
        if is_locked(looked_up_user):
            return Response(
                {'detail': f'Too many failed attempts. Try again in {lockout_remaining_minutes(looked_up_user)} minute(s).'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Allow login by email or username
        user = authenticate(request, username=username, password=password)

        # If authentication by username failed, try by email
        if user is None:
            from core.models import User
            try:
                email_user = User.objects.get(email=username)
                user = authenticate(request, username=email_user.username, password=password)
            except User.DoesNotExist:
                pass

        if user is None:
            if looked_up_user:
                record_failed_attempt(looked_up_user)
            return Response(
                {'detail': 'Invalid credentials. Please check your username/email and password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        record_successful_login(user)

        if not user.is_active:
            return Response(
                {'detail': 'This account has been deactivated. Please contact support.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if user.role not in ('admin', 'super-admin'):
            return Response(
                {'detail': 'This login is restricted to administrators only.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        from .models import AdminSettings
        if AdminSettings.get_settings().enable_two_factor_auth and user.is_2fa_enabled:
            from .two_factor_views import TwoFactorPendingToken
            pending = TwoFactorPendingToken.for_user(user)
            return Response({
                'twoFactorRequired': True,
                'pendingToken': str(pending),
            })

        # Generate JWT tokens
        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': _access_token_for(user),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email,
                'role': user.role,
            }
        })


class AuthLogoutView(APIView):
    """
    Logout endpoint — blacklists the refresh token so it cannot be reused.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass  # Token may already be invalid/blacklisted
        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    """
    Stub endpoint for forgot password.
    Accepts an email but returns a "not configured" message until
    an email service is set up.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response(
                {'detail': 'Please provide your email address.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({
            'detail': 'Password reset is not yet configured. Please contact the system administrator.',
            'configured': False,
        }, status=status.HTTP_200_OK)


class StudentDashboardView(APIView):
    """
    Consolidated dashboard data for the authenticated student.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        
        user = request.user
        
        has_avatar = bool(hasattr(user, 'avatar') and user.avatar)
        has_phone = bool(getattr(user, 'phone_number', '') or getattr(user, 'phone', ''))
        has_name = bool(user.first_name and user.last_name)
        completion_points = 50 + (20 if has_avatar else 0) + (15 if has_phone else 0) + (15 if has_name else 0)

        # Profile
        profile_data = {
            "name": f"{user.first_name} {user.last_name}".strip() or user.username,
            "avatar": user.avatar if has_avatar else None,
            "targetPosition": getattr(user, 'role', 'Student').replace("-", " ").title(),
            "completionPercentage": completion_points,
            "phone": getattr(user, 'phone_number', '') or getattr(user, 'phone', '')
        }

        # Stats
        from analytics.services.analytics_service import AnalyticsService
        overview = AnalyticsService.get_overview(user)
        
        study_time_hours = overview.get("total_study_time_mins", 0) // 60
        study_time_mins = overview.get("total_study_time_mins", 0) % 60

        stats_data = {
            "totalExams": overview.get("total_available_exams", 0),
            "completedExams": overview.get("model_exams_taken", 0),
            "averageScore": overview.get("overall_accuracy", 0),
            "bestScore": overview.get("overall_accuracy", 0), 
            "accuracy": overview.get("overall_accuracy", 0),
            "questionsAttempted": overview.get("questions_solved", 0),
            "studyStreak": overview.get("study_streak", 0),
            "studyTime": f"{study_time_hours}h {study_time_mins}m",
            "progress": overview.get("journey_progress", 0)
        }

        # Continue Learning
        continue_learning = None
        active_course = overview.get("active_course")
        if active_course:
            course_name = active_course.get("name", "Active Course")
            course_slug = active_course.get("slug")
            
            continue_learning = {
                "id": active_course.get("id", 0),
                "type": "practice",
                "title": f"Continue {course_name}",
                "progress": overview.get("journey_progress", 0),
                "url": f"/student/courses/{course_slug}" if course_slug else "/student/practice"
            }

        # Recent Exams
        recent_exams_data = []
        try:
            from exams.models import ExaminationAttempt
            recent_attempts = ExaminationAttempt.objects.filter(
                student=user, status='submitted'
            ).select_related('examination').order_by('-started_at')[:5]
            
            for attempt in recent_attempts:
                recent_exams_data.append({
                    "id": attempt.id,
                    "title": attempt.examination.title if attempt.examination else "Examination",
                    "date": attempt.started_at.isoformat() if attempt.started_at else "",
                    "score": attempt.score,
                    "percentage": attempt.percentage
                })
                
        except Exception as e:
            logger.error(f"Error fetching recent exams for dashboard: {e}")

        # Purchases
        purchases_data = []
        try:
            from courses.models import CourseApplication
            applications = CourseApplication.objects.filter(student=user).select_related('course').order_by('-applied_at')[:5]
            for app in applications:
                purchases_data.append({
                    "id": app.id,
                    "title": app.course.title if app.course else "Course Application",
                    "status": "APPROVED" if app.status == 'approved' else "PENDING",
                    "url": f"/student/courses/{app.course.slug}" if app.course else "/student/courses"
                })
        except Exception as e:
            logger.error(f"Error fetching purchases for dashboard: {e}")

        # Subject Performance
        try:
            subject_performance = AnalyticsService.get_subject_performance(user)
            formatted_subject_performance = [
                {
                    "subject": sp["subject"],
                    "progress": sp["accuracy"]
                }
                for sp in subject_performance[:5]
            ]
        except Exception as e:
            logger.error(f"Error fetching subject performance: {e}")
            formatted_subject_performance = []

        # Today's Plan
        todays_plan = []
        try:
            from study_plan.models import StudyTask
            from django.utils import timezone
            
            today = timezone.localdate()
            tasks = StudyTask.objects.filter(
                study_plan__student=user,
                date=today
            ).order_by('created_at')[:5]
            
            for task in tasks:
                todays_plan.append({
                    "id": task.id,
                    "title": task.title,
                    "type": "exam" if task.task_type == "MODEL_EXAM" else "practice",
                    "completed": task.status == 'COMPLETED',
                    "duration": task.duration_minutes
                })
        except Exception as e:
            logger.error(f"Error fetching today's plan for dashboard: {e}")

        data = {
            "profile": profile_data,
            "stats": stats_data,
            "continueLearning": continue_learning,
            "todaysPlan": todays_plan,
            "recentExams": recent_exams_data,
            "purchases": purchases_data,
            "supportTickets": [], 
            "subjectPerformance": formatted_subject_performance
        }

        return Response(data)

class SocialLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        provider = request.data.get('provider')
        token = request.data.get('token')
        additional_data = request.data.get('additional_data', {})

        if not provider or not token:
            return Response({"detail": "Provider and token are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from core.social_auth import SocialAuthService
            
            if provider == 'google':
                provider_data = SocialAuthService.verify_google_token(token)
            elif provider == 'facebook':
                provider_data = SocialAuthService.verify_facebook_token(token)
            elif provider == 'apple':
                provider_data = SocialAuthService.verify_apple_token(token)
            else:
                return Response({"detail": "Invalid provider."}, status=status.HTTP_400_BAD_REQUEST)

            user = SocialAuthService.get_or_create_social_user(provider, provider_data, additional_data)

            from rest_framework_simplejwt.tokens import RefreshToken
            update_last_login(None, user)
            refresh = RefreshToken.for_user(user)

            return Response({
                'access': _access_token_for(user),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                }
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": f"Authentication failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
