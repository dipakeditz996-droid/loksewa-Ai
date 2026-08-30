"""Account lockout after repeated failed logins (Admin Settings > Security >
Max Login Attempts). The lockout window itself isn't an admin-configurable
field - only the attempt threshold is - so a fixed, reasonable duration is
used once that threshold is reached.
"""
from datetime import timedelta

from django.utils import timezone

LOCKOUT_DURATION_MINUTES = 15


def find_user_by_username_or_email(identifier):
    from core.models import User
    try:
        return User.objects.get(username=identifier)
    except User.DoesNotExist:
        try:
            return User.objects.get(email=identifier)
        except User.DoesNotExist:
            return None


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
