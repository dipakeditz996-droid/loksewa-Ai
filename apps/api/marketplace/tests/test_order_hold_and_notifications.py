from decimal import Decimal
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from django.utils import timezone

from marketplace.models import (
    Product, ProductImage, Order, OrderItem, Cart, CartItem,
    DeliveryAddress, PaymentMethod, PaymentSubmission
)
from core.models import AdminEmailRecipient, EmailDeliveryLog
from support.models import StudentProfile
from core.email_notification_service import _get_base_frontend_url, EmailNotificationService

User = get_user_model()

VALID_IMAGE_BYTES = (
    b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff'
    b'\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00'
    b'\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
)


@override_settings(
    STORAGES={'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'}},
    DEFAULT_FILE_STORAGE='django.core.files.storage.FileSystemStorage'
)
class MarketplaceOrderHoldAndNotificationTests(APITestCase):
    def setUp(self):
        # Users
        self.admin = User.objects.create_superuser(
            username='admin_tester',
            email='admin@test.com',
            password='Password123!',
            role='admin'
        )
        self.student = User.objects.create_user(
            username='student_one',
            email='student_one@test.com',
            password='Password123!',
            role='student'
        )
        self.other_student = User.objects.create_user(
            username='student_two',
            email='student_two@test.com',
            password='Password123!',
            role='student'
        )

        StudentProfile.objects.get_or_create(user=self.student, phone='9800000001')
        StudentProfile.objects.get_or_create(user=self.other_student, phone='9800000002')

        # Admin email recipient for notifications
        self.admin_recipient = AdminEmailRecipient.objects.create(
            name='Marketplace Admin',
            email='admin_notif@test.com',
            is_active=True,
            subscribed_events=['marketplace', 'payment']
        )

        # Product
        self.product = Product.objects.create(
            title='Loksewa Officer Guide',
            description='Comprehensive guidebook',
            category='NEW_BOOK',
            price=Decimal('1000.00'),
            stock=10,
            listing_status='ACTIVE',
            is_published=True,
            delivery_fee=Decimal('50.00'),
        )

        # Payment Method
        self.payment_method = PaymentMethod.objects.create(
            method_type='ESEWA',
            display_name='eSewa Digital Wallet',
            account_name='Loksewa Admin',
            account_number='9800000000',
            is_active=True,
        )

        # Address
        self.address = DeliveryAddress.objects.create(
            student=self.student,
            full_name='Dipak Bhandari',
            phone_number='9800000001',
            province='Bagmati Province',
            district='Kathmandu',
            municipality='Kathmandu Metropolitan',
            ward_number='3',
            tole_area='Maharajgunj',
            is_default=True,
        )

    def _create_sample_order(self, student=None, is_cod=True, status_val='PENDING_PAYMENT', payment_status='UNPAID'):
        st = student or self.student
        order = Order.objects.create(
            student=st,
            status=status_val,
            payment_status=payment_status,
            payment_method_type='COD' if is_cod else 'PREPAID',
            is_cod=is_cod,
            cod_advance_rate=Decimal('0.15'),
            cod_advance_required=Decimal('157.50'),
            cod_remaining_balance=Decimal('892.50'),
            total_amount=Decimal('1000.00'),
            delivery_fee=Decimal('50.00'),
            shipping_address='Maharajgunj, Kathmandu',
            contact_number='9800000001',
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price=Decimal('1000.00'),
        )
        return order

    # 1. Customer can only track their own orders
    def test_customer_can_only_track_own_orders(self):
        order = self._create_sample_order(student=self.student)
        self.client.force_authenticate(user=self.other_student)
        res = self.client.get(f'/api/marketplace/student/orders/{order.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(user=self.student)
        res = self.client.get(f'/api/marketplace/student/orders/{order.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['id'], order.id)

    # 2. Incomplete payment appears as Payment Not Completed
    def test_incomplete_payment_appears_as_payment_not_completed(self):
        order = self._create_sample_order(student=self.student, status_val='PENDING_PAYMENT', payment_status='UNPAID')
        self.client.force_authenticate(user=self.student)
        res = self.client.get(f'/api/marketplace/student/orders/{order.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'PENDING_PAYMENT')
        self.assertEqual(res.data['payment_status'], 'UNPAID')
        self.assertTrue(res.data['can_retry_payment'])

    # 3. Customer can resume payment without duplicate order creation
    def test_customer_can_resume_payment_without_duplicate_order(self):
        order = self._create_sample_order(student=self.student, status_val='PENDING_PAYMENT')
        order_count_before = Order.objects.count()

        self.client.force_authenticate(user=self.student)
        img = SimpleUploadedFile("slip.gif", VALID_IMAGE_BYTES, content_type="image/gif")
        res = self.client.post('/api/marketplace/student/payment-submissions/', {
            'order': order.id,
            'payment_method': self.payment_method.id,
            'transaction_id': 'TXN987654',
            'screenshot': img,
        }, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), order_count_before)
        order.refresh_from_db()
        self.assertEqual(order.status, 'PAYMENT_SUBMITTED')

    # 4. Paid advance is non-refundable on hold/cancellation
    def test_paid_advance_non_refundable_on_cancellation(self):
        order = self._create_sample_order(student=self.student, status_val='PENDING_PAYMENT', payment_status='PARTIALLY_PAID')
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/marketplace/student/orders/{order.id}/cancel/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non-refundable', res.data.get('detail', '').lower())

    # 5. Unpaid advance is not treated as forfeited
    def test_unpaid_advance_not_treated_as_forfeited(self):
        order = self._create_sample_order(student=self.student, status_val='PENDING_PAYMENT', payment_status='UNPAID')
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/marketplace/student/orders/{order.id}/cancel/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'CANCELLED')
        self.assertFalse(order.advance_forfeited)

    # 6. Hold and cancellation permissions are enforced
    def test_hold_and_cancellation_permissions_enforced(self):
        order = self._create_sample_order(student=self.student, status_val='CONFIRMED', payment_status='UNPAID')
        self.client.force_authenticate(user=self.other_student)
        # Attempt to hold another customer's order
        res = self.client.post(f'/api/marketplace/student/orders/{order.id}/hold/', {'reason': 'delay'})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Legitimate owner can hold
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/marketplace/student/orders/{order.id}/hold/', {'reason': 'Traveling for a week'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'ON_HOLD')
        self.assertEqual(order.hold_reason, 'Traveling for a week')
        self.assertIsNotNone(order.held_at)

    # 7. Admin notification is not sent for incomplete checkout
    @patch('core.email_notification_service.EmailNotificationService.send_admin_marketplace_order_email')
    def test_admin_notification_not_sent_for_incomplete_checkout(self, mock_admin_email):
        self.client.force_authenticate(user=self.student)
        cart, _ = Cart.objects.get_or_create(student=self.student)
        CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        # Checkout
        res = self.client.post('/api/marketplace/student/orders/checkout/', {
            'delivery_address_id': self.address.id,
            'payment_mode': 'COD',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # Verify admin email was NOT sent at checkout
        mock_admin_email.assert_not_called()

    # 8. Admin notification is sent only at payment verification stage
    @patch('core.email_notification_service.EmailNotificationService.send_admin_marketplace_order_email')
    def test_admin_notification_sent_only_at_payment_verification(self, mock_admin_email):
        order = self._create_sample_order(student=self.student, status_val='PAYMENT_SUBMITTED')
        submission = PaymentSubmission.objects.create(
            order=order,
            payment_method=self.payment_method,
            transaction_id='TXN12345',
            submitted_amount=Decimal('157.50'),
            expected_amount=Decimal('157.50'),
            status='PENDING',
        )

        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f'/api/marketplace/admin/payment-submissions/{submission.id}/review/', {
            'action': 'APPROVE',
            'note': 'Verified payment receipt',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        mock_admin_email.assert_called_once()

    # 9. Duplicate notifications are prevented
    def test_duplicate_notifications_prevented(self):
        order = self._create_sample_order(student=self.student, status_val='CONFIRMED')
        logs1 = EmailNotificationService.send_admin_marketplace_order_email(order)
        self.assertEqual(len(logs1), 1)

        # Log count before second call
        log_count_before = EmailDeliveryLog.objects.filter(event_category='marketplace').count()
        # Second call with same order (same idempotency_prefix) does not create new logs
        logs2 = EmailNotificationService.send_admin_marketplace_order_email(order)
        log_count_after = EmailDeliveryLog.objects.filter(event_category='marketplace').count()
        self.assertEqual(log_count_before, log_count_after)

    # 10. Multiple product images can be created, edited, removed, and displayed
    def test_multiple_product_images_management(self):
        self.client.force_authenticate(user=self.admin)
        img1 = SimpleUploadedFile("img1.gif", VALID_IMAGE_BYTES, content_type="image/gif")
        img2 = SimpleUploadedFile("img2.gif", VALID_IMAGE_BYTES, content_type="image/gif")

        # Upload multiple images
        res = self.client.post(f'/api/marketplace/admin/products/{self.product.id}/upload-images/', {
            'images': [img1, img2],
            'image_labels': ['front_cover', 'back_cover'],
            'set_first_as_primary': 'true',
        }, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self.product.images.count(), 2)

        # Primary is set
        primary_img = self.product.images.filter(is_primary=True).first()
        self.assertIsNotNone(primary_img)

        # Set second image as primary
        other_img = self.product.images.filter(is_primary=False).first()
        res = self.client.post(f'/api/marketplace/admin/products/{self.product.id}/set-primary-image/', {
            'image_id': other_img.id
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        other_img.refresh_from_db()
        self.assertTrue(other_img.is_primary)

        # Delete image
        res = self.client.post(f'/api/marketplace/admin/products/{self.product.id}/delete-image/', {
            'image_id': other_img.id
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self.product.images.count(), 1)

    # 11. Existing single-image products remain compatible
    def test_existing_single_image_products_remain_compatible(self):
        legacy_product = Product.objects.create(
            title='Legacy Book',
            category='NEW_BOOK',
            price=Decimal('500.00'),
            cover_image=SimpleUploadedFile("cover.gif", VALID_IMAGE_BYTES, content_type="image/gif"),
            listing_status='ACTIVE',
            is_published=True,
        )
        self.client.force_authenticate(user=self.student)
        res = self.client.get('/api/marketplace/public/products/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        item = next((p for p in res.data if p['id'] == legacy_product.id), None)
        self.assertIsNotNone(item)
        self.assertIsNotNone(item['cover_image'])

    # 12. Email links use the correct canonical www domain
    def test_email_links_use_canonical_domain(self):
        url = _get_base_frontend_url()
        self.assertEqual(url, 'https://www.hemrajkc.com.np')
        with self.settings(FRONTEND_URL='https://hemrajkc.com'):
            self.assertEqual(_get_base_frontend_url(), 'https://www.hemrajkc.com.np')
        with self.settings(FRONTEND_URL='http://hemrajkc.com.np'):
            self.assertEqual(_get_base_frontend_url(), 'https://www.hemrajkc.com.np')
