from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import Notification
from support.models import NotificationPreference

User = get_user_model()

# Audiences an admin broadcast can target. Each maps to a concrete queryset in
# resolve_audience(); nothing here can address a group the backend cannot build.
AUDIENCE_CHOICES = (
    ('all', 'Everyone'),
    ('students', 'All Students'),
    ('teachers', 'All Teachers'),
    ('admins', 'Admins'),
    ('course', 'Students Enrolled in a Course'),
    ('individual', 'Specific Users'),
)


class NotificationBroadcastError(Exception):
    """Raised when an audience cannot be resolved into real recipients."""


class NotificationService:
    @staticmethod
    def _create_if_allowed(recipient, notif_type, preference_key, title, message, action_url, priority='normal'):
        """Helper to check preferences and create a notification."""
        prefs, _ = NotificationPreference.objects.get_or_create(user=recipient)
        
        # Check if in-app notification is enabled for this category
        is_allowed = getattr(prefs, preference_key, True)
        
        if is_allowed:
            Notification.objects.create(
                recipient=recipient,
                type=notif_type,
                title=title,
                message=message,
                action_url=action_url,
                priority=priority
            )
            # In a real app, here you would also check the corresponding *_email 
            # preference and enqueue a Celery task to send an email.

    @classmethod
    def notify_question_review(cls, teacher, question_title, status, feedback=None, action_url=None):
        title = "Question Requires Changes" if status == 'rejected' else "Question Approved"
        priority = 'important' if status == 'rejected' else 'normal'
        message = f"Your question '{question_title}' was {status}."
        if feedback:
            message += f" Feedback: {feedback}"
            
        cls._create_if_allowed(
            recipient=teacher,
            notif_type='question_review',
            preference_key='question_reviews_inapp',
            title=title,
            message=message,
            action_url=action_url,
            priority=priority
        )

    @classmethod
    def notify_material_review(cls, teacher, material_title, status, feedback=None, action_url=None):
        title = "Study Material Requires Changes" if status == 'rejected' else "Study Material Approved"
        priority = 'important' if status == 'rejected' else 'normal'
        message = f"Your material '{material_title}' was {status}."
        if feedback:
            message += f" Feedback: {feedback}"
            
        cls._create_if_allowed(
            recipient=teacher,
            notif_type='material_review',
            preference_key='study_material_reviews_inapp',
            title=title,
            message=message,
            action_url=action_url,
            priority=priority
        )

    @classmethod
    def notify_student_activity(cls, teacher, student_name, activity_type, action_url=None):
        title = "New Student Activity"
        message = f"Student {student_name} recently completed a {activity_type}."
        
        cls._create_if_allowed(
            recipient=teacher,
            notif_type='student_activity',
            preference_key='student_activity_inapp',
            title=title,
            message=message,
            action_url=action_url,
            priority='normal'
        )

    @classmethod
    def notify_system_alert(cls, teacher, title, message, action_url=None, priority='critical'):
        # System alerts in-app are required, no preference check for creation
        Notification.objects.create(
            recipient=teacher,
            type='system',
            title=title,
            message=message,
            action_url=action_url,
            priority=priority
        )


# ── Admin broadcast fan-out ──────────────────────────────────────────────────
# AdminNotification is the campaign record; core.Notification is the per-user
# delivery row the Student Portal already reads. These helpers connect the two,
# which previously nothing did.

def resolve_audience(audience, *, course_id=None, user_ids=None):
    """Turn an audience choice into the queryset of real recipients.

    Recipient selection happens here, in the database — never in the client.
    """
    audience = (audience or '').strip().lower()
    active = User.objects.filter(is_active=True)

    if audience == 'all':
        return active
    if audience == 'students':
        return active.filter(role='student')
    if audience == 'teachers':
        return active.filter(role='teacher')
    if audience == 'admins':
        return active.filter(role__in=['admin', 'super-admin'])

    if audience == 'course':
        if not course_id:
            raise NotificationBroadcastError('Select a course for a course audience.')
        return active.filter(
            role='student',
            enrollments__course_id=course_id,
            enrollments__status='active',
        ).distinct()

    if audience == 'individual':
        if not user_ids:
            raise NotificationBroadcastError('Select at least one recipient.')
        return active.filter(id__in=user_ids)

    raise NotificationBroadcastError(f"Unsupported audience: {audience}")


# AdminNotification.type -> core.Notification.type, so a delivered row carries a
# category the student UI already understands.
_ADMIN_TYPE_MAP = {
    'alert': 'system',
    'system': 'system',
    'announcement': 'announcement',
}


@transaction.atomic
def broadcast_admin_notification(admin_notification, *, course_id=None, user_ids=None):
    """Fan an AdminNotification out to its recipients and mark it sent.

    Returns the number of delivery rows created. Runs in one transaction so a
    campaign is never left half-delivered.
    """
    recipients = resolve_audience(
        admin_notification.target_role, course_id=course_id, user_ids=user_ids
    )

    # Re-sending would duplicate rows, so skip anyone already delivered to.
    already = set(
        Notification.objects.filter(source_admin_notification=admin_notification)
        .values_list('recipient_id', flat=True)
    )

    notif_type = _ADMIN_TYPE_MAP.get(admin_notification.type, 'announcement')

    # values_list + iterator keeps a large broadcast off the Python heap.
    rows = [
        Notification(
            recipient_id=user_id,
            source_admin_notification=admin_notification,
            type=notif_type,
            title=admin_notification.title,
            message=admin_notification.content,
            priority='important' if admin_notification.type == 'alert' else 'normal',
        )
        for user_id in recipients.values_list('id', flat=True).iterator()
        if user_id not in already
    ]

    # One INSERT rather than one per recipient.
    Notification.objects.bulk_create(rows, batch_size=500)

    admin_notification.recipient_count = (
        Notification.objects.filter(source_admin_notification=admin_notification).count()
    )
    admin_notification.status = 'sent'
    admin_notification.sent_at = timezone.now()
    admin_notification.save(update_fields=['recipient_count', 'status', 'sent_at', 'updated_at'])

    return len(rows)


def delivery_stats(admin_notification):
    """Real read/unread counts for a campaign, from its delivery rows."""
    deliveries = Notification.objects.filter(source_admin_notification=admin_notification)
    total = deliveries.count()
    read = deliveries.filter(is_read=True).count()
    return {
        'recipient_count': total,
        'read_count': read,
        'unread_count': total - read,
        'read_rate': round((read / total) * 100, 2) if total else 0.0,
    }
