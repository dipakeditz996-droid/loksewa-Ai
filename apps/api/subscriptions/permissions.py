from rest_framework.permissions import BasePermission

from .access import has_active_subscription
from core.models import AdminSettings


class HasActiveSubscription(BasePermission):
    """Gates a view behind an active package, but only once the admin has
    turned enforcement on (AdminSettings.enforce_subscription_access). While
    it's off - the default, so existing accounts are never locked out the
    moment this ships - every request passes through unchanged.

    Staff roles (teacher/admin/super-admin) are never subject to this check;
    it exists to gate students' own paid-feature access, not staff tooling.
    """

    message = {'detail': 'An active package is required to access this feature.', 'code': 'subscription_required'}

    def has_permission(self, request, view):
        from .access import has_active_subscription, has_admin_granted_access

        if not request.user or not request.user.is_authenticated:
            return False

        if not AdminSettings.get_settings().enforce_subscription_access:
            return True

        if request.user.role in ('teacher', 'admin', 'super-admin'):
            return True

        if has_admin_granted_access(request.user):
            return True

        return has_active_subscription(request.user)
