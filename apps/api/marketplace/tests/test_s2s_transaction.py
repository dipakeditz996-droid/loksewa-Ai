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
