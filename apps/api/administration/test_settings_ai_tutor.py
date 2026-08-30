"""Tests for the AI Tutor slice of AdminSettingsView (GET/PUT /api/admin/settings/)."""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, AdminSettings

URL = '/api/admin/settings/'


class AdminSettingsAITutorTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.student = User.objects.create_user(
            username='stu1', password='pw', role='student')

    def as_admin(self):
        self.client.force_authenticate(user=self.admin)


class PermissionTests(AdminSettingsAITutorTestBase):
    def test_anonymous_rejected(self):
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_403_FORBIDDEN)


class GetTests(AdminSettingsAITutorTestBase):
    def test_returns_default_daily_limit(self):
        self.as_admin()
        resp = self.client.get(URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['settings']['aiTutor']['dailyMessageLimit'], 20)
        self.assertTrue(resp.data['settings']['features']['enableAiTutor'])


class PutTests(AdminSettingsAITutorTestBase):
    def test_updates_daily_limit(self):
        self.as_admin()
        resp = self.client.put(URL, {'aiTutor': {'dailyMessageLimit': 50}}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(AdminSettings.get_settings().ai_tutor_daily_message_limit, 50)

    def test_disable_flag_persists(self):
        self.as_admin()
        resp = self.client.put(URL, {'features': {'enableAiTutor': False}}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(AdminSettings.get_settings().enable_ai_tutor)

    def test_rejects_zero_limit(self):
        self.as_admin()
        resp = self.client.put(URL, {'aiTutor': {'dailyMessageLimit': 0}}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_negative_limit(self):
        self.as_admin()
        resp = self.client.put(URL, {'aiTutor': {'dailyMessageLimit': -5}}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_non_integer_limit(self):
        self.as_admin()
        resp = self.client.put(URL, {'aiTutor': {'dailyMessageLimit': 'unlimited'}}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unrelated_sections_unaffected(self):
        self.as_admin()
        resp = self.client.put(URL, {'aiTutor': {'dailyMessageLimit': 30}}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        settings = AdminSettings.get_settings()
        # Unrelated defaults should be untouched by a partial update.
        self.assertEqual(settings.platform_name, 'Loksewa')
        self.assertTrue(settings.enable_marketplace)
