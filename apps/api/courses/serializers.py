from rest_framework import serializers
from .models import Course, Enrollment, TeacherCourseAssignment
from exams.serializers import ExamSerializer

class CourseSerializer(serializers.ModelSerializer):
    exam_details = ExamSerializer(source='exam', read_only=True)

    class Meta:
        model = Course
        fields = '__all__'

class TeacherCourseAssignmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)

    class Meta:
        model = TeacherCourseAssignment
        fields = ['id', 'teacher', 'course', 'assigned_at']
