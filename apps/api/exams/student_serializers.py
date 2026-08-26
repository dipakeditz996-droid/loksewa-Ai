from django.utils import timezone
from rest_framework import serializers

from .models import Examination, ExaminationAttempt, StudentAnswer, Question
from .attempt_timing import (
    attempt_expires_at,
    attempt_remaining_seconds,
    attempt_is_expired,
)

class StudentExaminationSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    exam_name = serializers.CharField(source='exam.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    has_attempted = serializers.SerializerMethodField()
    attempts_used = serializers.SerializerMethodField()
    attempts_remaining = serializers.SerializerMethodField()
    active_attempt_id = serializers.SerializerMethodField()
    can_start = serializers.SerializerMethodField()
    start_blocked_reason = serializers.SerializerMethodField()

    class Meta:
        model = Examination
        fields = [
            'id', 'title', 'description', 'exam_type', 'category_name',
            'exam_name', 'subject_name', 'instructions', 'thumbnail',
            'total_questions', 'time_limit', 'total_marks',
            'passing_marks', 'marks_per_question', 'negative_marking',
            'negative_marking_value', 'max_attempts', 'allow_resume',
            'auto_submit', 'start_time', 'end_time', 'status',
            'has_attempted', 'attempts_used', 'attempts_remaining',
            'active_attempt_id', 'can_start', 'start_blocked_reason',
        ]

    # -- helpers -----------------------------------------------------------
    def _user(self):
        request = self.context.get('request')
        return getattr(request, 'user', None)

    def _attempts(self, obj):
        user = self._user()
        if not user or not user.is_authenticated:
            return ExaminationAttempt.objects.none()
        return obj.attempts.filter(student=user)

    def _active_attempt(self, obj):
        return self._attempts(obj).filter(status='in-progress').first()

    # -- fields ------------------------------------------------------------
    def get_has_attempted(self, obj):
        return self._attempts(obj).exists()

    def get_attempts_used(self, obj):
        return self._attempts(obj).count()

    def get_attempts_remaining(self, obj):
        if obj.max_attempts and obj.max_attempts > 0:
            return max(0, obj.max_attempts - self.get_attempts_used(obj))
        return None  # unlimited

    def get_active_attempt_id(self, obj):
        active = self._active_attempt(obj)
        return active.id if active else None

    def get_can_start(self, obj):
        return self.get_start_blocked_reason(obj) is None

    def get_start_blocked_reason(self, obj):
        user = self._user()
        if not user or not user.is_authenticated:
            return 'Sign in to take this exam.'
        if obj.status not in ('published', 'live'):
            return 'This exam is not currently active.'

        now = timezone.now()
        if obj.start_time and now < obj.start_time:
            return 'This exam has not opened yet.'
        if obj.end_time and now > obj.end_time:
            return 'This exam window has closed.'

        # A resumable attempt always wins over the attempt cap.
        if self._active_attempt(obj):
            return None

        remaining = self.get_attempts_remaining(obj)
        if remaining is not None and remaining <= 0:
            return 'You have used all of your attempts for this exam.'
        return None

class StudentSecureQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            'id', 'text', 'question_type', 'difficulty',
            'option_a', 'option_b', 'option_c', 'option_d',
            'marks', 'negative_marks'
        ]

class StudentAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAnswer
        fields = ['id', 'question', 'selected_option', 'is_correct', 'marks_awarded']
        read_only_fields = ['is_correct', 'marks_awarded']

class AttemptTimingMixin(serializers.Serializer):
    """
    Server-authoritative timing for an ExaminationAttempt.

    The client never invents a deadline: it reads `expires_at` /
    `remaining_seconds` alongside `server_time` so it can correct for clock
    skew, and re-reads them after every refresh or tab reopen.
    """
    time_limit_minutes = serializers.IntegerField(
        source='examination.time_limit', read_only=True
    )
    auto_submit = serializers.BooleanField(
        source='examination.auto_submit', read_only=True
    )
    allow_resume = serializers.BooleanField(
        source='examination.allow_resume', read_only=True
    )
    server_time = serializers.SerializerMethodField()
    expires_at = serializers.SerializerMethodField()
    remaining_seconds = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()

    def get_server_time(self, obj):
        return timezone.now().isoformat()

    def get_expires_at(self, obj):
        expires = attempt_expires_at(obj)
        return expires.isoformat() if expires else None

    def get_remaining_seconds(self, obj):
        return attempt_remaining_seconds(obj)

    def get_is_expired(self, obj):
        return attempt_is_expired(obj)

    def get_is_active(self, obj):
        return obj.status == 'in-progress' and not attempt_is_expired(obj)


TIMING_FIELDS = [
    'time_limit_minutes', 'auto_submit', 'allow_resume',
    'server_time', 'expires_at', 'remaining_seconds',
    'is_expired', 'is_active',
]


class StudentExaminationAttemptSerializer(AttemptTimingMixin, serializers.ModelSerializer):
    examination_title = serializers.CharField(source='examination.title', read_only=True)
    answers = StudentAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = ExaminationAttempt
        fields = [
            'id', 'examination', 'examination_title', 'started_at', 'submitted_at',
            'status', 'score', 'percentage', 'passed', 'time_taken_seconds', 'answers'
        ] + TIMING_FIELDS
        read_only_fields = [
            'examination', 'started_at', 'submitted_at',
            'status', 'score', 'percentage', 'passed', 'time_taken_seconds'
        ]

class StudentExaminationResultSerializer(AttemptTimingMixin, serializers.ModelSerializer):
    """Includes correct answers and explanations for completed exams."""
    examination_title = serializers.CharField(source='examination.title', read_only=True)
    answers = StudentAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = ExaminationAttempt
        fields = [
            'id', 'examination', 'examination_title', 'started_at', 'submitted_at',
            'status', 'score', 'percentage', 'passed', 'time_taken_seconds', 'answers'
        ] + TIMING_FIELDS

class StudentLeaderboardSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    student_id = serializers.IntegerField(source='student__id')
    student_name = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()
    score = serializers.FloatField()
    percentage = serializers.FloatField()
    total_exams = serializers.IntegerField()
    time_taken_seconds = serializers.IntegerField(required=False)
    trend = serializers.CharField(required=False)

    def get_student_name(self, obj):
        first_name = obj.get('student__first_name', '')
        last_name = obj.get('student__last_name', '')
        if first_name or last_name:
            return f"{first_name} {last_name}".strip()
        return obj.get('student__username', 'Unknown')

    def get_profile_image(self, obj):
        return obj.get('student__avatar', None)
