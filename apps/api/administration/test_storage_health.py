"""Tests for the admin-only Google Drive storage health check. All Drive
calls are mocked - must never depend on the real Google account."""
from unittest.mock import MagicMock, patch

from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User

URL = '/api/admin/storage/health/'

DRIVE_ENV = {
    'GOOGLE_DRIVE_CLIENT_ID': 'test-client-id',
    'GOOGLE_DRIVE_CLIENT_SECRET': 'test-client-secret',
    'GOOGLE_DRIVE_REFRESH_TOKEN': 'test-refresh-token',
    'GOOGLE_DRIVE_ROOT_FOLDER_ID': 'root-folder-id',
}


class StorageHealthTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.student = User.objects.create_user(
            username='stu1', password='pw', role='student')

    def as_admin(self):
        self.client.force_authenticate(user=self.admin)


class PermissionTests(StorageHealthTestBase):
    def test_anonymous_rejected(self):
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_403_FORBIDDEN)


class NotConfiguredTests(StorageHealthTestBase):
    @patch.dict('os.environ', {'GOOGLE_DRIVE_REFRESH_TOKEN': ''}, clear=False)
    def test_reports_not_configured_without_making_any_api_call(self):
        self.as_admin()
        resp = self.client.get(URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['configured'], False)
        self.assertEqual(resp.data['connected'], False)


class ConfiguredAndConnectedTests(StorageHealthTestBase):
    @patch.dict('os.environ', DRIVE_ENV, clear=False)
    @patch('core.google_drive.get_credentials')
    @patch('googleapiclient.discovery.build')
    def test_reports_connected_with_account_and_quota_but_no_secrets(self, mock_build, mock_get_credentials):
        mock_get_credentials.return_value = MagicMock()
        mock_service = MagicMock()
        mock_service.about.return_value.get.return_value.execute.return_value = {
            'user': {'emailAddress': 'drive-account@example.com'},
            'storageQuota': {'usage': '1000', 'limit': '16106127360'},
        }
        mock_build.return_value = mock_service

        self.as_admin()
        resp = self.client.get(URL)

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['configured'], True)
        self.assertEqual(resp.data['connected'], True)
        self.assertEqual(resp.data['account_email'], 'drive-account@example.com')
        self.assertEqual(resp.data['storage_used_bytes'], 1000)
        self.assertEqual(resp.data['storage_limit_bytes'], 16106127360)

        body = str(resp.content)
        self.assertNotIn('test-client-secret', body)
        self.assertNotIn('test-refresh-token', body)

    @patch.dict('os.environ', DRIVE_ENV, clear=False)
    @patch('core.google_drive.get_credentials')
    def test_reports_disconnected_when_refresh_fails(self, mock_get_credentials):
        from core.google_drive import GoogleDriveError
        mock_get_credentials.side_effect = GoogleDriveError('refresh token revoked')

        self.as_admin()
        resp = self.client.get(URL)

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['configured'], True)
        self.assertEqual(resp.data['connected'], False)
