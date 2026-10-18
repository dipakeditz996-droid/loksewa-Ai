import threading
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import User
from core.session_service import should_enforce_single_session


class SingleActiveSessionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = "SecurePassword123!"

        # Create student user
        self.student = User.objects.create_user(
            username="student_session_test",
            email="student_session@example.com",
            password=self.password,
            role="student",
            is_active=True,
        )

        # Create teacher user
        self.teacher = User.objects.create_user(
            username="teacher_session_test",
            email="teacher_session@example.com",
            password=self.password,
            role="teacher",
            is_active=True,
        )

        self.login_url = reverse('token_obtain_pair')
        self.refresh_url = reverse('token_refresh')
        self.me_url = reverse('auth_me')
        self.logout_url = reverse('auth_logout')

    def test_first_login_creates_valid_session(self):
        """First login creates an active session and returns valid tokens."""
        res1 = self.client.post(self.login_url, {
            'username': self.student.username,
            'password': self.password,
        })
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertIn('access', res1.data)
        self.assertIn('refresh', res1.data)

        self.student.refresh_from_db()
        self.assertTrue(bool(self.student.jwt_session_key))

        # Access protected endpoint with the access token
        client1 = APIClient()
        client1.credentials(HTTP_AUTHORIZATION=f"Bearer {res1.data['access']}")
        me_res = client1.get(self.me_url)
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.data['username'], self.student.username)

    def test_second_login_invalidates_first_session(self):
        """When a student logs in on Device 2, Device 1's access and refresh tokens become invalid."""
        # Device 1 logs in
        res1 = self.client.post(self.login_url, {
            'username': self.student.username,
            'password': self.password,
        })
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        token1_access = res1.data['access']
        token1_refresh = res1.data['refresh']

        client1 = APIClient()
        client1.credentials(HTTP_AUTHORIZATION=f"Bearer {token1_access}")
        self.assertEqual(client1.get(self.me_url).status_code, status.HTTP_200_OK)

        # Device 2 logs in
        res2 = self.client.post(self.login_url, {
            'username': self.student.username,
            'password': self.password,
        })
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        token2_access = res2.data['access']
        token2_refresh = res2.data['refresh']

        client2 = APIClient()
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {token2_access}")

        # Device 2 works
        me_res2 = client2.get(self.me_url)
        self.assertEqual(me_res2.status_code, status.HTTP_200_OK)

        # Device 1's access token is rejected immediately with session_revoked
        me_res1 = client1.get(self.me_url)
        self.assertEqual(me_res1.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(me_res1.data.get('code'), 'session_revoked')
        self.assertIn('another device', me_res1.data.get('detail', ''))

        # Device 1 cannot regain access by refreshing its refresh token
        ref_res1 = self.client.post(self.refresh_url, {'refresh': token1_refresh})
        self.assertEqual(ref_res1.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(ref_res1.data.get('code'), 'session_revoked')

        # Device 2's refresh token remains fully valid and works
        ref_res2 = self.client.post(self.refresh_url, {'refresh': token2_refresh})
        self.assertEqual(ref_res2.status_code, status.HTTP_200_OK)
        self.assertIn('access', ref_res2.data)

    def test_third_login_invalidates_both_previous_sessions(self):
        """A third login invalidates both previous sessions; only the newest remains valid."""
        res1 = self.client.post(self.login_url, {'username': self.student.username, 'password': self.password})
        res2 = self.client.post(self.login_url, {'username': self.student.username, 'password': self.password})
        res3 = self.client.post(self.login_url, {'username': self.student.username, 'password': self.password})

        c1 = APIClient()
        c1.credentials(HTTP_AUTHORIZATION=f"Bearer {res1.data['access']}")
        c2 = APIClient()
        c2.credentials(HTTP_AUTHORIZATION=f"Bearer {res2.data['access']}")
        c3 = APIClient()
        c3.credentials(HTTP_AUTHORIZATION=f"Bearer {res3.data['access']}")

        # Sessions 1 and 2 are revoked
        self.assertEqual(c1.get(self.me_url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(c2.get(self.me_url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(c1.get(self.me_url).data.get('code'), 'session_revoked')
        self.assertEqual(c2.get(self.me_url).data.get('code'), 'session_revoked')

        # Session 3 is active and valid
        res_c3 = c3.get(self.me_url)
        self.assertEqual(res_c3.status_code, status.HTTP_200_OK)

    def test_failed_login_does_not_invalidate_current_session(self):
        """A failed login attempt must NOT disturb or invalidate the active session."""
        login_res = self.client.post(self.login_url, {'username': self.student.username, 'password': self.password})
        access_token = login_res.data['access']
        refresh_token = login_res.data['refresh']

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        self.assertEqual(client.get(self.me_url).status_code, status.HTTP_200_OK)

        # Attacker / accidental failed attempt with wrong password
        fail_res = self.client.post(self.login_url, {'username': self.student.username, 'password': 'WrongPassword999!'})
        self.assertEqual(fail_res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Existing session must STILL be valid!
        self.assertEqual(client.get(self.me_url).status_code, status.HTTP_200_OK)

        # Existing refresh token must STILL work!
        ref_res = self.client.post(self.refresh_url, {'refresh': refresh_token})
        self.assertEqual(ref_res.status_code, status.HTTP_200_OK)

    def test_manual_logout_invalidates_access_and_refresh_tokens(self):
        """Manual logout terminates the active session immediately."""
        login_res = self.client.post(self.login_url, {'username': self.student.username, 'password': self.password})
        access_token = login_res.data['access']
        refresh_token = login_res.data['refresh']

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        self.assertEqual(client.get(self.me_url).status_code, status.HTTP_200_OK)

        # User logs out
        logout_res = client.post(self.logout_url, {'refresh': refresh_token})
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # Access token is immediately dead
        self.assertEqual(client.get(self.me_url).status_code, status.HTTP_401_UNAUTHORIZED)

        # Refresh token is blacklisted and session-revoked
        self.assertEqual(self.client.post(self.refresh_url, {'refresh': refresh_token}).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_teacher_sessions_not_broken(self):
        """Teacher accounts preserve multi-device login workflows by default."""
        res1 = self.client.post(self.login_url, {'username': self.teacher.username, 'password': self.password})
        res2 = self.client.post(self.login_url, {'username': self.teacher.username, 'password': self.password})

        c1 = APIClient()
        c1.credentials(HTTP_AUTHORIZATION=f"Bearer {res1.data['access']}")
        c2 = APIClient()
        c2.credentials(HTTP_AUTHORIZATION=f"Bearer {res2.data['access']}")

        # Both sessions remain valid for teacher
        self.assertEqual(c1.get(self.me_url).status_code, status.HTTP_200_OK)
        self.assertEqual(c2.get(self.me_url).status_code, status.HTTP_200_OK)


class ConcurrentLoginSessionTests(TransactionTestCase):
    """Verifies that race conditions/concurrent logins safely leave only 1 valid session."""

    def setUp(self):
        self.password = "SecurePassword123!"
        self.student = User.objects.create_user(
            username="concurrent_student",
            email="concurrent@example.com",
            password=self.password,
            role="student",
            is_active=True,
        )
        self.login_url = reverse('token_obtain_pair')
        self.me_url = reverse('auth_me')

    def test_simultaneous_logins_leave_one_active_session(self):
        from django.db import connection
        if connection.vendor == 'sqlite3':
            # SQLite uses single-file locking and cannot handle simultaneous thread writes in unit tests.
            # Perform rapid sequential logins to verify session invalidation on SQLite.
            results = []
            for _ in range(3):
                client = APIClient()
                res = client.post(self.login_url, {
                    'username': self.student.username,
                    'password': self.password,
                })
                self.assertEqual(res.status_code, status.HTTP_200_OK)
                results.append(res.data)
            
            # Check validity
            valid_count = 0
            for token_data in results:
                client = APIClient()
                client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_data['access']}")
                me_res = client.get(self.me_url)
                if me_res.status_code == status.HTTP_200_OK:
                    valid_count += 1
            self.assertEqual(valid_count, 1)
            return

        connection.close()
        results = []

        def do_login():
            try:
                client = APIClient()
                res = client.post(self.login_url, {
                    'username': self.student.username,
                    'password': self.password,
                })
                if res.status_code == status.HTTP_200_OK:
                    results.append(res.data)
            finally:
                connection.close()

        threads = [threading.Thread(target=do_login) for _ in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(results), 3)

        # Test which access tokens are still valid against /api/auth/me/
        valid_count = 0
        for token_data in results:
            client = APIClient()
            client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_data['access']}")
            me_res = client.get(self.me_url)
            if me_res.status_code == status.HTTP_200_OK:
                valid_count += 1

        # Exactly ONE session must be valid!
        self.assertEqual(valid_count, 1)
