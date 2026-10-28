from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken

from core.models import User
from core.authentication import ProfileAwareJWTAuthentication
from core.session_service import invalidate_user_session, establish_active_session

class Phase2JAuthenticationRegressionTests(TestCase):
    """
    Exhaustive regression test suite ensuring authentication security invariants
    are never weakened or bypassed:
    1. Inactive users
    2. Password changes (immediate token revocation)
    3. Revoked sessions
    4. Invalid and corrupted tokens
    5. Single active session enforcement for students
    6. Multi-window / non-enforcement preservation for staff and teachers
    """

    def setUp(self):
        self.password = "InitialSecurePassword123!"
        self.student = User.objects.create_user(
            username="student_sec_p2j",
            email="student_sec_p2j@example.com",
            password=self.password,
            role="student",
            is_active=True,
        )
        self.admin = User.objects.create_user(
            username="admin_sec_p2j",
            email="admin_sec_p2j@example.com",
            password=self.password,
            role="admin",
            is_staff=True,
            is_active=True,
        )
        self.auth = ProfileAwareJWTAuthentication()
        self.factory = APIRequestFactory()
        self.client = APIClient()

    def test_inactive_user_token_rejected_immediately(self):
        """If user is deactivated, outstanding access token must be rejected."""
        refresh = RefreshToken.for_user(self.student)
        access_token = str(refresh.access_token)

        # Confirm token works while active
        req = self.factory.get('/api/auth/me/', HTTP_AUTHORIZATION=f'Bearer {access_token}')
        user, validated_token = self.auth.authenticate(req)
        self.assertEqual(user.id, self.student.id)

        # Deactivate user
        self.student.is_active = False
        self.student.save(update_fields=['is_active'])

        # Authenticate must now raise AuthenticationFailed('User is inactive')
        with self.assertRaises(AuthenticationFailed) as cm:
            self.auth.authenticate(req)
        self.assertIn('inactive', str(cm.exception.detail).lower())

    def test_password_change_revokes_outstanding_tokens(self):
        """Changing the user password must immediately invalidate prior access tokens."""
        refresh = RefreshToken.for_user(self.student)
        access_token = str(refresh.access_token)

        req = self.factory.get('/api/auth/me/', HTTP_AUTHORIZATION=f'Bearer {access_token}')
        user, validated_token = self.auth.authenticate(req)
        self.assertEqual(user.id, self.student.id)

        # Change password
        self.student.set_password("NewPassword456!Changed")
        self.student.save(update_fields=['password'])

        # Authenticate must now reject with code='password_changed'
        with self.assertRaises(AuthenticationFailed) as cm:
            self.auth.authenticate(req)
        self.assertIn("password has been changed", str(cm.exception.detail))

    def test_revoked_session_rejects_student_access_token(self):
        """When student session is invalidated, tokens presenting old key must be rejected."""
        session_key = establish_active_session(self.student)
        refresh = RefreshToken.for_user(self.student)
        refresh['session_key'] = session_key
        access_token = str(refresh.access_token)

        req = self.factory.get('/api/auth/me/', HTTP_AUTHORIZATION=f'Bearer {access_token}')
        user, validated_token = self.auth.authenticate(req)
        self.assertEqual(user.id, self.student.id)

        # Invalidate session
        invalidate_user_session(self.student)

        # Token must be rejected with session_revoked
        with self.assertRaises(AuthenticationFailed) as cm:
            self.auth.authenticate(req)
        detail = cm.exception.detail
        self.assertEqual(detail.get('code'), 'session_revoked')

    def test_invalid_and_corrupted_tokens_raise_invalid_token(self):
        """Tampered or invalid JWT strings must raise InvalidToken."""
        req_garbage = self.factory.get('/api/auth/me/', HTTP_AUTHORIZATION='Bearer not_a_valid_jwt_string')
        with self.assertRaises(InvalidToken):
            self.auth.authenticate(req_garbage)

        req_none = self.factory.get('/api/auth/me/')
        result = self.auth.authenticate(req_none)
        self.assertIsNone(result)

    def test_single_active_session_replaces_old_device(self):
        """Student login on device 2 terminates device 1 immediately."""
        login_url = reverse('token_obtain_pair')
        me_url = reverse('auth_me')

        # Device 1 login
        r1 = self.client.post(login_url, {'username': self.student.username, 'password': self.password})
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        dev1_token = r1.data['access']

        c1 = APIClient()
        c1.credentials(HTTP_AUTHORIZATION=f'Bearer {dev1_token}')
        self.assertEqual(c1.get(me_url).status_code, status.HTTP_200_OK)

        # Device 2 login
        r2 = self.client.post(login_url, {'username': self.student.username, 'password': self.password})
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        dev2_token = r2.data['access']

        c2 = APIClient()
        c2.credentials(HTTP_AUTHORIZATION=f'Bearer {dev2_token}')

        # Device 2 works
        self.assertEqual(c2.get(me_url).status_code, status.HTTP_200_OK)

        # Device 1 rejected with 401 session_revoked
        resp1 = c1.get(me_url)
        self.assertEqual(resp1.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(resp1.data.get('code'), 'session_revoked')

    def test_admin_multi_session_preserved(self):
        """Admin accounts allow concurrent sessions for multi-window grading and administration."""
        login_url = reverse('token_obtain_pair')
        me_url = reverse('auth_me')

        # Admin window 1
        r1 = self.client.post(login_url, {'username': self.admin.username, 'password': self.password})
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        token1 = r1.data['access']

        # Admin window 2
        r2 = self.client.post(login_url, {'username': self.admin.username, 'password': self.password})
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        token2 = r2.data['access']

        c1 = APIClient()
        c1.credentials(HTTP_AUTHORIZATION=f'Bearer {token1}')
        c2 = APIClient()
        c2.credentials(HTTP_AUTHORIZATION=f'Bearer {token2}')

        # Both admin windows remain active
        self.assertEqual(c1.get(me_url).status_code, status.HTTP_200_OK)
        self.assertEqual(c2.get(me_url).status_code, status.HTTP_200_OK)
