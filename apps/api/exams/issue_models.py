"""
QuestionIssueReport model.

Students can flag a question as having an error (wrong answer, typo, etc).
This is *evidence* for Admin review — it never auto-modifies the Question.
The canonical Question model in exams.models remains the single source of truth.
"""
from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError


ALLOWED_EVIDENCE_EXTENSIONS = frozenset([
    'jpg', 'jpeg', 'png', 'webp', 'pdf',
])
EVIDENCE_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_evidence_file(file):
    ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
    if ext not in ALLOWED_EVIDENCE_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file type '.{ext}'. Allowed: "
            + ', '.join(sorted(ALLOWED_EVIDENCE_EXTENSIONS))
        )
    if file.size > EVIDENCE_MAX_BYTES:
        raise ValidationError("Evidence file must be 10 MB or smaller.")


class QuestionIssueReport(models.Model):
    # ── Issue type choices (stored as stable backend codes) ───────────────
    WRONG_QUESTION     = 'WRONG_QUESTION'
    WRONG_ANSWER       = 'WRONG_ANSWER'
    WRONG_EXPLANATION  = 'WRONG_EXPLANATION'
    TYPO               = 'TYPO'
    AMBIGUOUS          = 'AMBIGUOUS'
    DUPLICATE          = 'DUPLICATE'
    WRONG_SUBJECT_TOPIC = 'WRONG_SUBJECT_TOPIC'
    OTHER              = 'OTHER'

    ISSUE_TYPE_CHOICES = [
        (WRONG_QUESTION,      'Wrong Question'),
        (WRONG_ANSWER,        'Wrong Answer'),
        (WRONG_EXPLANATION,   'Wrong Explanation'),
        (TYPO,                'Typo / Spelling Mistake'),
        (AMBIGUOUS,           'Confusing / Ambiguous'),
        (DUPLICATE,           'Duplicate Question'),
        (WRONG_SUBJECT_TOPIC, 'Wrong Subject / Topic'),
        (OTHER,               'Other'),
    ]

    # ── Status state machine ──────────────────────────────────────────────
    PENDING          = 'PENDING'
    UNDER_REVIEW     = 'UNDER_REVIEW'
    RESOLVED         = 'RESOLVED'
    REJECTED         = 'REJECTED'
    NEEDS_INFORMATION = 'NEEDS_INFORMATION'

    STATUS_CHOICES = [
        (PENDING,           'Pending'),
        (UNDER_REVIEW,      'Under Review'),
        (RESOLVED,          'Resolved'),
        (REJECTED,          'Rejected'),
        (NEEDS_INFORMATION, 'Needs Information'),
    ]

    # ── Core fields ───────────────────────────────────────────────────────
    question = models.ForeignKey(
        'exams.Question',
        on_delete=models.CASCADE,
        related_name='issue_reports',
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='question_issue_reports',
    )
    issue_type = models.CharField(max_length=20, choices=ISSUE_TYPE_CHOICES)
    description = models.TextField(max_length=2000)
    suggested_correction = models.TextField(max_length=1000, blank=True)
    evidence_file = models.FileField(
        upload_to='question_reports/evidence/%Y/%m/',
        null=True, blank=True,
        max_length=500,
        validators=[validate_evidence_file],
    )

    # ── Status & admin fields ─────────────────────────────────────────────
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=PENDING, db_index=True,
    )
    admin_note = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reviewed_question_reports',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # ── Optional context FKs ──────────────────────────────────────────────
    examination = models.ForeignKey(
        'exams.Examination', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='question_issue_reports',
    )
    examination_attempt = models.ForeignKey(
        'exams.ExaminationAttempt', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='question_issue_reports',
    )
    practice_session = models.ForeignKey(
        'exams.PracticeSession', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='question_issue_reports',
    )
    question_attempt = models.ForeignKey(
        'exams.QuestionAttempt', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='question_issue_reports',
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['question', 'status']),
            models.Index(fields=['student', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'question', 'issue_type'],
                condition=models.Q(status__in=['PENDING', 'UNDER_REVIEW', 'NEEDS_INFORMATION']),
                name='unique_active_student_question_issue',
            )
        ]

    def __str__(self):
        return (
            f"[{self.get_status_display()}] {self.get_issue_type_display()} "
            f"— Q{self.question_id} by student#{self.student_id}"
        )
