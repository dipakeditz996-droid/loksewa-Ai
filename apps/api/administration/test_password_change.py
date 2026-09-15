"""Tests for the Admin self-service password change endpoint
(administration.self_service_views.AdminChangePasswordView).

Covers: correct/incorrect current password, weak new password, confirm
mismatch, same-as-current rejection, role enforcement (admin/super-admin
allowed, teacher/student/anonymous denied), secure hashing, refresh-token
blacklisting, audit logging, and in-app notification creation.
"""
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

from core.models import User, Notification
from .models import AuditLog

URL = '/api/admin/change-password/'
OLD_PASSWORD = 'OldPass@123'
NEW_PASSWORD = 'NewPass@456'


class AdminChangePasswordTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='pwadmin', email='pwadmin@example.com',
            password=OLD_PASSWORD, role='admin', is_staff=True,
        )
        self.super_admin = User.objects.create_user(
            username='pwsuperadmin', email='pwsuperadmin@example.com',
            password=OLD_PASSWORD, role='super-admin', is_staff=True,
        )
        self.teacher = User.objects.create_user(
            username='pwteacher', email='pwteacher@example.com',
            password=OLD_PASSWORD, role='teacher',
        )
        self.student = User.objects.create_user(
            username='pwstudent', email='pwstudent@example.com',
            password=OLD_PASSWORD, role='student',
        )

    def _payload(self, current=OLD_PASSWORD, new=NEW_PASSWORD, confirm=None):
        return {
            'current_password': current,
            'new_password': new,
            'confirm_password': confirm if confirm is not None else new,
        }

    # ---- Success cases ----------------------------------------------

    def test_admin_can_change_password(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(URL, self._payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password(NEW_PASSWORD))
        self.assertFalse(self.admin.check_password(OLD_PASSWORD))

    def test_super_admin_can_change_password(self):
        self.client.force_authenticate(self.super_admin)
        resp = self.client.post(URL, self._payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.super_admin.refresh_from_db()
        self.assertTrue(self.super_admin.check_password(NEW_PASSWORD))

    def test_password_is_securely_hashed_not_plaintext(self):
        self.client.force_authenticate(self.admin)
        self.client.post(URL, self._payload(), format='json')
        self.admin.refresh_from_db()
        self.assertNotEqual(self.admin.password, NEW_PASSWORD)
        self.assertTrue(self.admin.password.startswith('pbkdf2_') or '$' in self.admin.password)

    def test_response_never_contains_password_values(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(URL, self._payload(), format='json')
        body = str(resp.data)
        self.assertNotIn(OLD_PASSWORD, body)
        self.assertNotIn(NEW_PASSWORD, body)

    # ---- Rejections ----------------------------------------------------

    def test_wrong_current_password_rejected(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(URL, self._payload(current='WrongOne@123'), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('current_password', resp.data)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password(OLD_PASSWORD))  # unchanged

    def test_weak_password_rejected(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(URL, self._payload(new='123', confirm='123'), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_mismatch_rejected(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(URL, self._payload(new='NewPass@456', confirm='Different@789'), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('confirm_password', resp.data)

    def test_same_as_current_rejected(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(URL, self._payload(new=OLD_PASSWORD, confirm=OLD_PASSWORD), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password', resp.data)

    # ---- Role enforcement -----------------------------------------------

    def test_anonymous_denied(self):
        resp = self.client.post(URL, self._payload(), format='json')
        self.assertIn(resp.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_teacher_denied(self):
        self.client.force_authenticate(self.teacher)
        resp = self.client.post(URL, self._payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_denied(self):
        self.client.force_authenticate(self.student)
        resp = self.client.post(URL, self._payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # ---- Side effects ----------------------------------------------------

    def test_outstanding_refresh_tokens_blacklisted_on_success(self):
        token = RefreshToken.for_user(self.admin)
        outstanding = OutstandingToken.objects.get(jti=token['jti'])
        self.assertFalse(BlacklistedToken.objects.filter(token=outstanding).exists())

        self.client.force_authenticate(self.admin)
        resp = self.client.post(URL, self._payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.assertTrue(BlacklistedToken.objects.filter(token=outstanding).exists())

    def test_audit_log_created_on_success(self):
        self.client.force_authenticate(self.admin)
        self.client.post(URL, self._payload(), format='json')
        self.assertTrue(
            AuditLog.objects.filter(actor=self.admin, action='ADMIN_PASSWORD_CHANGED').exists()
        )

    def test_no_audit_log_on_failed_attempt(self):
        self.client.force_authenticate(self.admin)
        self.client.post(URL, self._payload(current='WrongOne@123'), format='json')
        self.assertFalse(
            AuditLog.objects.filter(actor=self.admin, action='ADMIN_PASSWORD_CHANGED').exists()
        )

    def test_notification_created_on_success(self):
        self.client.force_authenticate(self.admin)
        self.client.post(URL, self._payload(), format='json')
        self.assertTrue(
            Notification.objects.filter(recipient=self.admin, type='account', title='Password Changed').exists()
        )

    def test_repeated_wrong_password_locks_account(self):
        from core.models import AdminSettings
        AdminSettings.get_settings()  # ensure row exists with its default max_login_attempts
        max_attempts = AdminSettings.get_settings().max_login_attempts

        self.client.force_authenticate(self.admin)
        for _ in range(max_attempts):
            self.client.post(URL, self._payload(current='WrongOne@123'), format='json')

        resp = self.client.post(URL, self._payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
