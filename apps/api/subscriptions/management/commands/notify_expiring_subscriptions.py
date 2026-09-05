from django.core.management.base import BaseCommand

from core.notification_service import NotificationService


class Command(BaseCommand):
    help = (
        "Sends 'package expiring soon' and 'package expired' notifications "
        "to students with an ACTIVE Subscription. Run this on a schedule "
        "(cron, or the 'notify-expiring-and-expired-subscriptions' Celery "
        "beat entry in backend/celery.py) - nothing calls it automatically "
        "on its own."
    )

    def handle(self, *args, **options):
        expiring_sent = NotificationService.notify_subscription_expiring_soon()
        expired_sent = NotificationService.notify_subscription_expired()
        if not expiring_sent and not expired_sent:
            self.stdout.write("No package expiry notifications to send.")
            return
        self.stdout.write(self.style.SUCCESS(
            f"Sent {expiring_sent} 'package expiring soon' and {expired_sent} 'package expired' notification(s)."
        ))
