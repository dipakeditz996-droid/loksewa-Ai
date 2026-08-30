"""Tests for admin -> student performance feedback (Rankings & Leaderboards)."""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, Notification, StudentFeedback
from .models import AuditLog

URL = lambda student_id: f'/api/admin/students/{student_id}/feedback/'


class FeedbackTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.teacher = User.objects.create_user(
            username='teach1', password='pw', role='teacher')
        self.student = User.objects.create_user(
            username='stud1', password='pw', role='student', email='stud1@example.com')
        self.other_student = User.objects.create_user(
            username='stud2', password='pw', role='student')


class PermissionTests(FeedbackTestBase):
    def test_anonymous_rejected(self):
        response = self.client.post(URL(self.student.id), {'message': 'Great job'})
        self.assertIn(response.status_code, (401, 403))

    def test_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(URL(self.student.id), {'message': 'Great job'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_rejected(self):
        # Rankings & Leaderboards is admin-only; this endpoint matches that gate.
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post(URL(self.student.id), {'message': 'Great job'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_allowed(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(URL(self.student.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CreateFeedbackTests(FeedbackTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def test_text_only(self):
        response = self.client.post(URL(self.student.id), {'message': 'Keep improving your speed.'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(StudentFeedback.objects.count(), 1)
        fb = StudentFeedback.objects.first()
        self.assertEqual(fb.student, self.student)
        self.assertEqual(fb.given_by, self.admin)
        self.assertEqual(fb.youtube_url, '')

    def test_youtube_only(self):
        response = self.client.post(
            URL(self.student.id), {'youtube_url': 'https://www.youtube.com/watch?v=abc123'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        fb = StudentFeedback.objects.first()
        self.assertEqual(fb.message, '')
        self.assertEqual(fb.youtube_url, 'https://www.youtube.com/watch?v=abc123')

    def test_text_and_youtube(self):
        response = self.client.post(URL(self.student.id), {
            'message': 'Watch this explanation.',
            'youtube_url': 'https://youtu.be/abc123',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_youtu_be_short_link_accepted(self):
        response = self.client.post(URL(self.student.id), {'youtube_url': 'https://youtu.be/xyz'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_neither_field_rejected(self):
        response = self.client.post(URL(self.student.id), {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(StudentFeedback.objects.count(), 0)

    def test_blank_strings_rejected(self):
        response = self.client.post(URL(self.student.id), {'message': '   ', 'youtube_url': '  '})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_youtube_url_rejected(self):
        response = self.client.post(
            URL(self.student.id), {'youtube_url': 'https://vimeo.com/12345'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(StudentFeedback.objects.count(), 0)

    def test_unknown_student_404(self):
        response = self.client.post(URL(999999), {'message': 'Hello'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_student_user_id_404(self):
        # A teacher's id must not be reachable through the student feedback route.
        response = self.client.post(URL(self.teacher.id), {'message': 'Hello'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_creates_notification_for_student(self):
        self.client.post(URL(self.student.id), {'message': 'Nice work this week.'})
        notif = Notification.objects.filter(recipient=self.student, type='feedback').first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.action_url, '/student/feedback')
        self.assertIn('Nice work', notif.message)

    def test_video_only_notification_has_fallback_message(self):
        self.client.post(URL(self.student.id), {'youtube_url': 'https://youtu.be/abc'})
        notif = Notification.objects.filter(recipient=self.student, type='feedback').first()
        self.assertTrue(notif.message)

    def test_creates_audit_log(self):
        response = self.client.post(URL(self.student.id), {'message': 'Nice work.'})
        fb_id = response.data['id']
        log = AuditLog.objects.filter(action='STUDENT_FEEDBACK_SENT', entity_id=str(fb_id)).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor, self.admin)
        self.assertEqual(log.details['student_id'], self.student.id)


class ListFeedbackTests(FeedbackTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def test_empty_list(self):
        response = self.client.get(URL(self.student.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(response.data['results'], [])

    def test_only_shows_that_students_feedback(self):
        StudentFeedback.objects.create(student=self.student, given_by=self.admin, message='For stud1')
        StudentFeedback.objects.create(student=self.other_student, given_by=self.admin, message='For stud2')
        response = self.client.get(URL(self.student.id))
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['message'], 'For stud1')

    def test_newest_first(self):
        first = StudentFeedback.objects.create(student=self.student, given_by=self.admin, message='old')
        second = StudentFeedback.objects.create(student=self.student, given_by=self.admin, message='new')
        response = self.client.get(URL(self.student.id))
        ids = [row['id'] for row in response.data['results']]
        self.assertEqual(ids, [second.id, first.id])

    def test_pagination(self):
        for i in range(5):
            StudentFeedback.objects.create(student=self.student, given_by=self.admin, message=f'msg {i}')
        response = self.client.get(URL(self.student.id), {'page_size': 2, 'page': 1})
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(response.data['total_pages'], 3)
        self.assertTrue(response.data['has_next'])


class StudentFeedbackListEndpointTests(FeedbackTestBase):
    """The student-facing GET /api/student/feedback/ endpoint (core app)."""
    URL = '/api/student/feedback/'

    def test_anonymous_rejected(self):
        response = self.client.get(self.URL)
        self.assertIn(response.status_code, (401, 403))

    def test_student_sees_only_own_feedback(self):
        StudentFeedback.objects.create(student=self.student, given_by=self.admin, message='mine')
        StudentFeedback.objects.create(student=self.other_student, given_by=self.admin, message='not mine')

        self.client.force_authenticate(user=self.student)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['message'], 'mine')

    def test_includes_youtube_url_and_author(self):
        StudentFeedback.objects.create(
            student=self.student, given_by=self.admin,
            message='watch this', youtube_url='https://youtu.be/abc',
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.get(self.URL)
        row = response.data['results'][0]
        self.assertEqual(row['youtube_url'], 'https://youtu.be/abc')
        self.assertEqual(row['given_by'], self.admin.username)
