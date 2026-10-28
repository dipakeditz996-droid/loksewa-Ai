from rest_framework import serializers
from django.db.models import Q
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question, Examination
from notes.models import StudyMaterial

class ExamCategorySerializer(serializers.ModelSerializer):
    position_count = serializers.SerializerMethodField()
    notes_count = serializers.SerializerMethodField()
    questions_count = serializers.SerializerMethodField()
    exams_count = serializers.SerializerMethodField()

    class Meta:
        model = ExamCategory
        fields = [
            'id', 'name', 'description', 'is_active', 'order',
            'created_at', 'updated_at', 'position_count',
            'notes_count', 'questions_count', 'exams_count',
        ]

    def get_position_count(self, obj):
        val = getattr(obj, 'position_count_annotated', None)
        return val if val is not None else obj.exams.count()

    def get_notes_count(self, obj):
        val = getattr(obj, 'notes_count_annotated', None)
        return val if val is not None else StudyMaterial.objects.filter(exam__category=obj).exclude(status='archived').count()

    def get_questions_count(self, obj):
        val = getattr(obj, 'questions_count_annotated', None)
        return val if val is not None else Question.objects.filter(topic__chapter__subject__paper__exam__category=obj).count()

    def get_exams_count(self, obj):
        val = getattr(obj, 'exams_count_annotated', None)
        return val if val is not None else Examination.objects.filter(category=obj).count()


class ExamSerializer(serializers.ModelSerializer):
    paper_count = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True, default=None)
    notes_count = serializers.SerializerMethodField()
    questions_count = serializers.SerializerMethodField()
    exams_count = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = [
            'id', 'category', 'category_name', 'parent', 'parent_name',
            'name', 'description', 'status', 'is_active', 'order',
            'created_at', 'updated_at', 'paper_count',
            'notes_count', 'questions_count', 'exams_count',
        ]
        read_only_fields = ['is_active']

    def get_paper_count(self, obj):
        val = getattr(obj, 'paper_count_annotated', None)
        return val if val is not None else obj.papers.count()

    def get_notes_count(self, obj):
        val = getattr(obj, 'notes_count_annotated', None)
        return val if val is not None else StudyMaterial.objects.filter(exam=obj).exclude(status='archived').count()

    def get_questions_count(self, obj):
        val = getattr(obj, 'questions_count_annotated', None)
        return val if val is not None else Question.objects.filter(topic__chapter__subject__paper__exam=obj).count()

    def get_exams_count(self, obj):
        val = getattr(obj, 'exams_count_annotated', None)
        return val if val is not None else Examination.objects.filter(exam=obj).count()


class PaperSerializer(serializers.ModelSerializer):
    subject_count = serializers.SerializerMethodField()
    exam_name = serializers.CharField(source='exam.name', read_only=True)

    class Meta:
        model = Paper
        fields = [
            'id', 'exam', 'exam_name', 'name', 'paper_number',
            'description', 'is_active', 'order', 'created_at', 'updated_at',
            'subject_count',
        ]

    def get_subject_count(self, obj):
        val = getattr(obj, 'subject_count_annotated', None)
        return val if val is not None else obj.subjects.count()


class SubjectSerializer(serializers.ModelSerializer):
    chapter_count = serializers.SerializerMethodField()
    paper_name = serializers.CharField(source='paper.name', read_only=True, default=None)
    exam_id = serializers.IntegerField(source='paper.exam_id', read_only=True, default=None)
    exam_name = serializers.CharField(source='paper.exam.name', read_only=True, default=None)
    exam = serializers.PrimaryKeyRelatedField(queryset=Exam.objects.all(), write_only=True, required=False)
    notes_count = serializers.SerializerMethodField()
    questions_count = serializers.SerializerMethodField()
    exams_count = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = [
            'id', 'paper', 'paper_name', 'exam', 'exam_id', 'exam_name',
            'name', 'code', 'description', 'is_active', 'order',
            'created_at', 'updated_at', 'chapter_count',
            'notes_count', 'questions_count', 'exams_count',
        ]
        extra_kwargs = {
            'paper': {'required': False, 'allow_null': True},
        }

    def get_chapter_count(self, obj):
        val = getattr(obj, 'chapter_count_annotated', None)
        return val if val is not None else obj.chapters.count()

    def get_notes_count(self, obj):
        val = getattr(obj, 'notes_count_annotated', None)
        return val if val is not None else StudyMaterial.objects.filter(
            Q(subject=obj) | Q(chapter__subject=obj) | Q(topic__chapter__subject=obj)
        ).exclude(status='archived').distinct().count()

    def get_questions_count(self, obj):
        val = getattr(obj, 'questions_count_annotated', None)
        return val if val is not None else Question.objects.filter(topic__chapter__subject=obj).count()

    def get_exams_count(self, obj):
        val = getattr(obj, 'exams_count_annotated', None)
        return val if val is not None else Examination.objects.filter(
            Q(subject=obj) | Q(questions__topic__chapter__subject=obj)
        ).distinct().count()

    def validate(self, attrs):
        paper = attrs.get('paper')
        exam = attrs.get('exam')
        if paper and exam and paper.exam_id != exam.id:
            raise serializers.ValidationError({
                "paper": f"The selected paper '{paper.name}' (Exam ID: {paper.exam_id}) does not belong to the selected exam preparation '{exam.name}' (ID: {exam.id})."
            })
        if not self.instance and not paper and not exam:
            raise serializers.ValidationError({
                "exam": "An exam preparation or paper is required to establish the academic context."
            })
        return attrs

    def create(self, validated_data):
        exam = validated_data.pop('exam', None)
        paper = validated_data.get('paper')
        if not paper and exam:
            paper = exam.papers.order_by('order', 'id').first()
            if not paper:
                paper = Paper.objects.create(
                    exam=exam,
                    name=f"{exam.name} - Paper I",
                    paper_number="1",
                    order=1,
                    is_active=True,
                )
            validated_data['paper'] = paper
        return super().create(validated_data)

    def update(self, instance, validated_data):
        exam = validated_data.pop('exam', None)
        if exam and not validated_data.get('paper'):
            if not instance.paper or instance.paper.exam_id != exam.id:
                paper = exam.papers.order_by('order', 'id').first()
                if not paper:
                    paper = Paper.objects.create(
                        exam=exam,
                        name=f"{exam.name} - Paper I",
                        paper_number="1",
                        order=1,
                        is_active=True,
                    )
                validated_data['paper'] = paper
        return super().update(instance, validated_data)


class ChapterSerializer(serializers.ModelSerializer):
    topic_count = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    name = serializers.CharField(source='title', required=False)
    exam_id = serializers.IntegerField(source='subject.paper.exam_id', read_only=True, default=None)
    exam_name = serializers.CharField(source='subject.paper.exam.name', read_only=True, default=None)
    notes_count = serializers.SerializerMethodField()
    questions_count = serializers.SerializerMethodField()
    exams_count = serializers.SerializerMethodField()

    class Meta:
        model = Chapter
        fields = [
            'id', 'subject', 'subject_name', 'exam_id', 'exam_name',
            'title', 'name', 'description', 'is_active', 'order',
            'created_at', 'updated_at', 'topic_count',
            'notes_count', 'questions_count', 'exams_count',
        ]
        extra_kwargs = {
            'title': {'required': False},
        }

    def get_topic_count(self, obj):
        return obj.topics.count()

    def get_notes_count(self, obj):
        return StudyMaterial.objects.filter(
            Q(chapter=obj) | Q(topic__chapter=obj)
        ).exclude(status='archived').distinct().count()

    def get_questions_count(self, obj):
        return Question.objects.filter(topic__chapter=obj).count()

    def get_exams_count(self, obj):
        return Examination.objects.filter(questions__topic__chapter=obj).distinct().count()

    def validate(self, attrs):
        subject = attrs.get('subject') or (self.instance.subject if self.instance else None)
        if not self.instance and not subject:
            raise serializers.ValidationError({"subject": "A subject is required."})

        # Cross-context validation: if exam is supplied, ensure subject belongs to it
        exam_input = self.initial_data.get('exam') or self.initial_data.get('exam_id')
        if exam_input and subject and subject.paper:
            try:
                exam_input_id = int(exam_input)
                if subject.paper.exam_id != exam_input_id:
                    raise serializers.ValidationError({
                        "subject": f"Subject '{subject.name}' belongs to exam preparation '{subject.paper.exam.name}' (ID: {subject.paper.exam_id}), which does not match requested exam ID {exam_input_id}."
                    })
            except (ValueError, TypeError):
                pass
        return attrs

    def create(self, validated_data):
        if not validated_data.get('title'):
            # Allow 'name' as an alias for 'title'
            validated_data['title'] = validated_data.get('name') or self.initial_data.get('name') or ''
        return super().create(validated_data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Ensure both name and title are present
        ret['name'] = instance.title
        return ret


class TopicSerializer(serializers.ModelSerializer):
    chapter_name = serializers.CharField(source='chapter.title', read_only=True)
    unit = serializers.PrimaryKeyRelatedField(queryset=Chapter.objects.all(), write_only=True, required=False)
    subject_id = serializers.IntegerField(source='chapter.subject_id', read_only=True, default=None)
    subject_name = serializers.CharField(source='chapter.subject.name', read_only=True, default=None)
    exam_id = serializers.IntegerField(source='chapter.subject.paper.exam_id', read_only=True, default=None)
    exam_name = serializers.CharField(source='chapter.subject.paper.exam.name', read_only=True, default=None)
    notes_count = serializers.SerializerMethodField()
    questions_count = serializers.SerializerMethodField()
    exams_count = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'id', 'chapter', 'unit', 'chapter_name',
            'subject_id', 'subject_name', 'exam_id', 'exam_name',
            'name', 'description', 'is_active', 'order',
            'created_at', 'updated_at',
            'notes_count', 'questions_count', 'exams_count',
        ]
        extra_kwargs = {
            'chapter': {'required': False},
        }

    def get_notes_count(self, obj):
        return StudyMaterial.objects.filter(topic=obj).exclude(status='archived').count()

    def get_questions_count(self, obj):
        return Question.objects.filter(topic=obj).count()

    def get_exams_count(self, obj):
        return Examination.objects.filter(questions__topic=obj).distinct().count()

    def validate(self, attrs):
        chapter = attrs.get('chapter') or attrs.get('unit') or (self.instance.chapter if self.instance else None)
        if not self.instance and not chapter:
            raise serializers.ValidationError({"chapter": "A chapter is required."})

        # Cross-context validation: if subject is supplied, ensure chapter belongs to it
        subject_input = self.initial_data.get('subject') or self.initial_data.get('subject_id')
        if subject_input and chapter:
            try:
                sub_id = int(subject_input)
                if chapter.subject_id != sub_id:
                    raise serializers.ValidationError({
                        "chapter": f"Chapter '{chapter.title}' belongs to subject ID {chapter.subject_id}, which does not match requested subject ID {sub_id}."
                    })
            except (ValueError, TypeError):
                pass

        # Cross-context validation: if exam is supplied, ensure chapter belongs to it
        exam_input = self.initial_data.get('exam') or self.initial_data.get('exam_id')
        if exam_input and chapter and chapter.subject and chapter.subject.paper:
            try:
                exam_id = int(exam_input)
                if chapter.subject.paper.exam_id != exam_id:
                    raise serializers.ValidationError({
                        "chapter": f"Chapter '{chapter.title}' belongs to exam preparation '{chapter.subject.paper.exam.name}', which does not match requested exam ID {exam_id}."
                    })
            except (ValueError, TypeError):
                pass

        return attrs

    def create(self, validated_data):
        unit = validated_data.pop('unit', None)
        if not validated_data.get('chapter') and unit:
            validated_data['chapter'] = unit
        return super().create(validated_data)

    def update(self, instance, validated_data):
        unit = validated_data.pop('unit', None)
        if not validated_data.get('chapter') and unit:
            validated_data['chapter'] = unit
        return super().update(instance, validated_data)


class ReorderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order = serializers.IntegerField()

