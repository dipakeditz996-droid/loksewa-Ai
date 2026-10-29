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


@shared_task(
    bind=True,
    name='core.tasks.send_otp_email_task',
    max_retries=3,
    default_retry_delay=15,
)
def send_otp_email_task(self, to_email: str, code: str, purpose: str):
    """Sends an OTP email asynchronously in the background via Celery.
    Retries on transient network errors.
    """
    from .email_service import send_otp_email
    try:
        send_otp_email(to_email, code, purpose)
    except Exception as exc:
        logger.warning("send_otp_email_task failed for purpose=%s (retrying): %s", purpose, exc)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    name='core.tasks.process_email_delivery_task',
    max_retries=3,
    default_retry_delay=15,
)
def process_email_delivery_task(self, log_id: int):
    """Asynchronously processes an email delivery log and retries on failure."""
    from .email_notification_service import process_email_delivery
    try:
        success = process_email_delivery(log_id)
        if not success:
            logger.warning("process_email_delivery returned False for log_id=%s", log_id)
    except Exception as exc:
        logger.warning("process_email_delivery_task failed for log_id=%s (retrying): %s", log_id, exc)
        raise self.retry(exc=exc)


