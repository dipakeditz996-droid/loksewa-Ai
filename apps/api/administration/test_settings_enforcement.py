"""Tests proving the Admin Settings page's fields actually change app
behavior, not just persist to the DB. Each AdminSettings.get_settings() call
in setUp starts from real model defaults (feature flags True, notifications
True, password rules on with min_length=8) unless a test overrides them.
"""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, AdminSettings, Notification


class FeatureFlagTestBase(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='stu1', email='stu1@test.com', password='pass123', role='student')

    def disable(self, **fields):
        settings = AdminSettings.get_settings()
        for k, v in fields.items():
            setattr(settings, k, v)
        settings.save()


class MarketplaceFlagTests(FeatureFlagTestBase):
    def test_enabled_by_default_students_can_browse(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/marketplace/student/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_disabled_blocks_browsing(self):
        self.disable(enable_marketplace=False)
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/marketplace/student/products/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class StudyPlansFlagTests(FeatureFlagTestBase):
    def setUp(self):
        super().setUp()
        from exams.models import ExamCategory, Exam
        category = ExamCategory.objects.create(name='Loksewa')
        self.exam = Exam.objects.create(category=category, name='Kharidar')

    def test_disabled_blocks_plan_creation(self):
        self.disable(enable_study_plans=False)
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/study-plan/plans/', {
            'exam': self.exam.id, 'target_date': '2027-01-01', 'daily_minutes': 120,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enabled_by_default_allows_plan_creation(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/study-plan/plans/', {
            'exam': self.exam.id, 'target_date': '2027-01-01', 'daily_minutes': 120,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class GamificationFlagTests(FeatureFlagTestBase):
    def test_enabled_by_default_leaderboard_reachable(self):
        # /leaderboard/ requires authentication - unauthenticated always 401s
        # regardless of the feature flag, so that's not what this test means
        # to check.
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/gamification/leaderboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_disabled_blocks_leaderboard(self):
        self.disable(enable_gamification=False)
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/gamification/leaderboard/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_disabled_blocks_referral_dashboard(self):
        self.disable(enable_gamification=False)
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/gamification/referrals/me/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class NotificationToggleTests(FeatureFlagTestBase):
    def test_global_kill_switch_blocks_all_notifications(self):
        from core.notification_service import NotificationService
        self.disable(notifications_enabled=False)
        before = Notification.objects.count()
        NotificationService._create_if_allowed(
            self.student, 'other', 'question_reviews_inapp', 'Title', 'Msg', None)
        self.assertEqual(Notification.objects.count(), before)

    def test_in_app_toggle_blocks_notifications(self):
        from core.notification_service import NotificationService
        self.disable(enable_in_app_notifications=False)
        before = Notification.objects.count()
        NotificationService._create_if_allowed(
            self.student, 'other', 'question_reviews_inapp', 'Title', 'Msg', None)
        self.assertEqual(Notification.objects.count(), before)

    def test_enabled_creates_real_notification(self):
        from core.notification_service import NotificationService
        before = Notification.objects.count()
        NotificationService._create_if_allowed(
            self.student, 'other', 'question_reviews_inapp', 'Title', 'Msg', None)
        self.assertEqual(Notification.objects.count(), before + 1)


class SessionTimeoutTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='stu1', email='stu1@test.com', password='StrongPass123!', role='student')

    def _access_token_lifetime_seconds(self, response_data):
        from rest_framework_simplejwt.tokens import AccessToken
        token = AccessToken(response_data['access'])
        return token['exp'] - token['iat']

    def test_default_session_timeout_applied(self):
        response = self.client.post('/api/token/', {
            'username': 'stu1', 'password': 'StrongPass123!',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._access_token_lifetime_seconds(response.data), 60 * 60)  # default 60 min

    def test_admin_configured_session_timeout_applied(self):
        settings = AdminSettings.get_settings()
        settings.session_timeout_minutes = 15
        settings.save()

        response = self.client.post('/api/token/', {
            'username': 'stu1', 'password': 'StrongPass123!',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._access_token_lifetime_seconds(response.data), 15 * 60)


class AccountLockoutTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='stu1', email='stu1@test.com', password='StrongPass123!', role='student')
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='StrongPass123!',
            role='admin', is_staff=True)
        settings = AdminSettings.get_settings()
        settings.max_login_attempts = 3
        settings.save()

    def test_wrong_password_increments_counter_not_locked_yet(self):
        for _ in range(2):
            self.client.post('/api/token/', {'username': 'stu1', 'password': 'wrong'})
        self.student.refresh_from_db()
        self.assertEqual(self.student.failed_login_attempts, 2)
        self.assertIsNone(self.student.locked_until)

        # Third failure hits the threshold and locks the account.
        response = self.client.post('/api/token/', {'username': 'stu1', 'password': 'wrong'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.student.refresh_from_db()
        self.assertIsNotNone(self.student.locked_until)

    def test_locked_account_rejects_even_correct_password(self):
        for _ in range(3):
            self.client.post('/api/token/', {'username': 'stu1', 'password': 'wrong'})

        response = self.client.post('/api/token/', {'username': 'stu1', 'password': 'StrongPass123!'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('too many failed attempts', str(response.data).lower())

    def test_successful_login_resets_counter(self):
        self.client.post('/api/token/', {'username': 'stu1', 'password': 'wrong'})
        self.client.post('/api/token/', {'username': 'stu1', 'password': 'wrong'})
        self.student.refresh_from_db()
        self.assertEqual(self.student.failed_login_attempts, 2)

        response = self.client.post('/api/token/', {'username': 'stu1', 'password': 'StrongPass123!'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertEqual(self.student.failed_login_attempts, 0)
        self.assertIsNone(self.student.locked_until)

    def test_nonexistent_username_never_locks_a_real_account(self):
        for _ in range(5):
            self.client.post('/api/token/', {'username': 'nobody-here', 'password': 'whatever'})
        # Real accounts are untouched by attempts against a nonexistent identifier.
        self.student.refresh_from_db()
        self.assertEqual(self.student.failed_login_attempts, 0)

    def test_admin_login_endpoint_also_locks_out(self):
        for _ in range(3):
            self.client.post('/api/auth/admin-login/', {'username': 'admin1', 'password': 'wrong'})
        response = self.client.post('/api/auth/admin-login/', {'username': 'admin1', 'password': 'StrongPass123!'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('too many failed attempts', str(response.data).lower())


class PasswordPolicyTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='StrongPass123!',
            role='admin', is_staff=True)
        from exams.models import ExamCategory
        self.category = ExamCategory.objects.create(name='PSC Exams', is_active=True)

    def _signup_payload(self, **overrides):
        payload = {
            'name': 'Test Student', 'mobile': '9812345678',
            'permanent_district': 'Kathmandu', 'permanent_local_level': 'Kathmandu Metro',
            'exam_category_id': self.category.id,
        }
        payload.update(overrides)
        return payload

    def test_signup_rejects_weak_password(self):
        response = self.client.post('/api/auth/signup/', self._signup_payload(
            username='newstudent', email='new@test.com', password='weak',
        ))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='newstudent').exists())

    def test_signup_accepts_strong_password(self):
        response = self.client.post('/api/auth/signup/', self._signup_payload(
            username='newstudent2', email='new2@test.com', password='StrongPass123!',
        ))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_configured_min_length_enforced(self):
        settings = AdminSettings.get_settings()
        settings.password_min_length = 20
        settings.save()

        response = self.client.post('/api/auth/signup/', self._signup_payload(
            username='newstudent3', email='new3@test.com', password='Short1!',
        ))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_disabling_complexity_allows_simpler_password(self):
        settings = AdminSettings.get_settings()
        settings.password_require_uppercase = False
        settings.password_require_numbers = False
        settings.password_require_special_chars = False
        settings.save()

        response = self.client.post('/api/auth/signup/', self._signup_payload(
            username='newstudent4', email='new4@test.com', password='lowercaseonly',
        ))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_create_user_rejects_weak_password(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/admin/users/', {
            'username': 'staffuser', 'email': 'staff@test.com', 'password': '123', 'role': 'teacher',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_evaluator_create_rejects_weak_password(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/admin/evaluators/create/', {
            'firstName': 'Eva', 'lastName': 'Luator', 'email': 'eva@test.com', 'password': 'weak',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data.get('errors', {}))

    def test_evaluator_create_accepts_strong_password(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/admin/evaluators/create/', {
            'firstName': 'Eva', 'lastName': 'Luator', 'email': 'eva2@test.com', 'password': 'StrongPass123!',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
