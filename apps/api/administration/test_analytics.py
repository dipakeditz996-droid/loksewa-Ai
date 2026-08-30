"""Tests for the Admin Analytics module: Overview time-series
(AdminAnalyticsView), CSV export (AdminAnalyticsExportView), and the
Students cohort analytics (AdminStudentsAnalyticsView)."""
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from exams.models import (
    ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question,
    Examination, ExaminationAttempt,
)

OVERVIEW_URL = '/api/admin/analytics/'
EXPORT_URL = '/api/admin/analytics/export/'
STUDENTS_URL = '/api/admin/analytics/students/'


class AnalyticsTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.student = User.objects.create_user(
            username='stu1', password='pw', role='student')

        category = ExamCategory.objects.create(name='Loksewa')
        exam = Exam.objects.create(category=category, name='Kharidar')
        paper = Paper.objects.create(exam=exam, name='First Paper')
        subject = Subject.objects.create(paper=paper, name='General Knowledge')
        chapter = Chapter.objects.create(subject=subject, title='Geography')
        self.topic = Topic.objects.create(chapter=chapter, name='Mountains')
        self.examination = Examination.objects.create(
            title='Kharidar Mock', exam=exam, exam_type='mock',
            category=category, time_limit=60, total_marks=100,
        )

    def make_attempt(self, student=None, percentage=50.0, passed=False, started_days_ago=0):
        student = student or self.student
        attempt = ExaminationAttempt.objects.create(
            student=student, examination=self.examination, status='submitted',
            percentage=percentage, passed=passed,
        )
        started_at = timezone.now() - timedelta(days=started_days_ago)
        ExaminationAttempt.objects.filter(pk=attempt.pk).update(started_at=started_at)
        return attempt


class PermissionTests(AnalyticsTestBase):
    def test_overview_anonymous_rejected(self):
        self.assertEqual(self.client.get(OVERVIEW_URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_overview_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get(OVERVIEW_URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_overview_admin_allowed(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get(OVERVIEW_URL).status_code, status.HTTP_200_OK)

    def test_export_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get(EXPORT_URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_students_analytics_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get(STUDENTS_URL).status_code, status.HTTP_403_FORBIDDEN)


class OverviewTests(AnalyticsTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def test_default_period_is_30_days(self):
        response = self.client.get(OVERVIEW_URL)
        self.assertEqual(response.data['days'], 30)
        self.assertEqual(len(response.data['chartData']), 30)

    def test_period_7d(self):
        response = self.client.get(OVERVIEW_URL, {'period': '7d'})
        self.assertEqual(response.data['days'], 7)
        self.assertEqual(len(response.data['chartData']), 7)

    def test_registration_counted_on_real_day(self):
        response = self.client.get(OVERVIEW_URL, {'period': '7d'})
        total_regs = sum(row['registrations'] for row in response.data['chartData'])
        # self.student was created in setUp, "today" - must show up somewhere.
        self.assertGreaterEqual(total_regs, 1)

    def test_exam_attempts_counted(self):
        self.make_attempt(percentage=70)
        response = self.client.get(OVERVIEW_URL, {'period': '7d'})
        self.assertEqual(response.data['totals']['examAttempts'], 1)


class ExportTests(AnalyticsTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def test_export_returns_csv(self):
        response = self.client.get(EXPORT_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
        content = response.content.decode('utf-8')
        self.assertIn('Date,Registrations,Exam Attempts,AI Sessions,Practice Sessions', content)

    def test_export_row_count_matches_period(self):
        response = self.client.get(EXPORT_URL, {'period': '7d'})
        content = response.content.decode('utf-8').strip().split('\n')
        self.assertEqual(len(content), 8)  # header + 7 days


class StudentsAnalyticsTests(AnalyticsTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def test_empty_state(self):
        response = self.client.get(STUDENTS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['totalStudents'], 1)
        self.assertEqual(response.data['topPerformers'], [])
        self.assertEqual(sum(b['count'] for b in response.data['scoreDistribution']), 0)

    def test_never_logged_in_reflects_real_last_login(self):
        response = self.client.get(STUDENTS_URL)
        self.assertEqual(response.data['summary']['neverLoggedIn'], 1)
        self.assertEqual(response.data['summary']['active7d'], 0)

        self.student.last_login = timezone.now()
        self.student.save(update_fields=['last_login'])
        response = self.client.get(STUDENTS_URL)
        self.assertEqual(response.data['summary']['neverLoggedIn'], 0)
        self.assertEqual(response.data['summary']['active7d'], 1)

    def test_score_distribution_buckets_correctly(self):
        self.make_attempt(percentage=15)   # 0-20
        self.make_attempt(percentage=45)   # 40-60
        self.make_attempt(percentage=95)   # 80-100
        response = self.client.get(STUDENTS_URL)
        buckets = {b['range']: b['count'] for b in response.data['scoreDistribution']}
        self.assertEqual(buckets['0-20'], 1)
        self.assertEqual(buckets['40-60'], 1)
        self.assertEqual(buckets['80-100'], 1)
        self.assertEqual(buckets['20-40'], 0)

    def test_top_performers_ranked_by_average(self):
        other = User.objects.create_user(username='stu2', password='pw', role='student')
        self.make_attempt(student=self.student, percentage=60)
        self.make_attempt(student=other, percentage=90)

        response = self.client.get(STUDENTS_URL)
        top = response.data['topPerformers']
        self.assertEqual(top[0]['username'], 'stu2')
        self.assertEqual(top[0]['averagePercentage'], 90.0)

    def test_only_completed_attempts_count_toward_top_performers(self):
        ExaminationAttempt.objects.create(
            student=self.student, examination=self.examination, status='in-progress', percentage=0,
        )
        response = self.client.get(STUDENTS_URL)
        self.assertEqual(response.data['topPerformers'], [])

    def test_no_n_plus_one_regression(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        students = [User.objects.create_user(username=f'bulk{i}', password='pw', role='student') for i in range(6)]
        for s in students:
            self.make_attempt(student=s, percentage=40 + (s.id % 5) * 10)

        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(STUDENTS_URL, {'period': '30d'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Fixed baseline (SCORE_BUCKETS loop + a handful of aggregates), not
        # one query per student - confirms no N+1 as student count grows.
        self.assertLess(len(ctx.captured_queries), 20)
