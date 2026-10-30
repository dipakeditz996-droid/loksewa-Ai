from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from core.models import AdminEmailRecipient, EmailDeliveryLog, AdminSettings, Notification
from core.email_notification_service import EmailNotificationService, process_email_delivery
from core.notification_service import NotificationService
from support.models import NotificationPreference
from administration.models import AuditLog

User = get_user_model()


class DualNotificationPreferenceSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_boss',
            email='admin@loksewa.ai',
            password='Password123!',
            role='admin',
            is_staff=True,
        )
        self.student_a = User.objects.create_user(
            username='student_alpha',
            email='alpha@student.com',
            password='Password123!',
            role='student',
        )
        self.student_b = User.objects.create_user(
            username='student_beta',
            email='beta@student.com',
            password='Password123!',
            role='student',
        )
        self.settings = AdminSettings.get_settings()
        self.settings.notifications_enabled = True
        self.settings.enable_email_notifications = True
        self.settings.enable_in_app_notifications = True
        self.settings.save()

    # 1. Student Isolation
    def test_student_isolation(self):
        """Student A cannot access or modify Student B's preferences.
        Preferences are strictly tied to authenticated request.user.
        """
        self.client.force_authenticate(user=self.student_a)
        res = self.client.get('/api/support/notification-preferences/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Updates Student A
        res_patch = self.client.patch('/api/support/notification-preferences/', {
            'exam_reminders_email': False,
        }, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)

        pref_a = NotificationPreference.objects.get(user=self.student_a)
        self.assertFalse(pref_a.exam_reminders_email)

        # Student B's preference is untouched
        pref_b, _ = NotificationPreference.objects.get_or_create(user=self.student_b)
        self.assertTrue(pref_b.exam_reminders_email)

    # 2. Admin Authorization
    def test_admin_authorization(self):
        """Students and unauthenticated users cannot access administrative notification settings."""
        # Unauthenticated
        res_anon = self.client.get('/api/admin/notification-events/')
        self.assertEqual(res_anon.status_code, status.HTTP_401_UNAUTHORIZED)

        # Student
        self.client.force_authenticate(user=self.student_a)
        res_stu = self.client.get('/api/admin/notification-events/')
        self.assertEqual(res_stu.status_code, status.HTTP_403_FORBIDDEN)

        res_rec = self.client.get('/api/admin/email-recipients/')
        self.assertEqual(res_rec.status_code, status.HTTP_403_FORBIDDEN)

        # Admin
        self.client.force_authenticate(user=self.admin)
        res_admin = self.client.get('/api/admin/notification-events/')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        self.assertIn('categories', res_admin.data)

    # 3. Dual-Channel Independence
    @patch('core.email_notification_service._deliver_transport_email')
    def test_dual_channel_independence(self, mock_transport):
        """Disabling email does NOT suppress in-app notifications.
        Disabling in-app does NOT suppress email notifications.
        """
        pref, _ = NotificationPreference.objects.get_or_create(user=self.student_a)
        pref.payment_submission_email = False
        pref.payment_submission_inapp = True
        pref.save()

        # Dispatch student payment submitted
        NotificationService.notify_student_payment_submitted(
            student=self.student_a,
            title_ref='PSC Kharidar Prep Pack',
            amount=2500,
        )

        # In-app notification MUST be created
        self.assertTrue(
            Notification.objects.filter(recipient=self.student_a, type='payment').exists()
        )
        # Email MUST be suppressed because payment_submission_email=False
        self.assertFalse(
            EmailDeliveryLog.objects.filter(recipient_email=self.student_a.email, event_category='payment').exists()
        )

        # Now test opposite: in-app disabled, email enabled
        Notification.objects.filter(recipient=self.student_a).delete()
        EmailDeliveryLog.objects.filter(recipient_email=self.student_a.email).delete()

        pref.payment_submission_email = True
        pref.payment_submission_inapp = False
        pref.save()

        NotificationService.notify_student_payment_submitted(
            student=self.student_a,
            title_ref='PSC Kharidar Prep Pack',
            amount=2500,
        )

        # In-app MUST NOT be created
        self.assertFalse(
            Notification.objects.filter(recipient=self.student_a, type='payment').exists()
        )
        # Email MUST be created and delivered
        self.assertTrue(
            EmailDeliveryLog.objects.filter(recipient_email=self.student_a.email, event_category='payment').exists()
        )

    # 4. Mandatory Notification Enforcement
    @patch('core.email_notification_service._deliver_transport_email')
    def test_mandatory_notification_enforcement(self, mock_transport):
        """Critical security notifications and OTPs cannot be disabled by students
        and are always delivered via email and in-app.
        """
        self.client.force_authenticate(user=self.student_a)
        # Student attempts to turn off security alerts
        res = self.client.patch('/api/support/notification-preferences/', {
            'security_alerts_email': False,
            'security_alerts_inapp': False,
            'security_alerts': False,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        pref = NotificationPreference.objects.get(user=self.student_a)
        # Server-side enforcement guarantees they stay True
        self.assertTrue(pref.security_alerts_email)
        self.assertTrue(pref.security_alerts_inapp)

        # Mandatory email dispatch must succeed
        log = EmailNotificationService.send_student_welcome_email(self.student_a)
        self.assertIsNotNone(log)
        self.assertEqual(log.status, 'sent')

    # 5. Admin Granular Event & Category Controls
    @patch('core.email_notification_service._deliver_transport_email')
    def test_admin_granular_event_controls(self, mock_transport):
        """Admin toggling category or event off stops administrative email dispatch."""
        self.client.force_authenticate(user=self.admin)
        AdminEmailRecipient.objects.create(
            email='ops@loksewa.ai',
            name='Ops Lead',
            is_active=True,
            event_categories=['payment', 'marketplace'],
        )

        # 1. Global category toggle off for 'payment'
        res = self.client.patch('/api/admin/notification-events/', {
            'events': {'category:payment': False},
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        logs = EmailNotificationService.notify_admins(
            category='payment',
            subject='Manual Payment Proof Uploaded',
            headline='New Payment',
            content_html='<p>Review required</p>',
            content_text='Review required',
            event_key='payment_submitted',
        )
        self.assertEqual(logs, [])  # Skipped because category:payment is False

        # 2. Re-enable category, but disable specific event 'payment_submitted'
        self.client.patch('/api/admin/notification-events/', {
            'events': {'category:payment': True, 'payment_submitted': False},
        }, format='json')

        logs_event_off = EmailNotificationService.notify_admins(
            category='payment',
            subject='Manual Payment Proof Uploaded',
            headline='New Payment',
            content_html='<p>Review required</p>',
            content_text='Review required',
            event_key='payment_submitted',
        )
        self.assertEqual(logs_event_off, [])  # Skipped because payment_submitted is False

        # Other events in same category still dispatch
        logs_other = EmailNotificationService.notify_admins(
            category='payment',
            subject='Payment Approved Notice',
            headline='Payment Approved',
            content_html='<p>Enrolled</p>',
            content_text='Enrolled',
            event_key='payment_approved',
        )
        self.assertEqual(len(logs_other), 1)
        self.assertEqual(logs_other[0].recipient_email, 'ops@loksewa.ai')

    # 6. Multiple Admin Recipients with Granular Event Filtering
    @patch('core.email_notification_service._deliver_transport_email')
    def test_multiple_admin_recipients_and_event_filtering(self, mock_transport):
        """Recipients only receive notifications for their assigned categories and subscribed events."""
        # Recipient 1: All marketplace events
        r1 = AdminEmailRecipient.objects.create(
            email='market_lead@loksewa.ai',
            name='Market Lead',
            is_active=True,
            event_categories=['marketplace'],
            subscribed_events=[],
        )
        # Recipient 2: Only 'cod_advance_submitted' event
        r2 = AdminEmailRecipient.objects.create(
            email='finance@loksewa.ai',
            name='Finance',
            is_active=True,
            event_categories=['marketplace'],
            subscribed_events=['cod_advance_submitted'],
        )

        # Case A: new_order_placed event
        logs_order = EmailNotificationService.notify_admins(
            category='marketplace',
            subject='New Book Order',
            headline='Order Placed',
            content_html='<p>Book order #123</p>',
            content_text='Book order #123',
            event_key='new_order_placed',
        )
        recipients_received = [l.recipient_email for l in logs_order]
        self.assertIn('market_lead@loksewa.ai', recipients_received)
        self.assertNotIn('finance@loksewa.ai', recipients_received)  # Finance only subscribed to COD

        # Case B: cod_advance_submitted event
        logs_cod = EmailNotificationService.notify_admins(
            category='marketplace',
            subject='COD Advance Payment Uploaded',
            headline='COD Advance',
            content_html='<p>Advance deposit</p>',
            content_text='Advance deposit',
            event_key='cod_advance_submitted',
        )
        recipients_cod = [l.recipient_email for l in logs_cod]
        self.assertIn('market_lead@loksewa.ai', recipients_cod)
        self.assertIn('finance@loksewa.ai', recipients_cod)

    # 7. Audit Logging for Admin Configuration Changes
    def test_audit_logging_for_admin_configuration_changes(self):
        """Admin changes to recipients and event toggles generate AuditLog records."""
        self.client.force_authenticate(user=self.admin)
        # Create recipient
        res_create = self.client.post('/api/admin/email-recipients/', {
            'email': 'audited@loksewa.ai',
            'name': 'Audited Staff',
            'event_categories': ['security'],
        }, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        rec_id = res_create.data['id']

        self.assertTrue(
            AuditLog.objects.filter(
                actor=self.admin, action='ADMIN_EMAIL_RECIPIENT_CREATED', entity_id=str(rec_id)
            ).exists()
        )

        # Update event rules
        res_patch = self.client.patch('/api/admin/notification-events/', {
            'events': {'category:system': False},
        }, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)

        self.assertTrue(
            AuditLog.objects.filter(
                actor=self.admin, action='ADMIN_NOTIFICATION_EVENTS_UPDATED'
            ).exists()
        )

    # 8. Duplicate Prevention & Idempotency
    @patch('core.email_notification_service._deliver_transport_email')
    def test_duplicate_prevention_idempotency(self, mock_transport):
        """Duplicate notifications with identical idempotency key are safely de-duplicated."""
        log1 = EmailNotificationService.send(
            to_email='student@example.com',
            subject='Receipt #1001',
            html_body='<p>Receipt</p>',
            text_body='Receipt',
            event_category='payment',
            idempotency_key='receipt:1001',
            immediate=True,
        )
        self.assertIsNotNone(log1)
        self.assertEqual(log1.status, 'sent')

        # Retry with same idempotency key
        log2 = EmailNotificationService.send(
            to_email='student@example.com',
            subject='Receipt #1001',
            html_body='<p>Receipt</p>',
            text_body='Receipt',
            event_category='payment',
            idempotency_key='receipt:1001',
            immediate=True,
        )
        self.assertEqual(log1.id, log2.id)
        self.assertEqual(EmailDeliveryLog.objects.filter(idempotency_key='receipt:1001').count(), 1)

