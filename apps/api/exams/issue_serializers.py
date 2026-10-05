"""
Serializers for the Question Issue Report system.

Student:  create + list/retrieve own reports.
Admin:    list/retrieve all, patch status/admin_note.
"""
from rest_framework import serializers
from exams.models import QuestionIssueReport, Question


class QuestionSnippetSerializer(serializers.ModelSerializer):
    """Minimal question context surfaced inside a report."""
    subject_name = serializers.SerializerMethodField()
    topic_name = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id', 'question_id', 'text',
            'question_type',
            'option_a', 'option_b', 'option_c', 'option_d',
            'correct_option',
            'explanation',
            'subject_name', 'topic_name',
        ]

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else None

    def get_topic_name(self, obj):
        return obj.topic.name if obj.topic else None


# ─────────────────────────────────────────────────────────────────────────────
# Student-facing serializers
# ─────────────────────────────────────────────────────────────────────────────

class StudentQuestionIssueReportCreateSerializer(serializers.ModelSerializer):
    """Used for POST /student/question-reports/"""
    # Optional context IDs — validated against objects the student actually owns.
    examination_attempt_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    practice_session_id    = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    question_attempt_id    = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = QuestionIssueReport
        fields = [
            'question',
            'issue_type',
            'description',
            'suggested_correction',
            'evidence_file',
            'examination_attempt_id',
            'practice_session_id',
            'question_attempt_id',
        ]

    def validate_issue_type(self, value):
        valid = {c[0] for c in QuestionIssueReport.ISSUE_TYPE_CHOICES}
        if value not in valid:
            raise serializers.ValidationError(f"Invalid issue type: {value}")
        return value

    def validate(self, attrs):
        request = self.context['request']
        student = request.user
        question = attrs.get('question')
        issue_type = attrs.get('issue_type')

        # Duplicate protection: one active report per (student, question, issue_type).
        existing = QuestionIssueReport.objects.filter(
            student=student,
            question=question,
            issue_type=issue_type,
            status__in=[
                QuestionIssueReport.PENDING,
                QuestionIssueReport.UNDER_REVIEW,
                QuestionIssueReport.NEEDS_INFORMATION,
            ],
        ).first()
        if existing:
            raise serializers.ValidationError(
                {
                    'non_field_errors': [
                        'You already reported this issue. It is currently under review.'
                    ],
                    'existing_report_id': existing.id,
                }
            )
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        student = request.user

        # Pull optional context IDs and resolve them safely.
        attempt_id  = validated_data.pop('examination_attempt_id', None)
        session_id  = validated_data.pop('practice_session_id', None)
        qa_id       = validated_data.pop('question_attempt_id', None)

        from exams.models import ExaminationAttempt, PracticeSession, QuestionAttempt

        examination_attempt = None
        examination = None
        if attempt_id:
            try:
                examination_attempt = ExaminationAttempt.objects.select_related('examination').get(
                    pk=attempt_id, student=student
                )
                examination = examination_attempt.examination
            except ExaminationAttempt.DoesNotExist:
                pass  # silently ignore invalid / other-student attempt

        practice_session = None
        if session_id:
            try:
                practice_session = PracticeSession.objects.get(pk=session_id, user=student)
            except PracticeSession.DoesNotExist:
                pass

        question_attempt = None
        if qa_id:
            try:
                question_attempt = QuestionAttempt.objects.get(
                    pk=qa_id, session__user=student
                )
            except QuestionAttempt.DoesNotExist:
                pass

        report = QuestionIssueReport.objects.create(
            student=student,
            examination=examination,
            examination_attempt=examination_attempt,
            practice_session=practice_session,
            question_attempt=question_attempt,
            **validated_data,
        )

        # Send confirmation notification via existing NotificationService.
        try:
            from core.notification_service import NotificationService
            NotificationService.notify_question_report_submitted(student, report)
        except Exception:
            pass

        return report


class StudentQuestionIssueReportListSerializer(serializers.ModelSerializer):
    """Read-only, student-facing — no admin_note, no reviewed_by details."""
    issue_type_display = serializers.CharField(source='get_issue_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    question_id_label = serializers.CharField(source='question.question_id', read_only=True)
    question_text = serializers.CharField(source='question.text', read_only=True)
    has_evidence = serializers.SerializerMethodField()

    class Meta:
        model = QuestionIssueReport
        fields = [
            'id',
            'question', 'question_id_label', 'question_text',
            'issue_type', 'issue_type_display',
            'description',
            'suggested_correction',
            'has_evidence',
            'status', 'status_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_has_evidence(self, obj):
        return bool(obj.evidence_file)


# ─────────────────────────────────────────────────────────────────────────────
# Admin-facing serializers
# ─────────────────────────────────────────────────────────────────────────────

class AdminQuestionIssueReportListSerializer(serializers.ModelSerializer):
    issue_type_display = serializers.CharField(source='get_issue_type_display', read_only=True)
    status_display     = serializers.CharField(source='get_status_display', read_only=True)
    question_id_label  = serializers.CharField(source='question.question_id', read_only=True)
    question_text      = serializers.SerializerMethodField()
    student_name       = serializers.SerializerMethodField()
    student_email      = serializers.SerializerMethodField()
    has_evidence       = serializers.SerializerMethodField()
    # Aggregate — how many total reports exist for this question.
    reports_for_question = serializers.SerializerMethodField()

    class Meta:
        model = QuestionIssueReport
        fields = [
            'id',
            'question', 'question_id_label', 'question_text',
            'issue_type', 'issue_type_display',
            'status', 'status_display',
            'student_name', 'student_email',
            'has_evidence',
            'reports_for_question',
            'created_at',
        ]

    def get_question_text(self, obj):
        return (obj.question.text or '')[:120]

    def get_student_name(self, obj):
        u = obj.student
        return u.get_full_name() or u.username

    def get_student_email(self, obj):
        return obj.student.email

    def get_has_evidence(self, obj):
        return bool(obj.evidence_file)

    def get_reports_for_question(self, obj):
        # Use annotation injected by the viewset queryset when available.
        return getattr(obj, '_reports_count', None)


class AdminQuestionIssueReportDetailSerializer(serializers.ModelSerializer):
    issue_type_display = serializers.CharField(source='get_issue_type_display', read_only=True)
    status_display     = serializers.CharField(source='get_status_display', read_only=True)
    question_detail    = QuestionSnippetSerializer(source='question', read_only=True)
    student_name       = serializers.SerializerMethodField()
    student_email      = serializers.SerializerMethodField()
    reviewed_by_name   = serializers.SerializerMethodField()
    evidence_url       = serializers.SerializerMethodField()

    # Context: exam title and attempt info where available.
    examination_title  = serializers.SerializerMethodField()
    attempt_info       = serializers.SerializerMethodField()

    class Meta:
        model = QuestionIssueReport
        fields = [
            'id',
            'question', 'question_detail',
            'issue_type', 'issue_type_display',
            'description', 'suggested_correction',
            'evidence_url',
            'status', 'status_display',
            'admin_note',
            'student_name', 'student_email',
            'reviewed_by_name', 'reviewed_at',
            'examination_title', 'attempt_info',
            'created_at', 'updated_at',
        ]
        read_only_fields = [f for f in fields if f not in ('status', 'admin_note')]

    def get_student_name(self, obj):
        u = obj.student
        return u.get_full_name() or u.username

    def get_student_email(self, obj):
        return obj.student.email

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None

    def get_evidence_url(self, obj):
        if not obj.evidence_file:
            return None
        request = self.context.get('request')
        try:
            url = obj.evidence_file.url
            if request:
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return None

    def get_examination_title(self, obj):
        return obj.examination.title if obj.examination else None

    def get_attempt_info(self, obj):
        if not obj.examination_attempt:
            return None
        a = obj.examination_attempt
        return {
            'attempt_id': a.id,
            'started_at': a.started_at,
            'status': a.status,
        }


class AdminQuestionIssueReportPatchSerializer(serializers.ModelSerializer):
    """Handles status transitions + admin note."""

    ALLOWED_STATUSES = {
        QuestionIssueReport.UNDER_REVIEW,
        QuestionIssueReport.RESOLVED,
        QuestionIssueReport.REJECTED,
        QuestionIssueReport.NEEDS_INFORMATION,
    }

    class Meta:
        model = QuestionIssueReport
        fields = ['status', 'admin_note']

    def validate_status(self, value):
        if value not in self.ALLOWED_STATUSES:
            raise serializers.ValidationError(
                f"Admin cannot set status to '{value}'. "
                f"Allowed: {sorted(self.ALLOWED_STATUSES)}"
            )
        return value

    def update(self, instance, validated_data):
        from django.utils import timezone
        request = self.context['request']
        new_status = validated_data.get('status', instance.status)

        instance.status = new_status
        if 'admin_note' in validated_data:
            instance.admin_note = validated_data['admin_note']

        if new_status != QuestionIssueReport.PENDING:
            instance.reviewed_by = request.user
            instance.reviewed_at = timezone.now()

        instance.save()

        # Notify student on meaningful status transitions.
        try:
            from core.notification_service import NotificationService
            if new_status == QuestionIssueReport.RESOLVED:
                NotificationService.notify_question_report_resolved(instance.student, instance)
            elif new_status == QuestionIssueReport.REJECTED:
                NotificationService.notify_question_report_rejected(instance.student, instance)
            elif new_status == QuestionIssueReport.NEEDS_INFORMATION:
                NotificationService.notify_question_report_needs_info(instance.student, instance)
        except Exception:
            pass

        return instance
