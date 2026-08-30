"""Time-based exam lifecycle maintenance.

Examination has no automatic transition once it goes live: an exam that
was 'published' with an end_time sits in that status forever after the
window closes, unless an admin manually archives it. This is the one real,
well-defined periodic job on the exam side (see the Celery beat schedule in
backend/celery.py) - it does not touch anything a student can currently
start, since computed_status already reports 'COMPLETED' for those exams
live, without needing a DB write.
"""
import logging

from django.utils import timezone

logger = logging.getLogger(__name__)

# An expired exam is archived once its end_time is this far in the past,
# not the instant it closes - gives evaluators/admins a grace window to
# still see it under "published" (e.g. reviewing live results) before it
# moves to the archive.
ARCHIVE_GRACE_PERIOD_HOURS = 24


def archive_expired_examinations():
    """Moves 'published' exams whose end_time passed the grace period into
    'archived' status.

    Returns the list of {id, title} rows just archived.
    """
    from datetime import timedelta
    from .models import Examination

    cutoff = timezone.now() - timedelta(hours=ARCHIVE_GRACE_PERIOD_HOURS)

    expired = Examination.objects.filter(
        status='published',
        end_time__isnull=False,
        end_time__lt=cutoff,
    )

    archived = [{'id': e.id, 'title': e.title} for e in expired]
    if archived:
        count = expired.update(status='archived')
        logger.info("Auto-archived %d expired examination(s).", count)

    return archived
