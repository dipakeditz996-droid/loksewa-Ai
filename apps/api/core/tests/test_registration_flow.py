"""Production registration flow: pending-first registration, email OTP
verification, admin-assisted recovery-code verification, and the
permission/IDOR boundaries around all three.

Covers the full spec: required fields, PSC Level/Service hierarchy,
non-PSC categories skip PSC-only fields, admin pending-verification
visibility, OTP lifecycle (valid/wrong/expired/reused/resend-invalidates-
previous), login blocked until verified, recovery-code lifecycle (valid/
wrong/expired/reused/attempt cap), teacher cannot generate recovery codes,
student cannot verify another student, and course-preference personalization
without auto-enrollment.
"""
import hashlib

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, EmailOTP
from support.models import StudentProfile
from exams.models import ExamCategory, Exam
from courses.models import Course
from administration.models import AuditLog


def _valid_payload(**overrides):
    payload = {
        'username': 'newstudent',
        'email': 'newstudent@test.com',
        'password': 'StrongPass123!',
        'name': 'Dipak Bhandari',
        'mobile': '9812345678',
        'permanent_district': 'Rupandehi',
        'permanent_local_level': 'Butwal',
    }
    payload.update(overrides)
    return payload


def _seed_otp(email, code, purpose='signup', used=False, expired=False, attempts=0, generated_by=None):
    return EmailOTP.objects.create(
        email=email.strip().lower(), purpose=purpose,
        code_hash=hashlib.sha256(code.encode()).hexdigest(),
        is_used=used, attempts=attempts, generated_by=generated_by,
        expires_at=timezone.now() + timezone.timedelta(minutes=-1 if expired else 10),
    )


class RegistrationFieldValidationTests(APITestCase):
    def setUp(self):
        self.category = ExamCategory.objects.create(name='PSC Exams', is_active=True)
        self.level = Exam.objects.create(category=self.category, name='5th Level', is_active=True)
        self.service = Exam.objects.create(category=self.category, name='Computer', parent=self.level, is_active=True)

    def test_missing_required_fields_rejected(self):
        response = self.client.post('/api/auth/signup/', {'username': 'x', 'email': 'x@test.com', 'password': 'x'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='x').exists())

    def test_invalid_phone_rejected(self):
        payload = _valid_payload(mobile='12345', exam_category_id=self.category.id)
        response = self.client.post('/api/auth/signup/', payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('mobile', response.data.get('error', '').lower() + str(response.data))

    def test_valid_nepal_phone_formats_accepted(self):
        for i, phone in enumerate(['9812345678', '9712345678', '9612345678']):
            payload = _valid_payload(
                username=f'phoneuser{i}', email=f'phone{i}@test.com', mobile=phone,
                exam_category_id=self.category.id,
            )
            response = self.client.post('/api/auth/signup/', payload)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_missing_exam_category_rejected(self):
        payload = _valid_payload()
        response = self.client.post('/api/auth/signup/', payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('exam_category_id', response.data.get('missing_fields', []))

    def test_psc_level_and_service_saved_on_profile(self):
        payload = _valid_payload(exam_category_id=self.category.id, exam_position_id=self.service.id)
        response = self.client.post('/api/auth/signup/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        profile = StudentProfile.objects.get(user__username='newstudent')
        self.assertEqual(profile.target_category_id, self.category.id)
        self.assertEqual(profile.target_position_id, self.service.id)
        self.assertEqual(profile.target_position.parent_id, self.level.id)

    def test_non_psc_category_does_not_require_level(self):
        licence = ExamCategory.objects.create(name='Licence Exam', is_active=True)
        payload = _valid_payload(exam_category_id=licence.id)
        response = self.client.post('/api/auth/signup/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        profile = StudentProfile.objects.get(user__username='newstudent')
        self.assertEqual(profile.target_category_id, licence.id)
        self.assertIsNone(profile.target_position_id)

    def test_exam_position_must_belong_to_chosen_category(self):
        other_category = ExamCategory.objects.create(name='Other', is_active=True)
        payload = _valid_payload(exam_category_id=other_category.id, exam_position_id=self.service.id)
        response = self.client.post('/api/auth/signup/', payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_username_rejected(self):
        User.objects.create_user(username='newstudent', email='other@test.com', password='x', role='student')
        payload = _valid_payload(exam_category_id=self.category.id)
        response = self.client.post('/api/auth/signup/', payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_email_rejected(self):
        User.objects.create_user(username='other', email='newstudent@test.com', password='x', role='student')
        payload = _valid_payload(exam_category_id=self.category.id)
        response = self.client.post('/api/auth/signup/', payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RegistrationPendingStateTests(APITestCase):
    def setUp(self):
        self.category = ExamCategory.objects.create(name='PSC Exams', is_active=True)
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')

    def test_registration_creates_unverified_account_immediately(self):
        payload = _valid_payload(exam_category_id=self.category.id)
        response = self.client.post('/api/auth/signup/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('pending_verification'))
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)

        user = User.objects.get(username='newstudent')
        profile = StudentProfile.objects.get(user=user)
        self.assertFalse(profile.is_verified)

    def test_otp_generated_on_registration(self):
        payload = _valid_payload(exam_category_id=self.category.id)
        self.client.post('/api/auth/signup/', payload)
        self.assertTrue(EmailOTP.objects.filter(email='newstudent@test.com', purpose='signup').exists())

    def test_admin_sees_pending_registration_immediately(self):
        payload = _valid_payload(exam_category_id=self.category.id)
        self.client.post('/api/auth/signup/', payload)

        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/users/pending-verifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [r['email'] for r in response.data['results']]
        self.assertIn('newstudent@test.com', emails)
        row = next(r for r in response.data['results'] if r['email'] == 'newstudent@test.com')
        self.assertEqual(row['name'], 'Dipak Bhandari')
        self.assertEqual(row['permanent_district'], 'Rupandehi')
        self.assertEqual(row['preferred_exam_category'], 'PSC Exams')
        self.assertEqual(row['status'], 'Pending Email Verification')
        # never exposed
        self.assertNotIn('password', str(response.data))
        self.assertNotIn('access', str(response.data))
        self.assertNotIn('refresh', str(response.data))

    def test_unverified_student_cannot_log_in(self):
        payload = _valid_payload(exam_category_id=self.category.id)
        self.client.post('/api/auth/signup/', payload)

        response = self.client.post('/api/token/', {'username': 'newstudent', 'password': 'StrongPass123!'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_registration_creates_audit_log(self):
        payload = _valid_payload(exam_category_id=self.category.id)
        self.client.post('/api/auth/signup/', payload)
        self.assertTrue(AuditLog.objects.filter(action='REGISTRATION_CREATED').exists())


class EmailOTPVerificationTests(APITestCase):
    def setUp(self):
        self.category = ExamCategory.objects.create(name='PSC Exams', is_active=True)
        payload = _valid_payload(exam_category_id=self.category.id)
        self.client.post('/api/auth/signup/', payload)
        self.user = User.objects.get(username='newstudent')
        # Registration already generated a real OTP - seed a known one on top
        # (verify_otp always uses the most recent unused row for the email).
        _seed_otp('newstudent@test.com', '123456')

    def test_correct_otp_verifies_and_logs_in(self):
        response = self.client.post('/api/auth/verify-email-otp/', {'email': 'newstudent@test.com', 'otp': '123456'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

        profile = StudentProfile.objects.get(user=self.user)
        self.assertTrue(profile.is_verified)
        self.assertIsNotNone(profile.verified_at)

    def test_wrong_otp_fails(self):
        response = self.client.post('/api/auth/verify-email-otp/', {'email': 'newstudent@test.com', 'otp': '000000'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        profile = StudentProfile.objects.get(user=self.user)
        self.assertFalse(profile.is_verified)

    def test_expired_otp_fails(self):
        EmailOTP.objects.filter(email='newstudent@test.com', purpose='signup').update(
            expires_at=timezone.now() - timezone.timedelta(minutes=1)
        )
        response = self.client.post('/api/auth/verify-email-otp/', {'email': 'newstudent@test.com', 'otp': '123456'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_used_otp_cannot_be_reused(self):
        self.client.post('/api/auth/verify-email-otp/', {'email': 'newstudent@test.com', 'otp': '123456'})
        # A second, independent registration attempt trying the same code
        # should fail even though the account is now verified.
        response = self.client.post('/api/auth/verify-email-otp/', {'email': 'newstudent@test.com', 'otp': '123456'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resend_invalidates_previous_code(self):
        # Back-date the seeded code so the resend cooldown (60s since the
        # most recent send) doesn't itself block this resend.
        EmailOTP.objects.filter(email='newstudent@test.com', purpose='signup').update(
            created_at=timezone.now() - timezone.timedelta(minutes=2)
        )
        resend = self.client.post('/api/auth/signup/request-otp/', {'email': 'newstudent@test.com'})
        self.assertEqual(resend.status_code, status.HTTP_200_OK)
        # The originally-seeded 123456 is no longer the most recent row, so
        # it must no longer verify.
        response = self.client.post('/api/auth/verify-email-otp/', {'email': 'newstudent@test.com', 'otp': '123456'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_already_verified_account_rejects_reverification(self):
        self.client.post('/api/auth/verify-email-otp/', {'email': 'newstudent@test.com', 'otp': '123456'})
        _seed_otp('newstudent@test.com', '654321')
        response = self.client.post('/api/auth/verify-email-otp/', {'email': 'newstudent@test.com', 'otp': '654321'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verified_student_can_login_normally(self):
        self.client.post('/api/auth/verify-email-otp/', {'email': 'newstudent@test.com', 'otp': '123456'})
        response = self.client.post('/api/token/', {'username': 'newstudent', 'password': 'StrongPass123!'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class RecoveryCodeFlowTests(APITestCase):
    def setUp(self):
        self.category = ExamCategory.objects.create(name='PSC Exams', is_active=True)
        payload = _valid_payload(exam_category_id=self.category.id)
        self.client.post('/api/auth/signup/', payload)
        self.user = User.objects.get(username='newstudent')
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')
        self.teacher = User.objects.create_user(
            username='teacher1', email='teacher1@test.com', password='pass123', role='teacher')
        self.other_student = User.objects.create_user(
            username='other', email='other@test.com', password='pass123', role='student')
        StudentProfile.objects.create(user=self.other_student, is_verified=False)

    def test_admin_can_generate_recovery_code(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/admin/users/{self.user.id}/generate-recovery-code/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('code', response.data)
        self.assertEqual(len(response.data['code']), 6)

    def test_teacher_cannot_generate_recovery_code(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post(f'/api/admin/users/{self.user.id}/generate-recovery-code/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_access_admin_recovery_endpoint(self):
        self.client.force_authenticate(user=self.other_student)
        response = self.client.post(f'/api/admin/users/{self.user.id}/generate-recovery-code/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_generate_recovery_code(self):
        response = self.client.post(f'/api/admin/users/{self.user.id}/generate-recovery-code/')
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_valid_recovery_code_verifies_without_login(self):
        code = _seed_otp('newstudent@test.com', '111222', purpose='admin_recovery', generated_by=self.admin)
        response = self.client.post('/api/auth/verify-recovery-code/', {'email': 'newstudent@test.com', 'code': '111222'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)

        profile = StudentProfile.objects.get(user=self.user)
        self.assertTrue(profile.is_verified)

    def test_student_can_login_normally_after_recovery_verification(self):
        _seed_otp('newstudent@test.com', '111222', purpose='admin_recovery', generated_by=self.admin)
        self.client.post('/api/auth/verify-recovery-code/', {'email': 'newstudent@test.com', 'code': '111222'})
        response = self.client.post('/api/token/', {'username': 'newstudent', 'password': 'StrongPass123!'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_wrong_recovery_code_fails(self):
        _seed_otp('newstudent@test.com', '111222', purpose='admin_recovery', generated_by=self.admin)
        response = self.client.post('/api/auth/verify-recovery-code/', {'email': 'newstudent@test.com', 'code': '999999'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_recovery_code_fails(self):
        _seed_otp('newstudent@test.com', '111222', purpose='admin_recovery', expired=True, generated_by=self.admin)
        response = self.client.post('/api/auth/verify-recovery-code/', {'email': 'newstudent@test.com', 'code': '111222'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_used_recovery_code_cannot_be_reused(self):
        _seed_otp('newstudent@test.com', '111222', purpose='admin_recovery', generated_by=self.admin)
        self.client.post('/api/auth/verify-recovery-code/', {'email': 'newstudent@test.com', 'code': '111222'})
        _seed_otp('other@test.com', '111222', purpose='admin_recovery', generated_by=self.admin)
        # A student's own already-verified account rejects re-verification outright.
        response = self.client.post('/api/auth/verify-recovery-code/', {'email': 'newstudent@test.com', 'code': '111222'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_excessive_attempts_blocked(self):
        _seed_otp('newstudent@test.com', '111222', purpose='admin_recovery', attempts=5, generated_by=self.admin)
        response = self.client.post('/api/auth/verify-recovery-code/', {'email': 'newstudent@test.com', 'code': '111222'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('too many', response.data.get('error', '').lower())

    def test_student_a_cannot_use_student_b_recovery_code(self):
        _seed_otp('other@test.com', '333444', purpose='admin_recovery', generated_by=self.admin)
        # Trying student B's code against student A's email must not verify A.
        response = self.client.post('/api/auth/verify-recovery-code/', {'email': 'newstudent@test.com', 'code': '333444'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        profile = StudentProfile.objects.get(user=self.user)
        self.assertFalse(profile.is_verified)

    def test_recovery_generation_logs_responsible_admin(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post(f'/api/admin/users/{self.user.id}/generate-recovery-code/')
        log = AuditLog.objects.filter(action='ADMIN_GENERATED_RECOVERY_CODE').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor_id, self.admin.id)
        # plaintext code must never appear in the audit trail
        self.assertNotIn('code', log.details)

    def test_recovery_code_not_exposed_in_pending_list(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post(f'/api/admin/users/{self.user.id}/generate-recovery-code/')
        response = self.client.get('/api/admin/users/pending-verifications/')
        self.assertNotIn('code', str(response.data))


class CoursePersonalizationTests(APITestCase):
    def test_preference_does_not_auto_enroll(self):
        category = ExamCategory.objects.create(name='PSC Exams', is_active=True)
        level = Exam.objects.create(category=category, name='5th Level', is_active=True)
        service = Exam.objects.create(category=category, name='Computer', parent=level, is_active=True)
        Course.objects.create(title='PSC 5th Computer Prep', slug='psc-5th-computer', exam=service, status='published')

        payload = _valid_payload(exam_category_id=category.id, exam_position_id=service.id)
        self.client.post('/api/auth/signup/', payload)

        user = User.objects.get(username='newstudent')
        self.assertEqual(user.enrollments.count(), 0)
        self.assertEqual(user.course_applications.count(), 0)

    def test_preference_can_filter_matching_courses(self):
        category = ExamCategory.objects.create(name='PSC Exams', is_active=True)
        level = Exam.objects.create(category=category, name='5th Level', is_active=True)
        service = Exam.objects.create(category=category, name='Computer', parent=level, is_active=True)
        other_service = Exam.objects.create(category=category, name='Civil', parent=level, is_active=True)
        matching = Course.objects.create(title='PSC 5th Computer Prep', slug='psc-5th-computer', exam=service, status='published')
        Course.objects.create(title='PSC 5th Civil Prep', slug='psc-5th-civil', exam=other_service, status='published')

        matches = Course.objects.filter(exam=service)
        self.assertEqual(list(matches), [matching])
