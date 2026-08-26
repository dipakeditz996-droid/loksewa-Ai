from rest_framework import serializers
from core.models import User
from courses.models import TeacherStudentNote, TeacherMessage

class TeacherStudentListSerializer(serializers.ModelSerializer):
    enrolled_courses = serializers.IntegerField(read_only=True)
    completed_courses = serializers.IntegerField(read_only=True)
    average_score = serializers.FloatField(read_only=True)
    last_active = serializers.DateTimeField(read_only=True)
    status = serializers.CharField(read_only=True)
    practice_accuracy = serializers.FloatField(read_only=True)
    mock_exam_performance = serializers.FloatField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'username', 'email', 'avatar', 'enrolled_courses', 'completed_courses', 'average_score', 'last_active', 'status', 'practice_accuracy', 'mock_exam_performance']

class TeacherStudentDetailSerializer(serializers.ModelSerializer):
    enrolled_courses_count = serializers.IntegerField(read_only=True)
    completed_courses_count = serializers.IntegerField(read_only=True)
    total_study_time = serializers.IntegerField(read_only=True) # in seconds
    average_score = serializers.FloatField(read_only=True)
    best_score = serializers.FloatField(read_only=True)
    practice_accuracy = serializers.FloatField(read_only=True)
    joined_date = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'username', 'email', 'avatar', 'joined_date',
            'enrolled_courses_count', 'completed_courses_count', 'total_study_time',
            'average_score', 'best_score', 'practice_accuracy'
        ]

class TeacherStudentNoteSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    
    class Meta:
        model = TeacherStudentNote
        fields = ['id', 'teacher', 'teacher_name', 'student', 'note_text', 'created_at', 'updated_at']
        read_only_fields = ['teacher', 'student']

class TeacherMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherMessage
        fields = ['id', 'sender', 'recipient', 'subject', 'body', 'is_read', 'created_at']
        read_only_fields = ['sender']
