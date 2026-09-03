from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from core.models import User
from marketplace.models import (
    Product, Order, OrderItem, PayoutAccount, SellerPayout, MarketplaceSettings
)


class PayoutTests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(username='seller1', password='pw', role='student')
        self.buyer = User.objects.create_user(username='buyer1', password='pw', role='student')
        self.admin = User.objects.create_user(username='admin1', password='pw', role='admin', is_staff=True)

        # Create settings
        self.settings = MarketplaceSettings.get_settings()
        self.settings.minimum_payout_amount = Decimal('500.00')
        self.settings.save()

        # Create a payout account
        self.payout_account = PayoutAccount.objects.create(
            seller=self.seller,
            method='ESEWA',
            account_name='Seller One',
            account_identifier='9800000000'
        )

        # Create a product
        self.product1 = Product.objects.create(
            seller=self.seller,
            title='Book 1',
            price=Decimal('1000.00'),
            condition='NEW',
            listing_status='ACTIVE'
        )

    def _create_eligible_earning(self, amount):
        order = Order.objects.create(
            student=self.buyer,
            status='DELIVERED',
            total_amount=amount,
            delivery_fee=0
        )
        OrderItem.objects.create(
            order=order,
            product=self.product1,
            quantity=1,
            price=amount,
            commission_amount=Decimal('0.00'),
            seller_earning=amount,
            fulfillment_status='DELIVERED',
            payout_status='ELIGIBLE'
        )

    def test_payout_balance(self):
        self._create_eligible_earning(Decimal('600.00'))
        self.client.force_authenticate(user=self.seller)
        url = reverse('student-payouts-balance')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['available_balance'], '600.00')

    def test_request_payout_success(self):
        self._create_eligible_earning(Decimal('600.00'))
        self.client.force_authenticate(user=self.seller)
        url = reverse('student-payouts-request')
        response = self.client.post(url, {
            'requested_amount': '500.00',
            'payout_account_id': self.payout_account.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SellerPayout.objects.count(), 1)
        
        # Check balance again
        balance_url = reverse('student-payouts-balance')
        bal_response = self.client.get(balance_url)
        self.assertEqual(bal_response.data['available_balance'], '100.00')
        self.assertEqual(bal_response.data['pending_payouts'], '500.00')

    def test_request_payout_insufficient_funds(self):
        self._create_eligible_earning(Decimal('400.00'))
        self.client.force_authenticate(user=self.seller)
        url = reverse('student-payouts-request')
        response = self.client.post(url, {
            'requested_amount': '500.00',
            'payout_account_id': self.payout_account.id
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_request_payout_below_minimum(self):
        self._create_eligible_earning(Decimal('600.00'))
        self.client.force_authenticate(user=self.seller)
        url = reverse('student-payouts-request')
        response = self.client.post(url, {
            'requested_amount': '300.00',
            'payout_account_id': self.payout_account.id
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Minimum payout amount", response.data['detail'])

    def test_admin_update_payout_status(self):
        self._create_eligible_earning(Decimal('1000.00'))
        payout = SellerPayout.objects.create(
            seller=self.seller,
            payout_account=self.payout_account,
            requested_amount=Decimal('500.00'),
            status='PENDING'
        )

        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-payouts-update-status', kwargs={'pk': payout.id})
        
        # Admin approves
        res = self.client.post(url, {'status': 'APPROVED'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        payout.refresh_from_db()
        self.assertEqual(payout.status, 'APPROVED')

        # Admin pays without transaction ref -> should fail
        res2 = self.client.post(url, {'status': 'PAID'})
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

        # Admin pays with transaction ref -> success
        res3 = self.client.post(url, {'status': 'PAID', 'transaction_reference': 'TXN123'})
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        payout.refresh_from_db()
        self.assertEqual(payout.status, 'PAID')

        # Check seller balance
        self.client.force_authenticate(user=self.seller)
        bal = self.client.get(reverse('student-payouts-balance'))
        self.assertEqual(bal.data['available_balance'], '500.00')
        self.assertEqual(bal.data['paid_out'], '500.00')
