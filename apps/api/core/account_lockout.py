"""Account lockout after repeated failed logins (Admin Settings > Security >
Max Login Attempts). The lockout window itself isn't an admin-configurable
field - only the attempt threshold is - so a fixed, reasonable duration is
used once that threshold is reached.
"""
from datetime import timedelta

from django.utils import timezone

LOCKOUT_DURATION_MINUTES = 3


def find_user_by_username_or_email(identifier):
    """Resolves a login identifier to a user with ONE query (the profile
    needed by the login's verification check is joined in, not fetched
    separately). An exact username match wins over an email match. An
    identifier that is ambiguous by email (several accounts share it) is
    treated as unknown rather than guessing which account was meant."""
    from django.db.models import Q
    from core.models import User
    if not identifier:
        return None
    candidates = list(
        User.objects.select_related('student_profile')
        .filter(Q(username=identifier) | Q(email=identifier))[:3]
    )
    for candidate in candidates:
        if candidate.username == identifier:
            return candidate
    return candidates[0] if len(candidates) == 1 else None


def is_locked(user):
    return bool(user and user.locked_until and user.locked_until > timezone.now())


def lockout_remaining_minutes(user):
    if not is_locked(user):
        return 0
    remaining_seconds = (user.locked_until - timezone.now()).total_seconds()
    return max(1, int(remaining_seconds // 60) + 1)


def record_failed_attempt(user):
    """Increments the failed-attempt counter and locks the account once it
    reaches AdminSettings.max_login_attempts."""
    from core.models import AdminSettings
    max_attempts = AdminSettings.get_settings().max_login_attempts

    was_locked = bool(user.locked_until)
    user.failed_login_attempts += 1
    if user.failed_login_attempts >= max_attempts:
        user.locked_until = timezone.now() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
    user.save(update_fields=['failed_login_attempts', 'locked_until'])

    # An admin/super-admin account getting locked out is a real security
    # signal (repeated failed logins against a privileged account) worth
    # surfacing to the rest of the admin team. Students lock themselves out
    # with password typos constantly, so this is deliberately scoped to
    # privileged roles only - a student lockout notifying admins would just
    # be noise. is_locked() (not just was_locked) skips the request that
    # already found the account locked before reaching here.
    if not was_locked and user.locked_until and user.role in ('admin', 'super-admin'):
        from core.notification_service import NotificationService
        NotificationService.notify_admins(
            notif_type='system',
            title='Admin Account Locked Out',
            message=f"The account '{user.username}' ({user.role}) was locked for {LOCKOUT_DURATION_MINUTES} minutes after {user.failed_login_attempts} failed login attempts.",
            action_url='/admin-dashboard/audit-logs',
            priority='critical',
        )


def record_successful_login(user):
    if user.failed_login_attempts or user.locked_until:
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=['failed_login_attempts', 'locked_until'])
