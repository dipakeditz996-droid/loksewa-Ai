from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from marketplace.models import Product, MarketplaceSettings


class SellerListingPricingRuleTests(APITestCase):
    """
    S2S used-book pricing rule: a listing's offer price (Product.price)
    cannot exceed MarketplaceSettings.max_used_book_price_percent (default
    65%) of its marked price (Product.marked_price). Enforced server-side in
    SellerListingSerializer.validate() - the frontend calculator is only a
    convenience, so every case here goes through the real DRF endpoint,
    never the serializer/model directly, to prove a raw API call can't
    bypass it.
    """

    LISTING_URL = '/api/marketplace/student/my-listings/'

    def setUp(self):
        self.student = User.objects.create_user(
            username='seller1', password='pw', role='student')
        self.client.force_authenticate(user=self.student)

    def _payload(self, marked_price, price, **overrides):
        payload = {
            'title': 'Loksewa Tayari Pustika',
            'description': 'Used book in good condition.',
            'category': 'USED_BOOK',
            'marked_price': marked_price,
            'price': price,
            'condition': 'GOOD',
            'stock': 1,
            'location': 'Kathmandu',
            'negotiable': False,
        }
        payload.update(overrides)
        return payload

    def test_offer_price_within_65_percent_is_accepted(self):
        # 500 marked, 300 offer (60%) - comfortably valid.
        resp = self.client.post(self.LISTING_URL, self._payload('500.00', '300.00'), format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        product = Product.objects.get(pk=resp.data['id'])
        self.assertEqual(product.marked_price, Decimal('500.00'))
        self.assertEqual(product.price, Decimal('300.00'))

    def test_offer_price_at_exact_65_percent_boundary_is_accepted(self):
        # 500 * 65% = 325.00 exactly - the boundary must be valid, not rejected.
        resp = self.client.post(self.LISTING_URL, self._payload('500.00', '325.00'), format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

    def test_offer_price_one_rupee_over_65_percent_is_rejected(self):
        # 500 * 65% = 325.00, so 326 is invalid.
        resp = self.client.post(self.LISTING_URL, self._payload('500.00', '326.00'), format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price', resp.data)
        self.assertEqual(Product.objects.filter(seller=self.student).count(), 0)

    def test_larger_values_at_exact_boundary_accepted(self):
        # 1000 * 65% = 650.00 exactly.
        resp = self.client.post(self.LISTING_URL, self._payload('1000.00', '650.00'), format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

    def test_larger_values_just_over_boundary_rejected(self):
        resp = self.client.post(self.LISTING_URL, self._payload('1000.00', '651.00'), format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price', resp.data)

    def test_zero_marked_price_rejected(self):
        resp = self.client.post(self.LISTING_URL, self._payload('0', '100.00'), format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('marked_price', resp.data)

    def test_negative_marked_price_rejected(self):
        resp = self.client.post(self.LISTING_URL, self._payload('-50.00', '10.00'), format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('marked_price', resp.data)

    def test_zero_offer_price_rejected(self):
        resp = self.client.post(self.LISTING_URL, self._payload('500.00', '0'), format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price', resp.data)

    def test_negative_offer_price_rejected(self):
        resp = self.client.post(self.LISTING_URL, self._payload('500.00', '-10.00'), format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price', resp.data)

    def test_missing_marked_price_rejected(self):
        payload = self._payload('500.00', '100.00')
        del payload['marked_price']
        resp = self.client.post(self.LISTING_URL, payload, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('marked_price', resp.data)

    def test_non_numeric_price_rejected(self):
        resp = self.client.post(self.LISTING_URL, self._payload('abc', '100.00'), format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('marked_price', resp.data)

    def test_admin_configured_percent_is_respected(self):
        # Drop the cap to 50% via the real admin-configurable singleton and
        # confirm the serializer uses the live value, not a hardcoded 65.
        settings = MarketplaceSettings.get_settings()
        settings.max_used_book_price_percent = Decimal('50.00')
        settings.save(update_fields=['max_used_book_price_percent'])

        # 60% of 500 = 300, which is fine under the old 65% rule but invalid at 50%.
        resp = self.client.post(self.LISTING_URL, self._payload('500.00', '300.00'), format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        resp = self.client.post(self.LISTING_URL, self._payload('500.00', '250.00'), format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

    def test_update_re_validates_pricing_rule(self):
        resp = self.client.post(self.LISTING_URL, self._payload('500.00', '300.00'), format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        listing_id = resp.data['id']

        resp = self.client.patch(f'{self.LISTING_URL}{listing_id}/', {'price': '400.00'}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price', resp.data)


class MarketplacePricingPolicyViewTests(APITestCase):
    """Any authenticated student can read the real commission % and price cap."""

    def setUp(self):
        self.student = User.objects.create_user(
            username='seller2', password='pw', role='student')

    def test_authenticated_student_can_read_pricing_policy(self):
        self.client.force_authenticate(user=self.student)
        resp = self.client.get('/api/marketplace/student/pricing-policy/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('platform_commission_percentage', resp.data)
        self.assertIn('max_used_book_price_percent', resp.data)
        self.assertEqual(Decimal(resp.data['max_used_book_price_percent']), Decimal('65.00'))

    def test_unauthenticated_request_rejected(self):
        resp = self.client.get('/api/marketplace/student/pricing-policy/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
