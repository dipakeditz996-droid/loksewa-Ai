from rest_framework import serializers
from .models import StudyMaterial, StudentMaterialProgress, StudentMaterialBookmark
from exams.models import Exam, Subject, Chapter, Topic

class StudyMaterialListSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source='exam.name', read_only=True, default=None)
    parent_exam_name = serializers.CharField(source='exam.parent.name', read_only=True, default=None)
    category_name = serializers.CharField(source='exam.category.name', read_only=True, default=None)
    subject_name = serializers.CharField(source='subject.name', read_only=True, default=None)
    chapter_name = serializers.CharField(source='chapter.title', read_only=True, default=None)
    topic_name = serializers.CharField(source='topic.name', read_only=True, default=None)
    course_title = serializers.CharField(source='course.title', read_only=True, default=None)
    file_url = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = StudyMaterial
        fields = [
            'id', 'title', 'slug', 'description', 'material_type',
            'content_category', 'note_type',
            'access_type', 'status', 'estimated_reading_time', 'updated_at', 'created_at',
            'exam', 'exam_name', 'parent_exam_name', 'category_name',
            'subject', 'subject_name',
            'chapter', 'chapter_name',
            'topic', 'topic_name',
            'course', 'course_title',
            'file', 'file_url',
            'is_bookmarked', 'progress'
        ]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def get_is_bookmarked(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return StudentMaterialBookmark.objects.filter(student=request.user, material=obj).exists()
        return False

    def get_progress(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            prog = StudentMaterialProgress.objects.filter(student=request.user, material=obj).first()
            return prog.progress if prog else 0
        return 0


class StudyMaterialDetailSerializer(StudyMaterialListSerializer):
    class Meta(StudyMaterialListSerializer.Meta):
        fields = StudyMaterialListSerializer.Meta.fields + ['content', 'external_url', 'difficulty', 'review_note']


# ==========================================
# TEACHER / ADMIN WORKFLOW SERIALIZERS
# ==========================================

class TeacherStudyMaterialSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source='exam.name', read_only=True, default=None)
    subject_name = serializers.CharField(source='subject.name', read_only=True, default=None)
    chapter_name = serializers.CharField(source='chapter.title', read_only=True, default=None)
    topic_name = serializers.CharField(source='topic.name', read_only=True, default=None)
    author_name = serializers.CharField(source='teacher.get_full_name', read_only=True, default="Unknown")
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = StudyMaterial
        fields = [
            'id', 'title', 'slug', 'description', 'content', 'exam', 'subject', 'chapter', 'topic', 'course',
            'content_category', 'note_type',
            'material_type', 'difficulty', 'file', 'file_url', 'external_url', 'access_type', 'status',
            'review_note', 'estimated_reading_time', 'created_at', 'updated_at',
            'exam_name', 'subject_name', 'chapter_name', 'topic_name', 'author_name'
        ]
        read_only_fields = ['status', 'review_note', 'slug']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class AdminStudyMaterialSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source='exam.name', read_only=True, default=None)
    parent_exam_name = serializers.CharField(source='exam.parent.name', read_only=True, default=None)
    category_name = serializers.CharField(source='exam.category.name', read_only=True, default=None)
    subject_name = serializers.CharField(source='subject.name', read_only=True, default=None)
    chapter_name = serializers.CharField(source='chapter.title', read_only=True, default=None)
    topic_name = serializers.CharField(source='topic.name', read_only=True, default=None)
    author_name = serializers.CharField(source='teacher.get_full_name', read_only=True, default="Unknown")
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = StudyMaterial
        fields = [
            'id', 'title', 'slug', 'description', 'content', 'exam', 'subject', 'chapter', 'topic', 'course',
            'content_category', 'note_type',
            'material_type', 'difficulty', 'file', 'file_url', 'external_url', 'access_type', 'status',
            'review_note', 'estimated_reading_time', 'created_at', 'updated_at',
            'exam_name', 'parent_exam_name', 'category_name', 'subject_name', 'chapter_name', 'topic_name', 'author_name'
        ]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
