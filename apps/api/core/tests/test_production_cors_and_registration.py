"""Tests for production CORS configuration, allowed origins, custom header handling,
and student registration signup endpoint.
"""
from django.conf import settings
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from exams.models import ExamCategory
from core.models import User


class ProductionCorsAndRegistrationConfigTests(APITestCase):
    def setUp(self):
        self.category = ExamCategory.objects.create(name='PSC Technical Exams', is_active=True)

    def test_cors_settings_contain_production_domains(self):
        """Verify settings include production custom domain both with and without www."""
        self.assertIn('https://www.hemrajkc.com.np', settings.CORS_ALLOWED_ORIGINS)
        self.assertIn('https://hemrajkc.com.np', settings.CORS_ALLOWED_ORIGINS)
        self.assertIn('https://www.hemrajkc.com.np', settings.CSRF_TRUSTED_ORIGINS)
        self.assertIn('https://hemrajkc.com.np', settings.CSRF_TRUSTED_ORIGINS)

    def test_cors_settings_allow_x_request_id(self):
        """Verify CORS allow headers include x-request-id header."""
        self.assertIn('x-request-id', [h.lower() for h in settings.CORS_ALLOW_HEADERS])

    def test_cors_preflight_options_with_x_request_id(self):
        """Simulate browser CORS preflight for POST /api/auth/signup/ with custom header."""
        response = self.client.options(
            '/api/auth/signup/',
            HTTP_ORIGIN='https://www.hemrajkc.com.np',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS='content-type,x-request-id'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.headers.get('Access-Control-Allow-Origin'), 'https://www.hemrajkc.com.np')
        allow_headers = response.headers.get('Access-Control-Allow-Headers', '').lower()
        self.assertIn('content-type', allow_headers)
        self.assertIn('x-request-id', allow_headers)

    def test_cors_preflight_options_non_www_domain(self):
        """Verify non-www apex domain receives valid Access-Control-Allow-Origin."""
        response = self.client.options(
            '/api/auth/signup/',
            HTTP_ORIGIN='https://hemrajkc.com.np',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS='content-type'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.headers.get('Access-Control-Allow-Origin'), 'https://hemrajkc.com.np')

    def test_signup_with_client_request_id_in_payload(self):
        """Student signup succeeds when client_request_id is provided in JSON payload."""
        payload = {
            'username': 'corsteststudent',
            'email': 'corsstudent@test.com',
            'password': 'StrongPassword123!',
            'name': 'Hemraj KC',
            'mobile': '9841234567',
            'permanent_district': 'Kathmandu',
            'permanent_local_level': 'Kathmandu Metropolitan',
            'exam_category_id': str(self.category.id),
            'client_request_id': 'reg_test_cors_123',
        }
        with self.assertLogs('core.views', level='INFO') as log_ctx:
            response = self.client.post(
                '/api/auth/signup/',
                payload,
                format='json',
                HTTP_ORIGIN='https://www.hemrajkc.com.np'
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertTrue(response.data.get('pending_verification'))
            self.assertEqual(response.data.get('username'), 'corsteststudent')
            self.assertTrue(User.objects.filter(username='corsteststudent').exists())
            # Verify the logger used the client_request_id
            self.assertTrue(any('reg_test_cors_123' in msg for msg in log_ctx.output))

    def test_signup_validation_returns_structured_missing_fields(self):
        """Missing required fields return structured 400 Bad Request."""
        response = self.client.post(
            '/api/auth/signup/',
            {'email': 'incomplete@test.com'},
            format='json',
            HTTP_ORIGIN='https://www.hemrajkc.com.np'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('missing_fields', response.data)
        self.assertIn('password', response.data['missing_fields'])
