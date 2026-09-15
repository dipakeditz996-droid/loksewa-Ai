from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

from .permissions import IsAdminUser
from .models import AuditLog
from support.serializers import ChangePasswordSerializer
from core.account_lockout import (
    is_locked, lockout_remaining_minutes, record_failed_attempt, record_successful_login,
)
from core.notification_service import NotificationService
from core.email_service import send_password_changed_email


class AdminChangePasswordView(APIView):
    """
    POST /api/admin/change-password/

    Lets an authenticated Admin or Super Admin change their own password.
    Reuses support.serializers.ChangePasswordSerializer - the exact same
    current-password check, Django password validators, and mismatch/
    same-password checks that students and teachers already use in their
    own Settings pages - restricted here to admin/super-admin only via
    administration.permissions.IsAdminUser. No second validation system,
    no second User/Admin model.
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        user = request.user

        # Reuses the existing login-lockout primitives (core/account_lockout.py,
        # already wired to AdminSettings.max_login_attempts) instead of a new
        # throttling system - same threat model (repeated wrong-password
        # guesses against one account), just triggered here by a wrong
        # current_password instead of a failed login.
        if is_locked(user):
            return Response(
                {'detail': f'Too many failed attempts. Try again in {lockout_remaining_minutes(user)} minute(s).'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            # Only a wrong current_password is a credential-guessing signal -
            # a weak new password or a confirm-password typo isn't someone
            # probing this account, so those don't count toward lockout.
            if 'current_password' in serializer.errors:
                record_failed_attempt(user)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        record_successful_login(user)  # clears the failed-attempt counter

        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])

        # Force re-authentication on every other session: blacklist every
        # refresh token already issued for this user, the same primitive
        # AuthLogoutView already uses for a single token (core/views.py),
        # applied here to all of them. The current request's own access
        # token is left to expire naturally - SimpleJWT has no per-access-
        # token revocation list, and building one would be a second token
        # system, which this task explicitly rules out.
        #
        # Bulk, not a per-token loop: an account with hundreds of outstanding
        # tokens (long-lived dev/test accounts, or just months of daily
        # logins without ever logging out elsewhere) turned a per-row
        # get_or_create into hundreds of round trips and made this request
        # visibly hang - two queries plus one bulk insert regardless of N.
        outstanding_ids = list(OutstandingToken.objects.filter(user=user).values_list('id', flat=True))
        already_blacklisted_ids = set(
            BlacklistedToken.objects.filter(token_id__in=outstanding_ids).values_list('token_id', flat=True)
        )
        to_blacklist = [
            BlacklistedToken(token_id=tid) for tid in outstanding_ids if tid not in already_blacklisted_ids
        ]
        if to_blacklist:
            BlacklistedToken.objects.bulk_create(to_blacklist)

        AuditLog.objects.create(
            actor=user, action='ADMIN_PASSWORD_CHANGED',
            entity_type='User', entity_id=str(user.id), details={},
        )

        NotificationService.notify_password_changed(user)
        if user.email:
            send_password_changed_email(user.email, role=user.get_role_display())

        return Response({'detail': 'Password changed successfully.'})
