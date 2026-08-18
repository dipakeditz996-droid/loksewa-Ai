from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User

class StudentSignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        referral_code = request.data.get('ref', '').strip()

        if not username or not email or not password:
            return Response({'error': 'Please provide username, email, and password.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate Referral Code BEFORE creating user
        if referral_code:
            from gamification.models import GamificationProfile
            if not GamificationProfile.objects.filter(referral_code=referral_code).exists():
                return Response({'error': 'Invalid referral code.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password, role='student')

        # Register Referral
        if referral_code:
            try:
                from gamification.services import register_referral
                register_referral(user, referral_code)
            except Exception as e:
                pass # Ignore gamification errors during signup

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
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
            return Response(
                {'detail': 'Invalid credentials. Please check your username/email and password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

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

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
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
