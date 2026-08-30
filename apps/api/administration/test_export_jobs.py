"""Tests for background CSV exports (ExportJob): AdminAuditLogExportJobView
(create/list) and export_service.generate_export_job (the actual generation,
called directly here the same way the Celery task and the run_export_job
management command call it - no live worker needed to prove it works)."""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from .models import AuditLog, ExportJob
from .export_service import generate_export_job

CREATE_URL = '/api/admin/audit-logs/export-jobs/'


class ExportJobGenerationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        AuditLog.objects.create(actor=self.admin, action='TEST_ACTION', entity_type='Thing', entity_id='1')
        AuditLog.objects.create(actor=self.admin, action='TEST_ACTION_2', entity_type='Thing', entity_id='2')

    def test_generates_real_csv_file(self):
        job = ExportJob.objects.create(export_type='audit_logs', requested_by=self.admin)

        generate_export_job(job)
        job.refresh_from_db()

        self.assertEqual(job.status, 'completed')
        self.assertGreaterEqual(job.row_count, 2)
        self.assertTrue(job.file.name)
        self.assertIsNotNone(job.completed_at)

        content = job.file.read().decode('utf-8')
        self.assertIn('Timestamp,Action,User,Email,Details,Severity', content)

    def test_unknown_export_type_fails_cleanly(self):
        job = ExportJob.objects.create(export_type='not_a_real_type', requested_by=self.admin)

        generate_export_job(job)
        job.refresh_from_db()

        self.assertEqual(job.status, 'failed')
        self.assertIn('Unknown export_type', job.error_message)

    def test_notifies_requester_on_completion(self):
        from core.models import Notification

        job = ExportJob.objects.create(export_type='audit_logs', requested_by=self.admin)
        generate_export_job(job)

        self.assertTrue(
            Notification.objects.filter(recipient=self.admin, title='Export Ready').exists()
        )


class ExportJobApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.student = User.objects.create_user(username='stu1', password='pw', role='student')

    def test_student_cannot_create_export_job(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(CREATE_URL, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_creates_job_and_it_appears_in_their_list(self):
        self.client.force_authenticate(user=self.admin)

        create_response = self.client.post(CREATE_URL, {'search': '', 'action': 'all'}, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(create_response.data['status'], 'pending')
        job_id = create_response.data['id']

        list_response = self.client.get(CREATE_URL)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        ids = [j['id'] for j in list_response.data]
        self.assertIn(job_id, ids)

    def test_admin_only_sees_their_own_jobs(self):
        other_admin = User.objects.create_user(username='admin2', password='pw', role='admin')
        ExportJob.objects.create(export_type='audit_logs', requested_by=other_admin)

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(CREATE_URL)

        self.assertEqual(response.data, [])
