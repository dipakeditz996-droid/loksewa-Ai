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


@shared_task(name='exams.tasks.process_subjective_submission_task')
def process_subjective_submission_task(submission_id: int):
    """Asynchronously extracts handwritten text, maps answers, and grades subjective submission."""
    from .models import SubjectiveSubmission
    from .subjective_auto_marking_service import SubjectiveAutoMarkingService

    try:
        submission = SubjectiveSubmission.objects.select_related('attempt', 'attempt__examination').get(pk=submission_id)
        service = SubjectiveAutoMarkingService()
        result = service.evaluate_submission(submission)
        logger.info("Auto-evaluated subjective submission #%d: %s", submission_id, result.get('evaluation_status'))
        return result
    except SubjectiveSubmission.DoesNotExist:
        logger.warning("Subjective submission #%d not found for background auto-marking.", submission_id)
        return None
    except Exception as e:
        logger.exception("Failed to auto-evaluate subjective submission #%d: %s", submission_id, e)
        try:
            sub = SubjectiveSubmission.objects.get(pk=submission_id)
            sub.evaluation_status = 'needs_review'
            sub.save(update_fields=['evaluation_status'])
        except Exception:
            pass
        return None


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

