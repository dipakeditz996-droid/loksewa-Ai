from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminDashboardStatsView,
    AdminAnalyticsView,
    AdminUsersView,
    AdminUserDetailView,

    AdminExamsOverviewView,
    AdminAITutorOverviewView,
    AdminMarketplaceOverviewView,
    AdminEvaluatorListView,
    AdminEvaluatorDetailView,
    AdminEvaluatorCreateView,
    AdminEvaluatorUpdateView,
    AdminEvaluatorsSubjectsView,
    AdminEvaluationAssignmentsView,
)
from .syllabus_views import (
    ExamCategoryViewSet, ExamViewSet, PaperViewSet, SubjectViewSet, 
    ChapterViewSet, TopicViewSet, SyllabusStatsView, SyllabusTreeView
)

from .question_views import AdminQuestionViewSet
from .import_views import QuestionImportViewSet
from .question_set_views import QuestionSetViewSet
from .collection_views import QuestionCollectionViewSet
from .exam_views import ExaminationViewSet

router = DefaultRouter()
router.register(r'questions', AdminQuestionViewSet, basename='admin-questions')
router.register(r'questions/import', QuestionImportViewSet, basename='admin-question-import')
router.register(r'question-sets', QuestionSetViewSet, basename='admin-question-set')
router.register(r'collections', QuestionCollectionViewSet, basename='admin-collection')
router.register(r'exams', ExaminationViewSet, basename='admin-examination')
router.register(r'syllabus/categories', ExamCategoryViewSet, basename='syllabus-categories')
router.register(r'syllabus/exams', ExamViewSet, basename='syllabus-exams')
router.register(r'syllabus/papers', PaperViewSet, basename='syllabus-papers')
router.register(r'syllabus/subjects', SubjectViewSet, basename='syllabus-subjects')
router.register(r'syllabus/chapters', ChapterViewSet, basename='syllabus-chapters')
router.register(r'syllabus/topics', TopicViewSet, basename='syllabus-topics')

from .ai_views import AIGenerateOptionsView, AIApproveOptionsView, AIBulkGenerateContentView

urlpatterns = [
    path('dashboard/stats/', AdminDashboardStatsView.as_view(), name='admin-dashboard-stats'),
    path('analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    path('users/', AdminUsersView.as_view(), name='admin-users'),
    path('users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('exams/', AdminExamsOverviewView.as_view(), name='admin-exams'),
    path('ai-tutor/', AdminAITutorOverviewView.as_view(), name='admin-ai-tutor'),
    path('ai-tutor/generate-bulk-content/', AIBulkGenerateContentView.as_view(), name='admin-ai-bulk-generate'),
    path('marketplace/', AdminMarketplaceOverviewView.as_view(), name='admin-marketplace'),
    # Evaluator management
    path('evaluators/', AdminEvaluatorListView.as_view(), name='admin-evaluators'),
    path('evaluators/create/', AdminEvaluatorCreateView.as_view(), name='admin-evaluators-create'),
    path('evaluators/subjects/', AdminEvaluatorsSubjectsView.as_view(), name='admin-evaluators-subjects'),
    path('evaluators/<int:pk>/', AdminEvaluatorDetailView.as_view(), name='admin-evaluator-detail'),
    path('evaluators/<int:pk>/update/', AdminEvaluatorUpdateView.as_view(), name='admin-evaluator-update'),
    # Evaluation assignments
    path('evaluator-assignments/', AdminEvaluationAssignmentsView.as_view(), name='admin-evaluator-assignments'),
    # Syllabus
    path('syllabus/stats/', SyllabusStatsView.as_view(), name='syllabus-stats'),
    path('syllabus/tree/', SyllabusTreeView.as_view(), name='syllabus-tree'),
    # AI options
    path('questions/<int:pk>/generate-options/', AIGenerateOptionsView.as_view(), name='admin-generate-options'),
    path('questions/<int:pk>/approve-options/', AIApproveOptionsView.as_view(), name='admin-approve-options'),
    path('', include(router.urls)),
]
