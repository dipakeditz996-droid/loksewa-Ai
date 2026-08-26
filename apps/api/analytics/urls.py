from django.urls import path
from .views import (
    OverviewView,
    PerformanceTrendView,
    SubjectPerformanceView,
    TopicPerformanceView,
    AIInsightView
)
from .teacher_analytics_views import (
    TeacherAnalyticsOverviewView,
    TeacherAnalyticsTrendView,
    TeacherCoursePerformanceView,
    TeacherSubjectPerformanceView,
    TeacherTopicPerformanceView,
    TeacherStudentRankingView,
    TeacherNeedsAttentionView,
    TeacherStudentDetailAnalyticsView
)

urlpatterns = [
    # Student Analytics
    path('overview/', OverviewView.as_view(), name='analytics-overview'),
    path('performance-trend/', PerformanceTrendView.as_view(), name='analytics-performance-trend'),
    path('subject-performance/', SubjectPerformanceView.as_view(), name='analytics-subject-performance'),
    path('topic-analysis/', TopicPerformanceView.as_view(), name='analytics-topic-analysis'),
    path('ai-insight/', AIInsightView.as_view(), name='analytics-ai-insight'),
    
    # Teacher Analytics
    path('teacher/overview/', TeacherAnalyticsOverviewView.as_view(), name='teacher-analytics-overview'),
    path('teacher/trends/', TeacherAnalyticsTrendView.as_view(), name='teacher-analytics-trends'),
    path('teacher/courses/', TeacherCoursePerformanceView.as_view(), name='teacher-analytics-courses'),
    path('teacher/subjects/', TeacherSubjectPerformanceView.as_view(), name='teacher-analytics-subjects'),
    path('teacher/topics/', TeacherTopicPerformanceView.as_view(), name='teacher-analytics-topics'),
    path('teacher/students/', TeacherStudentRankingView.as_view(), name='teacher-analytics-students'),
    path('teacher/needs-attention/', TeacherNeedsAttentionView.as_view(), name='teacher-analytics-needs-attention'),
    path('teacher/students/<int:student_id>/', TeacherStudentDetailAnalyticsView.as_view(), name='teacher-analytics-student-detail'),
]
