from django.urls import path
from .views import (
    OverviewView,
    PerformanceTrendView,
    SubjectPerformanceView,
    TopicPerformanceView,
    AIInsightView
)

urlpatterns = [
    path('overview/', OverviewView.as_view(), name='analytics-overview'),
    path('performance-trend/', PerformanceTrendView.as_view(), name='analytics-performance-trend'),
    path('subject-performance/', SubjectPerformanceView.as_view(), name='analytics-subject-performance'),
    path('topic-analysis/', TopicPerformanceView.as_view(), name='analytics-topic-analysis'),
    path('ai-insight/', AIInsightView.as_view(), name='analytics-ai-insight'),
]
