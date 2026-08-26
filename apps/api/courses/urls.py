from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TeacherCourseViewSet,
    TeacherDashboardView,
    PublicCourseListView,
    StudentEnrollmentView,
    StudentCourseApplicationView,
    CourseDetailView,
    MyCoursesListView
)
from .teacher_student_views import TeacherStudentViewSet, TeacherMessageViewSet

router = DefaultRouter()
router.register(r'teacher/courses', TeacherCourseViewSet, basename='teacher-courses')
router.register(r'teacher/students', TeacherStudentViewSet, basename='teacher-students')
router.register(r'teacher/messages', TeacherMessageViewSet, basename='teacher-messages')

urlpatterns = [
    path('teacher/dashboard/', TeacherDashboardView.as_view(), name='teacher-dashboard'),

    # Public (no auth)
    path('courses/public/', PublicCourseListView.as_view(), name='public-courses'),
    path('courses/<int:pk>/', CourseDetailView.as_view(), name='course-detail'),

    # Student authenticated
    path('courses/my-enrollment/', StudentEnrollmentView.as_view(), name='my-enrollment'),
    path('courses/my-courses/', MyCoursesListView.as_view(), name='my-courses'),
    path('courses/apply/', StudentCourseApplicationView.as_view(), name='course-apply'),

    path('', include(router.urls)),
]
