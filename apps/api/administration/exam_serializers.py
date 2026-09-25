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
    course_title = serializers.CharField(source='course.title', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    question_set_name = serializers.CharField(source='question_set.name', read_only=True)
    attempts_count = serializers.SerializerMethodField()

    class Meta:
        model = Examination
        fields = [
            'id', 'title', 'description', 'exam_type', 'objective_category', 'category', 'category_name',
            'course', 'course_title',
            'exam', 'exam_name', 'subject', 'subject_name', 'question_set', 'question_set_name',
            'instructions', 'thumbnail', 'total_questions', 'time_limit', 'total_marks', 
            'passing_marks', 'marks_per_question', 'negative_marking', 'negative_marking_value',
            'max_attempts', 'allow_resume', 'auto_submit', 'result_visibility', 
            'show_correct_answers', 'randomize_questions', 'randomize_options', 
            'start_time', 'end_time', 'status', 'created_at', 'updated_at', 
            'eligibility_rules', 'attempts_count',
            'question_paper_pdf', 'question_paper_page_count', 'question_paper_file_size',
            'answer_upload_enabled', 'upload_deadline_minutes', 'upload_start_time',
            'upload_end_time', 'allowed_file_types', 'max_upload_size_mb', 'evaluation_type'
        ]
        read_only_fields = [
            'created_by', 'status', 'question_paper_page_count', 'question_paper_file_size'
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        # If course is not explicitly provided, attempt to auto-resolve from the exam
        if not attrs.get('course') and (attrs.get('exam') or getattr(self.instance, 'exam', None)):
            exam_obj = attrs.get('exam') or getattr(self.instance, 'exam', None)
            from courses.models import Course
            course_match = Course.objects.filter(exam=exam_obj).first()
            if course_match:
                attrs['course'] = course_match
        # Conversely, if course is provided but exam is not, sync exam from course
        if attrs.get('course') and not attrs.get('exam') and not getattr(self.instance, 'exam', None):
            course_obj = attrs['course']
            if course_obj.exam:
                attrs['exam'] = course_obj.exam
        return attrs

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
