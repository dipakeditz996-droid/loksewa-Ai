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


class CheckoutAndDeliveryFeeTests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_superuser(
            username='admin_test',
            email='admin@test.com',
            password='Password123!',
            role='admin'
        )
        self.student1 = User.objects.create_user(
            username='student1',
            email='student1@test.com',
            password='Password123!',
            first_name='Diwas',
            last_name='Sharma',
            role='student'
        )
        self.student2 = User.objects.create_user(
            username='student2',
            email='student2@test.com',
            password='Password123!',
            first_name='Hari',
            last_name='Thapa',
            role='student'
        )

        # Student 1 profile with registration info
        self.profile1, _ = StudentProfile.objects.get_or_create(user=self.student1)
        self.profile1.phone = '9841234567'
        self.profile1.permanent_district = 'Kathmandu'
        self.profile1.permanent_local_level = 'Kathmandu Metropolitan'
        self.profile1.save()

        # Student 2 profile
        self.profile2, _ = StudentProfile.objects.get_or_create(user=self.student2)
        self.profile2.phone = '9812345678'
        self.profile2.permanent_district = 'Kaski'
        self.profile2.permanent_local_level = 'Pokhara Lekhnath Metropolitan'
        self.profile2.save()

        # Active products
        self.product1 = Product.objects.create(
            title='Loksewa GK Comprehensive',
            description='GK guide for 5th level',
            category='NEW_BOOK',
            price=Decimal('500.00'),
            delivery_fee=Decimal('60.00'),
            stock=10,
            is_published=True,
            listing_status='ACTIVE'
        )
        self.product2 = Product.objects.create(
            title='Loksewa IQ Mastery',
            description='IQ guide',
            category='NEW_BOOK',
            price=Decimal('400.00'),
            delivery_fee=Decimal('80.00'),
            stock=10,
            is_published=True,
            listing_status='ACTIVE'
        )

        # Payment method
        self.method = PaymentMethod.objects.create(
            method_type='ESEWA',
            display_name='eSewa LoksewaAI',
            account_name='LoksewaAI Account',
            account_number='9841234567',
            is_active=True
        )

    # 1. Admin delivery fee creation, updating, and negative validation
    def test_admin_set_and_update_delivery_fee(self):
        self.client.force_authenticate(user=self.admin)
        
        # Create product with delivery fee
        create_resp = self.client.post('/api/marketplace/admin/products/', {
            'title': 'Loksewa Samanya Gyan',
            'description': 'Full syllabus',
            'category': 'NEW_BOOK',
            'price': '650.00',
            'stock': 15,
            'is_published': True,
            'delivery_fee': '75.00'
        }, format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED, create_resp.data)
        prod_id = create_resp.data['id']
        self.assertEqual(Decimal(str(create_resp.data['delivery_fee'])), Decimal('75.00'))

        # Update delivery fee
        patch_resp = self.client.patch(f'/api/marketplace/admin/products/{prod_id}/', {
            'delivery_fee': '110.00'
        }, format='json')
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(patch_resp.data['delivery_fee'])), Decimal('110.00'))

        # Negative delivery fee must be rejected
        neg_resp = self.client.patch(f'/api/marketplace/admin/products/{prod_id}/', {
            'delivery_fee': '-30.00'
        }, format='json')
        self.assertEqual(neg_resp.status_code, status.HTTP_400_BAD_REQUEST)

    # 2. Unauthorized / students cannot change product delivery fees
    def test_unauthorized_and_students_cannot_change_delivery_fee(self):
        # Anonymous
        resp = self.client.patch(f'/api/marketplace/admin/products/{self.product1.id}/', {
            'delivery_fee': '0.00'
        }, format='json')
        self.assertIn(resp.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

        # Student cannot access admin product endpoints
        self.client.force_authenticate(user=self.student1)
        resp2 = self.client.patch(f'/api/marketplace/admin/products/{self.product1.id}/', {
            'delivery_fee': '0.00'
        }, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_403_FORBIDDEN)

        # Student seller listing has delivery_fee read-only
        seller_resp = self.client.post('/api/marketplace/student/seller/listings/', {
            'title': 'Used Officer GK',
            'description': 'Good condition',
            'category': 'USED_BOOK',
            'price': '300.00',
            'stock': 1,
            'delivery_fee': '500.00'  # Attempting to tamper delivery fee
        }, format='json')
        if seller_resp.status_code == status.HTTP_201_CREATED:
            # Must remain default 0.00 because delivery_fee is in read_only_fields
            self.assertEqual(Decimal(str(seller_resp.data.get('delivery_fee', '0.00'))), Decimal('0.00'))

    # 3. Student profile address endpoint & missing fields derivation
    def test_student_profile_address_endpoint(self):
        self.client.force_authenticate(user=self.student1)
        resp = self.client.get('/api/marketplace/student/delivery-addresses/profile-address/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data

        self.assertEqual(data['full_name'], 'Diwas Sharma')
        self.assertEqual(data['phone_number'], '9841234567')
        self.assertEqual(data['district'], 'Kathmandu')
        self.assertEqual(data['municipality'], 'Kathmandu Metropolitan')
        # Province automatically resolved from district
        self.assertEqual(data['province'], 'Bagmati Province')
        # Missing fields should flag ward_number and tole_area
        self.assertIn('ward_number', data['missing_fields'])
        self.assertIn('tole_area', data['missing_fields'])
        self.assertFalse(data['is_profile_complete'])

    # 4. Student isolation: Student 1 cannot get Student 2's profile info
    def test_student_isolation_profile_and_addresses(self):
        # Create address for Student 2
        addr2 = DeliveryAddress.objects.create(
            student=self.student2,
            full_name='Hari Thapa',
            phone_number='9812345678',
            province='Gandaki',
            district='Kaski',
            municipality='Pokhara',
            ward_number='8',
            tole_area='Srijana Chowk'
        )

        # Student 1 authenticates
        self.client.force_authenticate(user=self.student1)

        # Student 1 profile address only returns Student 1 info
        resp = self.client.get('/api/marketplace/student/delivery-addresses/profile-address/')
        self.assertEqual(resp.data['full_name'], 'Diwas Sharma')
        self.assertNotEqual(resp.data['full_name'], 'Hari Thapa')

        # Student 1 cannot view Student 2's saved address
        resp2 = self.client.get(f'/api/marketplace/student/delivery-addresses/{addr2.id}/')
        self.assertEqual(resp2.status_code, status.HTTP_404_NOT_FOUND)

        # Student 1 cannot checkout using Student 2's address ID
        cart, _ = Cart.objects.get_or_create(student=self.student1)
        CartItem.objects.create(cart=cart, product=self.product1, quantity=1)
        checkout_resp = self.client.post('/api/marketplace/student/orders/checkout/', {
            'delivery_address_id': addr2.id
        }, format='json')
        self.assertEqual(checkout_resp.status_code, status.HTTP_404_NOT_FOUND)

    # 5. Order snapshot and authoritative totals
    def test_checkout_saves_address_snapshot_and_preserves_after_profile_changes(self):
        self.client.force_authenticate(user=self.student1)
        cart, _ = Cart.objects.get_or_create(student=self.student1)
        CartItem.objects.all().delete()
        CartItem.objects.create(cart=cart, product=self.product1, quantity=2)  # 2 * 500 = 1000

        # Checkout using "Use my existing info" payload with completed ward & tole
        checkout_payload = {
            'delivery_address': {
                'full_name': 'Diwas Sharma',
                'phone_number': '9841234567',
                'province': 'Bagmati',
                'district': 'Kathmandu',
                'municipality': 'Kathmandu Metropolitan',
                'ward_number': '10',
                'tole_area': 'New Baneshwor',
                'street_landmark': 'Opposite Everest Hotel',
                'delivery_note': 'Ring doorbell on arrival'
            },
            'save_to_addresses': True
        }
        resp = self.client.post('/api/marketplace/student/orders/checkout/', checkout_payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        order_data = resp.data
        order_id = order_data['id']

        order = Order.objects.get(id=order_id)
        # Authoritative Subtotal
        self.assertEqual(order.total_amount, Decimal('1000.00'))
        # Authoritative delivery fee for product1 (single shipment, not multiplied by qty 2)
        self.assertEqual(order.delivery_fee, Decimal('60.00'))
        # Final total
        self.assertEqual(order.total_amount + order.delivery_fee, Decimal('1060.00'))

        # Check snapshot stored
        snapshot = order.shipping_address_snapshot
        self.assertEqual(snapshot['full_name'], 'Diwas Sharma')
        self.assertEqual(snapshot['ward_number'], '10')
        self.assertEqual(snapshot['tole_area'], 'New Baneshwor')
        self.assertEqual(snapshot['street_landmark'], 'Opposite Everest Hotel')

        # Now change student profile
        self.profile1.permanent_district = 'Lalitpur'
        self.profile1.permanent_local_level = 'Lalitpur Metropolitan'
        self.profile1.save()

        # Refresh order from DB: snapshot must remain unchanged
        order.refresh_from_db()
        self.assertEqual(order.shipping_address_snapshot['district'], 'Kathmandu')
        self.assertEqual(order.shipping_address_snapshot['municipality'], 'Kathmandu Metropolitan')

    # 6. Multi-product order delivery fee calculation (does not charge duplicate per-item fees)
    def test_multi_product_delivery_fee_calculation(self):
        self.client.force_authenticate(user=self.student1)
        cart, _ = Cart.objects.get_or_create(student=self.student1)
        CartItem.objects.all().delete()
        # Product 1 fee: 60.00 (qty 2)
        # Product 2 fee: 80.00 (qty 1)
        CartItem.objects.create(cart=cart, product=self.product1, quantity=2)
        CartItem.objects.create(cart=cart, product=self.product2, quantity=1)

        saved_addr = DeliveryAddress.objects.create(
            student=self.student1,
            full_name='Diwas Sharma',
            phone_number='9841234567',
            province='Bagmati',
            district='Kathmandu',
            municipality='Kathmandu Metropolitan',
            ward_number='31',
            tole_area='Aloknagar'
        )

        resp = self.client.post('/api/marketplace/student/orders/checkout/', {
            'delivery_address_id': saved_addr.id
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(id=resp.data['id'])
        # Subtotal: 500*2 + 400*1 = 1400.00
        self.assertEqual(order.total_amount, Decimal('1400.00'))
        # Delivery fee: both products ship from platform/same seller, so max(60, 80) = 80.00
        self.assertEqual(order.delivery_fee, Decimal('80.00'))

    # 7. Regional DeliveryFeeRule integration
    def test_delivery_fee_rule_integration(self):
        self.client.force_authenticate(user=self.student1)
        # Create a regional rule for remote district Jumla
        DeliveryFeeRule.objects.create(
            province='Karnali',
            district='Jumla',
            fee=Decimal('150.00'),
            priority=10,
            is_active=True
        )

        fee_resp = self.client.post('/api/marketplace/student/orders/calculate_fee/', {
            'province': 'Karnali',
            'district': 'Jumla',
            'municipality': 'Chandannath'
        }, format='json')
        self.assertEqual(fee_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(fee_resp.data['delivery_fee'])), Decimal('150.00'))

    # 8. Payment verification uses correct total (total_amount + delivery_fee)
    def test_payment_submission_uses_correct_total(self):
        self.client.force_authenticate(user=self.student1)
        cart, _ = Cart.objects.get_or_create(student=self.student1)
        CartItem.objects.all().delete()
        CartItem.objects.create(cart=cart, product=self.product1, quantity=1)

        saved_addr = DeliveryAddress.objects.create(
            student=self.student1,
            full_name='Diwas Sharma',
            phone_number='9841234567',
            province='Bagmati',
            district='Kathmandu',
            municipality='Kathmandu',
            ward_number='1',
            tole_area='Naxal'
        )

        checkout_resp = self.client.post('/api/marketplace/student/orders/checkout/', {
            'delivery_address_id': saved_addr.id
        }, format='json')
        order_id = checkout_resp.data['id']
        order = Order.objects.get(id=order_id)
        # Expected total is 500.00 + 60.00 = 560.00
        expected_total = order.total_amount + order.delivery_fee

        # Submit payment
        pay_resp = self.client.post('/api/marketplace/student/payment-submissions/', {
            'order': order.id,
            'payment_method': self.method.id,
            'transaction_id': 'TXN-987654321',
            'screenshot': SimpleUploadedFile('sample.gif', b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;', content_type='image/gif')
        }, format='multipart')
        self.assertEqual(pay_resp.status_code, status.HTTP_201_CREATED, pay_resp.data)

        submission = PaymentSubmission.objects.get(id=pay_resp.data['id'])
        self.assertEqual(submission.expected_amount, expected_total)
        self.assertEqual(submission.submitted_amount, expected_total)
        self.assertEqual(submission.status, 'PENDING')

