"""Tests for Admin Notifications: creation, audience fan-out, delivery and analytics."""
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from datetime import timedelta

from rest_framework import status
from rest_framework.test import APITestCase

from core.models import AdminNotification, Notification, User
from courses.models import Course, Enrollment

LIST_URL = '/api/admin/notifications/'
CREATE_URL = '/api/admin/notifications/create/'


class NotificationTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='nadmin', password='pw', role='admin', is_staff=True)
        self.teacher = User.objects.create_user(
            username='nteacher', password='pw', role='teacher')
        self.student_a = User.objects.create_user(
            username='studa', password='pw', role='student', email='a@example.com')
        self.student_b = User.objects.create_user(
            username='studb', password='pw', role='student', email='b@example.com')
        self.inactive_student = User.objects.create_user(
            username='studgone', password='pw', role='student', is_active=False)

        self.course = Course.objects.create(title='Kharidar Course')
        Enrollment.objects.create(student=self.student_a, course=self.course, status='active')
        Enrollment.objects.create(student=self.student_b, course=self.course, status='cancelled')

    def as_admin(self):
        self.client.force_authenticate(user=self.admin)

    def payload(self, **overrides):
        base = {
            'title': 'New Mock Exam Available',
            'content': 'A new mock exam has been published.',
            'type': 'announcement',
            'targetRole': 'students',
            'delivery': 'now',
        }
        base.update(overrides)
        return base


class PermissionTests(NotificationTestBase):
    def test_anonymous_rejected(self):
        self.assertEqual(self.client.get(LIST_URL).status_code,
                         status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post(CREATE_URL, self.payload(), format='json').status_code,
                         status.HTTP_401_UNAUTHORIZED)

    def test_student_rejected(self):
        self.client.force_authenticate(user=self.student_a)
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.post(CREATE_URL, self.payload(), format='json').status_code,
                         status.HTTP_403_FORBIDDEN)

    def test_teacher_rejected(self):
        self.client.force_authenticate(user=self.teacher)
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_allowed(self):
        self.as_admin()
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_200_OK)

    def test_no_sensitive_fields_in_response(self):
        self.as_admin()
        self.client.post(CREATE_URL, self.payload(), format='json')
        body = str(self.client.get(LIST_URL).data).lower()
        for leaked in ('password', 'token', 'secret'):
            self.assertNotIn(leaked, body)


class ValidationTests(NotificationTestBase):
    def test_missing_title_rejected(self):
        self.as_admin()
        res = self.client.post(CREATE_URL, self.payload(title=''), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', res.data['details'])

    def test_missing_message_rejected(self):
        self.as_admin()
        res = self.client.post(CREATE_URL, self.payload(content=''), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('content', res.data['details'])

    def test_invalid_type_rejected(self):
        self.as_admin()
        res = self.client.post(CREATE_URL, self.payload(type='telepathy'), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('type', res.data['details'])

    def test_invalid_audience_rejected(self):
        self.as_admin()
        res = self.client.post(CREATE_URL, self.payload(targetRole='martians'), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('targetRole', res.data['details'])

    def test_course_audience_without_course_rejected(self):
        self.as_admin()
        res = self.client.post(CREATE_URL, self.payload(targetRole='course'), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_individual_audience_without_recipients_rejected(self):
        self.as_admin()
        res = self.client.post(CREATE_URL, self.payload(targetRole='individual'), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nothing_is_persisted_when_validation_fails(self):
        self.as_admin()
        self.client.post(CREATE_URL, self.payload(title=''), format='json')
        self.assertEqual(AdminNotification.objects.count(), 0)
        self.assertEqual(Notification.objects.count(), 0)

    def test_schedule_requires_a_future_time(self):
        self.as_admin()
        past = (timezone.now() - timedelta(days=1)).isoformat()
        res = self.client.post(CREATE_URL, self.payload(
            delivery='schedule', scheduledFor=past), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('scheduledFor', res.data['details'])

    def test_send_now_to_an_empty_audience_is_refused(self):
        """Better to refuse than to record a 'sent' campaign nobody received."""
        User.objects.filter(role='teacher').delete()
        self.as_admin()
        res = self.client.post(CREATE_URL, self.payload(targetRole='teachers'), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AdminNotification.objects.count(), 0)


class DeliveryTests(NotificationTestBase):
    def test_send_now_creates_campaign_and_delivery_rows(self):
        self.as_admin()
        res = self.client.post(CREATE_URL, self.payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['status'], 'sent')
        self.assertEqual(res.data['delivered'], 2)   # two active students

        campaign = AdminNotification.objects.get(pk=res.data['id'])
        self.assertEqual(campaign.recipient_count, 2)
        self.assertIsNotNone(campaign.sent_at)

        # The per-recipient rows the Student Portal actually reads.
        self.assertEqual(Notification.objects.filter(
            source_admin_notification=campaign).count(), 2)

    def test_inactive_users_are_not_delivered_to(self):
        self.as_admin()
        self.client.post(CREATE_URL, self.payload(), format='json')
        recipients = set(Notification.objects.values_list('recipient__username', flat=True))
        self.assertEqual(recipients, {'studa', 'studb'})
        self.assertNotIn('studgone', recipients)

    def test_audience_students_excludes_staff(self):
        self.as_admin()
        self.client.post(CREATE_URL, self.payload(), format='json')
        roles = set(Notification.objects.values_list('recipient__role', flat=True))
        self.assertEqual(roles, {'student'})

    def test_course_audience_targets_active_enrollment_only(self):
        self.as_admin()
        res = self.client.post(CREATE_URL, self.payload(
            targetRole='course', courseId=self.course.id), format='json')
        self.assertEqual(res.data['delivered'], 1)
        recipient = Notification.objects.get().recipient
        self.assertEqual(recipient, self.student_a)   # student_b is cancelled

    def test_individual_audience(self):
        self.as_admin()
        res = self.client.post(CREATE_URL, self.payload(
            targetRole='individual', userIds=[self.student_b.id]), format='json')
        self.assertEqual(res.data['delivered'], 1)
        self.assertEqual(Notification.objects.get().recipient, self.student_b)

    def test_draft_is_stored_but_not_delivered(self):
        self.as_admin()
        res = self.client.post(CREATE_URL, self.payload(delivery='draft'), format='json')
        self.assertEqual(res.data['status'], 'draft')
        self.assertEqual(res.data['delivered'], 0)
        self.assertTrue(res.data['created'])
        self.assertEqual(Notification.objects.count(), 0)

    def test_scheduled_is_stored_but_not_delivered(self):
        self.as_admin()
        future = (timezone.now() + timedelta(days=2)).isoformat()
        res = self.client.post(CREATE_URL, self.payload(
            delivery='schedule', scheduledFor=future), format='json')
        self.assertEqual(res.data['status'], 'scheduled')
        self.assertEqual(res.data['delivered'], 0)
        # Crucially: nothing has been sent to anyone yet.
        self.assertEqual(Notification.objects.count(), 0)
        self.assertIsNone(AdminNotification.objects.get().sent_at)

    def test_content_reaches_the_students_own_feed(self):
        """The admin→student path, through the canonical notification table."""
        self.as_admin()
        self.client.post(CREATE_URL, self.payload(), format='json')

        self.client.force_authenticate(user=self.student_a)
        res = self.client.get('/api/notifications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = str(res.data)
        self.assertIn('New Mock Exam Available', body)

    def test_a_student_only_sees_their_own_notification(self):
        self.as_admin()
        self.client.post(CREATE_URL, self.payload(
            targetRole='individual', userIds=[self.student_a.id]), format='json')

        self.client.force_authenticate(user=self.student_b)
        res = self.client.get('/api/notifications/')
        self.assertNotIn('New Mock Exam Available', str(res.data))


class SendAndCancelTests(NotificationTestBase):
    def test_sending_a_draft_delivers_it(self):
        self.as_admin()
        created = self.client.post(CREATE_URL, self.payload(delivery='draft'), format='json')
        nid = created.data['id']
        self.assertEqual(Notification.objects.count(), 0)

        res = self.client.post(f'/api/admin/notifications/{nid}/send/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'sent')
        self.assertEqual(res.data['delivered'], 2)
        self.assertEqual(Notification.objects.count(), 2)

    def test_resending_does_not_duplicate_rows(self):
        self.as_admin()
        nid = self.client.post(CREATE_URL, self.payload(), format='json').data['id']
        res = self.client.post(f'/api/admin/notifications/{nid}/send/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Notification.objects.count(), 2)

    def test_cancelling_a_scheduled_notification_returns_it_to_draft(self):
        self.as_admin()
        future = (timezone.now() + timedelta(days=2)).isoformat()
        nid = self.client.post(CREATE_URL, self.payload(
            delivery='schedule', scheduledFor=future), format='json').data['id']

        res = self.client.post(f'/api/admin/notifications/{nid}/cancel/')
        self.assertEqual(res.data['status'], 'draft')
        self.assertIsNone(AdminNotification.objects.get(pk=nid).scheduled_for)

    def test_cannot_cancel_a_sent_notification(self):
        self.as_admin()
        nid = self.client.post(CREATE_URL, self.payload(), format='json').data['id']
        self.assertEqual(
            self.client.post(f'/api/admin/notifications/{nid}/cancel/').status_code,
            status.HTTP_400_BAD_REQUEST)

    def test_sent_notification_cannot_be_deleted(self):
        """Students already have it; deleting the campaign would rewrite history."""
        self.as_admin()
        nid = self.client.post(CREATE_URL, self.payload(), format='json').data['id']
        res = self.client.delete(f'/api/admin/notifications/{nid}/delete/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(AdminNotification.objects.filter(pk=nid).exists())

    def test_draft_can_be_deleted(self):
        self.as_admin()
        nid = self.client.post(CREATE_URL, self.payload(delivery='draft'), format='json').data['id']
        res = self.client.delete(f'/api/admin/notifications/{nid}/delete/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(AdminNotification.objects.filter(pk=nid).exists())


class AnalyticsTests(NotificationTestBase):
    def test_read_counts_come_from_delivery_rows(self):
        self.as_admin()
        nid = self.client.post(CREATE_URL, self.payload(), format='json').data['id']

        # One student reads it.
        delivery = Notification.objects.filter(recipient=self.student_a).first()
        delivery.is_read = True
        delivery.save(update_fields=['is_read'])

        detail = self.client.get(f'/api/admin/notifications/{nid}/')
        self.assertEqual(detail.data['recipient_count'], 2)
        self.assertEqual(detail.data['read_count'], 1)
        self.assertEqual(detail.data['unread_count'], 1)
        self.assertEqual(detail.data['read_rate'], 50.0)

    def test_list_reports_read_counts(self):
        self.as_admin()
        self.client.post(CREATE_URL, self.payload(), format='json')
        row = self.client.get(LIST_URL).data['notifications'][0]
        self.assertEqual(row['recipientCount'], 2)
        self.assertEqual(row['readCount'], 0)
        self.assertEqual(row['unreadCount'], 2)

    def test_detail_404_for_missing_notification(self):
        self.as_admin()
        self.assertEqual(self.client.get('/api/admin/notifications/999999/').status_code,
                         status.HTTP_404_NOT_FOUND)


class ListFilterTests(NotificationTestBase):
    def test_empty_database_returns_valid_empty_response(self):
        self.as_admin()
        res = self.client.get(LIST_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total'], 0)
        self.assertEqual(res.data['notifications'], [])

    def test_pagination(self):
        self.as_admin()
        for i in range(7):
            self.client.post(CREATE_URL, self.payload(
                title=f'Notice {i}', delivery='draft'), format='json')
        p1 = self.client.get(LIST_URL, {'page_size': 3, 'page': 1})
        p2 = self.client.get(LIST_URL, {'page_size': 3, 'page': 2})
        self.assertEqual(p1.data['total'], 7)
        self.assertEqual(len(p1.data['notifications']), 3)
        ids1 = {n['id'] for n in p1.data['notifications']}
        ids2 = {n['id'] for n in p2.data['notifications']}
        self.assertEqual(ids1 & ids2, set())

    def test_search_matches_title_and_body(self):
        self.as_admin()
        self.client.post(CREATE_URL, self.payload(title='Scholarship news', delivery='draft'), format='json')
        self.client.post(CREATE_URL, self.payload(title='Exam reminder', delivery='draft'), format='json')
        self.assertEqual(self.client.get(LIST_URL, {'search': 'Scholarship'}).data['total'], 1)

    def test_status_and_audience_filters(self):
        self.as_admin()
        self.client.post(CREATE_URL, self.payload(delivery='draft'), format='json')
        self.client.post(CREATE_URL, self.payload(targetRole='teachers'), format='json')

        self.assertEqual(self.client.get(LIST_URL, {'status': 'draft'}).data['total'], 1)
        self.assertEqual(self.client.get(LIST_URL, {'status': 'sent'}).data['total'], 1)
        self.assertEqual(self.client.get(LIST_URL, {'audience': 'teachers'}).data['total'], 1)


class QueryCountTests(NotificationTestBase):
    def test_list_query_count_is_flat(self):
        self.as_admin()
        for i in range(2):
            self.client.post(CREATE_URL, self.payload(title=f'A{i}', delivery='draft'), format='json')
        with CaptureQueriesContext(connection) as few:
            self.client.get(LIST_URL, {'page_size': 50})

        for i in range(10):
            self.client.post(CREATE_URL, self.payload(title=f'B{i}', delivery='draft'), format='json')
        with CaptureQueriesContext(connection) as many:
            self.client.get(LIST_URL, {'page_size': 50})

        self.assertEqual(
            len(few.captured_queries), len(many.captured_queries),
            f'queries grew {len(few.captured_queries)} -> {len(many.captured_queries)}')

    def test_fan_out_uses_bulk_insert(self):
        """Delivering to many students must not mean one INSERT per student."""
        for i in range(30):
            User.objects.create_user(username=f'bulk{i}', password='pw', role='student')
        self.as_admin()
        with CaptureQueriesContext(connection) as ctx:
            res = self.client.post(CREATE_URL, self.payload(), format='json')
        self.assertEqual(res.data['delivered'], 32)
        inserts = [q for q in ctx.captured_queries
                   if q['sql'].lower().startswith('insert into "core_notification"')]
        self.assertLessEqual(len(inserts), 2, f'expected a bulk insert, saw {len(inserts)}')
