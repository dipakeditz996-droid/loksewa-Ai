"""
Automated tests for NCM Phase 3: Live Delivery Charge & Destination Branch Selection at Checkout.

All tests mock NCM service/HTTP interactions and ensure:
- Branch listing and location-based recommendation matching
- Destination branch validation
- Live rate quoting via calculate_fee with NCM
- Fallback behavior when NCM is unavailable (fallback enabled vs disabled)
- Server-side recalculation: frontend cannot manipulate delivery charges or totals
- Strict preservation of the 15% COD advance / 85% balance rule
- Fully prepaid 100% payment calculation
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from marketplace.models import (
    Cart,
    CartItem,
    DeliveryAddress,
    DeliveryFeeRule,
    Order,
    Product,
)
from marketplace.ncm_service import NCMAPIError, NCMConnectionError, NCMService

User = get_user_model()


class NCMCheckoutIntegrationTests(TestCase):
    def setUp(self):
        cache.clear()
        NCMService._fallback_branches_cache = None

        self.client = APIClient()
        self.student = User.objects.create_user(
            username="student_ncm",
            email="student_ncm@test.com",
            password="password123",
            role="student",
        )
        self.seller = User.objects.create_user(
            username="seller_ncm",
            email="seller_ncm@test.com",
            password="password123",
            role="student",
        )
        self.client.force_authenticate(user=self.student)

        # Create active physical book
        self.product = Product.objects.create(
            seller=self.seller,
            title="Loksewa Section Officer Complete Guide",
            description="Comprehensive preparation textbook",
            price=Decimal("1000.00"),
            stock=10,
            listing_status="ACTIVE",
            is_published=True,
        )

        # Setup cart
        self.cart = Cart.objects.create(student=self.student)
        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=1,
        )

        # Setup saved delivery address
        self.address = DeliveryAddress.objects.create(
            student=self.student,
            full_name="Hari Prasad",
            phone_number="9841234567",
            province="Gandaki",
            district="Kaski",
            municipality="Pokhara",
            ward_number="8",
            tole_area="Srijana Chowk",
            is_default=True,
        )

        # Setup a local fallback DeliveryFeeRule for Kaski/Gandaki
        self.fallback_rule = DeliveryFeeRule.objects.create(
            name="Gandaki Regional Rule",
            province="Gandaki",
            district="Kaski",
            fee=Decimal("150.00"),
            is_active=True,
            priority=5,
        )

        self.mock_branches = [
            {
                "pk": 1,
                "code": "KTM",
                "name": "Kathmandu",
                "district_name": "Kathmandu",
                "province_name": "Bagmati",
                "municipality": "Kathmandu Metropolitan City",
                "areas_covered": ["Baneshwor", "Koteshwor"],
                "address": "New Road, Kathmandu",
                "contact_number": "01-4222222",
            },
            {
                "pk": 2,
                "code": "PKR",
                "name": "Pokhara",
                "district_name": "Kaski",
                "province_name": "Gandaki",
                "municipality": "Pokhara Lekhnath",
                "areas_covered": ["Lakeside", "Mahendrapool", "Srijana Chowk"],
                "address": "Prithvi Chowk, Pokhara",
                "contact_number": "061-522222",
            },
            {
                "pk": 3,
                "code": "BRT",
                "name": "Biratnagar",
                "district_name": "Morang",
                "province_name": "Koshi",
                "municipality": "Biratnagar Metropolitan City",
                "areas_covered": ["Traffic Chowk"],
                "address": "Main Road, Biratnagar",
                "contact_number": "021-422222",
            },
            {
                "pk": 4,
                "code": "TMG",
                "name": "Tamghas",
                "district_name": "Gulmi",
                "province_name": "Lumbini",
                "municipality": "Resunga Municipality",
                "areas_covered": ["Tamghas Bazar"],
                "address": "Tamghas, Gulmi",
                "contact_number": "079-520111",
            },
            {
                "pk": 5,
                "code": "MIL",
                "name": "Milam Hub",
                "district_name": "Doti",
                "province_name": "Sudurpashchim",
                "municipality": "Milam Gaunpalika",
                "areas_covered": ["Milam Bazar"],
            },
            {
                "pk": 6,
                "code": "KTM2",
                "name": "Kathmandu Central Hub",
                "district_name": "Kathmandu",
                "province_name": "Bagmati",
                "municipality": "Kathmandu",
                "areas_covered": ["Thamel", "Baneshwor"],
            },
        ]

    def tearDown(self):
        cache.clear()
        NCMService._fallback_branches_cache = None

    # --- 1. LOCAL-LEVEL-FIRST SEARCH & SUGGESTION MATCHING ---

    @override_settings(NCM_API_TOKEN="mock_token_123")
    @patch.object(NCMService, "get_branches")
    def test_ncm_branches_endpoint_with_suggestion(self, mock_get_branches):
        """Test GET ncm-branches returns branches and automatically matches municipality."""
        mock_get_branches.return_value = self.mock_branches

        url = "/api/marketplace/student/orders/ncm-branches/?district=Kaski&municipality=Pokhara"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["enabled"])
        self.assertEqual(len(data["branches"]), 6)
        self.assertEqual(data["auto_selected"], "Pokhara")
        self.assertEqual(data["match_type"], "municipality")
        self.assertEqual(data["match_priority"], 1)
        self.assertEqual(len(data["suggested_branches"]), 1)
        self.assertEqual(data["suggested_branches"][0]["name"], "Pokhara")
        self.assertEqual(data["suggested_branches"][0]["match_label"], "Matches Your Municipality")

    @override_settings(NCM_API_TOKEN="mock_token_123")
    @patch.object(NCMService, "get_branches")
    def test_exact_municipality_match(self, mock_get_branches):
        """Priority 1: Exact municipality match identifies local-level branch and ignores unrelated branches."""
        mock_get_branches.return_value = self.mock_branches

        # Test with normalized administrative suffix 'Pokhara Lekhnath Metropolitan City'
        url = "/api/marketplace/student/orders/ncm-branches/?district=Kaski&municipality=Pokhara+Lekhnath+Metropolitan+City"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["match_type"], "municipality")
        self.assertEqual(data["match_priority"], 1)
        self.assertEqual(data["auto_selected"], "Pokhara")
        self.assertEqual(data["suggested_branches"][0]["name"], "Pokhara")

    @override_settings(NCM_API_TOKEN="mock_token_123")
    @patch.object(NCMService, "get_branches")
    def test_covered_area_municipality_match(self, mock_get_branches):
        """Priority 1: Matches covered-area when student local level is in branch areas_covered."""
        mock_get_branches.return_value = self.mock_branches

        # Srijana Chowk is in Pokhara's areas_covered
        url = "/api/marketplace/student/orders/ncm-branches/?district=Kaski&municipality=Srijana+Chowk"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["match_type"], "municipality")
        self.assertEqual(data["match_priority"], 1)
        self.assertEqual(data["auto_selected"], "Pokhara")

    @override_settings(NCM_API_TOKEN="mock_token_123")
    @patch.object(NCMService, "get_branches")
    def test_multiple_branches_serving_one_municipality(self, mock_get_branches):
        """When multiple branches serve a local level, return all of them with the top one recommended."""
        mock_get_branches.return_value = self.mock_branches

        url = "/api/marketplace/student/orders/ncm-branches/?district=Kathmandu&municipality=Kathmandu+Metropolitan+City"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["match_type"], "municipality")
        self.assertEqual(len(data["suggested_branches"]), 2)
        # First branch is flagged as recommended
        self.assertTrue(data["suggested_branches"][0]["is_recommended"])
        self.assertEqual(data["auto_selected"], data["suggested_branches"][0]["name"])

    @override_settings(NCM_API_TOKEN="mock_token_123")
    @patch.object(NCMService, "get_branches")
    def test_district_fallback_when_municipality_has_no_match(self, mock_get_branches):
        """
        Priority 2: Only when municipality returns zero matches, fall back to district branches.
        Must show the exact required notice.
        """
        mock_get_branches.return_value = self.mock_branches

        # Chhatrakot is a municipality in Gulmi, but no NCM branch is named Chhatrakot
        url = "/api/marketplace/student/orders/ncm-branches/?district=Gulmi&municipality=Chhatrakot"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["match_type"], "district")
        self.assertEqual(data["match_priority"], 2)
        self.assertEqual(data["auto_selected"], "Tamghas")
        self.assertEqual(len(data["suggested_branches"]), 1)
        self.assertEqual(data["suggested_branches"][0]["name"], "Tamghas")
        self.assertEqual(data["suggested_branches"][0]["match_label"], "Serves Your District")
        self.assertEqual(
            data["message"],
            "No NCM branch was found for your local level. Here are the available NCM branches serving your district."
        )

    @override_settings(NCM_API_TOKEN="mock_token_123")
    @patch.object(NCMService, "get_branches")
    def test_no_district_match_returns_unavailable(self, mock_get_branches):
        """When neither municipality nor district has any branch, return honest unavailable status."""
        mock_get_branches.return_value = self.mock_branches

        url = "/api/marketplace/student/orders/ncm-branches/?district=Manang&municipality=Chame"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["match_type"], "none")
        self.assertEqual(data["match_priority"], 0)
        self.assertIsNone(data["auto_selected"])
        self.assertEqual(len(data["suggested_branches"]), 0)
        self.assertIn("No NCM branch was found for your local level or district", data["message"])

    @override_settings(NCM_API_TOKEN="mock_token_123")
    @patch.object(NCMService, "get_branches")
    def test_similar_names_no_false_matches(self, mock_get_branches):
        """Ensure token boundary normalization prevents false positive substring matches ('Ilam' vs 'Milam Hub')."""
        mock_get_branches.return_value = self.mock_branches

        url = "/api/marketplace/student/orders/ncm-branches/?district=Ilam&municipality=Ilam+Municipality"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Must not match 'Milam Hub' in Doti
        self.assertEqual(data["match_type"], "none")
        self.assertIsNone(data["auto_selected"])
        self.assertEqual(len(data["suggested_branches"]), 0)

    @override_settings(NCM_API_TOKEN="mock_token_123")
    @patch.object(NCMService, "get_branches")
    def test_municipality_and_district_changes(self, mock_get_branches):
        """Changing municipality or district updates recommendations dynamically."""
        mock_get_branches.return_value = self.mock_branches

        # First query: Kaski / Pokhara
        resp1 = self.client.get("/api/marketplace/student/orders/ncm-branches/?district=Kaski&municipality=Pokhara")
        self.assertEqual(resp1.json()["auto_selected"], "Pokhara")

        # Second query: Morang / Biratnagar
        resp2 = self.client.get("/api/marketplace/student/orders/ncm-branches/?district=Morang&municipality=Biratnagar")
        self.assertEqual(resp2.json()["auto_selected"], "Biratnagar")

    # --- 2. LIVE DELIVERY RATE CALCULATION ---

    @override_settings(NCM_API_TOKEN="mock_token_123", NCM_FALLBACK_TO_LOCAL_RULES=False)
    @patch.object(NCMService, "get_branches")
    @patch.object(NCMService, "calculate_rate")
    def test_calculate_fee_live_ncm_success(self, mock_calc_rate, mock_get_branches):
        """Test calculate_fee successfully returns live NCM quote."""
        mock_get_branches.return_value = self.mock_branches
        mock_calc_rate.return_value = {
            "success": True,
            "charge": 120.0,
            "source_branch": "Kathmandu",
            "destination_branch": "Pokhara",
            "delivery_type": "Door2Door",
        }

        url = "/api/marketplace/student/orders/calculate_fee/"
        payload = {
            "delivery_address_id": self.address.id,
            "destination_branch": "Pokhara",
            "delivery_type": "Door2Door",
        }
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["delivery_fee"], 120.0)
        self.assertEqual(data["fee_source"], "ncm")
        self.assertEqual(data["destination_branch"], "Pokhara")
        self.assertFalse(data["fallback_applied"])

    @override_settings(NCM_API_TOKEN="mock_token_123", NCM_FALLBACK_TO_LOCAL_RULES=False)
    @patch.object(NCMService, "get_branches")
    def test_calculate_fee_invalid_destination_branch_rejected(self, mock_get_branches):
        """Test calculate_fee rejects invalid branch name not in active NCM branches."""
        mock_get_branches.return_value = self.mock_branches

        url = "/api/marketplace/student/orders/calculate_fee/"
        payload = {
            "delivery_address_id": self.address.id,
            "destination_branch": "NonExistentBranch123",
        }
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not a valid NCM branch", response.json()["detail"])

    @override_settings(NCM_API_TOKEN="mock_token_123", NCM_FALLBACK_TO_LOCAL_RULES=False)
    @patch.object(NCMService, "get_branches")
    @patch.object(NCMService, "calculate_rate")
    def test_calculate_fee_ncm_failure_when_fallback_disabled(self, mock_calc_rate, mock_get_branches):
        """When NCM fails and fallback is disabled, return 502 error instead of silently falsifying rate."""
        mock_get_branches.return_value = self.mock_branches
        mock_calc_rate.side_effect = NCMConnectionError("Courier rate timeout")

        url = "/api/marketplace/student/orders/calculate_fee/"
        payload = {
            "delivery_address_id": self.address.id,
            "destination_branch": "Pokhara",
        }
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.json()["fee_source"], "ncm_error")

    @override_settings(NCM_API_TOKEN="mock_token_123", NCM_FALLBACK_TO_LOCAL_RULES=True)
    @patch.object(NCMService, "get_branches")
    @patch.object(NCMService, "calculate_rate")
    def test_calculate_fee_ncm_failure_when_fallback_enabled(self, mock_calc_rate, mock_get_branches):
        """When NCM fails and fallback is enabled, return local DeliveryFeeRule and flag fallback_applied."""
        mock_get_branches.return_value = self.mock_branches
        mock_calc_rate.side_effect = NCMConnectionError("Courier API Down")

        url = "/api/marketplace/student/orders/calculate_fee/"
        payload = {
            "delivery_address_id": self.address.id,
            "destination_branch": "Pokhara",
        }
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(Decimal(str(data["delivery_fee"])), Decimal("150.00"))
        self.assertEqual(data["fee_source"], "rule_fallback")
        self.assertTrue(data["fallback_applied"])

    # --- 3. SERVER-SIDE CHECKOUT VALIDATION & ANTI-MANIPULATION ---

    @override_settings(NCM_API_TOKEN="mock_token_123", NCM_FALLBACK_TO_LOCAL_RULES=False)
    @patch.object(NCMService, "get_branches")
    @patch.object(NCMService, "calculate_rate")
    def test_checkout_server_recalculates_delivery_fee_and_total(self, mock_calc_rate, mock_get_branches):
        """
        Verify that frontend-submitted totals or rates are ignored:
        Server independently contacts NCM, quotes delivery, calculates final total,
        and saves snapshot details.
        """
        mock_get_branches.return_value = self.mock_branches
        mock_calc_rate.return_value = {
            "success": True,
            "charge": 135.0,
            "source_branch": "Kathmandu",
            "destination_branch": "Pokhara",
            "delivery_type": "Door2Door",
        }

        checkout_payload = {
            "delivery_address_id": self.address.id,
            "destination_branch": "Pokhara",
            "delivery_type": "Door2Door",
            "payment_mode": "PREPAID",
            # Attempt to manipulate price from frontend
            "delivery_fee": 10.0,
            "total_amount": 500.0,
        }

        response = self.client.post("/api/marketplace/student/orders/checkout/", checkout_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(id=response.json()["id"])
        # Product price (1000) + verified NCM fee (135) = 1135
        self.assertEqual(order.delivery_fee, Decimal("135.00"))
        self.assertEqual(order.total_amount, Decimal("1000.00"))
        self.assertEqual(order.final_total, Decimal("1135.00"))

        # Snapshot check
        snapshot = order.shipping_address_snapshot
        self.assertEqual(snapshot.get("ncm_destination_branch"), "Pokhara")
        self.assertEqual(snapshot.get("delivery_fee_source"), "ncm")
        self.assertEqual(snapshot.get("delivery_fee_quoted"), 135.0)

    # --- 4. STRICT 15% COD / 85% BALANCE SPLIT REGRESSION ---

    @override_settings(NCM_API_TOKEN="mock_token_123", NCM_FALLBACK_TO_LOCAL_RULES=False)
    @patch.object(NCMService, "get_branches")
    @patch.object(NCMService, "calculate_rate")
    def test_checkout_cod_15_advance_85_balance_calculation(self, mock_calc_rate, mock_get_branches):
        """
        Strict business rule:
        For COD, delivery fee is included in final_total.
        cod_advance_required = 15% of final_total.
        cod_remaining_balance = 85% of final_total.
        """
        mock_get_branches.return_value = self.mock_branches
        mock_calc_rate.return_value = {
            "success": True,
            "charge": 200.0,
            "source_branch": "Kathmandu",
            "destination_branch": "Pokhara",
            "delivery_type": "Door2Door",
        }

        checkout_payload = {
            "delivery_address_id": self.address.id,
            "destination_branch": "Pokhara",
            "delivery_type": "Door2Door",
            "payment_mode": "COD",
        }

        response = self.client.post("/api/marketplace/student/orders/checkout/", checkout_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(id=response.json()["id"])
        self.assertTrue(order.is_cod)
        self.assertEqual(order.total_amount, Decimal("1000.00"))
        self.assertEqual(order.delivery_fee, Decimal("200.00"))
        self.assertEqual(order.final_total, Decimal("1200.00"))

        # 15% of 1200 = 180.00
        self.assertEqual(order.cod_advance_required, Decimal("180.00"))
        # 85% of 1200 = 1020.00
        self.assertEqual(order.cod_remaining_balance, Decimal("1020.00"))
        self.assertEqual(order.payment_status, "UNPAID")

    # --- 5. FULLY PREPAID ORDER CALCULATION ---

    @override_settings(NCM_API_TOKEN="mock_token_123", NCM_FALLBACK_TO_LOCAL_RULES=False)
    @patch.object(NCMService, "get_branches")
    @patch.object(NCMService, "calculate_rate")
    def test_checkout_prepaid_calculation(self, mock_calc_rate, mock_get_branches):
        """For PREPAID orders, COD advance/remaining balance must both be 0.00."""
        mock_get_branches.return_value = self.mock_branches
        mock_calc_rate.return_value = {
            "success": True,
            "charge": 100.0,
            "source_branch": "Kathmandu",
            "destination_branch": "Pokhara",
            "delivery_type": "Door2Door",
        }

        checkout_payload = {
            "delivery_address_id": self.address.id,
            "destination_branch": "Pokhara",
            "payment_mode": "PREPAID",
        }

        response = self.client.post("/api/marketplace/student/orders/checkout/", checkout_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(id=response.json()["id"])
        self.assertFalse(order.is_cod)
        self.assertEqual(order.final_total, Decimal("1100.00"))
        self.assertEqual(order.cod_advance_required, Decimal("0.00"))
        self.assertEqual(order.cod_remaining_balance, Decimal("0.00"))

    # --- 6. CHECKOUT BLOCKED WHEN NCM FAILS AND FALLBACK DISABLED ---

    @override_settings(NCM_API_TOKEN="mock_token_123", NCM_FALLBACK_TO_LOCAL_RULES=False)
    @patch.object(NCMService, "get_branches")
    @patch.object(NCMService, "calculate_rate")
    def test_checkout_blocked_when_ncm_fails_and_fallback_disabled(self, mock_calc_rate, mock_get_branches):
        """Checkout must fail with validation error if NCM cannot calculate rate and fallback is disabled."""
        mock_get_branches.return_value = self.mock_branches
        mock_calc_rate.side_effect = NCMConnectionError("Courier network unreachable")

        checkout_payload = {
            "delivery_address_id": self.address.id,
            "destination_branch": "Pokhara",
        }

        response = self.client.post("/api/marketplace/student/orders/checkout/", checkout_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Courier delivery rate calculation failed", response.json()["detail"])

    # --- 7. CHECKOUT SUCCEEDS WITH FALLBACK WHEN ENABLED ---

    @override_settings(NCM_API_TOKEN="mock_token_123", NCM_FALLBACK_TO_LOCAL_RULES=True)
    @patch.object(NCMService, "get_branches")
    @patch.object(NCMService, "calculate_rate")
    def test_checkout_succeeds_with_fallback_when_enabled(self, mock_calc_rate, mock_get_branches):
        """Checkout falls back to DeliveryFeeRule when NCM fails and fallback is enabled."""
        mock_get_branches.return_value = self.mock_branches
        mock_calc_rate.side_effect = NCMAPIError("Courier error 500", status_code=500)

        checkout_payload = {
            "delivery_address_id": self.address.id,
            "destination_branch": "Pokhara",
        }

        response = self.client.post("/api/marketplace/student/orders/checkout/", checkout_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(id=response.json()["id"])
        self.assertEqual(order.delivery_fee, Decimal("150.00"))
        self.assertEqual(order.shipping_address_snapshot.get("delivery_fee_source"), "rule_fallback")
        self.assertTrue(order.shipping_address_snapshot.get("fallback_applied"))
