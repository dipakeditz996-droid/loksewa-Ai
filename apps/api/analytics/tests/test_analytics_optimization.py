from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from exams.models import (
    PracticeSession,
    Examination,
    ExaminationAttempt,
    QuestionAttempt,
    StudentAnswer,
    Question,
    ExamCategory,
    Exam,
    Subject,
    Topic,
    Chapter,
    Paper
)
from core.models import User
from courses.models import Course, Enrollment, TeacherCourseAssignment
from analytics.services.analytics_service import AnalyticsService
from analytics.services.teacher_analytics_service import TeacherAnalyticsService
from django.db import connection
from django.test.utils import CaptureQueriesContext

class TestAnalyticsOptimization(TestCase):
    def setUp(self):
        # Create Users
        self.student = User.objects.create_user(username='student1', email='student1@example.com')
        self.student2 = User.objects.create_user(username='student2', email='student2@example.com')
        self.teacher = User.objects.create_user(username='teacher1', email='teacher1@example.com', role='teacher')
        
        # Create hierarchy
        self.category = ExamCategory.objects.create(name="Cat1")
        self.exam_level = Exam.objects.create(name="ExamLevel1", category=self.category)
        self.paper = Paper.objects.create(name="Paper1", exam=self.exam_level)
        self.subject = Subject.objects.create(name="Subject1", paper=self.paper)
        self.chapter = Chapter.objects.create(title="Chapter1", subject=self.subject)
        self.topic = Topic.objects.create(name="Topic1", chapter=self.chapter)

        # Create Questions
        self.q1 = Question.objects.create(topic=self.topic, text="Q1", marks=1)
        self.q2 = Question.objects.create(topic=self.topic, text="Q2", marks=1)
        
        # Course & Enrollment
        self.course = Course.objects.create(title="Course 1", slug="course-1", exam=self.exam_level)
        Enrollment.objects.create(student=self.student, course=self.course, status='active')
        Enrollment.objects.create(student=self.student2, course=self.course, status='active')
        TeacherCourseAssignment.objects.create(teacher=self.teacher, course=self.course)

        self.canonical_exam = Examination.objects.create(title="Canonical 1", category=self.category, exam=self.exam_level, course=self.course)

    def test_student_overview_combines_attempts(self):
        # Add a practice session
        ps = PracticeSession.objects.create(user=self.student, exam=self.exam_level, completed=True, total_questions=1)
        QuestionAttempt.objects.create(session=ps, question=self.q1, is_correct=True)

        # Add an exam attempt
        ea = ExaminationAttempt.objects.create(student=self.student, examination=self.canonical_exam, status='submitted', score=1, percentage=50)
        StudentAnswer.objects.create(attempt=ea, question=self.q2, is_correct=True)

        overview = AnalyticsService.get_overview(self.student)

        self.assertEqual(overview['questions_solved'], 2)
        self.assertEqual(overview['model_exams_taken'], 1)
        self.assertEqual(overview['overall_accuracy'], 100.0)  # 2 correct out of 2 solved

    def test_teacher_course_performance_n_plus_1(self):
        # We will test that we don't have N+1 issues
        # Create a second course
        course2 = Course.objects.create(title="Course 2", slug="course-2", exam=self.exam_level)
        Enrollment.objects.create(student=self.student, course=course2, status='active')
        TeacherCourseAssignment.objects.create(teacher=self.teacher, course=course2)

        # Give the student some activity
        ea = ExaminationAttempt.objects.create(student=self.student, examination=self.canonical_exam, status='submitted', score=10)

        with CaptureQueriesContext(connection) as ctx:
            stats = TeacherAnalyticsService.get_course_performance(self.teacher)

        self.assertLess(len(ctx.captured_queries), 15)
        self.assertEqual(len(stats), 2)
        for stat in stats:
            if stat['id'] == self.course.id:
                self.assertEqual(stat['attempts'], 1)
                self.assertEqual(stat['students'], 2)
            elif stat['id'] == course2.id:
                self.assertEqual(stat['attempts'], 1)
                self.assertEqual(stat['students'], 1)

    def test_teacher_needs_attention_n_plus_1(self):
        # Add some attempts so it isn't completely empty
        ExaminationAttempt.objects.create(student=self.student, examination=self.canonical_exam, status='submitted', score=5, percentage=50)
        ExaminationAttempt.objects.create(student=self.student2, examination=self.canonical_exam, status='submitted', score=2, percentage=20)
        
        with CaptureQueriesContext(connection) as ctx:
            TeacherAnalyticsService.get_needs_attention(self.teacher)
            
        self.assertLess(len(ctx.captured_queries), 15)
