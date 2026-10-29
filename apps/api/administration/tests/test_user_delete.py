from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from administration.models import AuditLog
from administration.user_delete_service import fast_delete_user
from support.models import StudentProfile, NotificationPreference

User = get_user_model()


class UserDeleteTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin_test',
            email='admin_test@test.com',
            password='password123',
            role='admin',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        self.student = User.objects.create_user(
            username='student_to_delete',
            email='student_delete@test.com',
            password='password123',
            role='student',
        )
        StudentProfile.objects.create(user=self.student, phone='9812345678')
        NotificationPreference.objects.create(user=self.student)

    def test_fast_delete_user_direct(self):
        user_id = self.student.id
        fast_delete_user(self.student)
        self.assertFalse(User.objects.filter(id=user_id).exists())

    def test_admin_delete_user_api(self):
        user_id = self.student.id
        url = f'/api/admin/users/{user_id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=user_id).exists())

        # Verify audit log was created
        log = AuditLog.objects.filter(action='DELETE_USER', entity_id=str(user_id)).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.details.get('username'), 'student_to_delete')

    def test_cannot_delete_self(self):
        url = f'/api/admin/users/{self.admin.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(id=self.admin.id).exists())
