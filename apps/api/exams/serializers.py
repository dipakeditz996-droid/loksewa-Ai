from rest_framework import serializers
from .models import Exam, Subject, Chapter, Topic, Question, PracticeSession, QuestionAttempt, UserTopicProgress

class TopicSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    accuracy = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    title = serializers.CharField(source='name')

    class Meta:
        model = Topic
        fields = ['id', 'title', 'name', 'status', 'progress', 'accuracy', 'description']

    def get_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 'not-started'
        progress = UserTopicProgress.objects.filter(user=request.user, topic=obj).first()
        return progress.status if progress else 'not-started'

    def get_progress(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        progress = UserTopicProgress.objects.filter(user=request.user, topic=obj).first()
        return progress.progress if progress else 0

    def get_accuracy(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        progress = UserTopicProgress.objects.filter(user=request.user, topic=obj).first()
        return progress.accuracy if progress else None

class ChapterSerializer(serializers.ModelSerializer):
    topics = TopicSerializer(many=True, read_only=True)

    class Meta:
        model = Chapter
        fields = ['id', 'title', 'topics']

class SubjectSerializer(serializers.ModelSerializer):
    chapters = ChapterSerializer(many=True, read_only=True)
    units = ChapterSerializer(source='chapters', many=True, read_only=True)
    progress = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    title = serializers.CharField(source='name')
    
    class Meta:
        model = Subject
        fields = ['id', 'title', 'name', 'code', 'progress', 'description', 'chapters', 'units']

    def get_progress(self, obj):
        # Calculate subject progress based on topics (Mocking 0 for now unless fully implemented)
        # We will just return 0 to prevent complexity, or a simple average.
        return 0

    def get_description(self, obj):
        # We didn't add description to Subject model, but mock data expects it.
        # Let's just return a generic description or empty string
        return f"Study materials for {obj.name}"

class ExamSerializer(serializers.ModelSerializer):
    subjects = serializers.SerializerMethodField()
    title = serializers.CharField(source='name') # map name to title

    class Meta:
        model = Exam
        fields = ['id', 'title', 'description', 'category', 'subjects']

    def get_subjects(self, obj):
        from django.db.models import Q
        from .models import Subject
        subjects = Subject.objects.filter(paper__exam=obj).distinct()
        return SubjectSerializer(subjects, many=True, context=self.context).data

class QuestionFullSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'
        read_only_fields = ['created_by']

from .models import QuestionSet, QuestionSetQuestion

class TeacherQuestionSetQuestionSerializer(serializers.ModelSerializer):
    question_details = QuestionFullSerializer(source='question', read_only=True)

    class Meta:
        model = QuestionSetQuestion
        fields = ['id', 'question', 'question_details', 'order', 'marks']
        read_only_fields = ['id']

class TeacherQuestionSetSerializer(serializers.ModelSerializer):
    questions_list = TeacherQuestionSetQuestionSerializer(source='question_set_questions', many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    position_name = serializers.CharField(source='exam.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    chapter_name = serializers.CharField(source='chapter.title', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)

    # For creating/updating questions via through model in one go
    questions_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = QuestionSet
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'reviewer_comment', 'reviewed_by', 'submitted_at', 'reviewed_at']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions_data', [])
        question_set = super().create(validated_data)
        
        for q_data in questions_data:
            QuestionSetQuestion.objects.create(
                question_set=question_set,
                question_id=q_data['question_id'],
                order=q_data.get('order', 0),
                marks=q_data.get('marks', 1)
            )
        return question_set

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions_data', None)
        instance = super().update(instance, validated_data)
        
        if questions_data is not None:
            # Clear existing and recreate (simple approach for updating)
            instance.question_set_questions.all().delete()
            for q_data in questions_data:
                QuestionSetQuestion.objects.create(
                    question_set=instance,
                    question_id=q_data['question_id'],
                    order=q_data.get('order', 0),
                    marks=q_data.get('marks', 1)
                )
        return instance

class QuestionAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionAttempt
        fields = '__all__'

class PracticeSessionSerializer(serializers.ModelSerializer):
    attempts = QuestionAttemptSerializer(many=True, read_only=True)
    
    class Meta:
        model = PracticeSession
        fields = '__all__'
        read_only_fields = ['user', 'score', 'completed']

class UserTopicProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserTopicProgress
        fields = ['topic', 'status', 'progress', 'accuracy']

class SecureQuestionSerializer(serializers.ModelSerializer):
    """Used for practice sessions to hide correct option and explanation before submission."""
    class Meta:
        model = Question
        fields = ['id', 'topic', 'text', 'option_a', 'option_b', 'option_c', 'option_d', 'difficulty']

class BookmarkSerializer(serializers.ModelSerializer):
    question_detail = QuestionFullSerializer(source='question', read_only=True)

    class Meta:
        from .models import Bookmark
        model = Bookmark
        fields = ['id', 'question', 'question_detail', 'created_at']
        read_only_fields = ['id', 'created_at']

# ============================================================
# SUBJECTIVE SERIALIZERS
# ============================================================

class SubjectiveQuestionSerializer(serializers.ModelSerializer):
    topic_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()

    class Meta:
        from .models import Question
        model = Question
        fields = ['id', 'topic', 'topic_name', 'subject_name', 'text', 'marks', 'expected_time_minutes', 'difficulty', 'status']

    def get_topic_name(self, obj):
        return obj.topic.name if obj.topic else ''

    def get_subject_name(self, obj):
        return obj.topic.chapter.subject.name if obj.topic else ''

class SubjectiveQuestionWithModelAnswerSerializer(serializers.ModelSerializer):
    """For evaluators - includes model answer"""
    topic_name = serializers.SerializerMethodField()

    class Meta:
        from .models import Question
        model = Question
        fields = ['id', 'topic', 'topic_name', 'text', 'marks', 'expected_time_minutes', 'difficulty', 'model_answer']

    def get_topic_name(self, obj):
        return obj.topic.name if obj.topic else ''

class SubjectivePracticeSetSerializer(serializers.ModelSerializer):
    subject_name = serializers.SerializerMethodField()
    topic_name = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()

    class Meta:
        from .models import SubjectivePracticeSet
        model = SubjectivePracticeSet
        fields = ['id', 'title', 'description', 'exam', 'subject', 'subject_name', 'topic', 'topic_name', 'question_count', 'estimated_time_minutes', 'difficulty', 'status']

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else ''

    def get_topic_name(self, obj):
        return obj.topic.name if obj.topic else ''

    def get_question_count(self, obj):
        return obj.questions.count()

class SubjectiveModelExamSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()
    duration_minutes = serializers.IntegerField(source='time_limit')

    class Meta:
        from .models import Examination
        model = Examination
        fields = ['id', 'title', 'description', 'exam', 'duration_minutes', 'total_marks', 'passing_marks', 'status', 'question_count']

    def get_question_count(self, obj):
        return obj.questions.count()

class AnnotationSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import Annotation
        model = Annotation
        fields = ['id', 'selected_text', 'comment', 'start_offset', 'end_offset', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'created_at']

class VideoFeedbackSerializer(serializers.ModelSerializer):
    embed_url = serializers.SerializerMethodField()

    class Meta:
        from .models import VideoFeedback
        model = VideoFeedback
        fields = ['id', 'youtube_url', 'embed_url', 'created_at']

    def get_embed_url(self, obj):
        import re
        url = obj.youtube_url or ''
        # Extract video ID from various YouTube URL formats
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return f'https://www.youtube.com/embed/{match.group(1)}'
        return ''

class EvaluationSerializer(serializers.ModelSerializer):
    annotations = AnnotationSerializer(many=True, read_only=True)
    video_feedback = VideoFeedbackSerializer(read_only=True)
    evaluator_name = serializers.SerializerMethodField()

    class Meta:
        from .models import Evaluation
        model = Evaluation
        fields = ['id', 'answer', 'evaluator', 'evaluator_name', 'marks_obtained', 'feedback', 'evaluated_at', 'annotations', 'video_feedback']
        read_only_fields = ['evaluator', 'evaluated_at']

    def get_evaluator_name(self, obj):
        return obj.evaluator.get_full_name() or obj.evaluator.username if obj.evaluator else 'Unknown'

class SubjectiveAnswerSerializer(serializers.ModelSerializer):
    question = SubjectiveQuestionSerializer(read_only=True)
    evaluation = EvaluationSerializer(read_only=True)

    class Meta:
        from .models import SubjectiveAnswer
        model = SubjectiveAnswer
        fields = ['id', 'attempt', 'question', 'answer_text', 'file_url', 'status', 'last_saved_at', 'submitted_at', 'word_count', 'evaluation']

class SubjectiveAttemptSerializer(serializers.ModelSerializer):
    answers = SubjectiveAnswerSerializer(many=True, read_only=True)
    practice_set_detail = SubjectivePracticeSetSerializer(source='practice_set', read_only=True)
    model_exam_detail = SubjectiveModelExamSerializer(source='model_exam', read_only=True)

    class Meta:
        from .models import SubjectiveAttempt
        model = SubjectiveAttempt
        fields = ['id', 'student', 'practice_set', 'practice_set_detail', 'model_exam', 'model_exam_detail', 'mode', 'started_at', 'submitted_at', 'status', 'answers']
        read_only_fields = ['student', 'started_at']

class SubjectiveAnswerListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for teacher pending list"""
    question = SubjectiveQuestionSerializer(read_only=True)
    student_name = serializers.SerializerMethodField()
    has_evaluation = serializers.SerializerMethodField()

    class Meta:
        from .models import SubjectiveAnswer
        model = SubjectiveAnswer
        fields = ['id', 'attempt', 'question', 'answer_text', 'file_url', 'status', 'submitted_at', 'word_count', 'student_name', 'has_evaluation']

    def get_student_name(self, obj):
        return obj.attempt.student.get_full_name() or obj.attempt.student.username

    def get_has_evaluation(self, obj):
        return hasattr(obj, 'evaluation')


class TeacherExaminationQuestionSerializer(serializers.ModelSerializer):
    question_detail = QuestionFullSerializer(source='question', read_only=True)

    class Meta:
        from .models import ExaminationQuestion
        model = ExaminationQuestion
        fields = ['id', 'question', 'question_detail', 'order', 'marks']
        read_only_fields = ['id']

class TeacherExaminationSerializer(serializers.ModelSerializer):
    questions_list = TeacherExaminationQuestionSerializer(source='examination_questions', many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    exam_name = serializers.CharField(source='exam.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        from .models import Examination
        model = Examination
        fields = [
            'id', 'title', 'description', 'exam_type', 'objective_category', 'category', 'category_name', 'exam', 'exam_name',
            'subject', 'subject_name', 'total_questions', 'time_limit', 'total_marks', 'passing_marks',
            'marks_per_question', 'negative_marking', 'negative_marking_value', 'max_attempts', 
            'allow_resume', 'auto_submit', 'result_visibility', 'show_correct_answers', 'randomize_questions', 
            'randomize_options', 'start_time', 'end_time', 'status', 'reviewer_comment', 'reviewed_by', 
            'submitted_at', 'reviewed_at', 'questions_list', 'created_at', 'updated_at'
        ]
        read_only_fields = ['status', 'reviewer_comment', 'reviewed_by', 'submitted_at', 'reviewed_at', 'created_at', 'updated_at']

class AdminExaminationReviewSerializer(serializers.ModelSerializer):
    questions_list = TeacherExaminationQuestionSerializer(source='examination_questions', many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        from .models import Examination
        model = Examination
        fields = '__all__'
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "Unknown"
