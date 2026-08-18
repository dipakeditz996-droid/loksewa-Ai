from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeacherCourseViewSet, TeacherDashboardView
from .teacher_student_views import TeacherStudentViewSet, TeacherMessageViewSet

router = DefaultRouter()
router.register(r'teacher/courses', TeacherCourseViewSet, basename='teacher-courses')
router.register(r'teacher/students', TeacherStudentViewSet, basename='teacher-students')
router.register(r'teacher/messages', TeacherMessageViewSet, basename='teacher-messages')

urlpatterns = [
    path('teacher/dashboard/', TeacherDashboardView.as_view(), name='teacher-dashboard'),
    path('', include(router.urls)),
]
