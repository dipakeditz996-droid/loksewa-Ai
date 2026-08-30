from datetime import date, time, timedelta, timezone as dt_timezone
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from exams.models import ExamCategory, Exam, Examination, ExamSchedule
from courses.models import Course, Enrollment

User = get_user_model()

class ExamScheduleAndCountdownTests(APITestCase):
    def setUp(self):
        # Users
        self.admin_user = User.objects.create_superuser(
            username='admin_tester',
            email='admin@loksewa.ai',
            password='Password123!',
            is_staff=True,
            role='admin'
        )

        self.student_user = User.objects.create_user(
            username='student_tester',
            email='student@loksewa.ai',
            password='Password123!',
            role='student'
        )
        self.unauthorized_student = User.objects.create_user(
            username='unauthorized_student',
            email='other@loksewa.ai',
            password='Password123!',
            role='student'
        )

        # Category and Exam
        self.category = ExamCategory.objects.create(name='Civil Service', order=1)
        self.exam = Exam.objects.create(category=self.category, name='Section Officer')

        # Course and Enrollment for student_user
        self.course = Course.objects.create(title='Officer Premium Batch', exam=self.exam)
        Enrollment.objects.create(student=self.student_user, course=self.course, status='active')

    def test_01_admin_can_create_schedule(self):
        """1. Admin can create official exam schedule."""
        self.client.force_authenticate(user=self.admin_user)
        future_date = (timezone.now() + timedelta(days=30)).date()
        payload = {
            'title': 'Loksewa Section Officer 2083 First Paper',
            'exam_category': self.category.id,
            'exam': self.exam.id,
            'description': 'Official first paper examination announcement.',
            'exam_date': str(future_date),
            'exam_time': '08:00:00',
            'is_published': True,
            'is_active': True,
            'official_notice_url': 'https://psc.gov.np/notice/123'
        }
        res = self.client.post('/api/admin/schedules/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ExamSchedule.objects.count(), 1)
        schedule = ExamSchedule.objects.first()
        self.assertEqual(schedule.title, 'Loksewa Section Officer 2083 First Paper')
        self.assertIsNotNone(schedule.exam_datetime)

    def test_02_admin_can_update_schedule(self):
        """2. Admin can update schedule dates and details."""
        self.client.force_authenticate(user=self.admin_user)
        future_date_a = (timezone.now() + timedelta(days=20)).date()
        future_date_b = (timezone.now() + timedelta(days=25)).date()
        schedule = ExamSchedule.objects.create(
            title='Preliminary Exam',
            exam_category=self.category,
            exam_date=future_date_a,
            exam_time=time(9, 0),
            is_published=True,
            is_active=True
        )
        res = self.client.patch(
            f'/api/admin/schedules/{schedule.id}/',
            {'exam_date': str(future_date_b), 'title': 'Updated Preliminary Exam'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        schedule.refresh_from_db()
        self.assertEqual(schedule.exam_date, future_date_b)
        self.assertEqual(schedule.title, 'Updated Preliminary Exam')

    def test_03_admin_can_publish_and_unpublish_schedule(self):
        """3. Admin can publish/unpublish schedule via action."""
        self.client.force_authenticate(user=self.admin_user)
        future_date = (timezone.now() + timedelta(days=15)).date()
        schedule = ExamSchedule.objects.create(
            title='Draft Schedule',
            exam_date=future_date,
            is_published=False,
            is_active=True
        )
        # Toggle publish
        res = self.client.post(f'/api/admin/schedules/{schedule.id}/toggle-publish/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        schedule.refresh_from_db()
        self.assertTrue(schedule.is_published)

    def test_04_student_can_read_published_schedule(self):
        """4. Student can read published schedule via public endpoint."""
        future_date = (timezone.now() + timedelta(days=40)).date()
        schedule = ExamSchedule.objects.create(
            title='Section Officer 2083',
            exam_category=self.category,
            exam=self.exam,
            exam_date=future_date,
            exam_time=time(8, 30),
            is_published=True,
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        res = self.client.get('/api/schedules/next/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res.data.get('schedule'))
        self.assertEqual(res.data['schedule']['title'], 'Section Officer 2083')
        self.assertEqual(res.data['schedule']['exam_date'], str(future_date))
        self.assertIn('server_time', res.data)

    def test_05_student_cannot_modify_schedule(self):
        """5. Student cannot create, update, or delete schedules."""
        self.client.force_authenticate(user=self.student_user)
        future_date = (timezone.now() + timedelta(days=10)).date()
        schedule = ExamSchedule.objects.create(
            title='Official Test',
            exam_date=future_date,
            is_published=True
        )
        res_post = self.client.post('/api/admin/schedules/', {'title': 'Hack'}, format='json')
        self.assertEqual(res_post.status_code, status.HTTP_403_FORBIDDEN)
        res_patch = self.client.patch(f'/api/admin/schedules/{schedule.id}/', {'title': 'Hack'}, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_403_FORBIDDEN)
        res_delete = self.client.delete(f'/api/admin/schedules/{schedule.id}/')
        self.assertEqual(res_delete.status_code, status.HTTP_403_FORBIDDEN)

    def test_06_unpublished_schedule_is_not_returned(self):
        """6. Unpublished schedule is not returned to students."""
        future_date = (timezone.now() + timedelta(days=10)).date()
        ExamSchedule.objects.create(
            title='Unpublished Draft',
            exam_date=future_date,
            is_published=False,
            is_active=True
        )
        res = self.client.get('/api/schedules/next/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data.get('schedule'))

    def test_07_inactive_schedule_is_not_returned_as_next_exam(self):
        """7. Inactive schedule is not chosen when looking for active next exam."""
        future_date_near = (timezone.now() + timedelta(days=5)).date()
        future_date_far = (timezone.now() + timedelta(days=20)).date()
        # Inactive near schedule
        ExamSchedule.objects.create(
            title='Inactive Near Exam',
            exam_date=future_date_near,
            is_published=True,
            is_active=False
        )
        # Active far schedule
        ExamSchedule.objects.create(
            title='Active Far Exam',
            exam_date=future_date_far,
            is_published=True,
            is_active=True
        )
        res = self.client.get('/api/schedules/next/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['schedule']['title'], 'Active Far Exam')

    def test_08_past_schedule_is_not_returned_as_upcoming(self):
        """8. Past schedule is not returned as upcoming."""
        past_date = (timezone.now() - timedelta(days=5)).date()
        ExamSchedule.objects.create(
            title='Old Past Exam',
            exam_date=past_date,
            is_published=True,
            is_active=True
        )
        res = self.client.get('/api/schedules/next/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data.get('schedule'))

    def test_09_only_one_active_next_exam_exists(self):
        """9. When activating a new schedule, previous active schedules are deactivated."""
        self.client.force_authenticate(user=self.admin_user)
        future_date1 = (timezone.now() + timedelta(days=10)).date()
        future_date2 = (timezone.now() + timedelta(days=20)).date()
        sched1 = ExamSchedule.objects.create(
            title='Schedule 1',
            exam_date=future_date1,
            is_published=True,
            is_active=True
        )
        sched2 = ExamSchedule.objects.create(
            title='Schedule 2',
            exam_date=future_date2,
            is_published=True,
            is_active=True
        )
        sched1.refresh_from_db()
        self.assertFalse(sched1.is_active)
        self.assertTrue(sched2.is_active)
        self.assertEqual(ExamSchedule.objects.filter(is_active=True).count(), 1)

    def test_10_mock_exam_upcoming_status(self):
        """10. Mock exam with start_time in future returns UPCOMING."""
        now = timezone.now()
        start = now + timedelta(hours=2)
        end = now + timedelta(hours=4)
        mock = Examination.objects.create(
            title='Upcoming Grand Mock Test',
            category=self.category,
            exam=self.exam,
            start_time=start,
            end_time=end,
            time_limit=90,
            status='published'
        )
        self.assertEqual(mock.computed_status, 'UPCOMING')
        res = self.client.get('/api/student/mock-exams/upcoming/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'UPCOMING')
        self.assertEqual(res.data['mock_exam']['id'], mock.id)
        self.assertFalse(res.data['mock_exam']['can_start'])

    def test_11_mock_exam_live_status(self):
        """11. Mock exam currently in window returns LIVE and can_start=True for authenticated student."""
        now = timezone.now()
        start = now - timedelta(minutes=15)
        end = now + timedelta(hours=1)
        mock = Examination.objects.create(
            title='Live Mock Test',
            category=self.category,
            exam=self.exam,
            start_time=start,
            end_time=end,
            time_limit=60,
            status='published'
        )
        self.assertEqual(mock.computed_status, 'LIVE')
        self.client.force_authenticate(user=self.student_user)
        res = self.client.get('/api/student/mock-exams/upcoming/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'LIVE')
        self.assertTrue(res.data['mock_exam']['can_start'])

    def test_12_mock_exam_completed_status(self):
        """12. Mock exam past end_time returns COMPLETED."""
        now = timezone.now()
        start = now - timedelta(hours=3)
        end = now - timedelta(hours=1)
        mock = Examination.objects.create(
            title='Completed Mock Test',
            category=self.category,
            exam=self.exam,
            start_time=start,
            end_time=end,
            time_limit=60,
            status='published'
        )
        self.assertEqual(mock.computed_status, 'COMPLETED')

    def test_13_unauthorized_student_cannot_access_course_restricted_mock_exam(self):
        """13. Student not enrolled in course cannot see restricted mock exam in upcoming."""
        now = timezone.now()
        mock = Examination.objects.create(
            title='Enrolled Only Mock Test',
            category=self.category,
            exam=self.exam,
            course=self.course,
            start_time=now + timedelta(hours=1),
            status='published'
        )
        # unauthorized student
        self.client.force_authenticate(user=self.unauthorized_student)
        res = self.client.get('/api/student/mock-exams/upcoming/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'NONE')

        # authorized student
        self.client.force_authenticate(user=self.student_user)
        res_auth = self.client.get('/api/student/mock-exams/upcoming/')
        self.assertEqual(res_auth.status_code, status.HTTP_200_OK)
        self.assertEqual(res_auth.data['status'], 'UPCOMING')

    def test_14_schedule_change_is_reflected_in_api(self):
        """14. Admin changing date is immediately reflected in student API response."""
        date_a = (timezone.now() + timedelta(days=10)).date()
        date_b = (timezone.now() + timedelta(days=15)).date()
        schedule = ExamSchedule.objects.create(
            title='Dynamic Changing Exam',
            exam_date=date_a,
            is_published=True,
            is_active=True
        )
        # Verify Date A in student API
        res_a = self.client.get('/api/schedules/next/')
        self.assertEqual(res_a.data['schedule']['exam_date'], str(date_a))

        # Admin updates to Date B
        self.client.force_authenticate(user=self.admin_user)
        self.client.patch(f'/api/admin/schedules/{schedule.id}/', {'exam_date': str(date_b)}, format='json')

        # Student gets Date B
        self.client.logout()
        res_b = self.client.get('/api/schedules/next/')
        self.assertEqual(res_b.data['schedule']['exam_date'], str(date_b))

    def test_15_timezone_handling(self):
        """15. Timezone handling verifies Asia/Kathmandu UTC offset (+05:45)."""
        future_date = (timezone.now() + timedelta(days=30)).date()
        schedule = ExamSchedule.objects.create(
            title='Nepal Time Exam',
            exam_date=future_date,
            exam_time=time(11, 0), # 11:00 AM NPT
            timezone='Asia/Kathmandu',
            is_published=True,
            is_active=True
        )
        # 11:00 AM NPT should equal 05:15 AM UTC
        schedule.refresh_from_db()
        utc_dt = schedule.exam_datetime.astimezone(dt_timezone.utc)
        self.assertEqual(utc_dt.hour, 5)
        self.assertEqual(utc_dt.minute, 15)
