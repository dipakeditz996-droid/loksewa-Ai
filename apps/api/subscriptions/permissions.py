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

        if not AdminSettings.is_subscription_enforced():
            return True

        if request.user.role in ('teacher', 'admin', 'super-admin'):
            return True

        if has_admin_granted_access(request.user):
            return True

        if has_active_subscription(request.user):
            return True

        # Check if student holds an active coin entitlement for the specific requested examination or material
        pk = getattr(view, 'kwargs', {}).get('pk')
        if pk:
            try:
                from wallet.models import ContentEntitlement
                from django.db.models import Q
                from django.utils import timezone
                now = timezone.now()
                return ContentEntitlement.objects.filter(
                    user=request.user,
                    content_id=pk,
                    status='ACTIVE'
                ).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now)).exists()
            except Exception:
                pass

        return False
