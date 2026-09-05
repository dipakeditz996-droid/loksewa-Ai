"""Package/subscription + payment verification system.

Covers the spec's checklist: package CRUD/publish visibility, purchase using
the server-side price (never the client's), duplicate-payment prevention,
the full approve transaction (subscription activation, correct expiry math,
auto-enrollment, invoice, notification), rejection (reason required, nothing
activated), access control via HasActiveSubscription both with enforcement
off and on, cross-student IDOR, teacher/admin authorization boundaries, and
remaining-days/expiring-soon/expired computation.
"""
import base64
from datetime import timedelta
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import AdminSettings, Notification, User
from courses.models import Course, Enrollment
from marketplace.models import PaymentMethod
from subscriptions.access import has_active_subscription, has_feature
from subscriptions.models import Invoice, Subscription, SubscriptionPayment, SubscriptionPlan

# A 1x1 GIF - the same dummy upload fixture the marketplace test suite uses,
# small enough to pass validate_image_size_5mb and validate_image_extension.
_GIF_DATA = base64.b64decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')


def _dummy_screenshot(name='proof.gif'):
    return SimpleUploadedFile(name, _GIF_DATA, content_type='image/gif')


class PackageManagementTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin1', password='pw', role='admin', is_staff=True)
        self.student = User.objects.create_user(username='stud1', password='pw', role='student')

    def test_admin_can_create_package(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/subscriptions/plans/', {
            'name': 'PSC Foundation', 'description': 'Base plan', 'duration': 90,
            'duration_unit': 'DAYS', 'price': '2999.00', 'features': ['ai_tutor'],
            'status': 'ACTIVE',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertTrue(SubscriptionPlan.objects.filter(name='PSC Foundation').exists())

    def test_admin_can_edit_package(self):
        plan = SubscriptionPlan.objects.create(name='Basic', description='', duration=30, price='500.00')
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(f'/api/subscriptions/plans/{plan.id}/', {'price': '750.00'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        plan.refresh_from_db()
        self.assertEqual(str(plan.price), '750.00')

    def test_student_cannot_create_package(self):
        self.client.force_authenticate(self.student)
        resp = self.client.post('/api/subscriptions/plans/', {
            'name': 'Hack', 'description': '', 'duration': 1, 'price': '0.00',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_sees_only_active_plans(self):
        active = SubscriptionPlan.objects.create(name='Active Plan', description='', duration=30, price='500', status='ACTIVE')
        draft = SubscriptionPlan.objects.create(name='Draft Plan', description='', duration=30, price='500', status='INACTIVE')
        self.client.force_authenticate(self.student)
        resp = self.client.get('/api/subscriptions/plans/')
        names = [p['name'] for p in resp.data]
        self.assertIn('Active Plan', names)
        self.assertNotIn('Draft Plan', names)

    def test_public_endpoint_never_exposes_draft_plans(self):
        SubscriptionPlan.objects.create(name='Draft Plan', description='', duration=30, price='500', status='INACTIVE')
        resp = self.client.get('/api/packages/public/')
        names = [p['name'] for p in resp.data]
        self.assertNotIn('Draft Plan', names)

    def test_public_endpoint_derives_feature_flags_from_plan_features(self):
        SubscriptionPlan.objects.create(
            name='AI Plan', description='', duration=30, price='500', status='ACTIVE',
            features=['ai_tutor'],
        )
        resp = self.client.get('/api/packages/public/')
        plan_data = next(p for p in resp.data if p['name'] == 'AI Plan')
        self.assertTrue(plan_data['ai_features'])
        self.assertFalse(plan_data['mock_exam_access'])

    def test_wildcard_feature_grants_everything_on_public_endpoint(self):
        SubscriptionPlan.objects.create(
            name='All Access', description='', duration=30, price='500', status='ACTIVE',
            features=['*'],
        )
        resp = self.client.get('/api/packages/public/')
        plan_data = next(p for p in resp.data if p['name'] == 'All Access')
        self.assertTrue(plan_data['practice_access'])
        self.assertTrue(plan_data['mock_exam_access'])
        self.assertTrue(plan_data['notes_access'])
        self.assertTrue(plan_data['ai_features'])


class PurchaseFlowTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='stud1', password='pw', role='student')
        self.plan = SubscriptionPlan.objects.create(
            name='PSC Foundation', description='', duration=90, duration_unit='DAYS',
            price='2999.00', status='ACTIVE',
        )
        self.method = PaymentMethod.objects.create(
            method_type='ESEWA', display_name='eSewa', account_name='LoksewaAI', account_number='9800000000',
        )

    @patch('core.google_drive.upload_file')
    def test_purchase_uses_server_side_price_not_client_amount(self, mock_upload):
        mock_upload.return_value = {'id': 'mock_id'}
        self.client.force_authenticate(self.student)
        resp = self.client.post('/api/subscriptions/payments/', {
            'plan': self.plan.id, 'payment_method': self.method.id,
            'amount': '1.00',  # tampered - must be ignored
            'transaction_id': 'TXN-001', 'screenshot': _dummy_screenshot(),
        }, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        payment = SubscriptionPayment.objects.get(transaction_id='TXN-001')
        self.assertEqual(str(payment.amount), '2999.00')
        self.assertEqual(payment.status, 'PENDING')

    @patch('core.google_drive.upload_file')
    def test_purchase_notifies_student_and_admins(self, mock_upload):
        mock_upload.return_value = {'id': 'mock_id'}
        admin = User.objects.create_user(username='admin1', password='pw', role='admin', is_staff=True)
        self.client.force_authenticate(self.student)
        self.client.post('/api/subscriptions/payments/', {
            'plan': self.plan.id, 'payment_method': self.method.id, 'amount': '2999.00',
            'transaction_id': 'TXN-002', 'screenshot': _dummy_screenshot(),
        }, format='multipart')
        self.assertTrue(Notification.objects.filter(recipient=self.student, type='payment').exists())
        self.assertTrue(Notification.objects.filter(recipient=admin, type='payment').exists())

    @patch('core.google_drive.upload_file')
    def test_duplicate_transaction_id_rejected(self, mock_upload):
        mock_upload.return_value = {'id': 'mock_id'}
        self.client.force_authenticate(self.student)
        self.client.post('/api/subscriptions/payments/', {
            'plan': self.plan.id, 'payment_method': self.method.id, 'amount': '2999.00',
            'transaction_id': 'DUPLICATE', 'screenshot': _dummy_screenshot(),
        }, format='multipart')
        resp = self.client.post('/api/subscriptions/payments/', {
            'plan': self.plan.id, 'payment_method': self.method.id, 'amount': '2999.00',
            'transaction_id': 'DUPLICATE', 'screenshot': _dummy_screenshot('proof2.gif'),
        }, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(SubscriptionPayment.objects.filter(transaction_id='DUPLICATE').count(), 1)


class VerificationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin1', password='pw', role='admin', is_staff=True)
        self.student = User.objects.create_user(username='stud1', password='pw', role='student')
        self.method = PaymentMethod.objects.create(
            method_type='ESEWA', display_name='eSewa', account_name='LoksewaAI', account_number='9800000000',
        )

    def _pending_payment(self, plan):
        return SubscriptionPayment.objects.create(
            student=self.student, plan=plan, payment_method=self.method,
            amount=plan.price, transaction_id=f'TXN-{plan.id}-{self.student.id}',
            screenshot=_dummy_screenshot(),
        )

    def test_admin_sees_pending_payment(self):
        plan = SubscriptionPlan.objects.create(name='Plan', description='', duration=30, price='500')
        self._pending_payment(plan)
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/subscriptions/payments/')
        self.assertEqual(len(resp.data), 1)

    def test_approve_activates_subscription_with_correct_dates(self):
        plan = SubscriptionPlan.objects.create(name='Plan', description='', duration=90, duration_unit='DAYS', price='500')
        payment = self._pending_payment(plan)
        self.client.force_authenticate(self.admin)

        before = timezone.now()
        resp = self.client.post(f'/api/subscriptions/payments/{payment.id}/approve/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)

        payment.refresh_from_db()
        self.assertEqual(payment.status, 'APPROVED')
        self.assertIsNotNone(payment.subscription)

        sub = payment.subscription
        self.assertEqual(sub.status, 'ACTIVE')
        self.assertTrue(before <= sub.start_date)
        self.assertAlmostEqual(
            (sub.expiry_date - sub.start_date).total_seconds(),
            timedelta(days=90).total_seconds(),
            delta=5,
        )
        self.assertTrue(Invoice.objects.filter(payment=payment).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.student, type='payment').exists())
        self.assertTrue(has_active_subscription(self.student))

    def test_approve_renews_from_existing_expiry_not_from_now(self):
        plan = SubscriptionPlan.objects.create(name='Plan', description='', duration=30, duration_unit='DAYS', price='500')
        existing_expiry = timezone.now() + timedelta(days=10)
        Subscription.objects.create(
            student=self.student, plan=plan, status='ACTIVE',
            start_date=timezone.now(), expiry_date=existing_expiry,
        )
        payment = self._pending_payment(plan)
        self.client.force_authenticate(self.admin)
        self.client.post(f'/api/subscriptions/payments/{payment.id}/approve/')

        payment.refresh_from_db()
        new_sub = payment.subscription
        self.assertAlmostEqual(new_sub.start_date.timestamp(), existing_expiry.timestamp(), delta=5)

    def test_approve_auto_enrolls_when_plan_has_course(self):
        course = Course.objects.create(title='Constitutional Law', slug='constitutional-law')
        plan = SubscriptionPlan.objects.create(name='Course Plan', description='', duration=30, price='500', course=course)
        payment = self._pending_payment(plan)
        self.client.force_authenticate(self.admin)
        self.client.post(f'/api/subscriptions/payments/{payment.id}/approve/')

        enrollment = Enrollment.objects.get(student=self.student, course=course)
        self.assertEqual(enrollment.status, 'active')

    def test_cannot_approve_twice(self):
        plan = SubscriptionPlan.objects.create(name='Plan', description='', duration=30, price='500')
        payment = self._pending_payment(plan)
        self.client.force_authenticate(self.admin)
        self.client.post(f'/api/subscriptions/payments/{payment.id}/approve/')
        resp = self.client.post(f'/api/subscriptions/payments/{payment.id}/approve/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Subscription.objects.filter(student=self.student).count(), 1)

    def test_reject_requires_reason(self):
        plan = SubscriptionPlan.objects.create(name='Plan', description='', duration=30, price='500')
        payment = self._pending_payment(plan)
        self.client.force_authenticate(self.admin)
        resp = self.client.post(f'/api/subscriptions/payments/{payment.id}/reject/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_stores_reason_and_activates_nothing(self):
        plan = SubscriptionPlan.objects.create(name='Plan', description='', duration=30, price='500')
        payment = self._pending_payment(plan)
        self.client.force_authenticate(self.admin)
        resp = self.client.post(f'/api/subscriptions/payments/{payment.id}/reject/', {'reason': 'Blurry screenshot'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        payment.refresh_from_db()
        self.assertEqual(payment.status, 'REJECTED')
        self.assertEqual(payment.rejection_reason, 'Blurry screenshot')
        self.assertIsNone(payment.subscription)
        self.assertFalse(Subscription.objects.filter(student=self.student).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.student, type='payment', message__icontains='rejected').exists())

    def test_teacher_cannot_approve_or_reject(self):
        plan = SubscriptionPlan.objects.create(name='Plan', description='', duration=30, price='500')
        payment = self._pending_payment(plan)
        teacher = User.objects.create_user(username='teach1', password='pw', role='teacher')
        self.client.force_authenticate(teacher)
        resp = self.client.post(f'/api/subscriptions/payments/{payment.id}/approve/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class IDORTests(APITestCase):
    def setUp(self):
        self.student1 = User.objects.create_user(username='stud1', password='pw', role='student')
        self.student2 = User.objects.create_user(username='stud2', password='pw', role='student')
        self.teacher = User.objects.create_user(username='teach1', password='pw', role='teacher')
        self.method = PaymentMethod.objects.create(
            method_type='ESEWA', display_name='eSewa', account_name='LoksewaAI', account_number='9800000000',
        )
        self.plan = SubscriptionPlan.objects.create(name='Plan', description='', duration=30, price='500')
        self.payment = SubscriptionPayment.objects.create(
            student=self.student1, plan=self.plan, payment_method=self.method,
            amount=self.plan.price, transaction_id='TXN-IDOR', screenshot=_dummy_screenshot(),
        )
        self.subscription = Subscription.objects.create(
            student=self.student1, plan=self.plan, status='ACTIVE',
            start_date=timezone.now(), expiry_date=timezone.now() + timedelta(days=30),
        )

    def test_student_cannot_list_another_students_payment(self):
        self.client.force_authenticate(self.student2)
        resp = self.client.get('/api/subscriptions/payments/')
        ids = [p['id'] for p in resp.data]
        self.assertNotIn(self.payment.id, ids)

    def test_student_cannot_retrieve_another_students_payment(self):
        self.client.force_authenticate(self.student2)
        resp = self.client.get(f'/api/subscriptions/payments/{self.payment.id}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_cannot_approve_another_students_payment(self):
        self.client.force_authenticate(self.student2)
        resp = self.client.post(f'/api/subscriptions/payments/{self.payment.id}/approve/')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'PENDING')

    def test_student_cannot_see_another_students_subscription(self):
        self.client.force_authenticate(self.student2)
        resp = self.client.get('/api/subscriptions/my-subscriptions/')
        ids = [s['id'] for s in resp.data]
        self.assertNotIn(self.subscription.id, ids)

    def test_teacher_cannot_access_payment_queue(self):
        self.client.force_authenticate(self.teacher)
        resp = self.client.get(f'/api/subscriptions/payments/{self.payment.id}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class AccessControlTests(APITestCase):
    """HasActiveSubscription (subscriptions/permissions.py), exercised
    directly against a real gated endpoint (PracticeSessionViewSet)."""

    def setUp(self):
        self.student = User.objects.create_user(username='stud1', password='pw', role='student')
        self.admin = User.objects.create_user(username='admin1', password='pw', role='admin', is_staff=True)
        self.teacher = User.objects.create_user(username='teach1', password='pw', role='teacher')
        self.plan = SubscriptionPlan.objects.create(name='Plan', description='', duration=30, price='500', features=['*'])
        settings_obj = AdminSettings.get_settings()
        settings_obj.enforce_subscription_access = False
        settings_obj.save(update_fields=['enforce_subscription_access'])

    def test_enforcement_off_allows_student_with_no_package(self):
        self.client.force_authenticate(self.student)
        resp = self.client.get('/api/practice-sessions/')
        self.assertNotEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_enforcement_on_denies_student_with_no_package(self):
        settings_obj = AdminSettings.get_settings()
        settings_obj.enforce_subscription_access = True
        settings_obj.save(update_fields=['enforce_subscription_access'])

        self.client.force_authenticate(self.student)
        resp = self.client.get('/api/practice-sessions/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_enforcement_on_allows_student_with_active_package(self):
        settings_obj = AdminSettings.get_settings()
        settings_obj.enforce_subscription_access = True
        settings_obj.save(update_fields=['enforce_subscription_access'])
        Subscription.objects.create(
            student=self.student, plan=self.plan, status='ACTIVE',
            start_date=timezone.now(), expiry_date=timezone.now() + timedelta(days=30),
        )

        self.client.force_authenticate(self.student)
        resp = self.client.get('/api/practice-sessions/')
        self.assertNotEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_enforcement_on_denies_student_with_expired_package(self):
        settings_obj = AdminSettings.get_settings()
        settings_obj.enforce_subscription_access = True
        settings_obj.save(update_fields=['enforce_subscription_access'])
        Subscription.objects.create(
            student=self.student, plan=self.plan, status='ACTIVE',
            start_date=timezone.now() - timedelta(days=60), expiry_date=timezone.now() - timedelta(days=1),
        )

        self.client.force_authenticate(self.student)
        resp = self.client.get('/api/practice-sessions/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(has_active_subscription(self.student))

    def test_enforcement_on_never_blocks_staff_roles(self):
        settings_obj = AdminSettings.get_settings()
        settings_obj.enforce_subscription_access = True
        settings_obj.save(update_fields=['enforce_subscription_access'])

        self.client.force_authenticate(self.teacher)
        resp = self.client.get('/api/practice-sessions/')
        self.assertNotEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/practice-sessions/')
        self.assertNotEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_enforcement_on_allows_student_with_admin_granted_access(self):
        settings_obj = AdminSettings.get_settings()
        settings_obj.enforce_subscription_access = True
        settings_obj.save(update_fields=['enforce_subscription_access'])
        from support.models import StudentProfile
        StudentProfile.objects.create(
            user=self.student,
            access_origin='ADMIN_GRANTED',
            admin_granted_by=self.admin,
            admin_granted_at=timezone.now()
        )

        self.client.force_authenticate(self.student)
        resp = self.client.get('/api/practice-sessions/')
        self.assertNotEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(has_feature(self.student, 'ai_tutor'))

    def test_enforcement_on_denies_student_with_expired_admin_granted_access(self):
        settings_obj = AdminSettings.get_settings()
        settings_obj.enforce_subscription_access = True
        settings_obj.save(update_fields=['enforce_subscription_access'])
        from support.models import StudentProfile
        StudentProfile.objects.create(
            user=self.student,
            access_origin='ADMIN_GRANTED',
            admin_access_expiry=timezone.now() - timedelta(days=1),
            admin_granted_by=self.admin,
            admin_granted_at=timezone.now() - timedelta(days=30)
        )

        self.client.force_authenticate(self.student)
        resp = self.client.get('/api/practice-sessions/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(has_feature(self.student, 'ai_tutor'))

    def test_has_feature_respects_wildcard(self):
        Subscription.objects.create(
            student=self.student, plan=self.plan, status='ACTIVE',
            start_date=timezone.now(), expiry_date=timezone.now() + timedelta(days=30),
        )
        self.assertTrue(has_feature(self.student, 'ai_tutor'))
        self.assertTrue(has_feature(self.student, 'anything_at_all'))

    def test_has_feature_false_without_subscription(self):
        self.assertFalse(has_feature(self.student, 'ai_tutor'))


class ExpiryComputationTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='stud1', password='pw', role='student')
        self.plan = SubscriptionPlan.objects.create(name='Plan', description='', duration=30, price='500')

    def test_remaining_days_and_status_active(self):
        sub = Subscription.objects.create(
            student=self.student, plan=self.plan, status='ACTIVE',
            start_date=timezone.now(), expiry_date=timezone.now() + timedelta(days=20),
        )
        self.client.force_authenticate(self.student)
        resp = self.client.get('/api/subscriptions/my-subscriptions/')
        row = next(s for s in resp.data if s['id'] == sub.id)
        self.assertEqual(row['computed_status'], 'ACTIVE')
        self.assertIn(row['remaining_days'], (19, 20))

    def test_expiring_soon_within_threshold(self):
        sub = Subscription.objects.create(
            student=self.student, plan=self.plan, status='ACTIVE',
            start_date=timezone.now(), expiry_date=timezone.now() + timedelta(days=5),
        )
        self.client.force_authenticate(self.student)
        resp = self.client.get('/api/subscriptions/my-subscriptions/')
        row = next(s for s in resp.data if s['id'] == sub.id)
        self.assertEqual(row['computed_status'], 'EXPIRING_SOON')

    def test_expired_even_if_status_still_active_in_db(self):
        """Status is deliberately never flipped by a background job - the
        live expiry_date comparison is the source of truth."""
        sub = Subscription.objects.create(
            student=self.student, plan=self.plan, status='ACTIVE',
            start_date=timezone.now() - timedelta(days=40),
            expiry_date=timezone.now() - timedelta(days=1),
        )
        self.client.force_authenticate(self.student)
        resp = self.client.get('/api/subscriptions/my-subscriptions/')
        row = next(s for s in resp.data if s['id'] == sub.id)
        self.assertEqual(row['computed_status'], 'EXPIRED')
        self.assertEqual(row['remaining_days'], 0)
        self.assertFalse(has_active_subscription(self.student))


class ExpiryNotificationTaskTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='stud1', password='pw', role='student')
        self.plan = SubscriptionPlan.objects.create(name='Plan', description='', duration=30, price='500')

    def test_notifies_once_per_expiring_subscription(self):
        from core.notification_service import NotificationService

        Subscription.objects.create(
            student=self.student, plan=self.plan, status='ACTIVE',
            start_date=timezone.now(), expiry_date=timezone.now() + timedelta(days=3),
        )
        sent_first = NotificationService.notify_subscription_expiring_soon()
        sent_second = NotificationService.notify_subscription_expiring_soon()
        self.assertEqual(sent_first, 1)
        self.assertEqual(sent_second, 0)  # related_id dedupe - never double-notifies
        self.assertTrue(Notification.objects.filter(recipient=self.student, title='Package Expiring Soon').exists())

    def test_notifies_expired_subscription(self):
        from core.notification_service import NotificationService

        Subscription.objects.create(
            student=self.student, plan=self.plan, status='ACTIVE',
            start_date=timezone.now() - timedelta(days=40), expiry_date=timezone.now() - timedelta(days=1),
        )
        sent = NotificationService.notify_subscription_expired()
        self.assertEqual(sent, 1)
        self.assertTrue(Notification.objects.filter(recipient=self.student, title='Package Expired').exists())
