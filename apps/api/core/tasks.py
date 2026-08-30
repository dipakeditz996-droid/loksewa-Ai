import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='core.tasks.dispatch_scheduled_notifications')
def dispatch_scheduled_notifications():
    """Beat-scheduled wrapper - see notification_service.dispatch_due_scheduled_notifications
    for what this actually does. Kept thin on purpose: the same function is
    also called directly by the `dispatch_scheduled_notifications` management
    command, so the real logic is exercised (and testable) without Celery."""
    from .notification_service import dispatch_due_scheduled_notifications

    results = dispatch_due_scheduled_notifications()
    if results:
        logger.info("Dispatched %d scheduled notification(s): %s", len(results), results)
    return results
