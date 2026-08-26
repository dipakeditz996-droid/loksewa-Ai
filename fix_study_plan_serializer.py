import os

filepath = 'apps/api/study_plan/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_class = '''class StudyPlanTemplateSerializer(serializers.ModelSerializer):
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
                
        return instance'''

# Replace old class with new class
import re
pattern = re.compile(r'class StudyPlanTemplateSerializer\(serializers\.ModelSerializer\):.*?(?=class StudyPlanSerializer)', re.DOTALL)
content = pattern.sub(new_class + '\n\n', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
