from rest_framework import serializers
from exams.models import Question, Topic, QuestionCollection
from core.models import Tag

class AdminQuestionSerializer(serializers.ModelSerializer):
    # Read: {id, name} per collection this question already belongs to.
    # Write: optional list of QuestionCollection ids under `collection_ids`
    # (source='collections') - a question does not need to belong to any
    # collection. `collections` is a real ManyToManyField on Question, so
    # DRF's default ModelSerializer.update()/create() already knows how to
    # set it (via .set()) once the write field points at that source - no
    # custom create/update override needed here.
    collections = serializers.SerializerMethodField()
    collection_ids = serializers.PrimaryKeyRelatedField(
        queryset=QuestionCollection.objects.all(), many=True, required=False,
        write_only=True, source='collections',
        help_text="Optional QuestionCollection IDs to add this question to.",
    )

    def get_collections(self, obj):
        # Reads from the queryset's prefetch_related('collections') cache via
        # .all() - calling .values() here would silently bypass that cache
        # and re-query the database once per question in the list.
        return [{'id': c.id, 'name': c.name} for c in obj.collections.all()]

    # Structured search/filter tags - independent of Collections and of the
    # legacy free-text `tags` CharField (left untouched, still writable
    # below). Same optional-many-to-many pattern as collections above.
    tag_objects = serializers.SerializerMethodField()
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), many=True, required=False,
        write_only=True, source='tag_objects',
        help_text="Optional Tag IDs (from Academic Management > Tags) for search/filtering.",
    )

    def get_tag_objects(self, obj):
        # Inactive tags stay visible on questions that already carry them
        # (historical metadata), just excluded from new-question selectors.
        # Reads from the prefetch_related('tag_objects') cache via .all() -
        # same reasoning as get_collections above.
        tags = sorted(obj.tag_objects.all(), key=lambda t: t.name)
        return [{'id': t.id, 'name': t.name, 'slug': t.slug, 'color': t.color, 'is_active': t.is_active} for t in tags]

    topic_name = serializers.SerializerMethodField()
    chapter_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    position_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    
    chapter_id = serializers.SerializerMethodField()
    subject_id = serializers.SerializerMethodField()
    position_id = serializers.SerializerMethodField()
    category_id = serializers.SerializerMethodField()
    
    usage_count = serializers.SerializerMethodField()

    def get_usage_count(self, obj):
        # Prefer the annotated value the viewset's queryset attaches
        # (usage_count_computed) - one query for the whole page instead of
        # two COUNT queries per row via the Question.usage_count property.
        # Falls back to the property so this serializer still works
        # correctly against any queryset that didn't add the annotation.
        annotated = getattr(obj, 'usage_count_computed', None)
        return annotated if annotated is not None else obj.usage_count

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
            'marks', 'negative_marks', 'expected_time_minutes', 'explanation', 'hint',
            'difficulty', 'tags', 'usage_count', 'created_at', 'updated_at',
            'collections', 'collection_ids', 'tag_objects', 'tag_ids',
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
