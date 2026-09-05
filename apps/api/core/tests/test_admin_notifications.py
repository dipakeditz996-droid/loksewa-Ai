"""The admin dashboard's notification bell was purely decorative (a static
button, no data), and nothing in the app ever created a Notification row for
an admin recipient - so even a working bell would have stayed empty forever.
Covers: NotificationService.notify_admins() itself (fan-out, kill switches),
and that real student-triggered events (a support ticket, a course
application) actually land one in each active admin's inbox.
"""
import hashlib

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, AdminSettings, Notification, EmailOTP
from core.notification_service import NotificationService


class NotifyAdminsTests(APITestCase):
    def setUp(self):
        self.admin1 = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')
        self.admin2 = User.objects.create_user(
            username='admin2', email='admin2@test.com', password='pass123', role='super-admin')
        self.inactive_admin = User.objects.create_user(
            username='admin3', email='admin3@test.com', password='pass123', role='admin', is_active=False)
        self.teacher = User.objects.create_user(
            username='teach1', email='teach1@test.com', password='pass123', role='teacher')

    def test_fans_out_to_active_admins_only(self):
        NotificationService.notify_admins(
            notif_type='payment', title='Test', message='A test event.')
        recipients = set(Notification.objects.filter(title='Test').values_list('recipient__username', flat=True))
        self.assertEqual(recipients, {'admin1', 'admin2'})

    def test_teachers_and_students_never_receive_admin_notifications(self):
        NotificationService.notify_admins(
            notif_type='payment', title='Test', message='A test event.')
        self.assertFalse(Notification.objects.filter(recipient=self.teacher).exists())

    def test_respects_global_notifications_kill_switch(self):
        settings_obj = AdminSettings.get_settings()
        settings_obj.notifications_enabled = False
        settings_obj.save()
        NotificationService.notify_admins(
            notif_type='payment', title='Test', message='A test event.')
        self.assertFalse(Notification.objects.filter(title='Test').exists())

    def test_respects_in_app_kill_switch(self):
        settings_obj = AdminSettings.get_settings()
        settings_obj.enable_in_app_notifications = False
        settings_obj.save()
        NotificationService.notify_admins(
            notif_type='payment', title='Test', message='A test event.')
        self.assertFalse(Notification.objects.filter(title='Test').exists())


class SupportTicketNotifiesAdminsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')
        self.student = User.objects.create_user(
            username='stud1', email='stud1@test.com', password='pass123', role='student')

    def test_creating_a_ticket_notifies_admins(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/support/support/tickets/', {
            'subject': 'Cannot access my exam',
            'category': 'technical',
            'priority': 'high',
            'description': 'The exam page just shows a spinner forever.',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        notif = Notification.objects.get(recipient=self.admin, type='support')
        self.assertIn('stud1', notif.message)
        self.assertEqual(notif.priority, 'important')


class CourseApplicationNotifiesAdminsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')
        self.student = User.objects.create_user(
            username='stud1', email='stud1@test.com', password='pass123', role='student')

        from courses.models import Course
        self.course = Course.objects.create(
            title='Kharidar Foundation Course', slug='kharidar-foundation',
            status='published', is_open_for_enrollment=True,
        )

    def test_applying_notifies_admins(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/courses/apply/', {'course_id': self.course.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        notif = Notification.objects.get(recipient=self.admin, type='course_application')
        self.assertIn('Kharidar Foundation Course', notif.message)
        self.assertIn('stud1', notif.message)


class NewRegistrationNotifiesAdminsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')
        from exams.models import ExamCategory
        self.category = ExamCategory.objects.create(name='PSC Exams', is_active=True)

    def test_signing_up_notifies_admins(self):
        # Registration itself no longer requires a verified OTP - the
        # account is created pending-verification and the OTP is emailed as
        # part of this same call (see VerifyEmailOTPView for the next step).
        response = self.client.post('/api/auth/signup/', {
            'username': 'newstudent',
            'email': 'newstudent@test.com',
            'password': 'StrongPass123!',
            'name': 'New Student',
            'mobile': '9812345678',
            'permanent_district': 'Kathmandu',
            'permanent_local_level': 'Kathmandu Metro',
            'exam_category_id': self.category.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        notif = Notification.objects.get(recipient=self.admin, type='new_registration')
        self.assertIn('newstudent', notif.message)
        self.assertIn('newstudent@test.com', notif.message)


class AccountDeactivationNotifiesAdminsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')
        self.acting_admin = User.objects.create_user(
            username='admin2', email='admin2@test.com', password='pass123', role='super-admin')
        self.student = User.objects.create_user(
            username='stud1', email='stud1@test.com', password='pass123', role='student')

    def test_deactivating_a_user_notifies_other_admins(self):
        self.client.force_authenticate(user=self.acting_admin)
        response = self.client.patch(f'/api/admin/users/{self.student.id}/', {'is_active': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        notif = Notification.objects.get(recipient=self.admin, type='account', title='Account Deactivated')
        self.assertIn('stud1', notif.message)
        self.assertIn('admin2', notif.message)

    def test_updating_an_already_active_user_does_not_notify(self):
        """Only the True -> False transition should fire - not every PATCH."""
        self.client.force_authenticate(user=self.acting_admin)
        response = self.client.patch(f'/api/admin/users/{self.student.id}/', {'is_active': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Notification.objects.filter(type='account', title='Account Deactivated').exists())


class TeacherAccountCreatedNotifiesAdminsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')
        self.acting_admin = User.objects.create_user(
            username='admin2', email='admin2@test.com', password='pass123', role='super-admin')

        from exams.models import ExamCategory
        self.exam_category = ExamCategory.objects.create(name='PSC Exams', is_active=True)

    def test_creating_a_teacher_notifies_other_admins(self):
        self.client.force_authenticate(user=self.acting_admin)
        response = self.client.post('/api/admin/users/', {
            'username': 'newteacher', 'email': 'newteacher@test.com',
            'password': 'StrongPass123!', 'role': 'teacher',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        notif = Notification.objects.get(recipient=self.admin, type='account', title='New Teacher Account Created')
        self.assertIn('newteacher', notif.message)

    def test_creating_a_student_does_not_notify(self):
        self.client.force_authenticate(user=self.acting_admin)
        response = self.client.post('/api/admin/users/', {
            'username': 'newstud', 'email': 'newstud@test.com',
            'password': 'StrongPass123!', 'role': 'student',
            'name': 'New Student', 'mobile': '9812345678',
            'permanent_district': 'Rupandehi', 'permanent_local_level': 'Butwal',
            'exam_category_id': self.exam_category.id,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertFalse(Notification.objects.filter(title='New Teacher Account Created').exists())


class SubscriptionPaymentDecisionNotifiesAdminsTests(APITestCase):
    def setUp(self):
        from subscriptions.models import SubscriptionPlan, SubscriptionPayment
        from marketplace.models import PaymentMethod

        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')
        self.acting_admin = User.objects.create_user(
            username='admin2', email='admin2@test.com', password='pass123', role='super-admin')
        self.student = User.objects.create_user(
            username='stud1', email='stud1@test.com', password='pass123', role='student')

        self.plan = SubscriptionPlan.objects.create(
            name='Gold Plan', description='x', duration=30, duration_unit='DAYS', price=500)
        self.method = PaymentMethod.objects.create(
            method_type='ESEWA', display_name='eSewa', account_name='x', account_number='1')
        self.payment = SubscriptionPayment.objects.create(
            student=self.student, plan=self.plan, payment_method=self.method,
            amount=500, transaction_id='TX-APPROVE-1', status='PENDING',
            screenshot='subscriptions/payment_proofs/x.jpg',
        )

    def test_approving_notifies_other_admins(self):
        self.client.force_authenticate(user=self.acting_admin)
        response = self.client.post(f'/api/subscriptions/payments/{self.payment.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        notif = Notification.objects.get(recipient=self.admin, type='payment', title='Subscription Payment Approved')
        self.assertIn('stud1', notif.message)
        self.assertIn('Gold Plan', notif.message)

    def test_rejecting_notifies_other_admins(self):
        self.client.force_authenticate(user=self.acting_admin)
        response = self.client.post(f'/api/subscriptions/payments/{self.payment.id}/reject/', {
            'reason': 'Screenshot does not match the expected amount.',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        notif = Notification.objects.get(recipient=self.admin, type='payment', title='Subscription Payment Rejected')
        self.assertIn('stud1', notif.message)
        self.assertIn('does not match', notif.message)


class MarketplaceOrderDecisionNotifiesAdminsTests(APITestCase):
    def setUp(self):
        from marketplace.models import Product, PaymentMethod, PaymentSubmission

        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')
        self.acting_admin = User.objects.create_user(
            username='admin2', email='admin2@test.com', password='pass123', role='super-admin')
        self.student = User.objects.create_user(
            username='stud1', email='stud1@test.com', password='pass123', role='student')

        self.product = Product.objects.create(
            title='Kharidar PDF Pack', description='x', category='PDF', price='500.00')
        self.method = PaymentMethod.objects.create(
            method_type='ESEWA', display_name='eSewa', account_name='x', account_number='1')
        self.submission = PaymentSubmission.objects.create(
            student=self.student, product=self.product, payment_method=self.method,
            transaction_id='TX-MKT-1', expected_amount=self.product.price,
            submitted_amount=self.product.price, screenshot='marketplace/payment_proofs/x.jpg',
            status='PENDING',
        )

    def test_approving_notifies_other_admins(self):
        self.client.force_authenticate(user=self.acting_admin)
        response = self.client.post(
            f'/api/marketplace/admin/payment-submissions/{self.submission.id}/review/',
            {'status': 'APPROVED'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        notif = Notification.objects.get(recipient=self.admin, type='payment', title='Marketplace Order Approved')
        self.assertIn('stud1', notif.message)
        self.assertIn('Kharidar PDF Pack', notif.message)

    def test_rejecting_notifies_other_admins(self):
        self.client.force_authenticate(user=self.acting_admin)
        response = self.client.post(
            f'/api/marketplace/admin/payment-submissions/{self.submission.id}/review/',
            {'status': 'REJECTED', 'rejection_reason': 'Duplicate transaction ID.'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        notif = Notification.objects.get(recipient=self.admin, type='payment', title='Marketplace Order Rejected')
        self.assertIn('stud1', notif.message)
        self.assertIn('Duplicate transaction', notif.message)


class SupportTicketReplyNotifiesAdminsTests(APITestCase):
    def setUp(self):
        from support.models import SupportTicket

        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')
        self.student = User.objects.create_user(
            username='stud1', email='stud1@test.com', password='pass123', role='student')
        self.ticket = SupportTicket.objects.create(
            student=self.student, subject='Cannot access my exam',
            category='technical', priority='normal',
        )

    def test_replying_notifies_admins(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(f'/api/support/support/tickets/{self.ticket.id}/messages/', {
            'message': 'Still broken, any update?',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        notif = Notification.objects.get(recipient=self.admin, type='support', title='New Ticket Reply')
        self.assertIn('stud1', notif.message)
        self.assertIn(self.ticket.subject, notif.message)


class AdminAccountLockoutNotifiesAdminsTests(APITestCase):
    def setUp(self):
        from core.models import AdminSettings
        self.admin1 = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')
        self.target_admin = User.objects.create_user(
            username='admin2', email='admin2@test.com', password='CorrectPass123!', role='super-admin')
        settings_obj = AdminSettings.get_settings()
        settings_obj.max_login_attempts = 3
        settings_obj.save()

    def test_locking_an_admin_account_notifies_other_admins(self):
        for _ in range(3):
            self.client.post('/api/token/', {
                'username': 'admin2', 'password': 'WrongPassword',
            }, format='json')

        notif = Notification.objects.get(recipient=self.admin1, title='Admin Account Locked Out')
        self.assertIn('admin2', notif.message)
        self.assertEqual(notif.priority, 'critical')

    def test_locking_out_does_not_double_notify_on_further_attempts(self):
        for _ in range(3):
            self.client.post('/api/token/', {
                'username': 'admin2', 'password': 'WrongPassword',
            }, format='json')
        # Account is now locked - further attempts short-circuit before
        # record_failed_attempt runs again, so no second notification.
        self.client.post('/api/token/', {
            'username': 'admin2', 'password': 'WrongPassword',
        }, format='json')
        self.assertEqual(
            Notification.objects.filter(recipient=self.admin1, title='Admin Account Locked Out').count(), 1)

    def test_student_lockouts_do_not_notify_admins(self):
        from core.models import AdminSettings
        student = User.objects.create_user(
            username='stud1', email='stud1@test.com', password='CorrectPass123!', role='student')
        for _ in range(3):
            self.client.post('/api/token/', {
                'username': 'stud1', 'password': 'WrongPassword',
            }, format='json')
        self.assertFalse(Notification.objects.filter(title='Admin Account Locked Out').exists())


class AIProviderFailureNotifiesAdminsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')

    def test_provider_failure_notifies_admins(self):
        from ai_tutor.models import Conversation
        from ai_tutor.services import AITutorService

        student = User.objects.create_user(
            username='stud1', email='stud1@test.com', password='pass123', role='student')
        conversation = Conversation.objects.create(student=student, mode='EXPLAIN', title='Test chat')

        service = AITutorService()
        service.is_mock = False

        class _BoomClient:
            class chats:
                @staticmethod
                def create(*args, **kwargs):
                    raise RuntimeError('Gemini is down')

        service.client = _BoomClient()

        result = service.generate_response(conversation, 'Explain Article 18.')
        self.assertIn('temporarily unavailable', result)

        notif = Notification.objects.get(recipient=self.admin, type='system', title='AI Tutor Provider Failure')
        self.assertIn('Gemini is down', notif.message)
        self.assertEqual(notif.priority, 'critical')

    def test_repeated_failures_within_the_window_are_deduped(self):
        NotificationService.notify_system_failure(
            component='AI Tutor Provider', detail='first failure', dedupe_minutes=15)
        NotificationService.notify_system_failure(
            component='AI Tutor Provider', detail='second failure, moments later', dedupe_minutes=15)
        self.assertEqual(
            Notification.objects.filter(title='AI Tutor Provider Failure').count(), 1)


class StorageFailureNotifiesAdminsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')

    def test_drive_upload_failure_notifies_admins(self):
        from unittest.mock import patch, MagicMock
        from core import google_drive

        broken_service = MagicMock()
        broken_service.files.return_value.create.return_value.execute.side_effect = RuntimeError('Drive API unreachable')

        with patch.object(google_drive, '_get_service', return_value=broken_service), \
             patch.object(google_drive, '_resolve_target_folder', return_value='folder123'):
            import io
            with self.assertRaises(google_drive.GoogleDriveError):
                google_drive.upload_file('notes/x.pdf', io.BytesIO(b'data'), mime_type='application/pdf')

        notif = Notification.objects.get(recipient=self.admin, type='system', title='Google Drive Storage Failure')
        # Deliberately checks the exception type, not the raw message: the
        # storage layer only ever logs/reports type(e).__name__, never the
        # exception text itself, since Drive/API errors can carry request
        # detail that shouldn't reach a notification row.
        self.assertIn('RuntimeError', notif.message)
        self.assertIn('x.pdf', notif.message)
        self.assertEqual(notif.priority, 'critical')


class NotificationApiTests(APITestCase):
    """Verifies the shared /api/notifications/ endpoints (list, unread count,
    mark read, mark all read) and that access is strictly recipient-scoped -
    there is no separate 'admin notifications' endpoint to duplicate; the
    same endpoints serve every role, filtered by request.user as recipient."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pass123', role='admin')
        self.other_admin = User.objects.create_user(
            username='admin2', email='admin2@test.com', password='pass123', role='admin')
        self.student = User.objects.create_user(
            username='stud1', email='stud1@test.com', password='pass123', role='student')
        self.teacher = User.objects.create_user(
            username='teach1', email='teach1@test.com', password='pass123', role='teacher')

        Notification.objects.create(recipient=self.admin, type='payment', title='A', message='a')
        Notification.objects.create(recipient=self.admin, type='support', title='B', message='b')
        Notification.objects.create(recipient=self.other_admin, type='payment', title='C', message='c')

    def test_unauthenticated_access_denied(self):
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_sees_only_their_own_notifications(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = {n['title'] for n in response.data['results']}
        self.assertEqual(titles, {'A', 'B'})

    def test_student_and_teacher_cannot_see_admin_notifications(self):
        for user in (self.student, self.teacher):
            self.client.force_authenticate(user=user)
            response = self.client.get('/api/notifications/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['results'], [])

    def test_type_filter(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/notifications/?type=support')
        titles = {n['title'] for n in response.data['results']}
        self.assertEqual(titles, {'B'})

    def test_unread_count(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/notifications/unread/')
        self.assertEqual(response.data['unread_count'], 2)

    def test_mark_read(self):
        self.client.force_authenticate(user=self.admin)
        notif = Notification.objects.get(recipient=self.admin, title='A')
        response = self.client.patch(f'/api/notifications/{notif.id}/read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)

    def test_cannot_mark_another_users_notification_read(self):
        self.client.force_authenticate(user=self.admin)
        notif = Notification.objects.get(recipient=self.other_admin, title='C')
        response = self.client.patch(f'/api/notifications/{notif.id}/read/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        notif.refresh_from_db()
        self.assertFalse(notif.is_read)

    def test_mark_all_read(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/notifications/mark-all-read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Notification.objects.filter(recipient=self.admin, is_read=False).count(), 0)
        # Another admin's unread notification must be untouched.
        self.assertTrue(
            Notification.objects.get(recipient=self.other_admin, title='C').is_read is False)
