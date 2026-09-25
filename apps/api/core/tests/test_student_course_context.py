from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import timedelta

from courses.models import Course, Enrollment
from exams.models import ExamCategory, Exam, ExamSchedule, Examination
from subscriptions.models import SubscriptionPlan, Subscription
from support.models import StudentProfile
from core.models import AdminSettings

User = get_user_model()


class StudentCourseContextAndSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Category and Exams
        self.category = ExamCategory.objects.create(name="PSC Exams")
        self.level5 = Exam.objects.create(name="5th Level", category=self.category, is_active=True, status="active")
        self.civil5 = Exam.objects.create(name="Civil Engineering", parent=self.level5, category=self.category, is_active=True, status="active")
        self.electrical5 = Exam.objects.create(name="Electrical Engineering", parent=self.level5, category=self.category, is_active=True, status="active")

        # Create Courses
        self.course_civil = Course.objects.create(
            title="PSC 5th Level Civil Engineering",
            slug="psc-5th-civil",
            exam=self.civil5,
            status="published"
        )
        self.course_electrical = Course.objects.create(
            title="PSC 5th Level Electrical Engineering",
            slug="psc-5th-electrical",
            exam=self.electrical5,
            status="published"
        )
        self.course_draft = Course.objects.create(
            title="PSC Coming Soon Course",
            slug="psc-coming-soon",
            status="coming_soon"
        )

        # Create Students
        self.student_a = User.objects.create_user(
            username="student_a",
            email="student_a@example.com",
            password="Password123!",
            role="student"
        )
        self.profile_a, _ = StudentProfile.objects.get_or_create(user=self.student_a)

        self.student_b = User.objects.create_user(
            username="student_b",
            email="student_b@example.com",
            password="Password123!",
            role="student"
        )
        self.profile_b, _ = StudentProfile.objects.get_or_create(user=self.student_b)

        # Enroll Student A in Civil
        now = timezone.now()
        Enrollment.objects.create(
            student=self.student_a,
            course=self.course_civil,
            status="active",
            enrolled_at=now,
            expires_at=now + timedelta(days=30)
        )

        # Enroll Student B in Electrical
        Enrollment.objects.create(
            student=self.student_b,
            course=self.course_electrical,
            status="active",
            enrolled_at=now,
            expires_at=now + timedelta(days=30)
        )

        # Exam schedule configured for Civil only
        self.schedule_civil = ExamSchedule.objects.create(
            title="PSC 5th Level Civil Official Exam",
            exam_category=self.category,
            exam=self.civil5,
            exam_date=now.date() + timedelta(days=20),
            is_published=True,
            is_active=True
        )

        # Mock exams for each course
        self.exam_civil = Examination.objects.create(
            title="Civil Mock Exam 1",
            category=self.category,
            course=self.course_civil,
            exam=self.civil5,
            status="published",
            total_marks=100,
            passing_marks=40,
            time_limit=60,
            created_by=self.student_a
        )
        self.exam_electrical = Examination.objects.create(
            title="Electrical Mock Exam 1",
            category=self.category,
            course=self.course_electrical,
            exam=self.electrical5,
            status="published",
            total_marks=100,
            passing_marks=40,
            time_limit=60,
            created_by=self.student_b
        )

    def test_canonical_course_context_single_course(self):
        """Student A with only Civil enrolled automatically has Civil as active course."""
        self.client.force_authenticate(user=self.student_a)
        response = self.client.get('/api/student/context/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertIsNotNone(data['active_course'])
        self.assertEqual(data['active_course']['id'], self.course_civil.id)
        self.assertEqual(data['active_course']['title'], self.course_civil.title)

        # Authorized courses contains exactly 1 course
        self.assertEqual(len(data['authorized_courses']), 1)
        self.assertEqual(data['authorized_courses'][0]['id'], self.course_civil.id)

        # Exam schedule for Civil is returned
        self.assertIsNotNone(data['exam_schedule'])
        self.assertEqual(data['exam_schedule']['id'], self.schedule_civil.id)

    def test_course_switching_authorization(self):
        """Student with multiple courses can switch, but cannot switch to unauthorized course."""
        # Enroll Student A in Electrical as well (now owns 2 courses)
        now = timezone.now()
        Enrollment.objects.create(
            student=self.student_a,
            course=self.course_electrical,
            status="active",
            enrolled_at=now,
            expires_at=now + timedelta(days=30)
        )

        self.client.force_authenticate(user=self.student_a)

        # Context returns 2 authorized courses
        res = self.client.get('/api/student/context/')
        self.assertEqual(len(res.json()['authorized_courses']), 2)

        # Switch to Electrical
        switch_res = self.client.post('/api/student/context/select-course/', {'course_id': self.course_electrical.id})
        self.assertEqual(switch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(switch_res.json()['active_course']['id'], self.course_electrical.id)

        # Attempt to switch to an unauthorized draft or non-existent course ID -> 403 Forbidden
        idor_res = self.client.post('/api/student/context/select-course/', {'course_id': self.course_draft.id})
        self.assertEqual(idor_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_exam_timeline_scoping_and_empty_state(self):
        """Student A sees Civil schedule, Student B sees honest empty message for Electrical."""
        # Student A (Civil has schedule configured)
        self.client.force_authenticate(user=self.student_a)
        res_a = self.client.get('/api/schedules/next/')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res_a.json()['schedule'])
        self.assertEqual(res_a.json()['course_id'], self.course_civil.id)

        # Student A attempts IDOR: request schedule for Electrical course -> 403 Forbidden
        res_idor = self.client.get(f'/api/schedules/next/?course_id={self.course_electrical.id}')
        self.assertEqual(res_idor.status_code, status.HTTP_403_FORBIDDEN)

        # Student B (Electrical has no schedule configured) -> Honest empty message
        self.client.force_authenticate(user=self.student_b)
        res_b = self.client.get('/api/schedules/next/')
        self.assertEqual(res_b.status_code, status.HTTP_200_OK)
        self.assertIsNone(res_b.json()['schedule'])
        self.assertIn("No exam schedule configured for this course yet", res_b.json()['message'])

    def test_notes_portal_idor_protection(self):
        """Student A cannot fetch notes/syllabus for Course B (Electrical)."""
        self.client.force_authenticate(user=self.student_a)

        # Legitimate access for own course Civil
        res_ok = self.client.get(f'/api/notes/student/portal/?course_id={self.course_civil.id}')
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)

        # IDOR attempt: Student A requests Electrical notes by course_id -> 403 Forbidden
        res_idor_course = self.client.get(f'/api/notes/student/portal/?course_id={self.course_electrical.id}')
        self.assertEqual(res_idor_course.status_code, status.HTTP_403_FORBIDDEN)

        # IDOR attempt: Student A requests Electrical notes by exam_id -> 403 Forbidden
        res_idor_exam = self.client.get(f'/api/notes/student/portal/?exam={self.electrical5.id}')
        self.assertEqual(res_idor_exam.status_code, status.HTTP_403_FORBIDDEN)

    def test_mock_exam_idor_protection(self):
        """Student A cannot access Student B's Electrical mock exam."""
        self.client.force_authenticate(user=self.student_a)

        # Listing exams only shows Civil exams
        res_list = self.client.get('/api/student/exams/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        data = res_list.json()
        results = data.get('results', data) if isinstance(data, dict) else data
        exam_ids = [e['id'] for e in results]
        self.assertIn(self.exam_civil.id, exam_ids)
        self.assertNotIn(self.exam_electrical.id, exam_ids)

        # Direct detail request to Electrical exam -> 403 or 404 (IDOR blocked)
        res_detail = self.client.get(f'/api/student/exams/{self.exam_electrical.id}/')
        self.assertIn(res_detail.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # Attempt to start Electrical exam -> 403 or 404 (IDOR blocked)
        res_start = self.client.post(f'/api/student/exams/{self.exam_electrical.id}/start/')
        self.assertIn(res_start.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_unsubscribed_user_honest_empty_state(self):
        """A user with no course enrollment sees honest empty state."""
        unsubscribed_user = User.objects.create_user(
            username="unsubscribed",
            email="unsub@example.com",
            password="Password123!",
            role="student"
        )
        StudentProfile.objects.create(user=unsubscribed_user)

        self.client.force_authenticate(user=unsubscribed_user)
        res = self.client.get('/api/student/context/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIsNone(data['active_course'])
        self.assertEqual(len(data['authorized_courses']), 0)
        self.assertEqual(data['schedule_message'], "No active course yet.")
