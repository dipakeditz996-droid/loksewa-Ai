from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StudyMaterialViewSet, TeacherStudyMaterialViewSet, AdminStudyMaterialViewSet,
    PublicStudyMaterialListView, StudentPortalSyllabusNotesView,
)

router = DefaultRouter()
router.register(r'materials', StudyMaterialViewSet, basename='material')
router.register(r'teacher/materials', TeacherStudyMaterialViewSet, basename='teacher-material')
router.register(r'admin/materials', AdminStudyMaterialViewSet, basename='admin-material')

urlpatterns = [
    path('public/', PublicStudyMaterialListView.as_view(), name='public-materials'),
    path('student/portal/', StudentPortalSyllabusNotesView.as_view(), name='student-portal-syllabus-notes'),
    path('', include(router.urls)),
]
