from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudyMaterialViewSet, TeacherStudyMaterialViewSet, AdminStudyMaterialViewSet

router = DefaultRouter()
router.register(r'materials', StudyMaterialViewSet, basename='material')
router.register(r'teacher/materials', TeacherStudyMaterialViewSet, basename='teacher-material')
router.register(r'admin/materials', AdminStudyMaterialViewSet, basename='admin-material')

urlpatterns = [
    path('', include(router.urls)),
]
