"""Tests for the extended AdminUsersView.post student-creation path
(Admin -> User Management -> Add User -> Role = Student).

Covers: full registration-equivalent field set persisted to StudentProfile,
immediate verification (no pending-verification queue entry, unlike self-
registration), required-field/format/hierarchy validation, duplicate email/
username protection, course preference recorded as a pending
CourseApplication (never an auto-enrollment), permission boundaries
(teacher/student cannot create users), and that plain teacher/admin
creation is unaffected."""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from support.models import StudentProfile
from exams.models import ExamCategory, Exam
from courses.models import Course, CourseApplication, Enrollment
from gamification.models import GamificationProfile
from administration.models import AuditLog

CREATE_URL = '/api/admin/users/'
PENDING_VERIFICATION_URL = '/api/admin/users/pending-verifications/'


def _student_payload(**overrides):
    payload = {
        'username': 'newstudent',
        'email': 'newstudent@test.com',
        'password': 'StrongPass123!',
        'role': 'student',
        'name': 'Dipak Bhandari',
        'mobile': '9812345678',
        'permanent_district': 'Rupandehi',
        'permanent_local_level': 'Butwal',
    }
    payload.update(overrides)
    return payload


class AdminCreateStudentTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin1', password='pw', role='admin', is_staff=True)
        self.teacher = User.objects.create_user(username='teacher1', password='pw', role='teacher')
        self.other_student = User.objects.create_user(username='stu1', password='pw', role='student')

        self.category = ExamCategory.objects.create(name='PSC Exams', is_active=True)
        self.level = Exam.objects.create(category=self.category, name='5th Level', is_active=True)
        self.service = Exam.objects.create(category=self.category, name='Computer', parent=self.level, is_active=True)
        self.course = Course.objects.create(
            title='Computer Service Prep', slug='computer-service-prep',
            status='published', exam=self.service,
        )

    # ---- happy path ---------------------------------------------------

    def test_admin_can_create_full_student(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(
            exam_category_id=self.category.id,
            exam_position_id=self.service.id,
            course_id=self.course.id,
        )
        response = self.client.post(CREATE_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        user = User.objects.get(username='newstudent')
        self.assertEqual(user.role, 'student')
        self.assertEqual(user.first_name, 'Dipak')
        self.assertEqual(user.last_name, 'Bhandari')
        self.assertTrue(user.check_password('StrongPass123!'))

        profile = StudentProfile.objects.get(user=user)
        self.assertEqual(profile.phone, '9812345678')
        self.assertEqual(profile.permanent_district, 'Rupandehi')
        self.assertEqual(profile.permanent_local_level, 'Butwal')
        self.assertEqual(profile.target_category_id, self.category.id)
        self.assertEqual(profile.target_position_id, self.service.id)
        # Admin-created accounts are trusted immediately - no OTP pending step.
        self.assertTrue(profile.is_verified)
        self.assertIsNotNone(profile.verified_at)

        self.assertTrue(GamificationProfile.objects.filter(user=user).exists())

        # Course preference is recorded as a pending application only -
        # never an auto-enrollment or auto-purchase.
        application = CourseApplication.objects.get(student=user, course=self.course)
        self.assertEqual(application.status, 'pending')
        self.assertIsNone(application.subscription_payment)
        self.assertFalse(Enrollment.objects.filter(student=user, course=self.course).exists())

        log = AuditLog.objects.get(action='ADMIN_STUDENT_CREATED', entity_id=str(user.id))
        self.assertEqual(log.actor, self.admin)
        self.assertEqual(log.details.get('created_by'), 'admin1')

    def test_admin_created_student_without_course_has_no_application(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(exam_category_id=self.category.id)
        response = self.client.post(CREATE_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        user = User.objects.get(username='newstudent')
        self.assertFalse(CourseApplication.objects.filter(student=user).exists())
        profile = StudentProfile.objects.get(user=user)
        self.assertIsNone(profile.target_position)

    def test_admin_created_student_not_in_pending_verification(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(exam_category_id=self.category.id)
        self.client.post(CREATE_URL, payload)

        response = self.client.get(PENDING_VERIFICATION_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [row['username'] for row in response.data['results']]
        self.assertNotIn('newstudent', usernames)

    def test_admin_created_student_appears_in_user_list_and_can_login(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(exam_category_id=self.category.id, password='StrongPass123!')
        self.client.post(CREATE_URL, payload)

        response = self.client.get('/api/admin/users/?search=newstudent')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['users'][0]['role'], 'student')

        self.client.force_authenticate(user=None)
        login = self.client.post('/api/token/', {'username': 'newstudent', 'password': 'StrongPass123!'})
        self.assertEqual(login.status_code, status.HTTP_200_OK, login.data)

    # ---- validation -----------------------------------------------------

    def test_missing_required_student_fields_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(CREATE_URL, {
            'username': 'incomplete', 'email': 'incomplete@test.com',
            'password': 'StrongPass123!', 'role': 'student',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='incomplete').exists())

    def test_invalid_phone_rejected(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(exam_category_id=self.category.id, mobile='12345')
        response = self.client.post(CREATE_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='newstudent').exists())

    def test_invalid_exam_category_rejected(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(exam_category_id=999999)
        response = self.client.post(CREATE_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_exam_position_from_wrong_category_rejected(self):
        other_category = ExamCategory.objects.create(name='Licence Exam', is_active=True)
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(exam_category_id=other_category.id, exam_position_id=self.service.id)
        response = self.client.post(CREATE_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='newstudent').exists())

    def test_duplicate_email_rejected(self):
        User.objects.create_user(username='existing', email='dupe@test.com', password='pw', role='student')
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(email='dupe@test.com', exam_category_id=self.category.id)
        response = self.client.post(CREATE_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='newstudent').exists())

    def test_duplicate_username_rejected(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(username='stu1', exam_category_id=self.category.id)
        response = self.client.post(CREATE_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.filter(username='stu1').count(), 1)

    def test_weak_password_rejected(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(password='123', exam_category_id=self.category.id)
        response = self.client.post(CREATE_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='newstudent').exists())

    def test_invalid_course_rejected(self):
        self.client.force_authenticate(user=self.admin)
        payload = _student_payload(exam_category_id=self.category.id, course_id=999999)
        response = self.client.post(CREATE_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='newstudent').exists())

    # ---- permissions ------------------------------------------------------

    def test_teacher_cannot_create_users(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post(CREATE_URL, _student_payload(exam_category_id=self.category.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_create_users(self):
        self.client.force_authenticate(user=self.other_student)
        response = self.client.post(CREATE_URL, _student_payload(exam_category_id=self.category.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_create_users(self):
        response = self.client.post(CREATE_URL, _student_payload(exam_category_id=self.category.id))
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    # ---- regression: teacher/admin creation unaffected ---------------------

    def test_teacher_creation_still_works_without_student_fields(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(CREATE_URL, {
            'username': 'newteacher', 'email': 'newteacher@test.com',
            'password': 'StrongPass123!', 'role': 'teacher',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        user = User.objects.get(username='newteacher')
        self.assertEqual(user.role, 'teacher')
        self.assertFalse(StudentProfile.objects.filter(user=user).exists())

    def test_admin_creation_still_works_without_student_fields(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(CREATE_URL, {
            'username': 'newadmin', 'email': 'newadmin@test.com',
            'password': 'StrongPass123!', 'role': 'admin',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(User.objects.get(username='newadmin').role, 'admin')
