"""User.last_login was never written anywhere in this JWT-based app (no
Django session login, so the built-in login signal never fires), which
silently broke any "active user" reporting built on it. Covers the fix:
UPDATE_LAST_LOGIN on the standard token endpoint, plus an explicit
update_last_login() call in the two views that mint tokens manually."""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class LastLoginTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='stud1', email='stud1@test.com', password='pass123', role='student')
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123',
            role='admin', is_staff=True)

    def test_standard_token_login_updates_last_login(self):
        self.assertIsNone(self.student.last_login)
        response = self.client.post('/api/token/', {
            'username': 'stud1', 'password': 'pass123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertIsNotNone(self.student.last_login)

    def test_admin_login_updates_last_login(self):
        self.assertIsNone(self.admin.last_login)
        response = self.client.post('/api/auth/admin-login/', {
            'username': 'admin1', 'password': 'pass123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.admin.refresh_from_db()
        self.assertIsNotNone(self.admin.last_login)

    def test_failed_login_does_not_update_last_login(self):
        self.client.post('/api/token/', {'username': 'stud1', 'password': 'wrong-password'})
        self.student.refresh_from_db()
        self.assertIsNone(self.student.last_login)
