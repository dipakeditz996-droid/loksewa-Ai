from django.core.management.base import BaseCommand

from core.notification_service import NotificationService


class Command(BaseCommand):
    help = (
        "Sends a 'starting soon' notification to every eligible student for "
        "each published exam starting within the next 30 minutes. Run this on "
        "a schedule (cron, or the 'notify-exams-starting-soon' Celery beat "
        "entry in backend/celery.py) - nothing calls it automatically on its own."
    )

    def handle(self, *args, **options):
        sent = NotificationService.notify_exams_starting_soon()
        if not sent:
            self.stdout.write("No 'exam starting soon' notifications to send.")
            return
        self.stdout.write(self.style.SUCCESS(f"Sent {sent} 'exam starting soon' notification(s)."))
