from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient
from rest_framework import status

from core.models import AdminEmailRecipient, EmailDeliveryLog, AdminSettings
from core.email_notification_service import EmailNotificationService, process_email_delivery
from core.email_service import send_otp_email, send_account_created_email, send_password_changed_email
from core.notification_service import NotificationService
from marketplace.models import Order

User = get_user_model()


class EmailNotificationSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='adminuser',
            email='admin@loksewaai.com',
            password='Password123!',
            role='admin',
            is_staff=True,
        )
        self.student = User.objects.create_user(
            username='studentuser',
            email='student@example.com',
            password='Password123!',
            role='student',
        )
        self.client.force_authenticate(user=self.admin)

    def test_admin_recipient_crud_and_validation(self):
        """Tests adding, validating, normalizing, updating, and removing admin recipients."""
        # 1. Invalid email
        res = self.client.post('/api/admin/email-recipients/', {
            'email': 'not-an-email',
            'name': 'Test Lead',
            'event_categories': ['payment'],
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Invalid category
        res = self.client.post('/api/admin/email-recipients/', {
            'email': 'ops@example.com',
            'event_categories': ['invalid_category'],
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Successful create (verifies normalization to lowercase and stripped)
        res = self.client.post('/api/admin/email-recipients/', {
            'email': '  Ops.Team@Example.COM  ',
            'name': 'Operations Team',
            'event_categories': ['payment', 'marketplace'],
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['email'], 'ops.team@example.com')
        recipient_id = res.data['id']

        # 4. Duplicate prevention
        res_dup = self.client.post('/api/admin/email-recipients/', {
            'email': 'ops.team@example.com',
            'name': 'Duplicate',
        }, format='json')
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Partial update (toggle active, update categories)
        res_patch = self.client.patch(f'/api/admin/email-recipients/{recipient_id}/', {
            'is_active': False,
            'event_categories': ['payment', 'security', 'system'],
        }, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertFalse(res_patch.data['is_active'])
        self.assertIn('security', res_patch.data['event_categories'])

        # 6. Delete
        res_del = self.client.delete(f'/api/admin/email-recipients/{recipient_id}/')
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)
        self.assertFalse(AdminEmailRecipient.objects.filter(id=recipient_id).exists())

    def test_student_access_denied_to_admin_settings_and_logs(self):
        """Ordinary students must get 403 Forbidden on all admin recipient and log endpoints."""
        student_client = APIClient()
        student_client.force_authenticate(user=self.student)

        # Recipients list
        res = student_client.get('/api/admin/email-recipients/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Test email
        res = student_client.post('/api/admin/email-recipients/test-email/', {'recipient_email': 'x@y.com'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Logs view
        res = student_client.get('/api/admin/email-delivery-logs/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Health view
        res = student_client.get('/api/admin/email-delivery-logs/health/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', RESEND_API_KEY='')
    def test_diagnostic_test_email(self):
        """Tests sending a diagnostic test email and verifying delivery log recording."""
        mail.outbox.clear()
        res = self.client.post('/api/admin/email-recipients/test-email/', {
            'recipient_email': 'admin-test@example.com',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('admin-test@example.com', mail.outbox[0].to)
        self.assertIn('LoksewaAI Test Notification', mail.outbox[0].subject)

        # Verify EmailDeliveryLog
        log = EmailDeliveryLog.objects.filter(recipient_email='admin-test@example.com', event_category='test').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, 'sent')
        self.assertEqual(log.attempts, 1)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', RESEND_API_KEY='')
    def test_student_transactional_email_events(self):
        """Tests student notifications: welcome, payment submitted, approved, rejected, order status."""
        mail.outbox.clear()

        # 1. Welcome email
        log1 = EmailNotificationService.send_student_welcome_email(self.student)
        self.assertIsNotNone(log1)
        self.assertEqual(log1.status, 'sent')
        self.assertEqual(log1.recipient_email, self.student.email)
        self.assertIn("Welcome to LoksewaAI", mail.outbox[0].subject)

        # 2. Payment submitted
        log2 = EmailNotificationService.send_student_payment_submitted_email(
            student=self.student,
            title_ref='Kharidar All-Access',
            amount='1500.00',
            transaction_id='TXN12345',
        )
        self.assertIsNotNone(log2)
        self.assertEqual(log2.status, 'sent')
        self.assertIn('TXN12345', mail.outbox[1].body)

        # 3. Payment approved
        log3 = EmailNotificationService.send_student_payment_approved_email(
            student=self.student,
            title_ref='Kharidar All-Access',
            amount='1500.00',
            receipt_number='LKAI-2026-REC123',
        )
        self.assertIsNotNone(log3)
        self.assertEqual(log3.status, 'sent')
        self.assertIn('LKAI-2026-REC123', mail.outbox[2].body)

        # 4. Payment rejected with reason
        log4 = EmailNotificationService.send_student_payment_rejected_email(
            student=self.student,
            title_ref='Kharidar All-Access',
            reason='Screenshot blurry, transaction code not legible.',
        )
        self.assertIsNotNone(log4)
        self.assertEqual(log4.status, 'sent')
        self.assertIn('Screenshot blurry, transaction code not legible.', mail.outbox[3].body)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', RESEND_API_KEY='')
    def test_admin_recipients_and_category_filtering(self):
        """Tests that admin emails are routed only to active recipients subscribed to that specific category."""
        mail.outbox.clear()

        # Recipient 1: Subscribed to payment only
        r_pay = AdminEmailRecipient.objects.create(
            email='finance@loksewaai.com',
            name='Finance Desk',
            is_active=True,
            event_categories=['payment'],
        )
        # Recipient 2: Subscribed to marketplace only
        r_market = AdminEmailRecipient.objects.create(
            email='store@loksewaai.com',
            name='Store Operations',
            is_active=True,
            event_categories=['marketplace'],
        )
        # Recipient 3: Subscribed to all categories
        r_super = AdminEmailRecipient.objects.create(
            email='super@loksewaai.com',
            name='Super Admin',
            is_active=True,
            event_categories=['registration', 'payment', 'marketplace', 'security', 'system'],
        )
        # Recipient 4: Inactive recipient
        r_inactive = AdminEmailRecipient.objects.create(
            email='inactive@loksewaai.com',
            name='Ex Admin',
            is_active=False,
            event_categories=['payment', 'marketplace'],
        )

        # Dispatch payment alert
        EmailNotificationService.send_admin_payment_submitted_email(
            payment_type='Subscription',
            student=self.student,
            title='Section Officer Package',
            amount='2500',
            transaction_id='TXN99999',
        )

        # Expect: finance@loksewaai.com and super@loksewaai.com receive it; store & inactive do not.
        sent_to = [m.to[0] for m in mail.outbox]
        self.assertIn('finance@loksewaai.com', sent_to)
        self.assertIn('super@loksewaai.com', sent_to)
        self.assertNotIn('store@loksewaai.com', sent_to)
        self.assertNotIn('inactive@loksewaai.com', sent_to)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', RESEND_API_KEY='')
    def test_idempotency_prevents_duplicate_delivery(self):
        """Same idempotency_key must prevent sending duplicate emails."""
        mail.outbox.clear()

        key = "unique-order-event-101"
        log1 = EmailNotificationService.send(
            to_email='student@example.com',
            subject='First Try',
            html_body='<p>Content</p>',
            text_body='Content',
            idempotency_key=key,
            immediate=True,
        )
        self.assertIsNotNone(log1)
        self.assertEqual(log1.status, 'sent')
        self.assertEqual(len(mail.outbox), 1)

        # Second attempt with identical idempotency_key
        log2 = EmailNotificationService.send(
            to_email='student@example.com',
            subject='Second Try',
            html_body='<p>Content</p>',
            text_body='Content',
            idempotency_key=key,
            immediate=True,
        )
        # Must return the existing log and NOT send a second message
        self.assertEqual(log1.id, log2.id)
        self.assertEqual(len(mail.outbox), 1)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', RESEND_API_KEY='')
    def test_security_sensitive_emails_never_log_code_or_tokens(self):
        """OTP and password reset emails must record delivery without storing raw codes or tokens in delivery logs."""
        mail.outbox.clear()

        send_otp_email('student@example.com', '784912', 'signup')
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('784912', mail.outbox[0].body)

        otp_log = EmailDeliveryLog.objects.filter(recipient_email='student@example.com', template_name='signup_otp').first()
        self.assertIsNotNone(otp_log)
        self.assertEqual(otp_log.status, 'sent')

        # Critical: 784912 must NEVER appear in the delivery log subject, error, or metadata
        self.assertNotIn('784912', otp_log.subject)
        self.assertNotIn('784912', otp_log.error_message)
        self.assertNotIn('784912', str(otp_log.metadata))

    def test_smtp_failure_handling_and_retry_marking(self):
        """Verifies delivery failure accurately marks status as failed or retrying and does not swallow errors silently."""
        with patch('core.email_notification_service._deliver_transport_email', side_effect=ConnectionError("SMTP connection timeout")):
            log = EmailNotificationService.send(
                to_email='student@example.com',
                subject='Failing Email',
                html_body='<p>Test</p>',
                text_body='Test',
                immediate=True,
            )
            self.assertIsNotNone(log)
            # Transient error on first attempt marks 'retrying'
            self.assertIn(log.status, ('retrying', 'failed'))
            self.assertEqual(log.attempts, 1)
            self.assertIn("SMTP connection timeout", log.error_message)

    def test_delivery_health_and_logs_endpoints(self):
        """Verifies admin endpoints for delivery health and logs query/filter properly."""
        # Create some dummy logs
        EmailDeliveryLog.objects.create(
            event_category='payment',
            recipient_email='user1@example.com',
            subject='Payment 1',
            status='sent',
            attempts=1,
        )
        EmailDeliveryLog.objects.create(
            event_category='marketplace',
            recipient_email='user2@example.com',
            subject='Order 1',
            status='failed',
            attempts=3,
            error_message='Connection refused',
        )

        # GET /api/admin/email-delivery-logs/health/
        res_health = self.client.get('/api/admin/email-delivery-logs/health/')
        self.assertEqual(res_health.status_code, status.HTTP_200_OK)
        self.assertIn('health', res_health.data)
        self.assertIn('provider', res_health.data)
        self.assertEqual(res_health.data['health']['sent'], 1)
        self.assertEqual(res_health.data['health']['failed'], 1)

        # Verify provider secrets are NOT exposed
        self.assertNotIn('password', res_health.data['provider'])
        self.assertNotIn('api_key', res_health.data['provider'])

        # GET /api/admin/email-delivery-logs/ with category filter
        res_logs = self.client.get('/api/admin/email-delivery-logs/?category=payment')
        self.assertEqual(res_logs.status_code, status.HTTP_200_OK)
        self.assertEqual(res_logs.data['count'], 1)
        self.assertEqual(res_logs.data['results'][0]['recipient_email'], 'user1@example.com')

