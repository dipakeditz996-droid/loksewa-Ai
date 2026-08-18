from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TeacherMockExamViewSet, AdminExaminationReviewViewSet,
    ExamViewSet, SubjectViewSet, TopicViewSet, QuestionViewSet, 
    PracticeSessionViewSet, DashboardView, UserTopicProgressViewSet, BookmarkViewSet,
    ModelExamViewSet, ModelExamAttemptViewSet,
    SubjectivePracticeSetViewSet, SubjectiveModelExamViewSet, SubjectiveQuestionViewSet,
    SubjectiveAttemptViewSet, TeacherEvaluationViewSet, TeacherQuestionViewSet,
    TeacherQuestionSetViewSet, AdminQuestionReviewViewSet, AdminPracticeSetReviewViewSet
)
from .student_exam_views import (
    StudentExaminationViewSet, 
    StudentExaminationAttemptViewSet,
    LeaderboardViewSet
)

router = DefaultRouter()
router.register(r'exams', ExamViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'topics', TopicViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'practice-sessions', PracticeSessionViewSet, basename='practice-session')
router.register(r'topic-progress', UserTopicProgressViewSet, basename='topic-progress')
router.register(r'bookmarks', BookmarkViewSet, basename='bookmark')
router.register(r'model-exams', ModelExamViewSet, basename='model-exam')
router.register(r'model-exam-attempts', ModelExamAttemptViewSet, basename='model-exam-attempt')

# Subjective routes
router.register(r'subjective-practice-sets', SubjectivePracticeSetViewSet, basename='subjective-practice-set')
router.register(r'subjective-model-exams', SubjectiveModelExamViewSet, basename='subjective-model-exam')
router.register(r'subjective-questions', SubjectiveQuestionViewSet, basename='subjective-question')
router.register(r'subjective-attempts', SubjectiveAttemptViewSet, basename='subjective-attempt')
router.register(r'evaluations', TeacherEvaluationViewSet, basename='teacher-evaluation')
router.register(r'teacher/questions', TeacherQuestionViewSet, basename='teacher-question')
router.register(r'teacher/practice-sets', TeacherQuestionSetViewSet, basename='teacher-practice-set')
router.register(r'teacher/mock-exams', TeacherMockExamViewSet, basename='teacher-mock-exam')
router.register(r'admin/questions/review-queue', AdminQuestionReviewViewSet, basename='admin-question-review')
router.register(r'admin/practice-sets/review-queue', AdminPracticeSetReviewViewSet, basename='admin-practice-set-review')
router.register(r'admin/mock-exams/review-queue', AdminExaminationReviewViewSet, basename='admin-mock-exam-review')

# Student Exam routes
router.register(r'student/exams', StudentExaminationViewSet, basename='student-exam')
router.register(r'student/exam-attempts', StudentExaminationAttemptViewSet, basename='student-exam-attempt')
router.register(r'student/leaderboard', LeaderboardViewSet, basename='student-leaderboard')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('', include(router.urls)),
]
