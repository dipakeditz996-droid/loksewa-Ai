"""Tests for the AI Tutor's admin-configurable enable flag and daily message limit."""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, AdminSettings
from .models import Conversation, TutorUsage


class AITutorConfigEnforcementTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='stu1', password='pw', role='student')
        self.client.force_authenticate(user=self.student)

    def test_conversation_creation_blocked_when_disabled(self):
        settings = AdminSettings.get_settings()
        settings.enable_ai_tutor = False
        settings.save()

        resp = self.client.post('/api/tutor/conversations/', {'mode': 'EXPLAIN'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Conversation.objects.count(), 0)

    def test_conversation_creation_allowed_when_enabled(self):
        settings = AdminSettings.get_settings()
        settings.enable_ai_tutor = True
        settings.save()

        resp = self.client.post('/api/tutor/conversations/', {'mode': 'EXPLAIN'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_send_message_blocked_when_disabled(self):
        conv = Conversation.objects.create(student=self.student, mode='EXPLAIN')
        settings = AdminSettings.get_settings()
        settings.enable_ai_tutor = False
        settings.save()

        resp = self.client.post(f'/api/tutor/conversations/{conv.id}/send/', {'content': 'hi'})
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_send_message_respects_configurable_daily_limit(self):
        conv = Conversation.objects.create(student=self.student, mode='EXPLAIN')
        settings = AdminSettings.get_settings()
        settings.ai_tutor_daily_message_limit = 2
        settings.save()

        import datetime
        TutorUsage.objects.create(
            student=self.student, date=datetime.date.today(), request_count=2)

        resp = self.client.post(f'/api/tutor/conversations/{conv.id}/send/', {'content': 'hi'})
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_default_daily_limit_is_twenty(self):
        settings = AdminSettings.get_settings()
        self.assertEqual(settings.ai_tutor_daily_message_limit, 20)
