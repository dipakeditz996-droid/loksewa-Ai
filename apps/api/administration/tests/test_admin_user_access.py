from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import User
from support.models import StudentProfile
from administration.models import AuditLog


class AdminUserAccessTests(APITestCase):
    def setUp(self):
        self.super_admin = User.objects.create_user(
            username='super', password='pw', role='super-admin', is_staff=True
        )
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True
        )
        self.teacher = User.objects.create_user(
            username='teach1', password='pw', role='teacher'
        )
        self.student = User.objects.create_user(
            username='stud1', password='pw', role='student'
        )
        # Some student profiles might not exist, ensure one exists
        self.profile = StudentProfile.objects.create(
            user=self.student, access_origin='SELF_REGISTERED'
        )

        self.url = f'/api/admin/users/{self.student.id}/access/'

    def test_unauthorized_user_cannot_grant_access(self):
        self.client.force_authenticate(self.student)
        resp = self.client.post(self.url, {'note': 'Plz'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.teacher)
        resp = self.client.post(self.url, {'note': 'Plz'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.access_origin, 'SELF_REGISTERED')

    def test_admin_can_grant_access_with_expiry(self):
        self.client.force_authenticate(self.admin)
        expiry = (timezone.now() + timedelta(days=30)).isoformat()
        resp = self.client.post(self.url, {
            'expiry': expiry,
            'note': 'Granted for scholarship'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.access_origin, 'ADMIN_GRANTED')
        self.assertEqual(self.profile.admin_access_note, 'Granted for scholarship')
        self.assertEqual(self.profile.admin_granted_by, self.admin)
        self.assertIsNotNone(self.profile.admin_granted_at)
        self.assertIsNotNone(self.profile.admin_access_expiry)

        audit = AuditLog.objects.filter(action='ADMIN_GRANTED_ACCESS').first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.entity_id, str(self.student.id))

    def test_admin_can_revoke_access(self):
        # Setup pre-existing grant
        self.profile.access_origin = 'ADMIN_GRANTED'
        self.profile.admin_access_note = 'Temporary'
        self.profile.admin_granted_by = self.admin
        self.profile.admin_granted_at = timezone.now()
        self.profile.save()

        self.client.force_authenticate(self.admin)
        resp = self.client.delete(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.access_origin, 'SELF_REGISTERED')
        self.assertIsNone(self.profile.admin_access_expiry)
        self.assertEqual(self.profile.admin_access_note, '')
        self.assertIsNone(self.profile.admin_granted_by)
        self.assertIsNone(self.profile.admin_granted_at)

        audit = AuditLog.objects.filter(action='ADMIN_REVOKED_ACCESS').first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.entity_id, str(self.student.id))
