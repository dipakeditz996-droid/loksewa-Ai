from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from core.models import User

class AuthAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = "StrongPassword123!"
        
        # Student user
        self.student = User.objects.create_user(
            username="student_tester",
            email="student@example.com",
            password=self.password,
            role="student",
            is_active=True
        )
        
        # Disabled student user
        self.disabled_student = User.objects.create_user(
            username="disabled_student",
            email="disabled@example.com",
            password=self.password,
            role="student",
            is_active=False
        )
        
        # Teacher user
        self.teacher = User.objects.create_user(
            username="teacher_tester",
            email="teacher@example.com",
            password=self.password,
            role="teacher",
            is_active=True
        )

        self.login_url = reverse('token_obtain_pair')
        self.me_url = reverse('auth_me')
        self.logout_url = reverse('auth_logout')

    def test_login_valid_username_password(self):
        response = self.client.post(self.login_url, {
            'username': self.student.username,
            'password': self.password
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_valid_email_password(self):
        response = self.client.post(self.login_url, {
            'username': self.student.email,
            'password': self.password
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_wrong_password(self):
        response = self.client.post(self.login_url, {
            'username': self.student.username,
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['detail'], 'Invalid email/username or password.')

    def test_login_unknown_username(self):
        response = self.client.post(self.login_url, {
            'username': 'unknown_user',
            'password': self.password
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['detail'], 'Invalid email/username or password.')

    def test_login_unknown_email(self):
        response = self.client.post(self.login_url, {
            'username': 'unknown@example.com',
            'password': self.password
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['detail'], 'Invalid email/username or password.')

    def test_login_disabled_account(self):
        response = self.client.post(self.login_url, {
            'username': self.disabled_student.username,
            'password': self.password
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['detail'], 'Your account has been disabled. Please contact support.')

    def test_login_missing_username(self):
        response = self.client.post(self.login_url, {
            'password': self.password
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_missing_password(self):
        response = self.client.post(self.login_url, {
            'username': self.student.username
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_auth_me_with_access_token(self):
        # Login first
        login_response = self.client.post(self.login_url, {
            'username': self.student.username,
            'password': self.password
        })
        access_token = login_response.data['access']

        # Get me
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + access_token)
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.student.username)
        self.assertEqual(response.data['role'], 'student')

    def test_auth_me_rejects_unauthenticated(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_invalidates_refresh_token(self):
        # Login first
        login_response = self.client.post(self.login_url, {
            'username': self.student.username,
            'password': self.password
        })
        refresh_token = login_response.data['refresh']

        # Logout
        response = self.client.post(self.logout_url, {'refresh': refresh_token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Try to refresh with the blacklisted token
        refresh_url = reverse('token_refresh')
        refresh_response = self.client.post(refresh_url, {'refresh': refresh_token})
        # Should be rejected because it's blacklisted
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)
