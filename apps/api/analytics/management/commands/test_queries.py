from django.core.management.base import BaseCommand
from django.test.utils import CaptureQueriesContext
from django.db import connection
from core.models import User
from analytics.services.teacher_analytics_service import TeacherAnalyticsService
from analytics.services.analytics_service import AnalyticsService

class Command(BaseCommand):
    help = 'Test queries'

    def handle(self, *args, **options):
        teacher, _ = User.objects.get_or_create(email="teacher@test.com", defaults={"username": "teacher_test_unique", "role": "TEACHER"})
        student, _ = User.objects.get_or_create(email="student@test.com", defaults={"username": "student_test_unique", "role": "STUDENT"})
            
        from courses.models import Course, TeacherCourseAssignment, Enrollment
        course, _ = Course.objects.get_or_create(title="Test Course")
            
        TeacherCourseAssignment.objects.get_or_create(teacher=teacher, course=course)
        Enrollment.objects.get_or_create(student=student, course=course, status='active')
        
        from exams.models import PracticeSession, Examination, ExaminationAttempt
        PracticeSession.objects.get_or_create(user=student, completed=True, defaults={"score": 80, "accuracy": 80, "total_questions": 10, "correct_count": 8})
        
        exam, _ = Examination.objects.get_or_create(title="Test Exam", course=course, defaults={"is_published": True})
        ExaminationAttempt.objects.get_or_create(student=student, examination=exam, status='submitted', defaults={"score": 50, "percentage": 50})

        print(f"Testing teacher: {teacher.email}, student: {student.email}")

        print("\n--- TeacherAnalyticsService ---")
        with CaptureQueriesContext(connection) as ctx:
            TeacherAnalyticsService.get_overview(teacher)
        print(f"get_overview: {len(ctx.captured_queries)} queries")

        with CaptureQueriesContext(connection) as ctx:
            TeacherAnalyticsService.get_performance_trend(teacher)
        print(f"get_performance_trend: {len(ctx.captured_queries)} queries")

        with CaptureQueriesContext(connection) as ctx:
            TeacherAnalyticsService.get_course_performance(teacher)
        print(f"get_course_performance: {len(ctx.captured_queries)} queries")

        with CaptureQueriesContext(connection) as ctx:
            TeacherAnalyticsService.get_subject_performance(teacher)
        print(f"get_subject_performance: {len(ctx.captured_queries)} queries")

        with CaptureQueriesContext(connection) as ctx:
            TeacherAnalyticsService.get_topic_performance(teacher)
        print(f"get_topic_performance: {len(ctx.captured_queries)} queries")

        with CaptureQueriesContext(connection) as ctx:
            TeacherAnalyticsService.get_student_ranking(teacher)
        print(f"get_student_ranking: {len(ctx.captured_queries)} queries")

        with CaptureQueriesContext(connection) as ctx:
            TeacherAnalyticsService.get_needs_attention(teacher)
        print(f"get_needs_attention: {len(ctx.captured_queries)} queries")

        print("\n--- AnalyticsService ---")
        with CaptureQueriesContext(connection) as ctx:
            AnalyticsService.get_overview(student)
        print(f"get_overview: {len(ctx.captured_queries)} queries")

        with CaptureQueriesContext(connection) as ctx:
            AnalyticsService.get_performance_trend(student)
        print(f"get_performance_trend: {len(ctx.captured_queries)} queries")

        with CaptureQueriesContext(connection) as ctx:
            AnalyticsService.get_subject_performance(student)
        print(f"get_subject_performance: {len(ctx.captured_queries)} queries")

        with CaptureQueriesContext(connection) as ctx:
            AnalyticsService.get_topic_performance(student)
        print(f"get_topic_performance: {len(ctx.captured_queries)} queries")

