from rest_framework import serializers
from exams.models import Question, Topic

class AdminQuestionSerializer(serializers.ModelSerializer):
    topic_name = serializers.SerializerMethodField()
    chapter_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    position_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    
    chapter_id = serializers.SerializerMethodField()
    subject_id = serializers.SerializerMethodField()
    position_id = serializers.SerializerMethodField()
    category_id = serializers.SerializerMethodField()
    
    usage_count = serializers.IntegerField(read_only=True)

    def get_topic_name(self, obj):
        try:
            return obj.topic.name if obj.topic else None
        except:
            return None

    def get_chapter_name(self, obj):
        try:
            return obj.topic.chapter.title if obj.topic and obj.topic.chapter else None
        except:
            return None

    def get_subject_name(self, obj):
        try:
            return obj.topic.chapter.subject.name if obj.topic and obj.topic.chapter and obj.topic.chapter.subject else None
        except:
            return None

    def _question_exam(self, obj):
        # Subject links up to an Exam through its Paper.
        try:
            subject = obj.topic.chapter.subject
            if subject and subject.paper_id:
                return subject.paper.exam
            return None
        except Exception:
            return None

    def get_position_name(self, obj):
        try:
            exam = self._question_exam(obj)
            return exam.name if exam else None
        except:
            return None

    def get_category_name(self, obj):
        try:
            exam = self._question_exam(obj)
            return exam.category.name if exam and exam.category_id else None
        except:
            return None

    def get_chapter_id(self, obj):
        try:
            return obj.topic.chapter.id if obj.topic and obj.topic.chapter else None
        except:
            return None
            
    def get_subject_id(self, obj):
        try:
            return obj.topic.chapter.subject.id if obj.topic and obj.topic.chapter and obj.topic.chapter.subject else None
        except:
            return None
            
    def get_position_id(self, obj):
        try:
            exam = self._question_exam(obj)
            return exam.id if exam else None
        except:
            return None
            
    def get_category_id(self, obj):
        try:
            exam = self._question_exam(obj)
            return exam.category_id if exam and exam.category_id else None
        except:
            return None
    
    class Meta:
        model = Question
        fields = [
            'id', 'question_id', 'question_type', 'status', 'topic', 'topic_name', 'chapter_name',
            'subject_name', 'position_name', 'category_name', 
            'chapter_id', 'subject_id', 'position_id', 'category_id',
            'text', 'option_a', 
            'option_b', 'option_c', 'option_d', 'correct_option', 'model_answer',
            'marks', 'negative_marks', 'expected_time_minutes', 'explanation', 
            'difficulty', 'tags', 'usage_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['question_id']

    def validate(self, data):
        """
        Validate question rules based on type.
        """
        q_type = data.get('question_type') or (self.instance.question_type if self.instance else None)

        if q_type == 'mcq':
            if not data.get('option_a') or not data.get('option_b') or not data.get('option_c') or not data.get('option_d'):
                raise serializers.ValidationError("MCQ questions require all 4 options.")
            if not data.get('correct_option'):
                raise serializers.ValidationError("MCQ questions require a correct option.")
        elif q_type == 'true_false':
            if not data.get('correct_option'):
                raise serializers.ValidationError("True/False questions require a correct option (A or B).")
        elif q_type in ['subjective', 'short_answer', 'long_answer']:
            if not data.get('model_answer'):
                raise serializers.ValidationError("Subjective-type questions require a model answer.")

        return data
