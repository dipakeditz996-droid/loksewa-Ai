from rest_framework import serializers
from .models import Notification
from support.models import NotificationPreference

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'message', 'action_url', 'is_read', 'priority', 'created_at', 'read_at']


class TeacherNotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'question_reviews_inapp', 'question_reviews_email',
            'study_material_reviews_inapp', 'study_material_reviews_email',
            'student_activity_inapp', 'student_activity_email',
            'teacher_system_email'
        ]
