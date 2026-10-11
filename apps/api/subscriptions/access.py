"""Server-side mirror of apps/web/lib/access.ts - the single source of truth
for "does this student have an active package" and "does their plan include
this feature". Nothing else in the codebase should re-implement this check;
import from here.
"""
from django.utils import timezone

def has_admin_granted_access(user):
    from support.models import StudentProfile
    try:
        profile = user.student_profile
        if profile.access_origin == 'ADMIN_GRANTED':
            if profile.admin_access_expiry is None or profile.admin_access_expiry > timezone.now():
                return True
    except StudentProfile.DoesNotExist:
        pass
    return False


def get_active_subscription(user):
    """Returns the student's current active Subscription, or None.
    'Active' means status=='ACTIVE' AND (expiry_date is NULL or expiry_date > now) -
    matching Subscription.is_active exactly."""
    if not user or not user.is_authenticated:
        return None
    from .models import Subscription
    from django.db.models import Q, F

    now = timezone.now()
    return (
        Subscription.objects.filter(
            Q(expiry_date__isnull=True) | Q(expiry_date__gt=now),
            student=user,
            status='ACTIVE',
        )
        .select_related('plan')
        .order_by(F('expiry_date').desc(nulls_first=True))
        .first()
    )


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
