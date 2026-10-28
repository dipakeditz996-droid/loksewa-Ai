import io
import os
import tempfile
from unittest.mock import patch, MagicMock
from PIL import Image, ImageDraw

import pymupdf
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files.base import ContentFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from administration.models import (
    PdfBrandingSetting,
    PdfBrandingRecord,
    PdfBrandingBatchJob,
)
from administration.pdf_branding_service import (
    PdfBrandingService,
    MalformedPdfError,
    EncryptedPdfError,
    SignedPdfError,
    PdfLimitError,
)
from notes.models import StudyMaterial
from exams.models import ExamCategory, Exam, Paper, Subject

User = get_user_model()


def generate_test_pdf(
    pages=1,
    orientation='portrait',
    text="Loksewa Test Notes Content",
) -> bytes:
    """Generate a clean test PDF in memory."""
    doc = pymupdf.open()
    for _ in range(pages):
        if orientation == 'landscape':
            p = doc.new_page(width=842, height=595)
        elif orientation == 'mixed':
            # Alternate portrait and landscape
            p = doc.new_page(width=595, height=842)
            p = doc.new_page(width=842, height=595)
            break
        else:
            p = doc.new_page(width=595, height=842)
        p.insert_text((72, 100), text, fontsize=14)

    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def generate_test_image(format='PNG', transparent=True) -> bytes:
    """Generate a test logo or watermark image."""
    mode = 'RGBA' if transparent else 'RGB'
    bg = (0, 0, 0, 0) if transparent else (255, 255, 255)
    im = Image.new(mode, (120, 60), bg)
    draw = ImageDraw.Draw(im)
    draw.rectangle([5, 5, 115, 55], fill=(11, 37, 69, 200), outline=(212, 167, 44, 255), width=2)
    draw.text((20, 20), "LoksewaAI", fill=(255, 255, 255, 255))
    buf = io.BytesIO()
    im.save(buf, format=format)
    return buf.getvalue()


@override_settings(
    STORAGES={
        'default': {
            'BACKEND': 'django.core.files.storage.FileSystemStorage',
        },
        'staticfiles': {
            'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
        },
    },
    MEDIA_ROOT=os.path.join(tempfile.gettempdir(), 'loksewa_test_media'),
)
class PdfBrandingTestBase(APITestCase):
    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_superuser(
            username='branding_admin',
            email='admin@loksewaai.com',
            password='Password123!',
            role='admin',
            is_staff=True,
        )
        self.student = User.objects.create_user(
            username='branding_student',
            email='student@loksewaai.com',
            password='Password123!',
        )

        self.category = ExamCategory.objects.create(name='Civil Service')
        self.exam = Exam.objects.create(name='Nayab Subba', category=self.category)
        self.paper = Paper.objects.create(exam=self.exam, name='Paper 1', paper_number=1)
        self.subject = Subject.objects.create(paper=self.paper, name='General Knowledge', code='gk')

        self.settings = PdfBrandingSetting.get_settings()
        self.settings.logo_enabled = True
        self.settings.watermark_enabled = True
        self.settings.watermark_text = 'LoksewaAI'
        self.settings.watermark_color = '#0B2545'
        self.settings.watermark_opacity = 0.15
        self.settings.apply_by_default_on_upload = True
        self.settings.save()


class PdfBrandingSettingsPermissionsAndValidationTests(PdfBrandingTestBase):
    """Tests for central settings authorization, ranges, and serialization."""

    def test_unauthenticated_cannot_access_settings(self):
        res = self.client.get('/api/admin/pdf-branding/settings/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_cannot_access_settings(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.get('/api/admin/pdf-branding/settings/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_read_settings(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/admin/pdf-branding/settings/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('settings', res.data)
        self.assertIn('summary', res.data)
        self.assertEqual(res.data['settings']['watermark_text'], 'LoksewaAI')

    def test_admin_can_update_settings_and_version_increments(self):
        self.client.force_authenticate(user=self.admin)
        v_before = self.settings.version

        payload = {
            'watermark_text': 'Loksewa Nepal Official',
            'watermark_opacity': 0.20,
            'watermark_rotation': 30,
            'watermark_color': '#D4A72C',
            'logo_placement': 'top-left',
        }
        res = self.client.put('/api/admin/pdf-branding/settings/', data=payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['settings']['watermark_text'], 'Loksewa Nepal Official')
        self.assertGreater(res.data['settings']['version'], v_before)

    def test_invalid_settings_validation(self):
        self.client.force_authenticate(user=self.admin)

        # Invalid opacity > 1.0
        res = self.client.put('/api/admin/pdf-branding/settings/', data={'watermark_opacity': 1.5}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Invalid rotation > 180
        res = self.client.put('/api/admin/pdf-branding/settings/', data={'watermark_rotation': 360}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Invalid color hex
        res = self.client.put('/api/admin/pdf-branding/settings/', data={'watermark_color': 'invalid_color'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logo_upload_and_removal(self):
        self.client.force_authenticate(user=self.admin)

        logo_bytes = generate_test_image('PNG')
        logo_file = SimpleUploadedFile("brand_logo.png", logo_bytes, content_type="image/png")

        # Upload
        res = self.client.post('/api/admin/pdf-branding/logo/', data={'logo': logo_file}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res.data['settings']['logo_url'])

        # Delete
        del_res = self.client.delete('/api/admin/pdf-branding/logo/')
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertIsNone(del_res.data['settings']['logo_url'])


class PdfBrandingEngineTests(PdfBrandingTestBase):
    """Direct tests for PyMuPDF PDF watermarking, overlays, geometry, and safety."""

    def test_portrait_pdf_branding(self):
        raw_pdf = generate_test_pdf(pages=2, orientation='portrait')
        branded_bytes = PdfBrandingService.apply_branding_to_pdf_bytes(raw_pdf, settings=self.settings)

        doc = pymupdf.open(stream=branded_bytes, filetype="pdf")
        self.assertEqual(doc.page_count, 2)
        for page in doc:
            self.assertEqual(page.rect.width, 595)
            self.assertEqual(page.rect.height, 842)
            # Text content preserved
            text = page.get_text()
            self.assertIn("Loksewa Test Notes", text)
        doc.close()

    def test_landscape_pdf_branding(self):
        raw_pdf = generate_test_pdf(pages=1, orientation='landscape')
        branded_bytes = PdfBrandingService.apply_branding_to_pdf_bytes(raw_pdf, settings=self.settings)

        doc = pymupdf.open(stream=branded_bytes, filetype="pdf")
        self.assertEqual(doc.page_count, 1)
        self.assertEqual(doc[0].rect.width, 842)
        self.assertEqual(doc[0].rect.height, 595)
        doc.close()

    def test_mixed_page_orientations_preserved(self):
        raw_pdf = generate_test_pdf(pages=2, orientation='mixed')
        branded_bytes = PdfBrandingService.apply_branding_to_pdf_bytes(raw_pdf, settings=self.settings)

        doc = pymupdf.open(stream=branded_bytes, filetype="pdf")
        self.assertEqual(doc.page_count, 2)
        self.assertEqual(doc[0].rect.width, 595)
        self.assertEqual(doc[0].rect.height, 842)
        self.assertEqual(doc[1].rect.width, 842)
        self.assertEqual(doc[1].rect.height, 595)
        doc.close()

    def test_transparent_logo_insertion(self):
        logo_bytes = generate_test_image('PNG', transparent=True)
        self.settings.logo_file.save("test_logo.png", ContentFile(logo_bytes))
        self.settings.logo_enabled = True
        self.settings.logo_placement = 'top-right'
        self.settings.save()

        raw_pdf = generate_test_pdf(pages=1)
        branded_bytes = PdfBrandingService.apply_branding_to_pdf_bytes(raw_pdf, settings=self.settings)

        doc = pymupdf.open(stream=branded_bytes, filetype="pdf")
        images = doc[0].get_images()
        self.assertGreaterEqual(len(images), 1)
        doc.close()

    def test_watermark_image_overlay(self):
        wm_img_bytes = generate_test_image('PNG')
        self.settings.watermark_image_file.save("test_wm.png", ContentFile(wm_img_bytes))
        self.settings.watermark_type = 'image'
        self.settings.watermark_enabled = True
        self.settings.save()

        raw_pdf = generate_test_pdf(pages=1)
        branded_bytes = PdfBrandingService.apply_branding_to_pdf_bytes(raw_pdf, settings=self.settings)

        doc = pymupdf.open(stream=branded_bytes, filetype="pdf")
        images = doc[0].get_images()
        self.assertGreaterEqual(len(images), 1)
        doc.close()

    def test_tiled_watermark_placement(self):
        self.settings.watermark_type = 'text'
        self.settings.watermark_placement = 'tile'
        self.settings.save()

        raw_pdf = generate_test_pdf(pages=1)
        branded_bytes = PdfBrandingService.apply_branding_to_pdf_bytes(raw_pdf, settings=self.settings)
        doc = pymupdf.open(stream=branded_bytes, filetype="pdf")
        self.assertEqual(doc.page_count, 1)
        doc.close()

    def test_malformed_pdf_rejected(self):
        with self.assertRaises(MalformedPdfError):
            PdfBrandingService.validate_source_pdf_bytes(b"not a valid pdf file content")

    def test_empty_pdf_rejected(self):
        with self.assertRaises(MalformedPdfError):
            PdfBrandingService.validate_source_pdf_bytes(b"")


class PdfBrandingDocumentLifecycleAndReprocessingTests(PdfBrandingTestBase):
    """Tests original copy preservation, duplicate prevention, and reprocessing."""

    def test_material_branding_preserves_pristine_original(self):
        raw_pdf = generate_test_pdf(pages=1, text="Original Pristine Note")
        material = StudyMaterial.objects.create(
            title="Civil Service Act Notes",
            exam=self.exam,
            subject=self.subject,
            content_category="syllabus",
            file=SimpleUploadedFile("civil_notes.pdf", raw_pdf, content_type="application/pdf"),
        )

        # Brand material
        res = PdfBrandingService.process_material(material, settings=self.settings)
        self.assertEqual(res['status'], 'branded')

        record = PdfBrandingRecord.objects.get(material=material)
        self.assertEqual(record.status, 'branded')
        self.assertTrue(bool(record.original_file))

        # Check that original_file content matches unbranded raw_pdf
        record.original_file.seek(0)
        orig_content = record.original_file.read()
        self.assertEqual(orig_content, raw_pdf)

    def test_reprocessing_uses_original_preventing_duplicate_watermarks(self):
        raw_pdf = generate_test_pdf(pages=1, text="Unique Original Content")
        material = StudyMaterial.objects.create(
            title="Constitution Guide",
            exam=self.exam,
            subject=self.subject,
            content_category="syllabus",
            file=SimpleUploadedFile("constitution.pdf", raw_pdf, content_type="application/pdf"),
        )

        # First branding with v1
        PdfBrandingService.process_material(material, settings=self.settings)
        record = PdfBrandingRecord.objects.get(material=material)
        self.assertEqual(record.applied_version, self.settings.version)

        # Update global settings to v2
        self.settings.watermark_text = "Updated LoksewaAI 2026"
        self.settings.save()
        self.assertGreater(self.settings.version, record.applied_version)

        # Reprocess material
        res = PdfBrandingService.process_material(material, settings=self.settings, force=True)
        self.assertEqual(res['status'], 'branded')

        record.refresh_from_db()
        self.assertEqual(record.applied_version, self.settings.version)

        # Check PDF is valid, page count is still 1
        material.file.seek(0)
        doc = pymupdf.open(stream=material.file.read(), filetype="pdf")
        self.assertEqual(doc.page_count, 1)
        doc.close()

    def test_restore_pristine_original(self):
        raw_pdf = generate_test_pdf(pages=1, text="Pristine Text To Restore")
        material = StudyMaterial.objects.create(
            title="Restorable Notes",
            exam=self.exam,
            subject=self.subject,
            content_category="syllabus",
            file=SimpleUploadedFile("notes.pdf", raw_pdf, content_type="application/pdf"),
        )

        PdfBrandingService.process_material(material, settings=self.settings)
        self.assertEqual(material.branding_record.status, 'branded')

        # Restore original
        restore_res = PdfBrandingService.restore_original(material)
        self.assertTrue(restore_res['success'])

        material.refresh_from_db()
        material.file.seek(0)
        self.assertEqual(material.file.read(), raw_pdf)
        self.assertEqual(material.branding_record.status, 'unbranded')

    def test_document_skip_decision_is_respected(self):
        raw_pdf = generate_test_pdf(pages=1)
        material = StudyMaterial.objects.create(
            title="Private Unbranded Document",
            exam=self.exam,
            subject=self.subject,
            content_category="syllabus",
            file=SimpleUploadedFile("private.pdf", raw_pdf, content_type="application/pdf"),
        )
        record = PdfBrandingService.get_or_create_record(material)
        record.decision = 'skip'
        record.save()

        # Regular process should skip
        res = PdfBrandingService.process_material(material, settings=self.settings, force=False)
        self.assertEqual(res['status'], 'skipped')


class PdfBrandingUploadAndApiIntegrationTests(PdfBrandingTestBase):
    """Tests upload endpoints with per-upload branding choices."""

    def test_admin_upload_with_branding_decision_apply(self):
        self.client.force_authenticate(user=self.admin)
        pdf_bytes = generate_test_pdf(pages=1)
        uploaded = SimpleUploadedFile("new_doc.pdf", pdf_bytes, content_type="application/pdf")

        data = {
            'title': 'Applied Branding Note',
            'exam': self.exam.id,
            'subject': self.subject.id,
            'content_category': 'syllabus',
            'file': uploaded,
            'branding_decision': 'apply',
        }
        res = self.client.post('/api/admin/study-materials/', data=data, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        mat_id = res.data['id']
        mat = StudyMaterial.objects.get(id=mat_id)
        self.assertEqual(mat.branding_record.status, 'branded')
        self.assertEqual(mat.branding_record.decision, 'apply')

    def test_admin_upload_with_branding_decision_skip(self):
        self.client.force_authenticate(user=self.admin)
        pdf_bytes = generate_test_pdf(pages=1)
        uploaded = SimpleUploadedFile("clean_doc.pdf", pdf_bytes, content_type="application/pdf")

        data = {
            'title': 'Clean Note Without Branding',
            'exam': self.exam.id,
            'subject': self.subject.id,
            'content_category': 'syllabus',
            'file': uploaded,
            'branding_decision': 'skip',
        }
        res = self.client.post('/api/admin/study-materials/', data=data, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        mat_id = res.data['id']
        mat = StudyMaterial.objects.get(id=mat_id)
        self.assertEqual(mat.branding_record.status, 'unbranded')
        self.assertEqual(mat.branding_record.decision, 'skip')


class PdfBrandingBulkJobsAndBatchingTests(PdfBrandingTestBase):
    """Tests bulk operations, preview, batching, and error isolation."""

    def test_bulk_preview_calculation(self):
        self.client.force_authenticate(user=self.admin)

        # Create 3 materials
        m1 = StudyMaterial.objects.create(
            title="Note 1", exam=self.exam, subject=self.subject, content_category="syllabus",
            file=SimpleUploadedFile("1.pdf", generate_test_pdf(), content_type="application/pdf")
        )
        m2 = StudyMaterial.objects.create(
            title="Note 2", exam=self.exam, subject=self.subject, content_category="syllabus",
            file=SimpleUploadedFile("2.pdf", generate_test_pdf(), content_type="application/pdf")
        )

        res = self.client.post('/api/admin/pdf-branding/bulk-preview/', data={'action': 'all_eligible'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['affected_count'], 2)

    def test_bulk_apply_requires_explicit_confirmation(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/admin/pdf-branding/bulk-apply/', data={'action': 'all_eligible'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('confirmation', res.data['error'].lower())

    def test_bulk_execution_and_error_isolation(self):
        self.client.force_authenticate(user=self.admin)

        # Create one valid material and one malformed material
        valid_m = StudyMaterial.objects.create(
            title="Valid Note", exam=self.exam, subject=self.subject, content_category="syllabus",
            file=SimpleUploadedFile("valid.pdf", generate_test_pdf(), content_type="application/pdf")
        )
        corrupted_m = StudyMaterial.objects.create(
            title="Corrupted Note", exam=self.exam, subject=self.subject, content_category="syllabus",
            file=SimpleUploadedFile("corrupt.pdf", b"corrupted non-pdf bytes", content_type="application/pdf")
        )

        res = self.client.post('/api/admin/pdf-branding/bulk-apply/', data={
            'action': 'all_eligible',
            'material_ids': [valid_m.id, corrupted_m.id],
            'confirmed': True,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        job_id = res.data['job']['id']
        job = PdfBrandingBatchJob.objects.get(id=job_id)

        # Error isolation: valid material succeeds, corrupted material fails cleanly
        self.assertEqual(job.success_count, 1)
        self.assertEqual(job.failed_count, 1)
        self.assertEqual(job.status, 'completed')

        valid_m.refresh_from_db()
        corrupted_m.refresh_from_db()
        self.assertEqual(valid_m.branding_record.status, 'branded')
        self.assertEqual(corrupted_m.branding_record.status, 'failed')

    def test_retry_failed_job_only_targets_failures(self):
        self.client.force_authenticate(user=self.admin)

        failed_job = PdfBrandingBatchJob.objects.create(
            status='completed',
            operation='bulk_apply',
            total_files=2,
            results=[
                {'id': 101, 'status': 'branded', 'title': 'Success Doc'},
                {'id': 102, 'status': 'failed', 'title': 'Failed Doc', 'error': 'Corrupt header'},
            ],
            created_by=self.admin,
        )

        res = self.client.post(f'/api/admin/pdf-branding/jobs/{failed_job.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        new_job_id = res.data['job']['id']
        new_job = PdfBrandingBatchJob.objects.get(id=new_job_id)
        # Target IDs should only be the failed item 102
        self.assertEqual(new_job.file_ids, [102])
