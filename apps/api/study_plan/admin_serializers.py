from rest_framework import serializers
from django.db import transaction
from .models import StudyPlanTemplate, StudyPlanTemplateTask
from exams.serializers import ExamSerializer, SubjectSerializer, TopicSerializer

class AdminStudyPlanTemplateTaskSerializer(serializers.ModelSerializer):
    subject_details = SubjectSerializer(source='subject', read_only=True)
    topic_details = TopicSerializer(source='topic', read_only=True)

    class Meta:
        model = StudyPlanTemplateTask
        fields = [
            'id', 'template', 'day_number', 'title', 'task_type', 
            'subject', 'topic', 'subject_details', 'topic_details',
            'duration_minutes'
        ]
        read_only_fields = ['template']

class AdminStudyPlanTemplateSerializer(serializers.ModelSerializer):
    tasks = AdminStudyPlanTemplateTaskSerializer(many=True, required=False)
    assigned_count = serializers.SerializerMethodField()
    course_details = serializers.SerializerMethodField()
    exam_details = ExamSerializer(source='exam', read_only=True)

    class Meta:
        model = StudyPlanTemplate
        fields = [
            'id', 'name', 'description', 'duration_days', 'course', 'exam', 
            'is_active', 'created_at', 'tasks', 'assigned_count',
            'course_details', 'exam_details'
        ]

    def get_assigned_count(self, obj):
        return obj.instances.count()

    def get_course_details(self, obj):
        if obj.course:
            return {'id': obj.course.id, 'title': obj.course.title}
        return None

    @transaction.atomic
    def create(self, validated_data):
        tasks_data = validated_data.pop('tasks', [])
        template = StudyPlanTemplate.objects.create(**validated_data)
        for task_data in tasks_data:
            StudyPlanTemplateTask.objects.create(template=template, **task_data)
        return template

    @transaction.atomic
    def update(self, instance, validated_data):
        tasks_data = validated_data.pop('tasks', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tasks_data is not None:
            # Recreate tasks entirely or update? We'll replace them all for simplicity and idempotency
            instance.tasks.all().delete()
            for task_data in tasks_data:
                StudyPlanTemplateTask.objects.create(template=instance, **task_data)
                
        return instance
