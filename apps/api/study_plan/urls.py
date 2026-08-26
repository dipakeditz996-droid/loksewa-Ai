from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudyPlanViewSet, StudyTaskViewSet, StudyPlanTemplateViewSet, DashboardView
from .admin_views import AdminStudyPlanTemplateViewSet

router = DefaultRouter()
router.register(r'templates', StudyPlanTemplateViewSet, basename='studytemplate')
router.register(r'plans', StudyPlanViewSet, basename='studyplan')
router.register(r'tasks', StudyTaskViewSet, basename='studytask')

# Admin Routes
router.register(r'admin/templates', AdminStudyPlanTemplateViewSet, basename='admin-studytemplate')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='study-dashboard'),
    path('', include(router.urls)),
]
