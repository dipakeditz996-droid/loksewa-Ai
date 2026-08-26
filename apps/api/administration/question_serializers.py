from rest_framework import serializers
from exams.models import Question, Topic

class AdminQuestionSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    chapter_name = serializers.CharField(source='topic.chapter.title', read_only=True)
    subject_name = serializers.CharField(source='topic.chapter.subject.name', read_only=True)
    position_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    usage_count = serializers.IntegerField(read_only=True)

    def _question_exam(self, obj):
        # Subject links up via the current `paper` FK, falling back to the
        # legacy `exam` FK for subjects not yet migrated onto a Paper.
        subject = obj.topic.chapter.subject
        if subject.paper_id:
            return subject.paper.exam
        return subject.exam

    def get_position_name(self, obj):
        exam = self._question_exam(obj)
        return exam.name if exam else None

    def get_category_name(self, obj):
        exam = self._question_exam(obj)
        return exam.category.name if exam and exam.category_id else None
    
    class Meta:
        model = Question
        fields = [
            'id', 'question_id', 'question_type', 'status', 'topic', 'topic_name', 'chapter_name',
            'subject_name', 'position_name', 'category_name', 'text', 'option_a', 
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
        elif q_type in ['subjective', 'short_answer', 'long_answer']:
            if not data.get('model_answer'):
                raise serializers.ValidationError("Subjective-type questions require a model answer.")
                
        return data
