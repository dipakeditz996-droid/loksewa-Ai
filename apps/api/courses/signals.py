from django.db.models.signals import post_save
from django.dispatch import receiver
from exams.models import Exam
from courses.services.course_sync_service import sync_course_for_exam


@receiver(post_save, sender=Exam)
def on_exam_saved(sender, instance, raw=False, **kwargs):
    """Automatically ensure that if an Exam already has a linked canonical
    Course record, renames and status updates propagate to the Course."""
    if not raw:
        try:
            # Sync existing linked course
            sync_course_for_exam(instance, create_if_missing=False)
        except Exception:
            # Fallback defensively during unready DB states or schema operations
            pass
