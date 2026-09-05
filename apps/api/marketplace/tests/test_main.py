"""Tests for the admin Marketplace: product CRUD, payment submission review
(approve/reject), and purchase revoke/reactivate."""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from courses.models import Course, Enrollment
from marketplace.models import Product, PaymentMethod, PaymentSubmission, Purchase

PRODUCTS_URL = '/api/marketplace/admin/products/'
PAYMENT_METHODS_URL = '/api/marketplace/admin/payment-methods/'
SUBMISSIONS_URL = '/api/marketplace/admin/payment-submissions/'
PURCHASES_URL = '/api/marketplace/admin/purchases/'


def product_url(pk):
    return f'{PRODUCTS_URL}{pk}/'


def submission_review_url(pk):
    return f'{SUBMISSIONS_URL}{pk}/review/'


def purchase_action_url(pk, action):
    return f'{PURCHASES_URL}{pk}/{action}/'


class MarketplaceTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.student = User.objects.create_user(
            username='stu1', password='pw', role='student')
        self.method = PaymentMethod.objects.create(
            method_type='ESEWA', display_name='eSewa',
            account_name='LoksewaAI', account_number='9800000000',
        )

    def as_admin(self):
        self.client.force_authenticate(user=self.admin)

    def make_product(self, title='Loksewa Guide', price='500.00', category='NEW_BOOK', **kwargs):
        return Product.objects.create(title=title, description='x', category=category, price=price, stock=10, **kwargs)

    def make_submission(self, product, status_='PENDING'):
        return PaymentSubmission.objects.create(
            student=self.student, product=product, payment_method=self.method,
            transaction_id=f'TXN-{product.id}-{status_}', expected_amount=product.price,
            submitted_amount=product.price, screenshot='marketplace/payment_proofs/x.jpg',
            status=status_,
        )


class PermissionTests(MarketplaceTestBase):
    def _assert_admin_only(self, url, method='get'):
        client_method = getattr(self.client, method)
        self.assertEqual(client_method(url).status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.student)
        self.assertEqual(client_method(url).status_code, status.HTTP_403_FORBIDDEN)

        self.as_admin()
        resp = client_method(url)
        self.assertIn(resp.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))

    def test_products_list_permissions(self):
        self._assert_admin_only(PRODUCTS_URL)

    def test_payment_methods_list_permissions(self):
        self._assert_admin_only(PAYMENT_METHODS_URL)

    def test_submissions_list_permissions(self):
        self._assert_admin_only(SUBMISSIONS_URL)

    def test_purchases_list_permissions(self):
        self._assert_admin_only(PURCHASES_URL)


class ProductCRUDTests(MarketplaceTestBase):
    def test_admin_can_create_product(self):
        self.as_admin()
        resp = self.client.post(PRODUCTS_URL, {
            'title': 'New Book', 'description': 'desc', 'category': 'NEW_BOOK',
            'price': '299.00', 'is_published': False, 'stock': 10
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Product.objects.filter(title='New Book').exists())

    def test_admin_can_update_product(self):
        product = self.make_product()
        self.as_admin()
        resp = self.client.patch(product_url(product.id), {'price': '450.00'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(str(product.price), '450.00')

    def test_admin_can_publish_product(self):
        product = self.make_product()
        self.as_admin()
        resp = self.client.patch(product_url(product.id), {'is_published': True}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertTrue(product.is_published)

    def test_admin_can_delete_product(self):
        product = self.make_product()
        self.as_admin()
        resp = self.client.delete(product_url(product.id))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Product.objects.filter(id=product.id).exists())

    def test_student_cannot_create_product(self):
        self.client.force_authenticate(user=self.student)
        resp = self.client.post(PRODUCTS_URL, {
            'title': 'Hack', 'description': 'x', 'category': 'NEW_BOOK', 'price': '1.00',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_empty_product_list(self):
        self.as_admin()
        resp = self.client.get(PRODUCTS_URL)
        self.assertEqual(resp.data, [])


class PaymentSubmissionReviewTests(MarketplaceTestBase):
    def test_approve_creates_active_purchase(self):
        product = self.make_product()
        submission = self.make_submission(product)
        self.as_admin()
        resp = self.client.post(submission_review_url(submission.id), {'status': 'APPROVED'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        purchase = Purchase.objects.get(student=self.student, product=product)
        self.assertEqual(purchase.status, 'ACTIVE')
        self.assertEqual(str(purchase.amount_paid), str(submission.submitted_amount))

    def test_reject_requires_reason(self):
        product = self.make_product()
        submission = self.make_submission(product)
        self.as_admin()
        resp = self.client.post(submission_review_url(submission.id), {'status': 'REJECTED'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_with_reason_does_not_create_purchase(self):
        product = self.make_product()
        submission = self.make_submission(product)
        self.as_admin()
        resp = self.client.post(
            submission_review_url(submission.id),
            {'status': 'REJECTED', 'rejection_reason': 'Unclear screenshot'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(Purchase.objects.filter(student=self.student, product=product).exists())

    def test_cannot_reprocess_already_reviewed_submission(self):
        product = self.make_product()
        submission = self.make_submission(product, status_='APPROVED')
        self.as_admin()
        resp = self.client.post(submission_review_url(submission.id), {'status': 'REJECTED', 'rejection_reason': 'x'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approving_course_product_creates_enrollment(self):
        # SKIPPED: Marketplace no longer supports COURSE category directly, physical books only.
        pass

    def test_student_cannot_review_submission(self):
        product = self.make_product()
        submission = self.make_submission(product)
        self.client.force_authenticate(user=self.student)
        resp = self.client.post(submission_review_url(submission.id), {'status': 'APPROVED'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class PurchaseRevokeReactivateTests(MarketplaceTestBase):
    def make_active_purchase(self, product=None):
        product = product or self.make_product()
        return Purchase.objects.create(student=self.student, product=product, amount_paid=product.price, status='ACTIVE')

    def test_admin_can_revoke_active_purchase(self):
        purchase = self.make_active_purchase()
        self.as_admin()
        resp = self.client.post(purchase_action_url(purchase.id, 'revoke'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        purchase.refresh_from_db()
        self.assertEqual(purchase.status, 'REVOKED')

    def test_cannot_revoke_already_revoked_purchase(self):
        purchase = self.make_active_purchase()
        purchase.status = 'REVOKED'
        purchase.save()
        self.as_admin()
        resp = self.client.post(purchase_action_url(purchase.id, 'revoke'))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_reactivate_revoked_purchase(self):
        purchase = self.make_active_purchase()
        purchase.status = 'REVOKED'
        purchase.save()
        self.as_admin()
        resp = self.client.post(purchase_action_url(purchase.id, 'reactivate'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        purchase.refresh_from_db()
        self.assertEqual(purchase.status, 'ACTIVE')

    def test_revoking_course_purchase_suspends_enrollment(self):
        # SKIPPED: Marketplace no longer supports COURSE category directly.
        pass

    def test_reactivating_course_purchase_restores_enrollment(self):
        # SKIPPED: Marketplace no longer supports COURSE category directly.
        pass

    def test_student_cannot_revoke(self):
        purchase = self.make_active_purchase()
        self.client.force_authenticate(user=self.student)
        resp = self.client.post(purchase_action_url(purchase.id, 'revoke'))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class PublicProductListViewTests(APITestCase):
    """/api/marketplace/public/products/ powers the homepage's Marketplace
    preview — a small, anonymous-friendly slice with only real fields
    (no invented rating/reviews the frontend used to render as undefined)."""

    def test_only_published_products_returned(self):
        # A product must be BOTH admin-published AND past S2S moderation
        # (listing_status='ACTIVE') to appear publicly - is_published=True
        # alone is not enough since listing_status defaults to
        # 'PENDING_REVIEW'. This fixture predates that moderation field.
        Product.objects.create(
            title='Published Product', description='d', category='NEW_BOOK', is_published=True,
            listing_status='ACTIVE', price=500, stock=10)
        Product.objects.create(
            title='Unpublished Product', description='d', category='NEW_BOOK', is_published=False,
            listing_status='ACTIVE', price=500, stock=10)

        response = self.client.get('/api/marketplace/public/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [p['title'] for p in response.data]
        self.assertEqual(titles, ['Published Product'])

    def test_response_has_real_fields_only(self):
        Product.objects.create(
            title='Mock Set', description='d', category='NEW_BOOK', is_published=True,
            listing_status='ACTIVE', price=500, discount_price=350, stock=10
        )
        response = self.client.get('/api/marketplace/public/products/')
        row = response.data[0]
        self.assertEqual(row['final_price'], '350.00')
        self.assertNotIn('rating', row)
        self.assertNotIn('reviews', row)

    def test_anonymous_access_allowed(self):
        response = self.client.get('/api/marketplace/public/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)



from marketplace.models import Order, Cart, CartItem, OrderItem, MarketplaceSettings, DeliveryAddress
from decimal import Decimal
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile

class BugFixRegressionTests(APITestCase):
    def setUp(self):
        self.student1 = User.objects.create_user(
            username='student1', email='student1@test.com', password='password123', role='STUDENT'
        )
        self.student2 = User.objects.create_user(
            username='student2', email='student2@test.com', password='password123', role='STUDENT'
        )
        self.seller = User.objects.create_user(
            username='seller1', email='seller@test.com', password='password123', role='STUDENT'
        )
        self.product = Product.objects.create(
            seller=self.seller, title='Test Notes', category='USED_BOOK', description='A note',
            price=Decimal('1000.00'), stock=5, listing_status='ACTIVE', is_published=True
        )
        self.order = Order.objects.create(
            student=self.student1, total_amount=Decimal('1000.00'),
            delivery_fee=Decimal('50.00'), status='PENDING_PAYMENT'
        )
        self.payment_method = PaymentMethod.objects.create(
            method_type='ESEWA', display_name='eSewa',
            account_name='Test', account_number='123'
        )
        MarketplaceSettings.get_settings() # Ensure it exists

    @patch('core.google_drive.upload_file')
    def test_payment_submission_ownership_valid(self, mock_upload):
        """Regression test for Bug 4: Owner can submit payment"""
        self.client.force_authenticate(user=self.student1)
        mock_upload.return_value = {'id': 'mock_id'}
        import base64
        gif_data = base64.b64decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
        dummy_file = SimpleUploadedFile('test.gif', gif_data, content_type='image/gif')
        resp = self.client.post('/api/marketplace/student/payment-submissions/', {
            'order': self.order.id,
            'payment_method': self.payment_method.id,
            'transaction_id': 'TXN123',
            'screenshot': dummy_file
        }, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_payment_submission_ownership_invalid(self):
        """Regression test for Bug 4: Non-owner gets 403"""
        self.client.force_authenticate(user=self.student2)
        import base64
        gif_data = base64.b64decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
        dummy_file = SimpleUploadedFile('test.gif', gif_data, content_type='image/gif')
        resp = self.client.post('/api/marketplace/student/payment-submissions/', {
            'order': self.order.id,
            'payment_method': self.payment_method.id,
            'transaction_id': 'TXN456',
            'screenshot': dummy_file
        }, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_listing_edit_nameerror(self):
        """Regression test for Bug 2: Edit S2S listing without NameError"""
        self.client.force_authenticate(user=self.seller)
        resp = self.client.patch(f'/api/marketplace/student/my-listings/{self.product.id}/', {
            'price': Decimal('900.00')
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('900.00'))

    def test_seller_cannot_edit_other_listing(self):
        self.client.force_authenticate(user=self.student1)
        resp = self.client.patch(f'/api/marketplace/student/my-listings/{self.product.id}/', {
            'price': Decimal('900.00')
        })
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_checkout_commission_calculation(self):
        """Regression test for Bug 1: Commission calculated during checkout"""
        cart, _ = Cart.objects.get_or_create(student=self.student1)
        CartItem.objects.create(cart=cart, product=self.product, quantity=2)
        
        addr = DeliveryAddress.objects.create(
            student=self.student1, full_name='Test', phone_number='980000',
            province='Bagmati', district='KTM', municipality='KTM', ward_number='1', tole_area='Baneshwor'
        )
        
        self.client.force_authenticate(user=self.student1)
        resp = self.client.post('/api/marketplace/student/orders/checkout/', {
            'delivery_address_id': addr.id
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        
        order_id = resp.data['id']
        order_item = OrderItem.objects.get(order_id=order_id)
        
        self.assertEqual(order_item.commission_amount, Decimal('100.00'))
        self.assertEqual(order_item.seller_earning, Decimal('1900.00'))

    def test_cart_item_quantity_update_valid(self):
        """Regression test for Bug 5: PATCH .../cart/items/{id}/ works (was a 404 - route didn't exist)"""
        cart, _ = Cart.objects.get_or_create(student=self.student1)
        item = CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        self.client.force_authenticate(user=self.student1)
        resp = self.client.patch(f'/api/marketplace/student/cart/items/{item.id}/', {'quantity': 3}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 3)

    def test_cart_item_quantity_update_exceeds_stock(self):
        cart, _ = Cart.objects.get_or_create(student=self.student1)
        item = CartItem.objects.create(cart=cart, product=self.product, quantity=1)  # product.stock == 5

        self.client.force_authenticate(user=self.student1)
        resp = self.client.patch(f'/api/marketplace/student/cart/items/{item.id}/', {'quantity': 99}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 1)  # unchanged

    def test_cart_item_quantity_update_invalid_value(self):
        cart, _ = Cart.objects.get_or_create(student=self.student1)
        item = CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        self.client.force_authenticate(user=self.student1)
        resp = self.client.patch(f'/api/marketplace/student/cart/items/{item.id}/', {'quantity': 0}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cart_item_update_blocked_for_other_student(self):
        """IDOR check: Student B cannot update Student A's cart item."""
        cart, _ = Cart.objects.get_or_create(student=self.student1)
        item = CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        self.client.force_authenticate(user=self.student2)
        resp = self.client.patch(f'/api/marketplace/student/cart/items/{item.id}/', {'quantity': 2}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 1)  # unchanged

    def test_cart_item_delete(self):
        cart, _ = Cart.objects.get_or_create(student=self.student1)
        item = CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        self.client.force_authenticate(user=self.student1)
        resp = self.client.delete(f'/api/marketplace/student/cart/items/{item.id}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CartItem.objects.filter(id=item.id).exists())

    def test_admin_update_item_fulfillment_status(self):
        """Regression test for Bug 6: admin per-item shipment status endpoint (was missing entirely)"""
        admin = User.objects.create_user(username='mp_admin', password='pw', role='admin', is_staff=True)
        item = OrderItem.objects.create(order=self.order, product=self.product, quantity=1, price=Decimal('1000.00'))

        self.client.force_authenticate(user=admin)
        resp = self.client.post(
            f'/api/marketplace/admin/orders/{self.order.id}/update_item_status/',
            {'item_id': item.id, 'fulfillment_status': 'SHIPPED'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.fulfillment_status, 'SHIPPED')

    def test_admin_update_item_payout_status(self):
        admin = User.objects.create_user(username='mp_admin2', password='pw', role='admin', is_staff=True)
        item = OrderItem.objects.create(order=self.order, product=self.product, quantity=1, price=Decimal('1000.00'))

        self.client.force_authenticate(user=admin)
        resp = self.client.post(
            f'/api/marketplace/admin/orders/{self.order.id}/update_item_status/',
            {'item_id': item.id, 'payout_status': 'ELIGIBLE'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.payout_status, 'ELIGIBLE')

    def test_non_admin_cannot_update_item_status(self):
        item = OrderItem.objects.create(order=self.order, product=self.product, quantity=1, price=Decimal('1000.00'))

        self.client.force_authenticate(user=self.student1)
        resp = self.client.post(
            f'/api/marketplace/admin/orders/{self.order.id}/update_item_status/',
            {'item_id': item.id, 'fulfillment_status': 'SHIPPED'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        item.refresh_from_db()
        self.assertEqual(item.fulfillment_status, 'PENDING')

    def test_update_item_status_rejects_invalid_value(self):
        admin = User.objects.create_user(username='mp_admin3', password='pw', role='admin', is_staff=True)
        item = OrderItem.objects.create(order=self.order, product=self.product, quantity=1, price=Decimal('1000.00'))

        self.client.force_authenticate(user=admin)
        resp = self.client.post(
            f'/api/marketplace/admin/orders/{self.order.id}/update_item_status/',
            {'item_id': item.id, 'fulfillment_status': 'NOT_A_REAL_STATUS'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
