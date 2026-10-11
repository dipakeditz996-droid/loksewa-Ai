"""Server-side mirror of apps/web/lib/access.ts - the single source of truth
for "does this student have an active package" and "does their plan include
this feature". Nothing else in the codebase should re-implement this check;
import from here.
"""
from django.utils import timezone

def has_admin_granted_access(user):
    if not user or not user.is_authenticated:
        return False
    cached = getattr(user, '_cached_admin_granted_access', None)
    if cached is not None:
        return cached
    from support.models import StudentProfile
    res = False
    try:
        profile = getattr(user, 'student_profile', None)
        if profile and profile.access_origin == 'ADMIN_GRANTED':
            if profile.admin_access_expiry is None or profile.admin_access_expiry > timezone.now():
                res = True
    except Exception:
        pass
    setattr(user, '_cached_admin_granted_access', res)
    return res


def get_active_subscription(user):
    """Returns the student's current active Subscription, or None.
    'Active' means status=='ACTIVE' AND (expiry_date is NULL or expiry_date > now) -
    matching Subscription.is_active exactly.
    Paid active subscriptions strictly take precedence over Free subscriptions."""
    if not user or not user.is_authenticated:
        return None
    cached = getattr(user, '_cached_active_subscription', None)
    if cached is not None:
        return None if cached == '__none__' else cached

    from .models import Subscription
    from django.db.models import Q, F

    now = timezone.now()
    # 1. Paid subscriptions first
    paid_sub = (
        Subscription.objects.filter(
            Q(expiry_date__isnull=True) | Q(expiry_date__gt=now),
            student=user,
            status='ACTIVE',
            plan__price__gt=0,
        )
        .select_related('plan')
        .order_by(F('expiry_date').desc(nulls_first=True), '-created_at')
        .first()
    )
    if paid_sub:
        setattr(user, '_cached_active_subscription', paid_sub)
        return paid_sub

    # 2. Free subscriptions fallback
    free_sub = (
        Subscription.objects.filter(
            Q(expiry_date__isnull=True) | Q(expiry_date__gt=now),
            student=user,
            status='ACTIVE',
        )
        .select_related('plan')
        .order_by('-created_at')
        .first()
    )
    setattr(user, '_cached_active_subscription', free_sub or '__none__')
    return free_sub


def has_active_subscription(user):
    return get_active_subscription(user) is not None


def has_feature(user, feature_key):
    """Mirrors lib/access.ts hasFeature(): '*' in plan.features unlocks
    everything, otherwise the exact key must be present."""
    if has_admin_granted_access(user):
        return True

    subscription = get_active_subscription(user)
    if subscription is None:
        return False

    features = subscription.plan.features or []
    if '*' in features:
        return True
    return feature_key in features
