from rest_framework import serializers
from .models import StudyPlan, StudyTask, StudyPlanTemplate, StudyPlanTemplateTask
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

class StudyPlanTemplateTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyPlanTemplateTask
        fields = ['id', 'day_number', 'title', 'task_type', 'duration_minutes']

class StudyPlanTemplateSerializer(serializers.ModelSerializer):
    tasks = StudyPlanTemplateTaskSerializer(many=True, required=False)
    
    class Meta:
        model = StudyPlanTemplate
        fields = ['id', 'name', 'description', 'duration_days', 'exam', 'is_active', 'created_at', 'tasks']

    def create(self, validated_data):
        tasks_data = validated_data.pop('tasks', [])
        template = StudyPlanTemplate.objects.create(**validated_data)
        for task_data in tasks_data:
            StudyPlanTemplateTask.objects.create(template=template, **task_data)
        return template

    def update(self, instance, validated_data):
        tasks_data = validated_data.pop('tasks', None)
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.duration_days = validated_data.get('duration_days', instance.duration_days)
        instance.exam = validated_data.get('exam', instance.exam)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.save()

        if tasks_data is not None:
            instance.tasks.all().delete()
            for task_data in tasks_data:
                StudyPlanTemplateTask.objects.create(template=instance, **task_data)
                
        return instance

class StudyPlanSerializer(serializers.ModelSerializer):
    exam_details = ExamSerializer(source='exam', read_only=True)
    template_details = StudyPlanTemplateSerializer(source='template', read_only=True)

    class Meta:
        model = StudyPlan
        fields = [
            'id', 'exam', 'exam_details', 'template', 'template_details', 'target_date', 'daily_minutes',
            'study_days', 'preferred_time', 'level', 'is_paused',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
