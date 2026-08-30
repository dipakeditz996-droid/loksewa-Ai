from django.core.management.base import BaseCommand

from core.notification_service import dispatch_due_scheduled_notifications


class Command(BaseCommand):
    help = (
        "Delivers every AdminNotification whose scheduled_for time has arrived. "
        "Run this on a schedule (cron, or the 'dispatch-scheduled-notifications' "
        "Celery beat entry in backend/celery.py) - nothing calls it automatically "
        "on its own."
    )

    def handle(self, *args, **options):
        results = dispatch_due_scheduled_notifications()
        if not results:
            self.stdout.write("No scheduled notifications were due.")
            return
        for r in results:
            self.stdout.write(self.style.SUCCESS(
                f"Sent '{r['title']}' (id={r['id']}) to {r['delivered']} recipient(s)."
            ))
