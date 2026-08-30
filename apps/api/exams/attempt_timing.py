"""
Server-authoritative timing and finalisation for ExaminationAttempt.

Everything about "is this attempt still running and how long is left" is
derived here from `ExaminationAttempt.started_at` (a server timestamp) and
`Examination.time_limit`. Nothing is duplicated into extra DB columns and no
second timer exists: the client renders whatever this module reports.
"""
from django.db import transaction
from django.utils import timezone

from .models import StudentAnswer


def attempt_time_limit_seconds(attempt):
    """Total allowed seconds for the attempt, or None if the exam is untimed."""
    limit = getattr(attempt.examination, 'time_limit', None)
    if not limit or limit <= 0:
        return None
    return int(limit) * 60


def attempt_expires_at(attempt):
    """Absolute server deadline for an attempt, or None when untimed."""
    total = attempt_time_limit_seconds(attempt)
    if total is None or attempt.started_at is None:
        return None
    return attempt.started_at + timezone.timedelta(seconds=total)


def attempt_remaining_seconds(attempt):
    """Seconds left, floored at 0. None when the exam is untimed."""
    expires = attempt_expires_at(attempt)
    if expires is None:
        return None
    if attempt.status != 'in-progress':
        return 0
    return max(0, int((expires - timezone.now()).total_seconds()))


def attempt_is_expired(attempt):
    """True when a still-in-progress attempt has run past its deadline."""
    if attempt.status != 'in-progress':
        return False
    remaining = attempt_remaining_seconds(attempt)
    return remaining is not None and remaining <= 0


@transaction.atomic
def finalize_attempt(attempt, auto=False):
    """
    Score and close an in-progress attempt. Idempotent: calling it on an
    already-submitted attempt is a no-op, which is what makes multi-tab
    submits and expiry-races safe.

    When `auto` is True the attempt is being closed because its server
    deadline passed; time_taken is clamped to the exam's time limit.
    """
    attempt.refresh_from_db()
    if attempt.status != 'in-progress':
        return attempt

    examination = attempt.examination
    answers = StudentAnswer.objects.filter(attempt=attempt).select_related('question')

    score = 0
    total_possible = examination.total_marks

    for answer in answers:
        question = answer.question
        answer.is_correct = False
        answer.marks_awarded = 0
        if answer.selected_option and question.correct_option:
            if answer.selected_option.upper() == question.correct_option.upper():
                answer.is_correct = True
                answer.marks_awarded = question.marks
                score += question.marks
            elif examination.negative_marking:
                score -= examination.negative_marking_value
        answer.save()

    score = max(0, score)
    percentage = round((score / total_possible * 100), 2) if total_possible > 0 else 0

    now = timezone.now()
    attempt.score = score
    attempt.percentage = percentage
    attempt.passed = score >= examination.passing_marks
    attempt.submitted_at = attempt_expires_at(attempt) if auto else now
    attempt.status = 'submitted'

    if attempt.started_at and attempt.submitted_at:
        attempt.time_taken_seconds = max(
            0, int((attempt.submitted_at - attempt.started_at).total_seconds())
        )

    attempt.save()

    # Award XP for examination attempt completion
    try:
        from gamification.services import award_xp
        # Base XP for completion + XP based on score percentage
        xp_to_award = 10 + int(attempt.percentage / 10)
        award_xp(attempt.student, xp_to_award, f"Examination Attempt Completed: {attempt.examination.title}")
    except Exception:
        pass

    # Deferred to on_commit: finalize_attempt runs inside @transaction.atomic,
    # so creating the notification here directly would leave an orphan row if
    # anything above it rolled back.
    from core.notification_service import NotificationService
    transaction.on_commit(lambda: NotificationService.notify_result_published(attempt))

    return attempt


def enforce_expiry(attempt):
    """
    Close the attempt if its deadline has passed. Returns True when the
    attempt was expired (and is therefore now submitted).
    """
    if attempt_is_expired(attempt):
        finalize_attempt(attempt, auto=True)
        return True
    return False
