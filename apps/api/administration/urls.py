from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminDashboardStatsView,
    AdminAnalyticsView,
    AdminUsersView,
    AdminUserDetailView,
    AdminAdministratorsView,
    AdminRolesView,
    AdminPermissionsView,
    AdminExamsOverviewView,
    AdminAITutorOverviewView,
    AdminMarketplaceOverviewView,
    AdminEvaluatorListView,
    AdminEvaluatorDetailView,
    AdminEvaluatorCreateView,
    AdminEvaluatorUpdateView,
    AdminEvaluatorsSubjectsView,
    AdminEvaluationAssignmentsView,
    AdminCourseApplicationView,
    AdminCourseApplicationDetailView,
    AdminEvaluationsView,
    AdminStudyMaterialsView,
    AdminStudyMaterialDetailView,
    AdminStudyPlansView,
    AdminStudyPlanDetailView,
    AdminAuditLogsView,
    AdminNotificationsListView,
    AdminNotificationsCreateView,
    AdminNotificationsDeleteView,
    AdminNotificationDetailView,
    AdminNotificationSendView,
    AdminNotificationCancelView,
    AdminSupportTicketsView,
    AdminTicketDetailView,
    AdminTicketReplyView,
    AdminTicketUpdateStatusView,
    AdminSettingsView,
    AdminPositionsView,
    AdminTagsView,
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
from .study_plan_views import AdminStudyPlanTemplateViewSet
from .leaderboard_views import AdminLeaderboardView
from .student_performance_views import (
    AdminExamAttemptReviewView, AdminStudentExamHistoryView,
    AdminStudentPerformanceView,
)
from .material_taxonomy_views import (
    AdminMaterialCategoryViewSet, AdminMaterialCollectionViewSet,
)


router = DefaultRouter()
router.register(r'questions', AdminQuestionViewSet, basename='admin-questions')
router.register(r'questions/import', QuestionImportViewSet, basename='admin-question-import')
router.register(r'question-sets', QuestionSetViewSet, basename='admin-question-set')
router.register(r'collections', QuestionCollectionViewSet, basename='admin-collection')
router.register(r'exams', ExaminationViewSet, basename='admin-examination')
router.register(r'study-plan-templates', AdminStudyPlanTemplateViewSet, basename='admin-study-plan-templates')
router.register(r'material-categories', AdminMaterialCategoryViewSet, basename='admin-material-categories')
router.register(r'material-collections', AdminMaterialCollectionViewSet, basename='admin-material-collections')
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
    path('admins/', AdminAdministratorsView.as_view(), name='admin-administrators'),
    path('roles/', AdminRolesView.as_view(), name='admin-roles'),
    path('permissions/', AdminPermissionsView.as_view(), name='admin-permissions'),
    path('exams-overview/', AdminExamsOverviewView.as_view(), name='admin-exams-overview'),
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
    # Evaluations list
    path('evaluations/', AdminEvaluationsView.as_view(), name='admin-evaluations'),
    # Study materials
    path('study-materials/', AdminStudyMaterialsView.as_view(), name='admin-study-materials'),
    path('study-materials/<int:pk>/', AdminStudyMaterialDetailView.as_view(), name='admin-study-material-detail'),
    # Study plans
    path('study-plans/', AdminStudyPlansView.as_view(), name='admin-study-plans'),
    path('study-plans/<int:pk>/', AdminStudyPlanDetailView.as_view(), name='admin-study-plan-detail'),
    # Ranking & Leaderboard
    path('gamification/leaderboard/', AdminLeaderboardView.as_view(), name='admin-leaderboard'),
    # Student performance & detailed exam review
    path('students/<int:pk>/performance/', AdminStudentPerformanceView.as_view(),
         name='admin-student-performance'),
    path('students/<int:pk>/exam-history/', AdminStudentExamHistoryView.as_view(),
         name='admin-student-exam-history'),
    path('exam-attempts/<int:pk>/review/', AdminExamAttemptReviewView.as_view(),
         name='admin-exam-attempt-review'),
    # Audit logs
    path('audit-logs/', AdminAuditLogsView.as_view(), name='admin-audit-logs'),
    # Notifications
    path('notifications/', AdminNotificationsListView.as_view(), name='admin-notifications-list'),
    path('notifications/create/', AdminNotificationsCreateView.as_view(), name='admin-notifications-create'),
    path('notifications/<int:pk>/', AdminNotificationDetailView.as_view(), name='admin-notification-detail'),
    path('notifications/<int:pk>/send/', AdminNotificationSendView.as_view(), name='admin-notification-send'),
    path('notifications/<int:pk>/cancel/', AdminNotificationCancelView.as_view(), name='admin-notification-cancel'),
    path('notifications/<int:pk>/delete/', AdminNotificationsDeleteView.as_view(), name='admin-notifications-delete'),
    # Support Tickets
    path('support/tickets/', AdminSupportTicketsView.as_view(), name='admin-support-tickets'),
    path('support/tickets/<int:pk>/', AdminTicketDetailView.as_view(), name='admin-ticket-detail'),
    path('support/tickets/<int:pk>/reply/', AdminTicketReplyView.as_view(), name='admin-ticket-reply'),
    path('support/tickets/<int:pk>/status/', AdminTicketUpdateStatusView.as_view(), name='admin-ticket-status'),
    # Settings
    path('settings/', AdminSettingsView.as_view(), name='admin-settings'),
    # Positions
    path('syllabus/positions/', AdminPositionsView.as_view(), name='admin-positions'),
    # Tags
    path('syllabus/tags/', AdminTagsView.as_view(), name='admin-tags'),
    # Course applications / enrollment management
    path('course-applications/', AdminCourseApplicationView.as_view(), name='admin-course-applications'),
    path('course-applications/<int:pk>/', AdminCourseApplicationDetailView.as_view(), name='admin-course-application-detail'),
    # Syllabus
    path('syllabus/stats/', SyllabusStatsView.as_view(), name='syllabus-stats'),
    path('syllabus/tree/', SyllabusTreeView.as_view(), name='syllabus-tree'),
    # AI options
    path('questions/<int:pk>/generate-options/', AIGenerateOptionsView.as_view(), name='admin-generate-options'),
    path('questions/<int:pk>/approve-options/', AIApproveOptionsView.as_view(), name='admin-approve-options'),
    path('', include(router.urls)),
]
