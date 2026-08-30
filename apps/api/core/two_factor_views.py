from datetime import timedelta

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken, Token

from . import two_factor
from .account_lockout import record_successful_login
from .views import _access_token_for

User = get_user_model()


class TwoFactorPendingToken(Token):
    """Short-lived token identifying a user who passed password auth but
    still owes a 2FA code - deliberately NOT an access/refresh token, so it
    cannot be used to call any authenticated API."""
    token_type = 'twofa_pending'
    lifetime = timedelta(minutes=5)


def _admin_2fa_platform_enabled():
    from .models import AdminSettings
    return AdminSettings.get_settings().enable_two_factor_auth


class TwoFactorStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'platformEnabled': _admin_2fa_platform_enabled(),
            'enabled': request.user.is_2fa_enabled,
        })


class TwoFactorSetupView(APIView):
    """POST /api/auth/2fa/setup/ - starts enrollment. The secret is stored
    immediately but is_2fa_enabled stays False until TwoFactorVerifySetupView
    confirms the user can actually generate a code with it."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _admin_2fa_platform_enabled():
            return Response(
                {'error': 'Two-factor authentication is not enabled by the administrator.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.user.role not in ('admin', 'super-admin'):
            return Response(
                {'error': 'Two-factor authentication is only available for admin accounts.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        secret = two_factor.generate_secret()
        request.user.totp_secret = secret
        request.user.save(update_fields=['totp_secret'])

        return Response({
            'secret': secret,
            'otpauthUri': two_factor.get_provisioning_uri(request.user, secret),
        })


class TwoFactorVerifySetupView(APIView):
    """POST /api/auth/2fa/verify-setup/ - body: {code}. Confirms setup and
    returns backup codes exactly once."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = (request.data.get('code') or '').strip()
        if not request.user.totp_secret:
            return Response({'error': 'Start setup first.'}, status=status.HTTP_400_BAD_REQUEST)
        if not two_factor.verify_totp_code(request.user.totp_secret, code):
            return Response({'error': 'Invalid code. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.is_2fa_enabled = True
        request.user.save(update_fields=['is_2fa_enabled'])
        backup_codes = two_factor.generate_backup_codes(request.user)

        return Response({'enabled': True, 'backupCodes': backup_codes})


class TwoFactorDisableView(APIView):
    """POST /api/auth/2fa/disable/ - body: {password}. Requires re-entering
    the password so a hijacked, still-logged-in session can't silently
    switch 2FA off."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        password = request.data.get('password') or ''
        if not request.user.check_password(password):
            return Response({'error': 'Incorrect password.'}, status=status.HTTP_400_BAD_REQUEST)

        from .models import TwoFactorBackupCode
        request.user.is_2fa_enabled = False
        request.user.totp_secret = None
        request.user.save(update_fields=['is_2fa_enabled', 'totp_secret'])
        TwoFactorBackupCode.objects.filter(user=request.user).delete()

        return Response({'enabled': False})


class TwoFactorLoginView(APIView):
    """POST /api/auth/2fa/login/ - body: {pendingToken, code}. Completes a
    login that TwoFactorPendingLogin started. 'code' may be a live TOTP code
    or an unused backup code."""
    permission_classes = [AllowAny]

    def post(self, request):
        pending_token = request.data.get('pendingToken') or ''
        code = (request.data.get('code') or '').strip()

        try:
            token = TwoFactorPendingToken(pending_token)
        except TokenError:
            return Response({'error': 'This login attempt has expired. Please log in again.'},
                             status=status.HTTP_401_UNAUTHORIZED)

        try:
            user = User.objects.get(pk=token['user_id'])
        except User.DoesNotExist:
            return Response({'error': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not user.is_2fa_enabled:
            return Response({'error': 'Two-factor authentication is not enabled for this account.'},
                             status=status.HTTP_400_BAD_REQUEST)

        if not two_factor.verify_login_code(user, code):
            return Response({'error': 'Invalid or expired code.'}, status=status.HTTP_400_BAD_REQUEST)

        record_successful_login(user)
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
