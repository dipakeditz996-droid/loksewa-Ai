from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from marketplace.models import (
    Product, Order, OrderItem, Cart, CartItem,
    DeliveryAddress, DeliveryFeeRule, PaymentMethod, PaymentSubmission
)
from support.models import StudentProfile

User = get_user_model()


VALID_IMAGE_BYTES = (
    b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff'
    b'\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00'
    b'\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
)

class MarketplaceCODAndPaymentRecoveryTests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_superuser(
            username='admin_user',
            email='admin@test.com',
            password='Password123!',
            role='admin'
        )
        self.student = User.objects.create_user(
            username='student_cod',
            email='student_cod@test.com',
            password='Password123!',
            first_name='Dipak',
            last_name='Bhandari',
            role='student'
        )
        self.other_student = User.objects.create_user(
            username='other_student',
            email='other@test.com',
            password='Password123!',
            first_name='Sita',
            last_name='Sharma',
            role='student'
        )

        # Student profile
        self.profile, _ = StudentProfile.objects.get_or_create(user=self.student)
        self.profile.phone = '9826414389'
        self.profile.permanent_district = 'Kathmandu'
        self.profile.permanent_local_level = 'Kathmandu Metropolitan'
        self.profile.save()

        # Products
        self.product1 = Product.objects.create(
            title='Question Bank Old Is Gold',
            description='Physical book for sub engineer',
            category='NEW_BOOK',
            price=Decimal('655.00'),
            delivery_fee=Decimal('50.00'),
            stock=20,
            is_published=True,
            listing_status='ACTIVE'
        )
        self.product2 = Product.objects.create(
            title='Loksewa Model Tests',
            description='Practice book',
            category='NEW_BOOK',
            price=Decimal('300.00'),
            delivery_fee=Decimal('30.00'),
            stock=15,
            is_published=True,
            listing_status='ACTIVE'
        )

        # Delivery Address
        self.address = DeliveryAddress.objects.create(
            student=self.student,
            full_name='Dipak Bhandari',
            phone_number='9826414389',
            province='Bagmati',
            district='Kathmandu',
            municipality='Kathmandu Metropolitan',
            ward_number='10',
            tole_area='Baneshwor',
            is_default=True
        )

        # Payment method
        self.payment_method = PaymentMethod.objects.create(
            method_type='ESEWA',
            display_name='eSewa',
            account_name='Dipak Bhandari',
            account_number='9765176703',
            is_active=True
        )

        # Dummy screenshot file
        self.dummy_screenshot = SimpleUploadedFile(
            'receipt.gif',
            VALID_IMAGE_BYTES,
            content_type='image/gif'
        )

    def test_cod_checkout_authoritative_calculation_and_rounding(self):
        """
        Verify authoritative calculation of 15% advance payment and 85% remaining balance
        using ROUND_HALF_UP on the total (subtotal + delivery fee).
        """
        self.client.force_authenticate(user=self.student)
        
        # Add 2 of product1 (2 * 655 = 1310.00)
        cart, _ = Cart.objects.get_or_create(student=self.student)
        CartItem.objects.create(cart=cart, product=self.product1, quantity=2)

        # Checkout with payment_method_type='COD'
        res = self.client.post('/api/marketplace/student/orders/checkout/', {
            'delivery_address_id': self.address.id,
            'payment_mode': 'COD'
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        order_id = res.data['id']
        order = Order.objects.get(id=order_id)

        # Subtotal = 1310.00, Delivery fee = 50.00
        # Final Total = 1360.00
        self.assertEqual(order.total_amount, Decimal('1310.00'))
        self.assertEqual(order.delivery_fee, Decimal('50.00'))
        self.assertEqual(order.final_total, Decimal('1360.00'))

        # 15% of 1360.00 = 204.00
        # 85% remaining = 1156.00
        self.assertTrue(order.is_cod)
        self.assertEqual(order.payment_mode, 'COD')
        self.assertEqual(order.cod_advance_required, Decimal('204.00'))
        self.assertEqual(order.cod_remaining_balance, Decimal('1156.00'))
        self.assertEqual(order.payment_status, 'UNPAID')
        self.assertEqual(order.status, 'PENDING_PAYMENT')

        # Check API response fields
        self.assertTrue(res.data['is_cod'])
        self.assertEqual(res.data['payment_mode'], 'COD')
        self.assertEqual(Decimal(str(res.data['cod_advance_required'])), Decimal('204.00'))
        self.assertEqual(Decimal(str(res.data['cod_remaining_balance'])), Decimal('1156.00'))

    def test_cod_odd_cent_rounding_boundary(self):
        """
        Test fractional cent boundary: e.g. total = 100.03
        15% of 100.03 = 15.0045 -> rounds to 15.00.
        Remaining balance = 100.03 - 15.00 = 85.03.
        Sum of advance + remaining MUST equal final total exactly.
        """
        order = Order.objects.create(
            student=self.student,
            total_amount=Decimal('80.03'),
            delivery_fee=Decimal('20.00'),
            payment_method_type='COD',
            is_cod=True
        )
        order.calculate_cod_amounts()
        order.save()

        self.assertEqual(order.final_total, Decimal('100.03'))
        self.assertEqual(order.cod_advance_required, Decimal('15.00'))
        self.assertEqual(order.cod_remaining_balance, Decimal('85.03'))
        self.assertEqual(order.cod_advance_required + order.cod_remaining_balance, order.final_total)

    def test_prevent_client_payment_bypass(self):
        """
        Verify that a client cannot bypass payment by sending status or amounts in payload.
        """
        self.client.force_authenticate(user=self.student)
        
        cart, _ = Cart.objects.get_or_create(student=self.student)
        CartItem.objects.create(cart=cart, product=self.product1, quantity=1)

        # Attempt to spoof status or totals
        res = self.client.post('/api/marketplace/student/orders/checkout/', {
            'delivery_address_id': self.address.id,
            'payment_mode': 'COD',
            'status': 'CONFIRMED',
            'payment_status': 'PAID',
            'total_amount': '1.00',
            'cod_advance_required': '0.00'
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(id=res.data['id'])
        # Server must enforce calculated amounts and initial UNPAID state
        self.assertEqual(order.status, 'PENDING_PAYMENT')
        self.assertEqual(order.payment_status, 'UNPAID')
        self.assertEqual(order.total_amount, Decimal('655.00'))
        self.assertEqual(order.final_total, Decimal('705.00'))
        self.assertEqual(order.cod_advance_required, Decimal('105.75')) # 15% of 705.00

    def test_student_payment_submission_uses_authoritative_advance(self):
        """
        When student submits payment proof for a COD order, the backend sets
        expected_amount to cod_advance_required, not the full total.
        """
        order = Order.objects.create(
            student=self.student,
            total_amount=Decimal('1000.00'),
            delivery_fee=Decimal('100.00'),
            payment_method_type='COD',
            is_cod=True
        )
        order.calculate_cod_amounts()
        order.save()

        self.client.force_authenticate(user=self.student)
        res = self.client.post('/api/marketplace/student/payment-submissions/', {
            'order': order.id,
            'payment_method': self.payment_method.id,
            'transaction_id': 'TXN123456789',
            'screenshot': self.dummy_screenshot,
            'amount': '1.00' # Spoofed client amount
        }, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        submission = PaymentSubmission.objects.get(id=res.data['id'])
        # Authoritative amount must be 15% of 1100 = 165.00
        self.assertEqual(submission.expected_amount, Decimal('165.00'))
        self.assertTrue(submission.is_cod_advance)
        self.assertEqual(submission.attempt_number, 1)

    def test_admin_approval_of_cod_advance(self):
        """
        When admin approves a COD advance payment:
        - Order status becomes CONFIRMED (ready for dispatch).
        - Order payment_status becomes PARTIALLY_PAID (NOT fully paid).
        - cod_advance_paid is set to verified amount.
        - cod_remaining_balance remains 85%.
        """
        order = Order.objects.create(
            student=self.student,
            total_amount=Decimal('1000.00'),
            delivery_fee=Decimal('100.00'),
            payment_method_type='COD',
            is_cod=True
        )
        order.calculate_cod_amounts()
        order.save()

        submission = PaymentSubmission.objects.create(
            student=order.student,
            order=order,
            payment_method=self.payment_method,
            transaction_id='TXN_ADVANCE_OK',
            expected_amount=order.cod_advance_required,
            submitted_amount=order.cod_advance_required,
            is_cod_advance=True,
            status='PENDING'
        )

        # Admin approves the submission
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f'/api/marketplace/admin/payment-submissions/{submission.id}/review/', {
            'action': 'APPROVE',
            'admin_notes': 'Advance payment verified successfully'
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        submission.refresh_from_db()

        self.assertEqual(submission.status, 'APPROVED')
        self.assertEqual(submission.expected_amount, Decimal('165.00'))
        
        # Critical COD state assertions:
        self.assertEqual(order.status, 'CONFIRMED')
        self.assertEqual(order.payment_status, 'PARTIALLY_PAID')
        self.assertEqual(order.cod_advance_paid, Decimal('165.00'))
        self.assertEqual(order.cod_remaining_balance, Decimal('935.00'))

    def test_admin_rejection_requires_reason_and_triggers_recovery(self):
        """
        When admin rejects payment:
        - Non-empty rejection_reason is required.
        - Submission status becomes REJECTED.
        - Order can_retry_payment is True, status is PENDING_PAYMENT.
        """
        order = Order.objects.create(
            student=self.student,
            total_amount=Decimal('500.00'),
            delivery_fee=Decimal('50.00'),
            payment_method_type='PREPAID',
            status='PROCESSING'
        )
        submission = PaymentSubmission.objects.create(
            student=order.student,
            order=order,
            payment_method=self.payment_method,
            transaction_id='TXN_BLURRY',
            expected_amount=Decimal('550.00'),
            submitted_amount=Decimal('550.00'),
            status='PENDING'
        )

        self.client.force_authenticate(user=self.admin)

        # 1. Rejection without reason must fail
        res = self.client.post(f'/api/marketplace/admin/payment-submissions/{submission.id}/review/', {
            'action': 'REJECT',
            'rejection_reason': ''
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Rejection with reason succeeds
        res = self.client.post(f'/api/marketplace/admin/payment-submissions/{submission.id}/review/', {
            'action': 'REJECT',
            'rejection_reason': 'The screenshot provided is illegible and the transaction ID was not found.'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        submission.refresh_from_db()
        order.refresh_from_db()

        self.assertEqual(submission.status, 'REJECTED')
        self.assertEqual(submission.rejection_reason, 'The screenshot provided is illegible and the transaction ID was not found.')
        self.assertEqual(order.status, 'PENDING_PAYMENT')
        self.assertEqual(order.payment_status, 'UNPAID')

    def test_payment_failure_retry_workflow(self):
        """
        After payment rejection, student can submit a new payment proof on the same order.
        Attempt number increments to 2, without creating duplicate orders.
        """
        order = Order.objects.create(
            student=self.student,
            total_amount=Decimal('500.00'),
            delivery_fee=Decimal('50.00'),
            payment_method_type='PREPAID',
            status='PENDING_PAYMENT',
            payment_status='UNPAID'
        )
        # Attempt 1 rejected
        PaymentSubmission.objects.create(
            student=order.student,
            order=order,
            payment_method=self.payment_method,
            transaction_id='TXN_BAD_1',
            expected_amount=Decimal('550.00'),
            submitted_amount=Decimal('500.00'),
            status='REJECTED',
            attempt_number=1,
            rejection_reason='Incorrect amount transferred.'
        )

        # Student retries on the same order
        self.client.force_authenticate(user=self.student)
        screenshot = SimpleUploadedFile('receipt2.gif', VALID_IMAGE_BYTES, content_type='image/gif')
        res = self.client.post('/api/marketplace/student/payment-submissions/', {
            'order': order.id,
            'payment_method': self.payment_method.id,
            'transaction_id': 'TXN_RETRY_OK_2',
            'screenshot': screenshot
        }, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        submission2 = PaymentSubmission.objects.get(id=res.data['id'])
        self.assertEqual(submission2.attempt_number, 2)
        self.assertEqual(submission2.status, 'PENDING')
        
        # Verify order still only has one Order instance and 2 submissions
        self.assertEqual(Order.objects.filter(student=self.student).count(), 1)
        self.assertEqual(order.payment_submissions.count(), 2)

    def test_switch_payment_mode_between_prepaid_and_cod(self):
        """
        Student can switch an eligible order from PREPAID to COD or vice versa,
        and backend recalculates the authoritative advance and remaining amounts.
        """
        order = Order.objects.create(
            student=self.student,
            total_amount=Decimal('1000.00'),
            delivery_fee=Decimal('100.00'),
            payment_method_type='PREPAID',
            is_cod=False,
            status='PENDING_PAYMENT',
            payment_status='UNPAID'
        )

        self.client.force_authenticate(user=self.student)

        # Switch to COD
        res = self.client.post(f'/api/marketplace/student/orders/{order.id}/switch-payment-mode/', {
            'payment_mode': 'COD'
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertTrue(order.is_cod)
        self.assertEqual(order.payment_mode, 'COD')
        self.assertEqual(order.cod_advance_required, Decimal('165.00')) # 15% of 1100
        self.assertEqual(order.cod_remaining_balance, Decimal('935.00'))

        # Switch back to PREPAID
        res = self.client.post(f'/api/marketplace/student/orders/{order.id}/switch-payment-mode/', {
            'payment_mode': 'PREPAID'
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertFalse(order.is_cod)
        self.assertEqual(order.payment_mode, 'PREPAID')
        self.assertEqual(order.cod_advance_required, Decimal('0.00'))
        self.assertEqual(order.cod_remaining_balance, Decimal('0.00'))

    def test_unauthorized_user_cannot_access_or_pay_other_student_order(self):
        """
        Another student cannot switch payment mode or submit payment proof for an order they do not own.
        """
        order = Order.objects.create(
            student=self.student,
            total_amount=Decimal('1000.00'),
            delivery_fee=Decimal('100.00'),
            payment_method_type='COD',
            is_cod=True
        )

        # Authenticate as other_student
        self.client.force_authenticate(user=self.other_student)

        # 1. Attempt to switch payment mode
        res1 = self.client.post(f'/api/marketplace/student/orders/{order.id}/switch-payment-mode/', {
            'payment_mode': 'PREPAID'
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_404_NOT_FOUND)

        # 2. Attempt to submit payment
        screenshot = SimpleUploadedFile('hacked.gif', VALID_IMAGE_BYTES, content_type='image/gif')
        res2 = self.client.post('/api/marketplace/student/payment-submissions/', {
            'order': order.id,
            'payment_method': self.payment_method.id,
            'transaction_id': 'TXN_SPOOF',
            'screenshot': screenshot
        }, format='multipart')
        self.assertIn(res2.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

