from rest_framework import serializers
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic

class ExamCategorySerializer(serializers.ModelSerializer):
    position_count = serializers.SerializerMethodField()

    class Meta:
        model = ExamCategory
        fields = ['id', 'name', 'description', 'is_active', 'order', 'created_at', 'updated_at', 'position_count']

    def get_position_count(self, obj):
        return obj.exams.count()

class ExamSerializer(serializers.ModelSerializer):
    paper_count = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Exam
        fields = ['id', 'category', 'category_name', 'name', 'description', 'is_active', 'order', 'created_at', 'updated_at', 'paper_count']

    def get_paper_count(self, obj):
        return obj.papers.count()

class PaperSerializer(serializers.ModelSerializer):
    subject_count = serializers.SerializerMethodField()
    exam_name = serializers.CharField(source='exam.name', read_only=True)

    class Meta:
        model = Paper
        fields = ['id', 'exam', 'exam_name', 'name', 'paper_number', 'description', 'is_active', 'order', 'created_at', 'updated_at', 'subject_count']

    def get_subject_count(self, obj):
        return obj.subjects.count()

class SubjectSerializer(serializers.ModelSerializer):
    chapter_count = serializers.SerializerMethodField()
    paper_name = serializers.CharField(source='paper.name', read_only=True)

    class Meta:
        model = Subject
        fields = ['id', 'paper', 'paper_name', 'name', 'code', 'description', 'is_active', 'order', 'created_at', 'updated_at', 'chapter_count']

    def get_chapter_count(self, obj):
        return obj.chapters.count()

class ChapterSerializer(serializers.ModelSerializer):
    topic_count = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = Chapter
        fields = ['id', 'subject', 'subject_name', 'title', 'description', 'is_active', 'order', 'created_at', 'updated_at', 'topic_count']

    def get_topic_count(self, obj):
        return obj.topics.count()

class TopicSerializer(serializers.ModelSerializer):
    chapter_name = serializers.CharField(source='Chapter.title', read_only=True)

    class Meta:
        model = Topic
        fields = ['id', 'Chapter', 'chapter_name', 'name', 'description', 'is_active', 'order', 'created_at', 'updated_at']

class ReorderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order = serializers.IntegerField()
