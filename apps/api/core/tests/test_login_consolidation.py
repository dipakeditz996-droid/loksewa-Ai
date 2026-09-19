from django.contrib.auth.hashers import PBKDF2PasswordHasher
from django.contrib.auth.models import Permission
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from core.models import User
from support.models import StudentProfile


class LoginConsolidationTests(TestCase):
    """One authentication = one user lookup and one password hash, with the
    same observable behaviour (messages, lockout, verification rules)."""

    def setUp(self):
        self.client = APIClient()
        self.password = "StrongPassword123!"
        self.url = reverse('token_obtain_pair')
        self.student = User.objects.create_user(
            username="stu", email="stu@example.com", password=self.password, role="student")
        self.inactive = User.objects.create_user(
            username="off", email="off@example.com", password=self.password, role="student", is_active=False)
        self.unverified = User.objects.create_user(
            username="unv", email="unv@example.com", password=self.password, role="student")
        profile, _ = StudentProfile.objects.get_or_create(user=self.unverified)
        profile.is_verified = False
        profile.save()

    def _post(self, username, password):
        hashes = []
        original = PBKDF2PasswordHasher.encode

        def counting(hasher, *args, **kwargs):
            hashes.append(1)
            return original(hasher, *args, **kwargs)

        PBKDF2PasswordHasher.encode = counting
        try:
            with CaptureQueriesContext(connection) as ctx:
                response = self.client.post(self.url, {'username': username, 'password': password}, format='json')
        finally:
            PBKDF2PasswordHasher.encode = original
        user_selects = [q for q in ctx.captured_queries
                        if q['sql'].lstrip().upper().startswith('SELECT') and '"core_user"' in q['sql']]
        return response, len(hashes), len(user_selects)

    def test_valid_login_hashes_once_and_looks_up_user_once(self):
        response, hashes, user_lookups = self._post("stu", self.password)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(hashes, 1)
        self.assertEqual(user_lookups, 1)
        self.assertEqual(response.data['user']['id'], self.student.id)
        self.assertIn('is_active', response.data['user'])
        self.assertIn('avatar', response.data['user'])

    def test_email_login_is_one_lookup(self):
        response, hashes, user_lookups = self._post("stu@example.com", self.password)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual((hashes, user_lookups), (1, 1))

    def test_wrong_password_and_unknown_user_cost_the_same_one_hash(self):
        wrong, wrong_hashes, _ = self._post("stu", "nope")
        unknown, unknown_hashes, _ = self._post("nobody", "nope")
        self.assertEqual(wrong.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(unknown.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(wrong_hashes, 1)
        self.assertEqual(unknown_hashes, 1)
        self.assertEqual(wrong.data['detail'], unknown.data['detail'])

    def test_failed_attempts_still_counted_for_real_accounts_only(self):
        self._post("stu", "nope")
        self.student.refresh_from_db()
        self.assertEqual(self.student.failed_login_attempts, 1)
        self._post("stu", self.password)
        self.student.refresh_from_db()
        self.assertEqual(self.student.failed_login_attempts, 0)

    def test_inactive_account_hashes_once_and_messages_unchanged(self):
        correct, hashes, _ = self._post("off", self.password)
        self.assertEqual(correct.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('disabled', correct.data['detail'].lower())
        self.assertEqual(hashes, 1)
        wrong, _, _ = self._post("off", "nope")
        self.assertIn('invalid', wrong.data['detail'].lower())

    def test_unverified_student_blocked_only_after_correct_password(self):
        correct, _, _ = self._post("unv", self.password)
        self.assertEqual(correct.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('verify', correct.data['detail'].lower())
        wrong, _, _ = self._post("unv", "nope")
        self.assertNotIn('verify', wrong.data['detail'].lower())

    def test_ambiguous_email_is_treated_as_unknown(self):
        User.objects.create_user(username="dup1", email="shared@example.com", password=self.password)
        User.objects.create_user(username="dup2", email="shared@example.com", password=self.password)
        response, _, _ = self._post("shared@example.com", self.password)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_model_permissions_still_work_with_single_backend(self):
        from django.conf import settings
        self.assertEqual(settings.AUTHENTICATION_BACKENDS, ['core.backends.EmailOrUsernameModelBackend'])
        perm = Permission.objects.first()
        self.student.user_permissions.add(perm)
        student = User.objects.get(pk=self.student.pk)
        self.assertTrue(student.has_perm(f"{perm.content_type.app_label}.{perm.codename}"))
