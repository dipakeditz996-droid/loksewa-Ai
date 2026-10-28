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

    @patch('core.media_views.google_drive.download_file')
    @patch('core.media_views.google_drive.get_file')
    def test_syllabus_displays_course_name_and_syllabus(self, mock_get_file, mock_download):
        import pymupdf
        from exams.models import Exam, ExamCategory
        from courses.models import Course
        from notes.models import StudyMaterial

        cat = ExamCategory.objects.create(name='PSC')
        exam = Exam.objects.create(category=cat, name='5th Level')
        course = Course.objects.create(title='Civil Sub Engineer', slug='civil-sub-eng', exam=exam)
        StudyMaterial.objects.create(
            title='5th',
            course=course,
            exam=exam,
            content_category='syllabus',
            file='study_materials/pdfs/FILE123__5th.pdf',
        )

        # Minimal valid PDF
        doc = pymupdf.open()
        doc.new_page()
        pdf_bytes = doc.tobytes()

        mock_get_file.return_value = {'id': 'FILE123', 'name': '5th', 'mimeType': 'application/pdf'}
        mock_download.return_value = pdf_bytes

        resp = self.client.get(URL)
        self.assertEqual(resp.status_code, 200)
        self.assertIn('Civil Sub Engineer - Syllabus.pdf', resp['Content-Disposition'])

        # Verify PDF Title metadata was injected
        resp_doc = pymupdf.open(stream=resp.content, filetype='pdf')
        self.assertEqual(resp_doc.metadata.get('title'), 'Civil Sub Engineer - Syllabus')

    @patch('core.media_views.google_drive.download_file')
    @patch('core.media_views.google_drive.get_file')
    def test_note_title_formatting(self, mock_get_file, mock_download):
        from core.pdf_utils import format_material_display_title
        from exams.models import Exam, ExamCategory
        from courses.models import Course
        from notes.models import StudyMaterial

        cat = ExamCategory.objects.create(name='PSC')
        exam = Exam.objects.create(category=cat, name='5th Level')
        course = Course.objects.create(title='Civil Sub Engineer', slug='civil-sub-eng-note', exam=exam)
        sm = StudyMaterial.objects.create(
            title='5th',
            course=course,
            exam=exam,
            content_category='subjective_topicwise',
            file='study_materials/pdfs/NOTE456__note.pdf',
        )

        title = format_material_display_title(sm)
        self.assertEqual(title, 'Civil Sub Engineer - Note')

    @patch('core.media_views.google_drive.download_file')
    @patch('core.media_views.google_drive.get_file')
    def test_protected_material_access_control(self, mock_get_file, mock_download):
        from django.contrib.auth import get_user_model
        from rest_framework_simplejwt.tokens import RefreshToken
        from exams.models import Exam, ExamCategory
        from courses.models import Course
        from notes.models import StudyMaterial

        User = get_user_model()
        admin_user = User.objects.create_superuser('admin_tester', 'admin@example.com', 'Pass1234!')
        cat = ExamCategory.objects.create(name='PSC Admin Test')
        exam = Exam.objects.create(category=cat, name='Officer')
        course = Course.objects.create(title='Admin Course', slug='admin-course-proxy', exam=exam)
        StudyMaterial.objects.create(
            title='Protected Note',
            course=course,
            exam=exam,
            content_category='revision_notes',
            file='study_materials/pdfs/PROT999__protected_note.pdf',
        )

        mock_get_file.return_value = {'id': 'PROT999', 'name': 'protected_note.pdf', 'mimeType': 'application/pdf'}
        mock_download.return_value = b'%PDF-1.4 test pdf content'

        prot_url = '/api/media/drive/PROT999/'

        # 1. Unauthenticated request -> 403 Forbidden
        resp_unauth = self.client.get(prot_url)
        self.assertEqual(resp_unauth.status_code, 403)

        # 2. Authenticated admin request via Bearer header -> 200 OK
        token = str(RefreshToken.for_user(admin_user).access_token)
        resp_auth = self.client.get(prot_url, HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(resp_auth.status_code, 200)

        # 3. Authenticated admin request via ?token= query param -> 200 OK
        resp_token_param = self.client.get(f'{prot_url}?token={token}')
        self.assertEqual(resp_token_param.status_code, 200)
