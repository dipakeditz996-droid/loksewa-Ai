import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='exams.tasks.archive_expired_examinations')
def archive_expired_examinations():
    """Beat-scheduled wrapper - see lifecycle_service.archive_expired_examinations
    for what this actually does. Also callable directly via the
    `archive_expired_examinations` management command, without Celery."""
    from .lifecycle_service import archive_expired_examinations as _archive

    archived = _archive()
    if archived:
        logger.info("Auto-archived %d examination(s): %s", len(archived), archived)
    return archived


@shared_task(name='exams.tasks.notify_exams_starting_soon')
def notify_exams_starting_soon():
    """Beat-scheduled wrapper - see NotificationService.notify_exams_starting_soon
    for what this actually does. Also callable directly via the
    `notify_exams_starting_soon` management command, without Celery."""
    from core.notification_service import NotificationService

    sent = NotificationService.notify_exams_starting_soon()
    if sent:
        logger.info("Sent %d 'exam starting soon' notification(s).", sent)
    return sent
