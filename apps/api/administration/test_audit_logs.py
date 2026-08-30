"""Tests for the Admin Audit Logs module: the merged event list
(AdminAuditLogsView), event detail (AdminAuditLogDetailView), retention
policy (AdminAuditLogRetentionView), and CSV export (AdminAuditLogExportView).

Covers real events from all four sources: user registrations, Question
creation, Evaluation submissions, and the administration.AuditLog table
that other admin views write to (bulk actions, notification sends, etc.)."""
from datetime import timedelta

from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, AdminSettings
from exams.models import (
    ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question,
    SubjectivePracticeSet, SubjectiveAttempt, SubjectiveAnswer, Evaluation,
)
from .models import AuditLog

LIST_URL = '/api/admin/audit-logs/'
RETENTION_URL = '/api/admin/audit-logs/retention/'
EXPORT_URL = '/api/admin/audit-logs/export/'


def detail_url(event_id):
    return f'/api/admin/audit-logs/{event_id}/'


class AuditLogTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.teacher = User.objects.create_user(
            username='teacher1', password='pw', role='teacher')
        self.student = User.objects.create_user(
            username='stu1', password='pw', role='student')

        category = ExamCategory.objects.create(name='Loksewa')
        exam = Exam.objects.create(category=category, name='Kharidar')
        paper = Paper.objects.create(exam=exam, name='First Paper')
        subject = Subject.objects.create(paper=paper, name='General Knowledge')
        chapter = Chapter.objects.create(subject=subject, title='Geography')
        self.topic = Topic.objects.create(chapter=chapter, name='Mountains')

    def make_question(self, created_by=None):
        return Question.objects.create(
            topic=self.topic, question_type='subjective', status='approved',
            text='Explain the significance of the Himalayas.',
            model_answer='Barrier effect.', marks=10, created_by=created_by,
        )

    def make_evaluation(self, evaluator=None, marks=8):
        question = self.make_question(created_by=self.teacher)
        practice_set = SubjectivePracticeSet.objects.create(
            title='GK Practice', exam=question.topic.chapter.subject.paper.exam,
            subject=question.topic.chapter.subject, topic=self.topic, status='published',
        )
        practice_set.questions.add(question)
        attempt = SubjectiveAttempt.objects.create(
            student=self.student, practice_set=practice_set, mode='practice',
            status='submitted', submitted_at=timezone.now(),
        )
        answer = SubjectiveAnswer.objects.create(
            attempt=attempt, question=question, answer_text='Barrier effect.',
            status='evaluated', submitted_at=timezone.now(), word_count=2,
        )
        return Evaluation.objects.create(answer=answer, evaluator=evaluator or self.admin, marks_obtained=marks)


class PermissionTests(AuditLogTestBase):
    def test_list_anonymous_rejected(self):
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_list_admin_allowed(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_200_OK)

    def test_retention_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get(RETENTION_URL).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.post(RETENTION_URL, {'retentionDays': 30}).status_code, status.HTTP_403_FORBIDDEN)

    def test_export_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get(EXPORT_URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_detail_anonymous_rejected(self):
        self.assertEqual(self.client.get(detail_url('user:1')).status_code, status.HTTP_401_UNAUTHORIZED)


class ListEventsTests(AuditLogTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def test_user_registration_event_present(self):
        response = self.client.get(LIST_URL)
        ids = [log['id'] for log in response.data['logs']]
        self.assertIn(f'user:{self.student.id}', ids)

    def test_content_created_event_present_with_real_creator(self):
        q = self.make_question(created_by=self.teacher)
        response = self.client.get(LIST_URL, {'action': 'content'})
        entry = next(log for log in response.data['logs'] if log['id'] == f'question:{q.id}')
        self.assertIn('teacher1', entry['user'])
        self.assertNotIn('Unknown', entry['user'])

    def test_content_created_shows_unknown_for_null_creator(self):
        q = self.make_question(created_by=None)
        response = self.client.get(LIST_URL, {'action': 'content'})
        entry = next(log for log in response.data['logs'] if log['id'] == f'question:{q.id}')
        self.assertEqual(entry['user'], 'Unknown')

    def test_evaluation_event_present(self):
        ev = self.make_evaluation()
        response = self.client.get(LIST_URL, {'action': 'evaluation'})
        ids = [log['id'] for log in response.data['logs']]
        self.assertIn(f'evaluation:{ev.id}', ids)

    def test_admin_action_event_present_from_real_auditlog_table(self):
        log = AuditLog.objects.create(
            actor=self.admin, action='BULK_DELETE', entity_type='Question', entity_id=None,
            details={'count': 3},
        )
        response = self.client.get(LIST_URL, {'action': 'admin'})
        ids = [entry['id'] for entry in response.data['logs']]
        self.assertIn(f'auditlog:{log.id}', ids)

    def test_admin_action_severity_warning_for_delete(self):
        log = AuditLog.objects.create(
            actor=self.admin, action='BULK_DELETE', entity_type='Question', entity_id=None, details={},
        )
        response = self.client.get(LIST_URL, {'action': 'admin'})
        entry = next(e for e in response.data['logs'] if e['id'] == f'auditlog:{log.id}')
        self.assertEqual(entry['severity'], 'warning')

    def test_admin_action_severity_info_for_non_destructive(self):
        log = AuditLog.objects.create(
            actor=self.admin, action='STUDENT_FEEDBACK_SENT', entity_type='StudentFeedback',
            entity_id='1', details={},
        )
        response = self.client.get(LIST_URL, {'action': 'admin'})
        entry = next(e for e in response.data['logs'] if e['id'] == f'auditlog:{log.id}')
        self.assertEqual(entry['severity'], 'info')

    def test_category_filter_excludes_other_categories(self):
        AuditLog.objects.create(actor=self.admin, action='BULK_DELETE', entity_type='Question', details={})
        response = self.client.get(LIST_URL, {'action': 'user'})
        for entry in response.data['logs']:
            self.assertEqual(entry['action'], 'user_registration')

    def test_category_totals_unaffected_by_category_filter(self):
        AuditLog.objects.create(actor=self.admin, action='BULK_DELETE', entity_type='Question', details={})
        all_response = self.client.get(LIST_URL, {'action': 'all'})
        user_only_response = self.client.get(LIST_URL, {'action': 'user'})
        self.assertEqual(all_response.data['categoryTotals'], user_only_response.data['categoryTotals'])
        self.assertGreaterEqual(all_response.data['categoryTotals']['admin'], 1)

    def test_search_matches_across_sources(self):
        AuditLog.objects.create(
            actor=self.admin, action='STUDENT_FEEDBACK_SENT', entity_type='StudentFeedback',
            entity_id='1', details={},
        )
        response = self.client.get(LIST_URL, {'search': 'admin1'})
        self.assertGreater(response.data['total'], 0)
        for entry in response.data['logs']:
            self.assertIn('admin1', (entry['user'] + entry['email']).lower())

    def test_pagination(self):
        for i in range(5):
            User.objects.create_user(username=f'bulk{i}', password='pw', role='student')
        response = self.client.get(LIST_URL, {'action': 'user', 'page': 1, 'page_size': 2})
        self.assertEqual(len(response.data['logs']), 2)
        self.assertGreaterEqual(response.data['totalPages'], 2)

    def test_empty_search_no_results(self):
        response = self.client.get(LIST_URL, {'search': 'no-such-user-xyz'})
        self.assertEqual(response.data['total'], 0)
        self.assertEqual(response.data['logs'], [])


class DetailTests(AuditLogTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def test_auditlog_detail(self):
        log = AuditLog.objects.create(
            actor=self.admin, action='BULK_DELETE', entity_type='Question', entity_id='7',
            details={'count': 3},
        )
        response = self.client.get(detail_url(f'auditlog:{log.id}'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['entityType'], 'Question')
        self.assertEqual(response.data['entityId'], '7')
        self.assertEqual(response.data['details'], {'count': 3})

    def test_user_detail(self):
        response = self.client.get(detail_url(f'user:{self.student.id}'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['entityType'], 'User')

    def test_question_detail(self):
        q = self.make_question(created_by=self.teacher)
        response = self.client.get(detail_url(f'question:{q.id}'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['actorName'], self.teacher.username)

    def test_evaluation_detail(self):
        ev = self.make_evaluation(marks=9)
        response = self.client.get(detail_url(f'evaluation:{ev.id}'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['details']['marksObtained'], 9)

    def test_unknown_id_404(self):
        response = self.client.get(detail_url('user:999999'))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_malformed_id_404(self):
        response = self.client.get(detail_url('not-a-real-id'))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unknown_source_404(self):
        response = self.client.get(detail_url('spaceship:1'))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class RetentionTests(AuditLogTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def test_get_default_retention(self):
        response = self.client.get(RETENTION_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['retentionDays'], 90)

    def test_save_persists_setting(self):
        response = self.client.post(RETENTION_URL, {'retentionDays': 30})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['retentionDays'], 30)
        self.assertEqual(AdminSettings.get_settings().audit_log_retention_days, 30)

    def test_save_rejects_invalid_value(self):
        response = self.client.post(RETENTION_URL, {'retentionDays': 'not-a-number'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_save_rejects_zero_or_negative(self):
        response = self.client.post(RETENTION_URL, {'retentionDays': 0})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_save_purges_old_auditlog_rows_only(self):
        old_log = AuditLog.objects.create(
            actor=self.admin, action='BULK_DELETE', entity_type='Question', details={},
        )
        AuditLog.objects.filter(pk=old_log.pk).update(
            timestamp=timezone.now() - timedelta(days=100))
        recent_log = AuditLog.objects.create(
            actor=self.admin, action='STUDENT_FEEDBACK_SENT', entity_type='StudentFeedback', details={},
        )

        response = self.client.post(RETENTION_URL, {'retentionDays': 90})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['purgedCount'], 1)
        self.assertFalse(AuditLog.objects.filter(pk=old_log.pk).exists())
        self.assertTrue(AuditLog.objects.filter(pk=recent_log.pk).exists())

    def test_save_never_deletes_users_questions_or_evaluations(self):
        q = self.make_question(created_by=self.teacher)
        Question.objects.filter(pk=q.pk).update(created_at=timezone.now() - timedelta(days=500))
        student_count_before = User.objects.count()

        self.client.post(RETENTION_URL, {'retentionDays': 1})

        self.assertTrue(Question.objects.filter(pk=q.pk).exists())
        self.assertEqual(User.objects.count(), student_count_before)

    def test_save_logs_its_own_audit_entry(self):
        self.client.post(RETENTION_URL, {'retentionDays': 30})
        self.assertTrue(
            AuditLog.objects.filter(action='AUDIT_RETENTION_POLICY_CHANGED', actor=self.admin).exists())


class ExportTests(AuditLogTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)

    def test_export_returns_csv(self):
        response = self.client.get(EXPORT_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
        content = response.content.decode('utf-8')
        self.assertIn('Timestamp,Action,User,Email,Details,Severity', content)

    def test_export_contains_real_row(self):
        response = self.client.get(EXPORT_URL)
        content = response.content.decode('utf-8')
        self.assertIn(self.student.username, content)

    def test_export_respects_category_filter(self):
        AuditLog.objects.create(actor=self.admin, action='BULK_DELETE', entity_type='Question', details={})
        response = self.client.get(EXPORT_URL, {'action': 'user'})
        content = response.content.decode('utf-8')
        self.assertNotIn('Bulk Delete', content)
