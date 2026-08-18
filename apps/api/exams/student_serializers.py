from rest_framework import serializers
from .models import Examination, ExaminationAttempt, StudentAnswer, Question

class StudentExaminationSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    exam_name = serializers.CharField(source='exam.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    has_attempted = serializers.SerializerMethodField()

    class Meta:
        model = Examination
        fields = [
            'id', 'title', 'description', 'exam_type', 'category_name', 
            'exam_name', 'subject_name', 'instructions', 'thumbnail', 
            'total_questions', 'time_limit', 'total_marks', 
            'passing_marks', 'marks_per_question', 'negative_marking', 
            'negative_marking_value', 'max_attempts', 'allow_resume', 
            'start_time', 'end_time', 'status', 'has_attempted'
        ]
        
    def get_has_attempted(self, obj):
        user = self.context['request'].user
        if not user.is_authenticated:
            return False
        return obj.attempts.filter(student=user).exists()

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

class StudentExaminationAttemptSerializer(serializers.ModelSerializer):
    examination_title = serializers.CharField(source='examination.title', read_only=True)
    answers = StudentAnswerSerializer(many=True, read_only=True)
    
    class Meta:
        model = ExaminationAttempt
        fields = [
            'id', 'examination', 'examination_title', 'started_at', 'submitted_at', 
            'status', 'score', 'percentage', 'passed', 'time_taken_seconds', 'answers'
        ]
        read_only_fields = [
            'examination', 'started_at', 'submitted_at', 
            'status', 'score', 'percentage', 'passed', 'time_taken_seconds'
        ]

class StudentExaminationResultSerializer(serializers.ModelSerializer):
    """Includes correct answers and explanations for completed exams."""
    examination_title = serializers.CharField(source='examination.title', read_only=True)
    answers = StudentAnswerSerializer(many=True, read_only=True)
    
    class Meta:
        model = ExaminationAttempt
        fields = [
            'id', 'examination', 'examination_title', 'started_at', 'submitted_at', 
            'status', 'score', 'percentage', 'passed', 'time_taken_seconds', 'answers'
        ]

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
