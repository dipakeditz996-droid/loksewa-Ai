from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic
from notes.models import StudyMaterial
from administration.models import TrashItem


class StudyMaterialEditTests(APITestCase):
    def setUp(self):
        # Academic hierarchy
        self.category = ExamCategory.objects.create(name='PSC Nepal', order=1, is_active=True)
        self.level = Exam.objects.create(
            name='5th Level', category=self.category, order=1, is_active=True, status='active'
        )
        self.exam = Exam.objects.create(
            name='Civil Engineering', category=self.category, parent=self.level, order=1, is_active=True, status='active'
        )
        self.paper = Paper.objects.create(exam=self.exam, name='Paper I', order=1, is_active=True)
        self.subject = Subject.objects.create(paper=self.paper, name='Structural Analysis', order=1, is_active=True)
        self.chapter = Chapter.objects.create(subject=self.subject, title='Mechanics', order=1, is_active=True)
        self.topic = Topic.objects.create(chapter=self.chapter, name='Stress & Strain', order=1, is_active=True)

        # Another topic under different chapter for hierarchy mismatch test
        self.chapter_other = Chapter.objects.create(subject=self.subject, title='Hydraulics', order=2, is_active=True)
        self.topic_other = Topic.objects.create(chapter=self.chapter_other, name='Fluid Dynamics', order=1, is_active=True)

        # Users
        self.admin = User.objects.create_superuser(
            username='admin_boss', email='admin@loksewa.ai', password='adminpassword123', role='super-admin'
        )
        self.student = User.objects.create_user(
            username='student_user', email='student@loksewa.ai', password='studentpassword123', role='student'
        )

        with patch('core.google_drive.upload_file', return_value='mock_drive_file_id_init'):
            self.material = StudyMaterial.objects.create(
                title='Official Civil Syllabus 2081',
                description='Original curriculum syllabus PDF',
                exam=self.exam,
                subject=self.subject,
                chapter=self.chapter,
                topic=self.topic,
                content_category='syllabus',
                note_type='standard',
                material_type='pdf',
                access_type='free',
                status='published',
                is_downloadable=True,
                order=0,
                file=SimpleUploadedFile('official_syllabus.pdf', b'%PDF-1.4 Initial PDF content', content_type='application/pdf'),
            )

    def test_admin_can_retrieve_material_detail_for_edit_prepopulation(self):
        """GET /api/admin/study-materials/<id>/ returns all fields required to prepopulate the edit form."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f'/api/admin/study-materials/{self.material.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data
        self.assertEqual(data['id'], self.material.id)
        self.assertEqual(data['title'], 'Official Civil Syllabus 2081')
        self.assertEqual(data['description'], 'Original curriculum syllabus PDF')
        self.assertEqual(data['contentCategory'], 'syllabus')
        self.assertEqual(data['status'], 'published')
        self.assertEqual(data['accessType'], 'free')
        self.assertTrue(data['isDownloadable'])
        self.assertEqual(data['examId'], self.exam.id)
        self.assertEqual(data['exam'], 'Civil Engineering')
        self.assertEqual(data['levelName'], '5th Level')
        self.assertEqual(data['categoryName'], 'PSC Nepal')
        self.assertIsNotNone(data['fileUrl'])
        self.assertTrue('official_syllabus' in data['fileName'] and data['fileName'].endswith('.pdf'))

    def test_metadata_only_update_preserves_existing_pdf(self):
        """Updating title, category, description, and status without sending a file preserves the original file."""
        self.client.force_authenticate(user=self.admin)
        orig_file_name = self.material.file.name

        payload = {
            'title': 'Updated Syllabus 2081 (Revised Edition)',
            'description': 'Updated description with amendments',
            'contentCategory': 'subjective_topicwise',
            'status': 'draft',
            'accessType': 'premium',
            'isDownloadable': False,
        }

        res = self.client.patch(f'/api/admin/study-materials/{self.material.id}/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['title'], 'Updated Syllabus 2081 (Revised Edition)')
        self.assertEqual(res.data['contentCategory'], 'subjective_topicwise')
        self.assertEqual(res.data['status'], 'draft')
        self.assertEqual(res.data['accessType'], 'premium')
        self.assertFalse(res.data['isDownloadable'])

        self.material.refresh_from_db()
        self.assertEqual(self.material.title, 'Updated Syllabus 2081 (Revised Edition)')
        self.assertEqual(self.material.description, 'Updated description with amendments')
        self.assertEqual(self.material.content_category, 'subjective_topicwise')
        self.assertEqual(self.material.status, 'draft')
        self.assertEqual(self.material.access_type, 'premium')
        self.assertFalse(self.material.is_downloadable)
        # Original file reference must be strictly preserved
        self.assertEqual(self.material.file.name, orig_file_name)

    def test_replacement_upload_updates_file(self):
        """Uploading a new PDF replaces the existing file while applying metadata updates."""
        self.client.force_authenticate(user=self.admin)

        new_pdf = SimpleUploadedFile('revised_syllabus.pdf', b'%PDF-1.4 New replacement PDF content', content_type='application/pdf')

        with patch('core.google_drive.upload_file', return_value='mock_drive_file_id_replaced'):
            res = self.client.patch(
                f'/api/admin/study-materials/{self.material.id}/',
                {
                    'title': 'Syllabus 2081 with Attached New PDF',
                    'file': new_pdf,
                },
                format='multipart'
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.material.refresh_from_db()
        self.assertEqual(self.material.title, 'Syllabus 2081 with Attached New PDF')
        self.assertTrue('revised_syllabus' in self.material.file.name and self.material.file.name.endswith('.pdf'))

    def test_invalid_title_rejected(self):
        """Empty or whitespace-only title is rejected with 400 Bad Request."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f'/api/admin/study-materials/{self.material.id}/',
            {'title': '   '},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', res.data)

        self.material.refresh_from_db()
        self.assertEqual(self.material.title, 'Official Civil Syllabus 2081')

    def test_invalid_file_extension_rejected(self):
        """Disallowed file extension (.exe) is rejected with 400 Bad Request and does not corrupt material."""
        self.client.force_authenticate(user=self.admin)
        orig_file = self.material.file.name

        bad_file = SimpleUploadedFile('dangerous_script.exe', b'MZExecutableContent', content_type='application/x-msdownload')
        res = self.client.patch(
            f'/api/admin/study-materials/{self.material.id}/',
            {'file': bad_file},
            format='multipart'
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        self.material.refresh_from_db()
        self.assertEqual(self.material.file.name, orig_file)

    def test_invalid_hierarchy_mismatch_rejected(self):
        """Topic belonging to different chapter is rejected to maintain tree integrity."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f'/api/admin/study-materials/{self.material.id}/',
            {
                'chapter': self.chapter.id,
                'topic': self.topic_other.id,  # belongs to chapter_other, not self.chapter
            },
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('does not belong to chapter', res.data['error'])

    def test_student_and_unauthenticated_blocked(self):
        """Students and unauthenticated users cannot edit study materials."""
        # Unauthenticated
        res_anon = self.client.patch(
            f'/api/admin/study-materials/{self.material.id}/',
            {'title': 'Hacked Title'},
            format='json'
        )
        self.assertEqual(res_anon.status_code, status.HTTP_401_UNAUTHORIZED)

        # Student
        self.client.force_authenticate(user=self.student)
        res_student = self.client.patch(
            f'/api/admin/study-materials/{self.material.id}/',
            {'title': 'Student Modified Title'},
            format='json'
        )
        self.assertEqual(res_student.status_code, status.HTTP_403_FORBIDDEN)

        self.material.refresh_from_db()
        self.assertEqual(self.material.title, 'Official Civil Syllabus 2081')

    def test_reorder_and_status_behavior_preserved(self):
        """Reordering material and toggling status continues working smoothly."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f'/api/admin/study-materials/{self.material.id}/',
            {'order': 3, 'status': 'archived'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.material.refresh_from_db()
        self.assertEqual(self.material.order, 3)
        self.assertEqual(self.material.status, 'archived')

    def test_delete_action_still_soft_deletes_to_trash(self):
        """Delete action continues soft-deleting material to TrashItem."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(f'/api/admin/study-materials/{self.material.id}/', {'reason': 'Curriculum overhaul'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])

        self.material.refresh_from_db()
        self.assertEqual(self.material.status, 'archived')
        trash = TrashItem.objects.filter(model_name='studymaterial', object_id=str(self.material.id)).first()
        self.assertIsNotNone(trash)
        self.assertEqual(trash.title, 'Official Civil Syllabus 2081')
