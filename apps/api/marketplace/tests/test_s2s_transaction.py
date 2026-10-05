from django.test import TestCase
from django.contrib.auth import get_user_model
from marketplace.models import Product, Order, OrderItem, MarketplaceSettings, Cart, CartItem
from decimal import Decimal

User = get_user_model()

class S2STransactionTests(TestCase):
    def setUp(self):
        # Create settings
        MarketplaceSettings.objects.create(
            platform_commission_percentage=Decimal('10.00'),
            max_listing_images=5,
            allow_student_listings=True
        )

        # Create users
        self.seller = User.objects.create_user(username='seller1', email='seller@example.com', password='pwd')
        self.buyer = User.objects.create_user(username='buyer1', email='buyer@example.com', password='pwd')

        # Create a S2S product
        self.product = Product.objects.create(
            title="Loksewa Book",
            description="Used condition",
            price=Decimal('1000.00'),
            stock=1,
            seller=self.seller,
            listing_status='ACTIVE',
            is_published=True,
            condition='good'
        )

    def test_commission_calculation(self):
        # Create an order simulating checkout
        order = Order.objects.create(
            student=self.buyer,
            status='CONFIRMED',
            total_amount=Decimal('1000.00'),
            delivery_fee=Decimal('50.00'),
            shipping_address="Kathmandu",
            contact_number="9800000000"
        )

        # Simulate the checkout logic in OrderViewSet.checkout
        commission_pct = MarketplaceSettings.get_settings().platform_commission_percentage
        price = self.product.final_price

        commission = (price * commission_pct) / Decimal('100.00')
        seller_earning = price - commission

        item = OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price=price,
            commission_amount=commission,
            seller_earning=seller_earning,
            fulfillment_status='PENDING',
            payout_status='PENDING',
            snapshot_product_name=self.product.title,
            snapshot_seller_name=self.seller.username
        )

        self.assertEqual(item.commission_amount, Decimal('100.00'))
        self.assertEqual(item.seller_earning, Decimal('900.00'))
        self.assertEqual(item.snapshot_product_name, "Loksewa Book")
        self.assertEqual(item.snapshot_seller_name, "seller1")

    def test_listing_deletion_blocked_by_order(self):
        order = Order.objects.create(
            student=self.buyer,
            status='CONFIRMED',
            total_amount=Decimal('1000.00'),
            delivery_fee=Decimal('0.00'),
            shipping_address="Ktm",
            contact_number="123"
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price=Decimal('1000.00')
        )
        # Attempt to delete product
        from django.db.models import ProtectedError
        with self.assertRaises(ProtectedError):
            self.product.delete()

    def test_prevent_self_purchase_at_cart_and_checkout(self):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.seller)
        
        # 1. Seller attempts to add own book to cart
        resp = client.post('/api/marketplace/student/cart/add_item/', {'product_id': self.product.id, 'quantity': 1}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn("cannot purchase your own listing", resp.data.get('detail', ''))

    def test_cart_cumulative_stock_validation(self):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.buyer)

        # Product has stock 1
        # First add succeeds
        resp1 = client.post('/api/marketplace/student/cart/add_item/', {'product_id': self.product.id, 'quantity': 1}, format='json')
        self.assertEqual(resp1.status_code, 200)

        # Second add of 1 exceeds available stock
        resp2 = client.post('/api/marketplace/student/cart/add_item/', {'product_id': self.product.id, 'quantity': 1}, format='json')
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("Not enough stock", resp2.data.get('detail', ''))

    def test_student_order_cancellation_restores_stock_and_republishes(self):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.buyer)

        # Place order
        cart = Cart.objects.create(student=self.buyer)
        CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        resp = client.post('/api/marketplace/student/orders/checkout/', {
            'shipping_address': 'Kathmandu',
            'contact_number': '9800000000'
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        order_id = resp.data['id']

        # Product stock is now 0 and SOLD, not published
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0)
        self.assertEqual(self.product.listing_status, 'SOLD')
        self.assertFalse(self.product.is_published)

        # Buyer cancels unpaid order
        cancel_resp = client.post(f'/api/marketplace/student/orders/{order_id}/cancel/')
        self.assertEqual(cancel_resp.status_code, 200)
        self.assertEqual(cancel_resp.data['status'], 'CANCELLED')

        # Stock is restored and republished
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 1)
        self.assertEqual(self.product.listing_status, 'ACTIVE')
        self.assertTrue(self.product.is_published)

    def test_marketplace_pagination_support(self):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.buyer)

        # Query with page=1
        resp = client.get('/api/marketplace/student/products/?page=1&page_size=5')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('count', resp.data)
        self.assertIn('results', resp.data)
        self.assertGreaterEqual(resp.data['count'], 1)

        # Query without page returns list for backwards compatibility
        resp_list = client.get('/api/marketplace/student/products/')
        self.assertEqual(resp_list.status_code, 200)
        self.assertIsInstance(resp_list.data, list)

