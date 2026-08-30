"""Covers dispatch_due_scheduled_notifications() - the periodic job that
finally delivers AdminNotification campaigns admins scheduled for later.
Before this, "Schedule" only ever stored status='scheduled' + scheduled_for;
nothing ever came back to actually send it."""
from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from core.models import User, AdminNotification, Notification
from core.notification_service import dispatch_due_scheduled_notifications


class DispatchScheduledNotificationsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')
        self.student = User.objects.create_user(
            username='stud1', email='stud1@test.com', password='pass123', role='student')

    def test_dispatches_due_notification(self):
        notif = AdminNotification.objects.create(
            title='Due Now', content='This is due.', type='announcement',
            target_role='all', status='scheduled',
            scheduled_for=timezone.now() - timedelta(minutes=1),
        )

        results = dispatch_due_scheduled_notifications()

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], notif.id)
        notif.refresh_from_db()
        self.assertEqual(notif.status, 'sent')
        self.assertIsNotNone(notif.sent_at)
        self.assertTrue(
            Notification.objects.filter(source_admin_notification=notif, recipient=self.admin).exists()
        )
        self.assertTrue(
            Notification.objects.filter(source_admin_notification=notif, recipient=self.student).exists()
        )

    def test_does_not_dispatch_future_notification(self):
        notif = AdminNotification.objects.create(
            title='Not Yet', content='Later.', type='announcement',
            target_role='all', status='scheduled',
            scheduled_for=timezone.now() + timedelta(hours=1),
        )

        results = dispatch_due_scheduled_notifications()

        self.assertEqual(results, [])
        notif.refresh_from_db()
        self.assertEqual(notif.status, 'scheduled')

    def test_does_not_redispatch_already_sent(self):
        notif = AdminNotification.objects.create(
            title='Already Sent', content='x', type='announcement',
            target_role='all', status='sent',
            scheduled_for=timezone.now() - timedelta(minutes=1),
            sent_at=timezone.now() - timedelta(minutes=1),
        )

        results = dispatch_due_scheduled_notifications()

        self.assertEqual(results, [])
        self.assertFalse(Notification.objects.filter(source_admin_notification=notif).exists())

    def test_draft_notification_is_never_dispatched_even_with_past_scheduled_for(self):
        AdminNotification.objects.create(
            title='Draft', content='x', type='announcement',
            target_role='all', status='draft',
            scheduled_for=timezone.now() - timedelta(minutes=1),
        )

        results = dispatch_due_scheduled_notifications()

        self.assertEqual(results, [])
