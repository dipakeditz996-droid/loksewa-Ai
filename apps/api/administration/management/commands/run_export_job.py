from django.core.management.base import BaseCommand, CommandError

from administration.models import ExportJob
from administration.export_service import generate_export_job


class Command(BaseCommand):
    help = (
        "Runs one pending ExportJob synchronously (no Celery worker needed) - "
        "useful for local verification. In production this same work happens "
        "via administration.tasks.generate_export_job_task, queued when the "
        "job is created."
    )

    def add_arguments(self, parser):
        parser.add_argument('job_id', type=int)

    def handle(self, *args, **options):
        try:
            job = ExportJob.objects.get(id=options['job_id'])
        except ExportJob.DoesNotExist:
            raise CommandError(f"No ExportJob with id={options['job_id']}")

        generate_export_job(job)
        job.refresh_from_db()

        if job.status == 'completed':
            self.stdout.write(self.style.SUCCESS(
                f"Export job {job.id} completed: {job.row_count} rows -> {job.file.name}"
            ))
        else:
            self.stdout.write(self.style.ERROR(
                f"Export job {job.id} ended with status={job.status}: {job.error_message}"
            ))
