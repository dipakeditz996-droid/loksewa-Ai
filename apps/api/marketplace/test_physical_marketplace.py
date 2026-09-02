from rest_framework import status
from rest_framework.test import APITestCase
from core.models import User
from marketplace.models import Product, DeliveryAddress, Order, OrderItem, PaymentSubmission, PaymentMethod, DeliveryFeeRule, OrderStatusHistory

class PhysicalMarketplaceTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.student = User.objects.create_user(
            username='stu1', password='pw', role='student')
        self.student2 = User.objects.create_user(
            username='stu2', password='pw', role='student')
        self.method = PaymentMethod.objects.create(
            method_type='ESEWA', display_name='eSewa',
            account_name='LoksewaAI', account_number='9800000000',
        )
        self.product = Product.objects.create(
            title='Loksewa Guide Book', description='Physical Book', category='NEW_BOOK',
            price='500.00', is_published=True, stock=10
        )
        self.digital_product = Product.objects.create(
            title='Loksewa Guide PDF', description='PDF', category='PDF',
            price='100.00', is_published=True, stock=0
        )

    def test_student_creates_delivery_address(self):
        self.client.force_authenticate(user=self.student)
        resp = self.client.post('/api/marketplace/student/delivery-addresses/', {
            'full_name': 'Ram Bahadur', 'phone_number': '9840000000',
            'province': 'Bagmati', 'district': 'Kathmandu', 'municipality': 'KTM',
            'ward_number': '1', 'tole_area': 'New Baneshwor',
            'is_default': True
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(DeliveryAddress.objects.filter(student=self.student).count(), 1)

    def test_student_retrieves_own_address(self):
        DeliveryAddress.objects.create(
            student=self.student, full_name='Ram Bahadur', phone_number='9840000000',
            province='Bagmati', district='Kathmandu', municipality='KTM',
            ward_number='1', tole_area='New Baneshwor'
        )
        self.client.force_authenticate(user=self.student)
        resp = self.client.get('/api/marketplace/student/delivery-addresses/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)

    def test_student_cannot_access_another_students_address(self):
        addr = DeliveryAddress.objects.create(
            student=self.student, full_name='Ram Bahadur', phone_number='9840000000',
            province='Bagmati', district='Kathmandu', municipality='KTM',
            ward_number='1', tole_area='New Baneshwor'
        )
        self.client.force_authenticate(user=self.student2)
        resp = self.client.get(f'/api/marketplace/student/delivery-addresses/{addr.id}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_checkout_requires_valid_delivery_address(self):
        self.client.force_authenticate(user=self.student)
        # add to cart
        self.client.post('/api/marketplace/student/cart/add_item/', {'product_id': self.product.id, 'quantity': 1})
        resp = self.client.post('/api/marketplace/student/orders/checkout/', {'delivery_address_id': 999})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Delivery address not found', str(resp.data))

    def test_checkout_stores_address_snapshot_and_checks_stock(self):
        addr = DeliveryAddress.objects.create(
            student=self.student, full_name='Ram Bahadur', phone_number='9840000000',
            province='Bagmati', district='Kathmandu', municipality='KTM',
            ward_number='1', tole_area='New Baneshwor'
        )
        self.client.force_authenticate(user=self.student)
        self.client.post('/api/marketplace/student/cart/add_item/', {'product_id': self.product.id, 'quantity': 2})
        
        # Initial stock is 10
        resp = self.client.post('/api/marketplace/student/orders/checkout/', {'delivery_address_id': addr.id})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        
        order = Order.objects.get(id=resp.data['id'])
        self.assertEqual(order.delivery_address_ref, addr)
        self.assertIn('Ram Bahadur', order.shipping_address)
        self.assertIn('9840000000', order.shipping_address)
        self.assertIn('Bagmati', order.shipping_address)
        
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)
        
        # Delete address, check order snapshot remains intact
        addr.delete()
        order.refresh_from_db()
        self.assertIn('Ram Bahadur', order.shipping_address)
        
    def test_digital_product_cannot_be_added_to_cart(self):
        self.client.force_authenticate(user=self.student)
        resp = self.client.post('/api/marketplace/student/cart/add_item/', {'product_id': self.digital_product.id, 'quantity': 1})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('only physical books', str(resp.data).lower())

    def test_payment_submission_updates_order_status(self):
        addr = DeliveryAddress.objects.create(
            student=self.student, full_name='Ram Bahadur', phone_number='9840000000',
            province='Bagmati', district='Kathmandu', municipality='KTM',
            ward_number='1', tole_area='New Baneshwor'
        )
        self.client.force_authenticate(user=self.student)
        self.client.post('/api/marketplace/student/cart/add_item/', {'product_id': self.product.id, 'quantity': 1})
        order_resp = self.client.post('/api/marketplace/student/orders/checkout/', {'delivery_address_id': addr.id})
        order_id = order_resp.data['id']
        
        # Upload payment proof
        import io
        from PIL import Image
        file_obj = io.BytesIO()
        image = Image.new("RGB", size=(1, 1), color=(255, 0, 0))
        image.save(file_obj, 'jpeg')
        file_obj.seek(0)
        from django.core.files.uploadedfile import SimpleUploadedFile
        screenshot = SimpleUploadedFile("proof.jpg", file_obj.read(), content_type="image/jpeg")
        resp = self.client.post('/api/marketplace/student/payment-submissions/', {
            'order': order_id,
            'payment_method': self.method.id,
            'transaction_id': 'TXN123',
            'screenshot': screenshot
        }, format='multipart')
        if resp.status_code != status.HTTP_201_CREATED:
            print("PAYMENT SUBMISSION ERROR:", resp.data)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        
        order = Order.objects.get(id=order_id)
        self.assertEqual(order.status, 'PAYMENT_SUBMITTED')

        # Admin approves
        submission = PaymentSubmission.objects.get(order_id=order_id)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/marketplace/admin/payment-submissions/{submission.id}/review/', {
            'status': 'APPROVED'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        
        order.refresh_from_db()
        self.assertEqual(order.status, 'CONFIRMED')

    def test_delivery_fee_priority_logic(self):
        # Global Rule
        DeliveryFeeRule.objects.create(name='Global', fee='100.00', priority=1)
        # Province Rule
        DeliveryFeeRule.objects.create(name='Bagmati', province='Bagmati', fee='80.00', priority=2)
        # District Rule
        DeliveryFeeRule.objects.create(name='KTM', province='Bagmati', district='Kathmandu', fee='50.00', priority=3)
        # Municipality Rule
        DeliveryFeeRule.objects.create(name='KMC', province='Bagmati', district='Kathmandu', municipality='KMC', fee='30.00', priority=4)
        
        addr1 = DeliveryAddress.objects.create(
            student=self.student, full_name='A', phone_number='1',
            province='Koshi', district='Morang', municipality='Biratnagar',
            ward_number='1', tole_area='A'
        )
        addr2 = DeliveryAddress.objects.create(
            student=self.student, full_name='B', phone_number='1',
            province='Bagmati', district='Bhaktapur', municipality='Bhaktapur',
            ward_number='1', tole_area='B'
        )
        addr3 = DeliveryAddress.objects.create(
            student=self.student, full_name='C', phone_number='1',
            province='Bagmati', district='Kathmandu', municipality='Kirtipur',
            ward_number='1', tole_area='C'
        )
        addr4 = DeliveryAddress.objects.create(
            student=self.student, full_name='D', phone_number='1',
            province='Bagmati', district='Kathmandu', municipality='KMC',
            ward_number='1', tole_area='D'
        )
        
        self.client.force_authenticate(user=self.student)
        
        # Test Global
        resp = self.client.post('/api/marketplace/student/orders/calculate_fee/', {'delivery_address_id': addr1.id})
        self.assertEqual(resp.data['delivery_fee'], 100.00)
        
        # Test Province
        resp = self.client.post('/api/marketplace/student/orders/calculate_fee/', {'delivery_address_id': addr2.id})
        self.assertEqual(resp.data['delivery_fee'], 80.00)
        
        # Test District
        resp = self.client.post('/api/marketplace/student/orders/calculate_fee/', {'delivery_address_id': addr3.id})
        self.assertEqual(resp.data['delivery_fee'], 50.00)
        
        # Test Municipality
        resp = self.client.post('/api/marketplace/student/orders/calculate_fee/', {'delivery_address_id': addr4.id})
        self.assertEqual(resp.data['delivery_fee'], 30.00)

    def test_admin_update_order_status(self):
        order = Order.objects.create(
            student=self.student,
            total_amount=500,
            delivery_fee=100,
            status='CONFIRMED'
        )
        self.client.force_authenticate(user=self.admin)
        
        resp = self.client.post(f'/api/marketplace/admin/orders/{order.id}/update_status/', {
            'status': 'SHIPPED',
            'note': 'Package sent'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'SHIPPED')
        
        # Check history
        history = OrderStatusHistory.objects.filter(order=order).order_by('-created_at').first()
        self.assertEqual(history.new_status, 'SHIPPED')
        self.assertEqual(history.previous_status, 'CONFIRMED')
        self.assertEqual(history.note, 'Package sent')
        self.assertEqual(history.changed_by, self.admin)
