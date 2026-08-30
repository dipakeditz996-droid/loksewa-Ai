"""Tests for the /api/media/drive/<id>/ proxy that serves Drive-hosted
files through our own domain. Every Drive call is mocked - must never
depend on the real Google account."""
from unittest.mock import patch

from django.test import TestCase

from core.google_drive import GoogleDriveError

URL = '/api/media/drive/FILE123/'


class DriveMediaProxyTests(TestCase):
    @patch('core.media_views.google_drive.download_file')
    @patch('core.media_views.google_drive.get_file')
    def test_serves_file_bytes_with_correct_content_type(self, mock_get_file, mock_download):
        mock_get_file.return_value = {'id': 'FILE123', 'mimeType': 'image/png'}
        mock_download.return_value = b'\x89PNG raw bytes'

        resp = self.client.get(URL)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'image/png')
        self.assertEqual(resp.content, b'\x89PNG raw bytes')
        mock_download.assert_called_once_with('FILE123')

    @patch('core.media_views.google_drive.download_file')
    @patch('core.media_views.google_drive.get_file')
    def test_sets_long_lived_cache_control(self, mock_get_file, mock_download):
        mock_get_file.return_value = {'id': 'FILE123', 'mimeType': 'image/png'}
        mock_download.return_value = b'data'

        resp = self.client.get(URL)

        self.assertIn('max-age=31536000', resp['Cache-Control'])

    @patch('core.media_views.google_drive.get_file')
    def test_404_when_drive_reports_no_such_file(self, mock_get_file):
        mock_get_file.return_value = None

        resp = self.client.get(URL)

        self.assertEqual(resp.status_code, 404)

    @patch('core.media_views.google_drive.get_file')
    def test_502_when_drive_is_unreachable(self, mock_get_file):
        mock_get_file.side_effect = GoogleDriveError('boom')

        resp = self.client.get(URL)

        self.assertEqual(resp.status_code, 502)

    @patch('core.media_views.google_drive.download_file')
    @patch('core.media_views.google_drive.get_file')
    def test_502_when_download_fails_after_metadata_succeeds(self, mock_get_file, mock_download):
        mock_get_file.return_value = {'id': 'FILE123', 'mimeType': 'image/png'}
        mock_download.side_effect = GoogleDriveError('boom')

        resp = self.client.get(URL)

        self.assertEqual(resp.status_code, 502)

    @patch('core.media_views.google_drive.download_file')
    @patch('core.media_views.google_drive.get_file')
    def test_falls_back_to_octet_stream_when_drive_reports_no_mime_type(self, mock_get_file, mock_download):
        mock_get_file.return_value = {'id': 'FILE123', 'mimeType': ''}
        mock_download.return_value = b'data'

        resp = self.client.get(URL)

        self.assertEqual(resp['Content-Type'], 'application/octet-stream')

    def test_no_authentication_required(self):
        # Matches the pre-existing R2/S3 security posture (public-read) -
        # not a new gap introduced by this proxy. Confirmed by getting a
        # real response (a 404/502 from the mocked-out Drive call, not 401).
        with patch('core.media_views.google_drive.get_file', return_value=None):
            resp = self.client.get(URL)
        self.assertNotEqual(resp.status_code, 401)
        self.assertNotEqual(resp.status_code, 403)
