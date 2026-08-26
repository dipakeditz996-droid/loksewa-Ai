from rest_framework import serializers
from .models import StudyMaterial, StudentMaterialProgress, StudentMaterialBookmark
from exams.models import Exam, Subject, Topic

class StudyMaterialListSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source='exam.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True, default=None)
    is_bookmarked = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = StudyMaterial
        fields = [
            'id', 'title', 'slug', 'description', 'material_type', 
            'access_type', 'estimated_reading_time', 'updated_at',
            'exam_name', 'subject_name', 'topic_name', 
            'is_bookmarked', 'progress'
        ]

    def get_is_bookmarked(self, obj):
        user = self.context['request'].user
        if user.is_authenticated:
            return StudentMaterialBookmark.objects.filter(student=user, material=obj).exists()
        return False

    def get_progress(self, obj):
        user = self.context['request'].user
        if user.is_authenticated:
            prog = StudentMaterialProgress.objects.filter(student=user, material=obj).first()
            return prog.progress if prog else 0
        return 0

class StudyMaterialDetailSerializer(StudyMaterialListSerializer):
    class Meta(StudyMaterialListSerializer.Meta):
        fields = StudyMaterialListSerializer.Meta.fields + ['content', 'file', 'external_url', 'difficulty']

# ==========================================
# TEACHER / ADMIN WORKFLOW SERIALIZERS
# ==========================================

class TeacherStudyMaterialSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source='exam.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True, default=None)
    author_name = serializers.CharField(source='teacher.get_full_name', read_only=True, default="Unknown")

    class Meta:
        model = StudyMaterial
        fields = [
            'id', 'title', 'slug', 'description', 'content', 'exam', 'subject', 'topic',
            'material_type', 'difficulty', 'file', 'external_url', 'access_type', 'status',
            'review_note', 'estimated_reading_time', 'created_at', 'updated_at',
            'exam_name', 'subject_name', 'topic_name', 'author_name'
        ]
        read_only_fields = ['status', 'review_note', 'slug']

class AdminStudyMaterialSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source='exam.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True, default=None)
    author_name = serializers.CharField(source='teacher.get_full_name', read_only=True, default="Unknown")

    class Meta:
        model = StudyMaterial
        fields = [
            'id', 'title', 'slug', 'description', 'content', 'exam', 'subject', 'topic',
            'material_type', 'difficulty', 'file', 'external_url', 'access_type', 'status',
            'review_note', 'estimated_reading_time', 'created_at', 'updated_at',
            'exam_name', 'subject_name', 'topic_name', 'author_name'
        ]
