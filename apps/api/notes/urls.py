from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StudyMaterialViewSet, TeacherStudyMaterialViewSet, AdminStudyMaterialViewSet,
    PublicStudyMaterialListView,
)

router = DefaultRouter()
router.register(r'materials', StudyMaterialViewSet, basename='material')
router.register(r'teacher/materials', TeacherStudyMaterialViewSet, basename='teacher-material')
router.register(r'admin/materials', AdminStudyMaterialViewSet, basename='admin-material')

urlpatterns = [
    path('public/', PublicStudyMaterialListView.as_view(), name='public-materials'),
    path('', include(router.urls)),
]
