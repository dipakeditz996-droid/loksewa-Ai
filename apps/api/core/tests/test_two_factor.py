"""Real TOTP-based 2FA for admin accounts (Admin Settings > Security >
Two-Factor Authentication). Covers: the platform switch never forcing an
unenrolled admin into a state they can't log in from, the full
setup -> verify -> login-with-code flow, backup codes, and disable."""
import pyotp
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import AdminSettings, TwoFactorBackupCode

User = get_user_model()


class TwoFactorSafetyTests(APITestCase):
    """The platform toggle alone must never block a normal admin login."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123',
            role='admin', is_staff=True)

    def test_platform_toggle_alone_does_not_require_2fa(self):
        settings_obj = AdminSettings.get_settings()
        settings_obj.enable_two_factor_auth = True
        settings_obj.save(update_fields=['enable_two_factor_auth'])

        response = self.client.post('/api/auth/admin-login/', {
            'username': 'admin1', 'password': 'pass123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertNotIn('twoFactorRequired', response.data)

    def test_setup_blocked_when_platform_disabled(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post('/api/auth/2fa/setup/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TwoFactorEnrollmentAndLoginTests(APITestCase):
    def setUp(self):
        AdminSettings.get_settings()
        settings_obj = AdminSettings.get_settings()
        settings_obj.enable_two_factor_auth = True
        settings_obj.save(update_fields=['enable_two_factor_auth'])

        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123',
            role='admin', is_staff=True)

    def _enroll(self):
        self.client.force_authenticate(self.admin)
        setup = self.client.post('/api/auth/2fa/setup/')
        self.assertEqual(setup.status_code, status.HTTP_200_OK)
        secret = setup.data['secret']
        code = pyotp.TOTP(secret).now()
        verify = self.client.post('/api/auth/2fa/verify-setup/', {'code': code})
        self.assertEqual(verify.status_code, status.HTTP_200_OK)
        self.client.force_authenticate(None)
        return secret, verify.data['backupCodes']

    def test_full_enrollment_flow(self):
        secret, backup_codes = self._enroll()
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_2fa_enabled)
        self.assertEqual(len(backup_codes), 10)
        self.assertEqual(TwoFactorBackupCode.objects.filter(user=self.admin).count(), 10)

    def test_login_requires_code_after_enrollment(self):
        secret, _ = self._enroll()

        login = self.client.post('/api/auth/admin-login/', {
            'username': 'admin1', 'password': 'pass123',
        })
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertTrue(login.data['twoFactorRequired'])
        pending_token = login.data['pendingToken']
        self.assertNotIn('access', login.data)

        code = pyotp.TOTP(secret).now()
        complete = self.client.post('/api/auth/2fa/login/', {
            'pendingToken': pending_token, 'code': code,
        })
        self.assertEqual(complete.status_code, status.HTTP_200_OK)
        self.assertIn('access', complete.data)

    def test_wrong_code_rejected(self):
        self._enroll()
        login = self.client.post('/api/auth/admin-login/', {
            'username': 'admin1', 'password': 'pass123',
        })
        pending_token = login.data['pendingToken']
        complete = self.client.post('/api/auth/2fa/login/', {
            'pendingToken': pending_token, 'code': '000000',
        })
        self.assertEqual(complete.status_code, status.HTTP_400_BAD_REQUEST)

    def test_backup_code_works_once(self):
        _, backup_codes = self._enroll()
        login = self.client.post('/api/auth/admin-login/', {
            'username': 'admin1', 'password': 'pass123',
        })
        pending_token = login.data['pendingToken']
        code = backup_codes[0]

        first = self.client.post('/api/auth/2fa/login/', {
            'pendingToken': pending_token, 'code': code,
        })
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        login2 = self.client.post('/api/auth/admin-login/', {
            'username': 'admin1', 'password': 'pass123',
        })
        second = self.client.post('/api/auth/2fa/login/', {
            'pendingToken': login2.data['pendingToken'], 'code': code,
        })
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_disable_requires_password(self):
        self._enroll()
        self.client.force_authenticate(self.admin)

        wrong = self.client.post('/api/auth/2fa/disable/', {'password': 'wrong'})
        self.assertEqual(wrong.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_2fa_enabled)

        correct = self.client.post('/api/auth/2fa/disable/', {'password': 'pass123'})
        self.assertEqual(correct.status_code, status.HTTP_200_OK)
        self.admin.refresh_from_db()
        self.assertFalse(self.admin.is_2fa_enabled)
        self.assertIsNone(self.admin.totp_secret)
        self.assertEqual(TwoFactorBackupCode.objects.filter(user=self.admin).count(), 0)

    def test_status_endpoint(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/auth/2fa/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['platformEnabled'])
        self.assertFalse(response.data['enabled'])
