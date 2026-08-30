"""Tests for the Admin AI Tutor endpoints: overview, provider status,
conversation list/detail, and usage analytics."""
from datetime import timedelta

from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from ai_tutor.models import Conversation, Message, TutorUsage

OVERVIEW_URL = '/api/admin/ai-tutor/'
PROVIDER_STATUS_URL = '/api/admin/ai-tutor/provider-status/'
CONVERSATIONS_URL = '/api/admin/ai-tutor/conversations/'
USAGE_URL = '/api/admin/ai-tutor/usage/'


def conversation_detail_url(pk):
    return f'/api/admin/ai-tutor/conversations/{pk}/'


class AITutorAdminTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.superadmin = User.objects.create_user(
            username='super1', password='pw', role='super-admin', is_staff=True)
        self.teacher = User.objects.create_user(
            username='teach1', password='pw', role='teacher')
        self.student = User.objects.create_user(
            username='stu1', password='pw', role='student', email='stu1@example.com')

    def as_admin(self):
        self.client.force_authenticate(user=self.admin)

    def make_conversation(self, student=None, mode='EXPLAIN', title='Chat'):
        return Conversation.objects.create(
            student=student or self.student, mode=mode, title=title,
        )


class PermissionTests(AITutorAdminTestBase):
    """Every new endpoint must reject anonymous/student/teacher and allow admin."""

    def _assert_locked_down(self, url):
        self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.teacher)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)

    def test_overview_permissions(self):
        self._assert_locked_down(OVERVIEW_URL)

    def test_provider_status_permissions(self):
        self._assert_locked_down(PROVIDER_STATUS_URL)

    def test_conversations_list_permissions(self):
        self._assert_locked_down(CONVERSATIONS_URL)

    def test_usage_permissions(self):
        self._assert_locked_down(USAGE_URL)

    def test_conversation_detail_permissions(self):
        conv = self.make_conversation()
        url = conversation_detail_url(conv.id)
        self._assert_locked_down(url)

    def test_super_admin_allowed_on_overview(self):
        self.client.force_authenticate(user=self.superadmin)
        self.assertEqual(self.client.get(OVERVIEW_URL).status_code, status.HTTP_200_OK)

    def test_student_cannot_read_another_students_conversation(self):
        conv = self.make_conversation()
        self.client.force_authenticate(user=self.student)
        resp = self.client.get(conversation_detail_url(conv.id))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class OverviewTests(AITutorAdminTestBase):
    def test_empty_database_returns_zeros(self):
        self.as_admin()
        resp = self.client.get(OVERVIEW_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['totalSessions'], 0)
        self.assertEqual(resp.data['activeStudents'], 0)
        self.assertEqual(resp.data['totalQuestions'], 0)
        self.assertEqual(resp.data['topModes'], [])

    def test_counts_reflect_real_data(self):
        conv1 = self.make_conversation(mode='EXPLAIN')
        conv2 = self.make_conversation(mode='PRACTICE')
        Message.objects.create(conversation=conv1, role='user', content='hi')
        Message.objects.create(conversation=conv1, role='assistant', content='hello')
        Message.objects.create(conversation=conv2, role='user', content='q2')

        self.as_admin()
        resp = self.client.get(OVERVIEW_URL)
        self.assertEqual(resp.data['totalSessions'], 2)
        self.assertEqual(resp.data['activeStudents'], 1)  # both convs same student
        # Only 'user' role messages count as questions asked.
        self.assertEqual(resp.data['totalQuestions'], 2)

    def test_no_sensitive_data_leaked(self):
        self.as_admin()
        resp = self.client.get(OVERVIEW_URL)
        body = str(resp.data)
        self.assertNotIn('GEMINI', body.upper())
        self.assertNotIn('password', body.lower())


class ProviderStatusTests(AITutorAdminTestBase):
    def test_not_configured_when_no_api_key(self):
        import os
        old = os.environ.pop('GEMINI_API_KEY', None)
        try:
            self.as_admin()
            resp = self.client.get(PROVIDER_STATUS_URL)
            self.assertEqual(resp.data['status'], 'not_configured')
        finally:
            if old is not None:
                os.environ['GEMINI_API_KEY'] = old

    def test_configured_when_api_key_present(self):
        import os
        old = os.environ.get('GEMINI_API_KEY')
        os.environ['GEMINI_API_KEY'] = 'fake-key-for-test'
        try:
            self.as_admin()
            resp = self.client.get(PROVIDER_STATUS_URL)
            self.assertEqual(resp.data['status'], 'configured')
        finally:
            if old is None:
                os.environ.pop('GEMINI_API_KEY', None)
            else:
                os.environ['GEMINI_API_KEY'] = old

    def test_never_exposes_the_actual_key(self):
        import os
        os.environ['GEMINI_API_KEY'] = 'super-secret-value-12345'
        try:
            self.as_admin()
            resp = self.client.get(PROVIDER_STATUS_URL)
            self.assertNotIn('super-secret-value-12345', str(resp.data))
        finally:
            os.environ.pop('GEMINI_API_KEY', None)


class ConversationListTests(AITutorAdminTestBase):
    def test_empty_state(self):
        self.as_admin()
        resp = self.client.get(CONVERSATIONS_URL)
        self.assertEqual(resp.data['total'], 0)
        self.assertEqual(resp.data['conversations'], [])

    def test_lists_real_conversations_with_message_count(self):
        conv = self.make_conversation(title='Algebra help')
        Message.objects.create(conversation=conv, role='user', content='hi')
        Message.objects.create(conversation=conv, role='assistant', content='hello')

        self.as_admin()
        resp = self.client.get(CONVERSATIONS_URL)
        self.assertEqual(resp.data['total'], 1)
        row = resp.data['conversations'][0]
        self.assertEqual(row['title'], 'Algebra help')
        self.assertEqual(row['messageCount'], 2)
        self.assertEqual(row['student']['email'], 'stu1@example.com')

    def test_search_by_student_name(self):
        other = User.objects.create_user(username='findme', password='pw', role='student')
        self.make_conversation(student=other, title='Other chat')
        self.make_conversation(student=self.student, title='Mine')

        self.as_admin()
        resp = self.client.get(CONVERSATIONS_URL, {'search': 'findme'})
        self.assertEqual(resp.data['total'], 1)
        self.assertEqual(resp.data['conversations'][0]['title'], 'Other chat')

    def test_filter_by_mode(self):
        self.make_conversation(mode='EXPLAIN')
        self.make_conversation(mode='PRACTICE')

        self.as_admin()
        resp = self.client.get(CONVERSATIONS_URL, {'mode': 'PRACTICE'})
        self.assertEqual(resp.data['total'], 1)
        self.assertEqual(resp.data['conversations'][0]['mode'], 'PRACTICE')

    def test_pagination(self):
        for i in range(5):
            self.make_conversation(title=f'Chat {i}')

        self.as_admin()
        resp = self.client.get(CONVERSATIONS_URL, {'page': 1, 'page_size': 2})
        self.assertEqual(resp.data['total'], 5)
        self.assertEqual(len(resp.data['conversations']), 2)
        self.assertEqual(resp.data['totalPages'], 3)

    def test_no_query_explosion_for_message_counts(self):
        """message_count must come from annotate(), not a per-row query."""
        for i in range(10):
            conv = self.make_conversation(title=f'Chat {i}')
            Message.objects.create(conversation=conv, role='user', content='x')

        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        self.as_admin()
        with CaptureQueriesContext(connection) as ctx:
            resp = self.client.get(CONVERSATIONS_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # One count query + one select query (+ auth queries) - not 10+ per-row queries.
        self.assertLess(len(ctx.captured_queries), 10)


class ConversationDetailTests(AITutorAdminTestBase):
    def test_returns_full_transcript(self):
        conv = self.make_conversation(title='Physics')
        Message.objects.create(conversation=conv, role='user', content='What is gravity?')
        Message.objects.create(conversation=conv, role='assistant', content='A force...')

        self.as_admin()
        resp = self.client.get(conversation_detail_url(conv.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['title'], 'Physics')
        self.assertEqual(len(resp.data['messages']), 2)
        self.assertEqual(resp.data['messages'][0]['role'], 'user')
        self.assertEqual(resp.data['messages'][0]['content'], 'What is gravity?')

    def test_404_for_missing_conversation(self):
        self.as_admin()
        resp = self.client.get(conversation_detail_url(999999))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_conversation_with_no_messages_returns_empty_list_not_fabricated(self):
        conv = self.make_conversation()
        self.as_admin()
        resp = self.client.get(conversation_detail_url(conv.id))
        self.assertEqual(resp.data['messages'], [])


class UsageTests(AITutorAdminTestBase):
    def test_empty_state_returns_zeros(self):
        self.as_admin()
        resp = self.client.get(USAGE_URL)
        self.assertEqual(resp.data['totalRequests'], 0)
        self.assertEqual(resp.data['totalTokens'], 0)
        self.assertEqual(resp.data['topStudents'], [])

    def test_trend_fills_missing_days_with_zero(self):
        self.as_admin()
        resp = self.client.get(USAGE_URL, {'days': 7})
        self.assertEqual(len(resp.data['trend']), 7)
        self.assertTrue(all(d['requests'] == 0 for d in resp.data['trend']))

    def test_real_usage_aggregation(self):
        TutorUsage.objects.create(student=self.student, request_count=5, token_usage=1200)

        self.as_admin()
        resp = self.client.get(USAGE_URL)
        self.assertEqual(resp.data['totalRequests'], 5)
        self.assertEqual(resp.data['totalTokens'], 1200)
        self.assertEqual(len(resp.data['topStudents']), 1)
        self.assertEqual(resp.data['topStudents'][0]['requests'], 5)
        self.assertEqual(resp.data['topStudents'][0]['tokens'], 1200)

    def test_days_param_is_capped(self):
        self.as_admin()
        resp = self.client.get(USAGE_URL, {'days': 999})
        self.assertLessEqual(len(resp.data['trend']), 90)
