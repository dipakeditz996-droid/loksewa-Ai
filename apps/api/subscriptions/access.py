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
    """Returns the student's current active, non-expired Subscription, or
    None. 'Active' means status=='ACTIVE' AND expiry_date is in the future -
    matching Subscription.is_active exactly, but as a queryset so callers
    that need the object (not just a bool) don't have to iterate."""
    from .models import Subscription

    return (
        Subscription.objects.filter(
            student=user, status='ACTIVE', expiry_date__gt=timezone.now()
        )
        .select_related('plan')
        .order_by('-expiry_date')
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
