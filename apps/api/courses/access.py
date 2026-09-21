"""Course access for students: the single check behind course-scoped Practice.

A student may use a course only through an ACTIVE, unexpired Enrollment (the
row the package-approval flow creates), and only while the course itself is
published - a Coming Soon, draft or archived course grants nothing even if an
enrollment row exists. Nothing else should re-implement this.
"""
from django.db.models import Q
from django.utils import timezone

from .models import Enrollment


def active_enrollments(user):
    """The student's enrollments that currently grant access."""
    now = timezone.now()
    return Enrollment.objects.filter(student=user, status='active').filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=now)
    )


def course_access_denial(user, course_id):
    """Why `user` may not use course `course_id`, as a (status, message)
    pair - or None when access is granted. One query.

    Not being enrolled and not existing look the same (403): a student can't
    probe which course ids exist.
    """
    enrollment = (
        active_enrollments(user).filter(course_id=course_id).select_related('course').first()
    )
    if enrollment is None:
        return 403, 'You are not enrolled in this course.'
    if enrollment.course.status != 'published':
        return 403, 'This course is not available yet.'
    return None


STAFF_ROLES = ('teacher', 'admin', 'super-admin')


def authorized_exam_ids(user, exams=None):
    """The exams `user` may practise - the single answer to "which exams does
    this student's purchase cover?".

    Returns None for staff (unrestricted), otherwise a set of Exam ids, all of
    them published (Exam.status == 'active'; Coming Soon and inactive exams
    are never practisable). An exam is authorised when it is - or sits under -
    the exam of:

      * a course the student has a live Enrollment in, while that course is
        published. Enrollments are what an approved payment creates for every
        package type that names courses (SINGLE, MULTI via the student's
        selection, BUNDLE); a pending or rejected payment creates none, and
        the enrollment expires with the subscription;
      * any published course, if the student holds an active ALL_ACCESS
        subscription (that package type names no courses - it means all);
      * the student's profile target position - but only where no purchase
        model applies: while package enforcement is OFF, or for accounts an
        admin granted access to directly (those have no payment/enrollment).
        A self-registered student's target is what they *intend* to buy, not
        something they own, so with enforcement ON it grants nothing.

    `exams` may carry the active exam rows (objects with id / parent_id / status)
    the caller has already loaded, saving one query.

    Computed from the database on every call - nothing is cached or
    remembered, so a change to an enrollment, subscription or exam takes
    effect on the very next request.
    """
    if user.role in STAFF_ROLES:
        return None
    from django.db.models import Exists

    from core.models import AdminSettings
    from exams.models import Exam
    from subscriptions.access import has_admin_granted_access
    from subscriptions.models import Subscription
    from .models import Course

    now = timezone.now()
    enrolled = active_enrollments(user).filter(
        course__status='published', course__exam_id__isnull=False
    ).values_list('course__exam_id', flat=True)
    all_access = Subscription.objects.filter(
        student=user, status='ACTIVE', expiry_date__gt=now, plan__package_type='ALL_ACCESS'
    )
    everything = Course.objects.filter(
        status='published', exam_id__isnull=False
    ).filter(Exists(all_access)).values_list('exam_id', flat=True)
    roots = set(enrolled.union(everything))

    if not AdminSettings.is_subscription_enforced() or has_admin_granted_access(user):
        try:
            target = user.student_profile.target_position_id
        except Exception:  # no profile
            target = None
        if target:
            roots.add(target)

    # An exam can be a level node with services underneath it; owning the
    # parent covers its children. One read of the (small) exam tree.
    if exams is None:
        rows = list(Exam.objects.filter(is_active=True).values_list('id', 'parent_id', 'status'))
    else:
        rows = [(e.id, e.parent_id, e.status) for e in exams]
    children = {}
    for exam_id, parent_id, _status in rows:
        children.setdefault(parent_id, []).append(exam_id)
    status_of = {exam_id: status for exam_id, _p, status in rows}
    covered, stack = set(), [r for r in roots if r in status_of]
    while stack:
        node = stack.pop()
        if node in covered:
            continue
        covered.add(node)
        stack.extend(children.get(node, []))
    return {i for i in covered if status_of.get(i) == 'active'}
