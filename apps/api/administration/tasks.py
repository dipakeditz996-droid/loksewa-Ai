import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='administration.tasks.generate_export_job')
def generate_export_job_task(job_id):
    """Runs one ExportJob in the background. Thin wrapper - see
    export_service.generate_export_job for the actual work; that function is
    also called directly by tests and the `run_export_job` management
    command so it's exercised without needing a live Celery worker."""
    from .models import ExportJob
    from .export_service import generate_export_job

    try:
        job = ExportJob.objects.get(id=job_id)
    except ExportJob.DoesNotExist:
        logger.error("generate_export_job_task: ExportJob %s no longer exists.", job_id)
        return

    generate_export_job(job)
