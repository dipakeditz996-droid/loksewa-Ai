from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient
from rest_framework import status

from core.models import StudentEmailTemplate, AdminEmailRecipient, EmailDeliveryLog
from core.email_notification_service import EmailNotificationService

User = get_user_model()


class StudentEmailNotificationManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_notif_mgr',
            email='admin.notif@loksewaai.com',
            password='AdminPassword123!',
            role='admin',
            is_staff=True,
        )
        self.student = User.objects.create_user(
            username='student_recipient',
            email='student.test@example.com',
            password='StudentPassword123!',
            role='student',
        )
        self.client.force_authenticate(user=self.admin)

    def test_templates_auto_seeded_with_all_21_events(self):
        """Verifies that all 21 configurable events exist across the 4 required categories."""
        res = self.client.get('/api/admin/student-email-notifications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data
        self.assertIn('categories', data)
        self.assertIn('templates', data)

        templates = data['templates']
        self.assertEqual(len(templates), 21)

        event_keys = {t['event_key'] for t in templates}
        required_keys = {
            # Account
            'welcome_email', 'email_verification', 'password_reset', 'password_change_confirmation',
            # Payments and subscriptions
            'payment_submitted', 'payment_approved', 'payment_rejected',
            'subscription_activated', 'subscription_expiry_reminder', 'subscription_expired',
            # Marketplace
            'order_confirmation', 'order_processing', 'order_dispatched',
            'delivery_status_update', 'order_delivered', 'order_cancelled',
            # Learning
            'course_access', 'exam_announcement', 'exam_reminder', 'result_published', 'student_announcement'
        }
        self.assertTrue(required_keys.issubset(event_keys))

    def test_mandatory_templates_protected_from_disabling(self):
        """Mandatory security/authentication notifications (verification, password reset, password change confirmation)
        must remain strictly protected and cannot be disabled via API.
        """
        mandatory_events = ['email_verification', 'password_reset', 'password_change_confirmation']

        for ev in mandatory_events:
            res = self.client.patch(
                f'/api/admin/student-email-notifications/{ev}/',
                {'is_enabled': False},
                format='json'
            )
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('is_enabled', res.data)
            self.assertIn('Mandatory', str(res.data['is_enabled']))

            # Verify it is still active in database
            tpl = StudentEmailTemplate.get_template(ev)
            self.assertTrue(tpl.is_enabled)
            self.assertTrue(tpl.is_mandatory)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', RESEND_API_KEY='')
    def test_optional_notifications_can_be_disabled_and_suppress_delivery(self):
        """When an administrator disables an optional event, backend triggers must suppress email delivery."""
        mail.outbox.clear()

        # 1. Enable welcome email and send -> delivers
        res = self.client.patch(
            '/api/admin/student-email-notifications/welcome_email/',
            {'is_enabled': True},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        log1 = EmailNotificationService.send_student_welcome_email(self.student)
        self.assertIsNotNone(log1)
        self.assertEqual(len(mail.outbox), 1)

        # 2. Disable welcome email via admin API
        res = self.client.patch(
            '/api/admin/student-email-notifications/welcome_email/',
            {'is_enabled': False},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['is_enabled'])

        # 3. Trigger welcome email -> must be suppressed!
        mail.outbox.clear()
        log2 = EmailNotificationService.send_student_welcome_email(self.student)
        self.assertIsNone(log2)
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', RESEND_API_KEY='')
    def test_template_customization_and_variable_rendering(self):
        """Verifies that an admin can customize subject and body, and the customized version is dispatched."""
        mail.outbox.clear()

        custom_subject = "Special Welcome to LoksewaAI for {{student_name}}!"
        custom_body = "<p>Greetings {{student_name}}, your preparation journey for {{email}} starts today.</p>"

        res = self.client.patch(
            '/api/admin/student-email-notifications/welcome_email/',
            {
                'subject': custom_subject,
                'body_html': custom_body,
                'is_enabled': True,
            },
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['subject'], custom_subject)

        # Trigger send
        log = EmailNotificationService.send_student_welcome_email(self.student)
        self.assertIsNotNone(log)
        self.assertEqual(len(mail.outbox), 1)

        expected_subject = f"Special Welcome to LoksewaAI for {self.student.username}!"
        self.assertEqual(mail.outbox[0].subject, expected_subject)
        self.assertIn(self.student.username, mail.outbox[0].body)

    def test_preview_endpoint(self):
        """Verifies the live preview endpoint substitutes sample context into subject and body."""
        res = self.client.post(
            '/api/admin/student-email-notifications/course_access/preview/',
            {
                'subject': 'Access to {{course_title}} Granted for {{student_name}}',
                'body_html': '<p>Enjoy learning {{course_title}}!</p>',
                'context': {
                    'student_name': 'Santosh KC',
                    'course_title': 'Section Officer English Paper',
                }
            },
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['subject'], 'Access to Section Officer English Paper Granted for Santosh KC')
        self.assertIn('Section Officer English Paper', res.data['rendered_html'])
        self.assertIn('Santosh KC', res.data['rendered_html'])

    def test_template_reset_to_default(self):
        """Verifies the reset endpoint restores system defaults."""
        # Customize first
        self.client.patch(
            '/api/admin/student-email-notifications/course_access/',
            {'subject': 'Temporary Test Subject'},
            format='json'
        )

        # Reset
        res = self.client.post('/api/admin/student-email-notifications/course_access/reset/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['template']['subject'], 'Access Granted: {{course_title}}')

    def test_student_forbidden_from_admin_student_notifications(self):
        """Students cannot view or edit student notification templates."""
        student_client = APIClient()
        student_client.force_authenticate(user=self.student)

        res = student_client.get('/api/admin/student-email-notifications/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res = student_client.patch(
            '/api/admin/student-email-notifications/welcome_email/',
            {'is_enabled': False},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

