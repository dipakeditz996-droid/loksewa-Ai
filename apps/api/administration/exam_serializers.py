from rest_framework import serializers
from exams.models import Examination, ExaminationEligibility, ExaminationAttempt, StudentAnswer
from .question_serializers import AdminQuestionSerializer

class ExaminationEligibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExaminationEligibility
        fields = ['id', 'target_category', 'target_position', 'is_global']

class ExaminationSerializer(serializers.ModelSerializer):
    eligibility_rules = ExaminationEligibilitySerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    exam_name = serializers.CharField(source='exam.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    question_set_name = serializers.CharField(source='question_set.name', read_only=True)
    attempts_count = serializers.SerializerMethodField()

    class Meta:
        model = Examination
        fields = [
            'id', 'title', 'description', 'exam_type', 'category', 'category_name', 
            'exam', 'exam_name', 'subject', 'subject_name', 'question_set', 'question_set_name',
            'instructions', 'thumbnail', 'total_questions', 'time_limit', 'total_marks', 
            'passing_marks', 'marks_per_question', 'negative_marking', 'negative_marking_value',
            'max_attempts', 'allow_resume', 'auto_submit', 'result_visibility', 
            'show_correct_answers', 'randomize_questions', 'randomize_options', 
            'start_time', 'end_time', 'status', 'created_at', 'updated_at', 
            'eligibility_rules', 'attempts_count'
        ]
        read_only_fields = ['created_by', 'status']

    def get_attempts_count(self, obj):
        return obj.attempts.count()

class ExaminationAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    
    class Meta:
        model = ExaminationAttempt
        fields = [
            'id', 'student', 'student_name', 'started_at', 'submitted_at', 
            'status', 'score', 'percentage', 'passed', 'time_taken_seconds'
        ]
