import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='subscriptions.tasks.notify_expiring_and_expired_subscriptions')
def notify_expiring_and_expired_subscriptions():
    """Beat-scheduled wrapper - see NotificationService.notify_subscription_expiring_soon
    and .notify_subscription_expired for what this actually does. Also
    callable directly via the `notify_expiring_subscriptions` management
    command, without Celery."""
    from core.notification_service import NotificationService

    expiring_sent = NotificationService.notify_subscription_expiring_soon()
    expired_sent = NotificationService.notify_subscription_expired()
    if expiring_sent or expired_sent:
        logger.info(
            "Sent %d 'package expiring soon' and %d 'package expired' notification(s).",
            expiring_sent, expired_sent,
        )
    return {'expiring_soon': expiring_sent, 'expired': expired_sent}
