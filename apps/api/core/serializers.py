from datetime import timedelta

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework import exceptions


def _apply_admin_session_timeout(data, user):
    """Re-issues the access token with a lifetime pulled from
    AdminSettings.session_timeout_minutes (Admin Settings > Security), which
    the static SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'] setting cannot express
    since it's fixed at process start, not per-request."""
    from .models import AdminSettings
    minutes = AdminSettings.get_settings().session_timeout_minutes
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

        try:
            data = super().validate(attrs)
        except exceptions.AuthenticationFailed as e:
            # If the user is inactive, authenticate() returns None and SimpleJWT raises AuthenticationFailed.
            # But we also need to distinguish between wrong password and disabled account.
            # By default, Django's authenticate returns None for both wrong password and disabled account
            # if user_can_authenticate() returns False, unless we catch it.
            # Wait, `EmailOrUsernameModelBackend` calls `self.user_can_authenticate(user)`, which returns False if `is_active` is False.
            # To provide a distinct message for inactive users, we can check manually here before calling super().
            pass

        # Manual check to distinguish inactive vs wrong password
        from django.contrib.auth import authenticate

        user = authenticate(request=self.context.get('request'), username=username, password=password)

        if user is None:
            if looked_up_user and looked_up_user.check_password(password) and not looked_up_user.is_active:
                raise exceptions.AuthenticationFailed(
                    'Your account has been disabled. Please contact support.',
                    'account_disabled'
                )

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
            from support.models import StudentProfile
            profile = StudentProfile.objects.filter(user=user).only('is_verified').first()
            if profile and not profile.is_verified:
                raise exceptions.AuthenticationFailed(
                    'Please verify your email before logging in. Check your inbox for the verification code, '
                    'or contact an administrator if you need help.',
                    'account_unverified',
                )

        # If user is valid, we still use the super().validate() to get the tokens,
        # but we must pass the actual username because the provided username might be an email.
        attrs[username_field] = user.username

        record_successful_login(user)
        data = super().validate(attrs)
        return _apply_admin_session_timeout(data, user)
