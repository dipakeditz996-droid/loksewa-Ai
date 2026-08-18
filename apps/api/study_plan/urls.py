from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudyPlanViewSet, StudyTaskViewSet

router = DefaultRouter()
router.register(r'plans', StudyPlanViewSet, basename='studyplan')
router.register(r'tasks', StudyTaskViewSet, basename='studytask')

urlpatterns = [
    path('', include(router.urls)),
]
