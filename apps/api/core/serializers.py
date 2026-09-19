from datetime import timedelta

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import AccessToken
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import exceptions


def _apply_admin_session_timeout(data, user, admin_settings=None):
    """Re-issues the access token with a lifetime pulled from
    AdminSettings.session_timeout_minutes (Admin Settings > Security), which
    the static SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'] setting cannot express
    since it's fixed at process start, not per-request."""
    from .models import AdminSettings
    minutes = (admin_settings or AdminSettings.get_settings()).session_timeout_minutes
    access = AccessToken.for_user(user)
    access.set_exp(lifetime=timedelta(minutes=minutes))
    data['access'] = str(access)
    return data


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        from .account_lockout import (
            find_user_by_username_or_email, is_locked, lockout_remaining_minutes,
            record_failed_attempt, record_successful_login,
        )

        username_field = self.username_field
        username = attrs.get(username_field)
        password = attrs.get("password")

        # Resolved once up front so a lockout can be enforced before password
        # verification - a locked account must reject even a correct
        # password until the lockout clears.
        looked_up_user = find_user_by_username_or_email(username)
        if is_locked(looked_up_user):
            raise exceptions.AuthenticationFailed(
                f'Too many failed attempts. Try again in {lockout_remaining_minutes(looked_up_user)} minute(s).',
                'account_locked',
            )

        from django.contrib.auth import authenticate

        # Inactive account: verify the password once here (authenticate()
        # would reject it after hashing, and re-checking would hash again) so
        # a disabled account is told apart from a wrong password only when
        # the password itself was correct.
        if looked_up_user is not None and not looked_up_user.is_active:
            if looked_up_user.check_password(password):
                raise exceptions.AuthenticationFailed(
                    'Your account has been disabled. Please contact support.',
                    'account_disabled'
                )
            record_failed_attempt(looked_up_user)
            raise exceptions.AuthenticationFailed(
                'Invalid email/username or password.',
                'no_active_account'
            )

        # The account was already resolved above (one query); hand it to the
        # backend so it neither looks it up again nor skips verification.
        user = authenticate(
            request=self.context.get('request'),
            username=username,
            password=password,
            user=looked_up_user,
        )

        if user is None:
            # A wrong password against a real account counts toward lockout.
            # A username/email that doesn't exist at all never does - there's
            # no account to protect, and it would let someone lock out a
            # victim's account just by guessing their identifier.
            if looked_up_user:
                record_failed_attempt(looked_up_user)

            raise exceptions.AuthenticationFailed(
                'Invalid email/username or password.',
                'no_active_account'
            )

        # A student whose registration is still pending email/recovery
        # verification (see StudentProfile.is_verified) can't log in yet -
        # checked only after the password is confirmed correct, so a wrong
        # password never leaks whether an account is verified.
        if user.role == 'student':
            # Loaded together with the user by find_user_by_username_or_email.
            try:
                profile = user.student_profile
            except ObjectDoesNotExist:
                profile = None
            if profile and not profile.is_verified:
                raise exceptions.AuthenticationFailed(
                    'Please verify your email before logging in. Check your inbox for the verification code, '
                    'or contact an administrator if you need help.',
                    'account_unverified',
                )

        # A 2FA-enabled account (enrollment is admin/super-admin only - see
        # TwoFactorSetupView - so this only ever fires for those roles today)
        # must pass a second factor before receiving real tokens. This is the
        # one login endpoint every role now goes through, so returning here
        # is what makes 2FA apply no matter which portal the user typed
        # their password into.
        from .models import AdminSettings
        admin_settings = AdminSettings.get_settings()
        if admin_settings.enable_two_factor_auth and user.is_2fa_enabled:
            from .two_factor_views import TwoFactorPendingToken
            pending = TwoFactorPendingToken.for_user(user)
            return {
                'twoFactorRequired': True,
                'pendingToken': str(pending),
            }

        # The user was authenticated above (one password verification).
        # Issue tokens for that user directly - re-running
        # TokenObtainPairSerializer.validate() here would authenticate a
        # second time, re-hashing the password for no security benefit.
        from django.contrib.auth.models import update_last_login
        from rest_framework_simplejwt.settings import api_settings
        if not api_settings.USER_AUTHENTICATION_RULE(user):
            raise exceptions.AuthenticationFailed(
                self.error_messages['no_active_account'], 'no_active_account'
            )
        self.user = user
        record_successful_login(user)
        refresh = self.get_token(user)
        data = {'refresh': str(refresh), 'access': str(refresh.access_token)}
        if api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, user)
        data['user'] = {
            'id': user.id,
            'username': user.username,
            'name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'email': user.email,
            'role': user.role,
            'is_active': user.is_active,
            'avatar': user.avatar,
        }
        return _apply_admin_session_timeout(data, user, admin_settings)

