from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudyMaterialViewSet

router = DefaultRouter()
router.register(r'materials', StudyMaterialViewSet, basename='material')

urlpatterns = [
    path('', include(router.urls)),
]
