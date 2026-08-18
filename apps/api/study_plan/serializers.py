from rest_framework import serializers
from .models import StudyPlan, StudyTask
from exams.serializers import ExamSerializer, SubjectSerializer, TopicSerializer

class StudyTaskSerializer(serializers.ModelSerializer):
    subject_details = SubjectSerializer(source='subject', read_only=True)
    topic_details = TopicSerializer(source='topic', read_only=True)

    class Meta:
        model = StudyTask
        fields = [
            'id', 'date', 'title', 'task_type', 
            'subject', 'topic', 'subject_details', 'topic_details',
            'duration_minutes', 'status', 'completed_at', 'created_at'
        ]

class StudyPlanSerializer(serializers.ModelSerializer):
    exam_details = ExamSerializer(source='exam', read_only=True)

    class Meta:
        model = StudyPlan
        fields = [
            'id', 'exam', 'exam_details', 'target_date', 'daily_minutes',
            'study_days', 'preferred_time', 'level', 'is_paused',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
