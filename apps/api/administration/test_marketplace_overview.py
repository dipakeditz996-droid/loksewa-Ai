"""Tests for the extended AdminMarketplaceOverviewView: cancelledOrders,
revenueToday, revenueTrend, and paymentMethodBreakdown - all real ORM
aggregation, no fabricated numbers."""
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from marketplace.models import Product, PaymentMethod, PaymentSubmission, Purchase

URL = '/api/admin/marketplace/'


class MarketplaceOverviewTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin1', password='pw', role='admin', is_staff=True)
        self.student = User.objects.create_user(
            username='stu1', password='pw', role='student')

    def as_admin(self):
        self.client.force_authenticate(user=self.admin)

    def make_product(self, price='500.00'):
        return Product.objects.create(title='Pack', description='x', category='PDF', price=price)


class PermissionTests(MarketplaceOverviewTestBase):
    def test_anonymous_rejected(self):
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_rejected(self):
        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_403_FORBIDDEN)


class StatsTests(MarketplaceOverviewTestBase):
    def test_empty_database_returns_zeros(self):
        self.as_admin()
        resp = self.client.get(URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['totalProducts'], 0)
        self.assertEqual(resp.data['cancelledOrders'], 0)
        self.assertEqual(resp.data['revenue'], 0)
        self.assertEqual(resp.data['revenueToday'], 0)
        self.assertEqual(len(resp.data['revenueTrend']), 7)
        self.assertEqual(resp.data['paymentMethodBreakdown'], [])

    def test_cancelled_orders_counts_rejected_submissions(self):
        product = self.make_product()
        method = PaymentMethod.objects.create(
            method_type='ESEWA', display_name='eSewa', account_name='x', account_number='1')
        PaymentSubmission.objects.create(
            student=self.student, product=product, payment_method=method,
            transaction_id='T1', expected_amount=500, submitted_amount=500,
            screenshot='marketplace/payment_proofs/x.jpg', status='REJECTED',
        )
        self.as_admin()
        resp = self.client.get(URL)
        self.assertEqual(resp.data['cancelledOrders'], 1)

    def test_revenue_only_counts_active_purchases(self):
        product = self.make_product()
        Purchase.objects.create(student=self.student, product=product, amount_paid=500, status='ACTIVE')
        revoked_product = self.make_product()
        Purchase.objects.create(student=self.student, product=revoked_product, amount_paid=300, status='REVOKED')

        self.as_admin()
        resp = self.client.get(URL)
        self.assertEqual(resp.data['revenue'], 500.0)

    def test_revenue_today_only_counts_todays_purchases(self):
        product = self.make_product()
        Purchase.objects.create(student=self.student, product=product, amount_paid=500, status='ACTIVE')

        self.as_admin()
        resp = self.client.get(URL)
        self.assertEqual(resp.data['revenueToday'], 500.0)
        # Today's total must be included in the last day of the 7-day trend.
        self.assertEqual(resp.data['revenueTrend'][-1]['revenue'], 500.0)

    def test_payment_method_breakdown_percentages_sum_correctly(self):
        product = self.make_product()
        esewa = PaymentMethod.objects.create(
            method_type='ESEWA', display_name='eSewa', account_name='x', account_number='1')
        khalti = PaymentMethod.objects.create(
            method_type='KHALTI', display_name='Khalti', account_name='x', account_number='2')
        for i in range(3):
            PaymentSubmission.objects.create(
                student=self.student, product=product, payment_method=esewa,
                transaction_id=f'E{i}', expected_amount=500, submitted_amount=500,
                screenshot='marketplace/payment_proofs/x.jpg',
            )
        PaymentSubmission.objects.create(
            student=self.student, product=product, payment_method=khalti,
            transaction_id='K1', expected_amount=500, submitted_amount=500,
            screenshot='marketplace/payment_proofs/x.jpg',
        )
        self.as_admin()
        resp = self.client.get(URL)
        breakdown = {b['method']: b for b in resp.data['paymentMethodBreakdown']}
        self.assertEqual(breakdown['eSewa']['count'], 3)
        self.assertEqual(breakdown['Khalti']['count'], 1)
        self.assertEqual(breakdown['eSewa']['percentage'], 75.0)
        self.assertEqual(breakdown['Khalti']['percentage'], 25.0)
