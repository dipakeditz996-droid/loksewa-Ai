from .models import Notification
from support.models import NotificationPreference
from django.contrib.auth import get_user_model

User = get_user_model()

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
