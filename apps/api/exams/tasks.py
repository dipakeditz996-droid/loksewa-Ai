import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='exams.tasks.archive_expired_examinations')
def archive_expired_examinations():
    """Beat-scheduled wrapper - see lifecycle_service.archive_expired_examinations
    for what this actually does. Also callable directly via the
    `archive_expired_examinations` management command, without Celery."""
    from .lifecycle_service import archive_expired_examinations as _archive

    archived = _archive()
    if archived:
        logger.info("Auto-archived %d examination(s): %s", len(archived), archived)
    return archived


@shared_task(name='exams.tasks.notify_exams_starting_soon')
def notify_exams_starting_soon():
    """Beat-scheduled wrapper - see NotificationService.notify_exams_starting_soon
    for what this actually does. Also callable directly via the
    `notify_exams_starting_soon` management command, without Celery."""
    from core.notification_service import NotificationService

    sent = NotificationService.notify_exams_starting_soon()
    if sent:
        logger.info("Sent %d 'exam starting soon' notification(s).", sent)
    return sent


def run_subjective_submission_processing(submission_id: int):
    """Core function to extract handwritten text, map answers, and evaluate subjective submission."""
    from .models import SubjectiveSubmission
    from .subjective_auto_marking_service import SubjectiveAutoMarkingService

    logger.info("Starting processing pipeline for subjective submission #%d", submission_id)
    try:
        submission = SubjectiveSubmission.objects.select_related('attempt', 'attempt__examination').get(pk=submission_id)
        service = SubjectiveAutoMarkingService()
        result = service.evaluate_submission(submission)
        logger.info("Successfully evaluated subjective submission #%d: status=%s, scores=%d",
                    submission_id, result.get('evaluation_status'), len(result.get('uncertain_questions', [])))
        return result
    except SubjectiveSubmission.DoesNotExist:
        logger.warning("Subjective submission #%d not found for background auto-marking.", submission_id)
        return None
    except Exception as e:
        logger.exception("Failed to auto-evaluate subjective submission #%d: %s", submission_id, e)
        try:
            sub = SubjectiveSubmission.objects.get(pk=submission_id)
            if sub.ocr_status != 'completed':
                sub.ocr_status = 'failed'
            sub.ocr_error = str(e)
            sub.evaluation_status = 'needs_review'
            sub.status = 'under_review'
            sub.save(update_fields=['ocr_status', 'ocr_error', 'evaluation_status', 'status'])
        except Exception:
            pass
        return None


@shared_task(name='exams.tasks.process_subjective_submission_task')
def process_subjective_submission_task(submission_id: int):
    """Celery-scheduled wrapper for subjective submission OCR & evaluation."""
    return run_subjective_submission_processing(submission_id)


def dispatch_subjective_submission_processing(submission_id: int) -> str:
    """
    Guarantees asynchronous execution of subjective OCR & grading:
    1. If Celery task is eager or a live Celery worker is active on the broker,
       enqueues via Celery task.
    2. Otherwise (broker unreachable, no Celery worker running, or standalone web process),
       spawns an asynchronous background daemon thread with clean DB connection management.
    Returns: task_id (str)
    """
    import threading
    import uuid
    from django.conf import settings
    from django.db import connection

    task_id = f"task-{uuid.uuid4().hex[:12]}"

    import sys
    # Check eager execution (e.g. testing or CELERY_TASK_ALWAYS_EAGER)
    if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False) or 'test' in sys.argv:
        try:
            res = process_subjective_submission_task.apply(args=[submission_id])
            logger.info("Executed submission #%d via eager task %s", submission_id, res.id)
            return str(res.id)
        except Exception as e:
            logger.warning("Eager task execution failed, running directly: %s", e)
            run_subjective_submission_processing(submission_id)
            return task_id

    # Check if a live Celery worker is reachable without blocking
    celery_dispatched = False
    try:
        from backend.celery import app as celery_app
        # Only attempt if broker is configured and not default unconfigured localhost
        broker_url = getattr(settings, 'CELERY_BROKER_URL', '')
        if broker_url and 'redis' in broker_url:
            # Check worker ping with a fast timeout (0.2s)
            pings = celery_app.control.ping(timeout=0.2)
            if pings:
                res = process_subjective_submission_task.apply_async(args=[submission_id])
                logger.info("Enqueued submission #%d to active Celery worker %s", submission_id, res.id)
                task_id = str(res.id)
                celery_dispatched = True
    except Exception as ping_err:
        logger.debug("Celery worker not available: %s. Using thread worker.", ping_err)

    if not celery_dispatched:
        def _thread_worker(sub_id: int):
            connection.close()  # clean per-thread connection
            try:
                run_subjective_submission_processing(sub_id)
            except Exception as thread_err:
                logger.exception("Background thread failed for submission #%d: %s", sub_id, thread_err)
            finally:
                connection.close()

        thread = threading.Thread(
            target=_thread_worker,
            args=(submission_id,),
            name=f"subjective-eval-{submission_id}",
            daemon=True,
        )
        thread.start()
        logger.info("Dispatched subjective submission #%d to background thread %s", submission_id, task_id)

    return task_id


@shared_task(name='exams.tasks.process_expert_solution_task')
def process_expert_solution_task(examination_id: int):
    """Asynchronously extracts text from Expert Solution PDF and generates proposed rubrics."""
    from .models import Examination
    from .subjective_expert_service import SubjectiveExpertSolutionService

    try:
        exam = Examination.objects.get(pk=examination_id)
        service = SubjectiveExpertSolutionService()
        result = service.process_expert_solution_pdf(exam)
        logger.info("Processed expert solution for examination #%d: %d questions", examination_id, result.get('total_questions_processed', 0))
        return result
    except Examination.DoesNotExist:
        logger.warning("Examination #%d not found for expert solution processing.", examination_id)
        return None
    except Exception as e:
        logger.exception("Failed to process expert solution for examination #%d: %s", examination_id, e)
        return None

