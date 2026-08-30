from django.core.management.base import BaseCommand

from exams.lifecycle_service import archive_expired_examinations, ARCHIVE_GRACE_PERIOD_HOURS


class Command(BaseCommand):
    help = (
        f"Archives 'published' exams whose end_time passed more than "
        f"{ARCHIVE_GRACE_PERIOD_HOURS} hours ago. Run this on a schedule (cron, "
        "or the 'archive-expired-examinations' Celery beat entry in "
        "backend/celery.py) - nothing calls it automatically on its own."
    )

    def handle(self, *args, **options):
        archived = archive_expired_examinations()
        if not archived:
            self.stdout.write("No expired examinations to archive.")
            return
        for e in archived:
            self.stdout.write(self.style.SUCCESS(f"Archived '{e['title']}' (id={e['id']})."))
