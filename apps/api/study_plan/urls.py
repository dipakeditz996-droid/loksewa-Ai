from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudyPlanViewSet, StudyTaskViewSet, StudyPlanTemplateViewSet, DashboardView
from .admin_views import AdminStudyPlanTemplateViewSet
from . import overview_views as ov

router = DefaultRouter()
router.register(r'templates', StudyPlanTemplateViewSet, basename='studytemplate')
router.register(r'plans', StudyPlanViewSet, basename='studyplan')
router.register(r'tasks', StudyTaskViewSet, basename='studytask')

# Admin Routes
router.register(r'admin/templates', AdminStudyPlanTemplateViewSet, basename='admin-studytemplate')

urlpatterns = [
    # The Study Plan page: one endpoint per section
    path('preparations/', ov.PreparationsView.as_view(), name='sp-preparations'),
    path('plan/', ov.PlanView.as_view(), name='sp-plan'),
    path('progress/', ov.ProgressView.as_view(), name='sp-progress'),
    path('week/', ov.WeekView.as_view(), name='sp-week'),
    path('preferences/', ov.PreferencesView.as_view(), name='sp-preferences'),
    path('dashboard/', DashboardView.as_view(), name='study-dashboard'),
    path('', include(router.urls)),
]
