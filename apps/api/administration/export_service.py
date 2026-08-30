"""Background CSV export generation.

AdminAuditLogExportView (the original synchronous endpoint) built the whole
export in-request and streamed it straight back - workable for a small
dataset, but audit logs grow without bound and nothing in the codebase ever
linked to that endpoint from the frontend anyway. generate_export_job()
does the same generation as a Celery job instead: the file lands in the
project's normal file storage (whatever STORAGES['default'] is configured
to - local disk in dev, R2/S3/Drive in production, same as every other
FileField) and the ExportJob row tracks progress so an admin can poll it
without holding a request open.
"""
import csv
import io
import logging

from django.core.files.base import ContentFile
from django.utils import timezone

logger = logging.getLogger(__name__)


def _generate_audit_logs_csv(filters):
    from .views import _collect_audit_events, _filter_by_search

    category_filter = filters.get('action', '')
    search = filters.get('search', '')

    events = _filter_by_search(_collect_audit_events(), search)
    if category_filter and category_filter != 'all':
        events = [e for e in events if e['category'] == category_filter]

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(['Timestamp', 'Action', 'User', 'Email', 'Details', 'Severity'])
    for e in events:
        writer.writerow([
            e['timestamp'].isoformat(), e['actionLabel'], e['user'], e['email'], e['details'], e['severity'],
        ])
    return buffer.getvalue(), len(events)


_GENERATORS = {
    'audit_logs': _generate_audit_logs_csv,
}


def generate_export_job(job):
    """Runs the export for one ExportJob and writes the result onto it.

    Takes the model instance (not just an id) so both the Celery task and
    the management command - and tests - can call it directly without an
    extra DB round trip to re-fetch it.
    """
    generator = _GENERATORS.get(job.export_type)
    if generator is None:
        job.status = 'failed'
        job.error_message = f"Unknown export_type: {job.export_type}"
        job.save(update_fields=['status', 'error_message'])
        return job

    job.status = 'processing'
    job.save(update_fields=['status'])

    try:
        csv_text, row_count = generator(job.filters or {})
        filename = f"{job.export_type}-{job.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}.csv"
        job.file.save(filename, ContentFile(csv_text.encode('utf-8')), save=False)
        job.row_count = row_count
        job.status = 'completed'
        job.completed_at = timezone.now()
        job.save(update_fields=['file', 'row_count', 'status', 'completed_at'])
        _notify_export_ready(job)
    except Exception as exc:
        logger.exception("Export job %s failed.", job.id)
        job.status = 'failed'
        job.error_message = str(exc)[:2000]
        job.save(update_fields=['status', 'error_message'])

    return job


def _notify_export_ready(job):
    """Best-effort: in-app notification always; email only if the platform
    actually has email configured. There's no SMTP backend wired into this
    project yet (AdminSettings.enable_email_notifications exists as a
    toggle, but nothing sends real mail when it's on), so for now this is
    the honest version of "email delivery" - the moment a real email
    backend exists, sending here is a few lines, not a redesign.
    """
    if not job.requested_by:
        return
    try:
        from core.models import AdminSettings, Notification
        admin_settings = AdminSettings.get_settings()
        if not admin_settings.notifications_enabled or not admin_settings.enable_in_app_notifications:
            return
        Notification.objects.create(
            recipient=job.requested_by,
            type='system',
            title='Export Ready',
            message=f"Your {job.get_export_type_display()} export ({job.row_count} rows) is ready to download.",
            action_url='/admin-dashboard/audit-logs',
        )
    except Exception:
        logger.exception("Failed to notify about completed export job %s.", job.id)
