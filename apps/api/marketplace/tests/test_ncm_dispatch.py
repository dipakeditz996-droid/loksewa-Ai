"""
Automated tests for NCM Phase 4: CourierShipment Model & Admin Dispatch Workflow.

All tests use mocked NCM service responses and verify:
- Admin permission gating
- Dispatch eligibility checks (order status must be CONFIRMED or PROCESSING)
- Payment verification enforcement:
  * COD orders require PARTIALLY_PAID (15% advance verified)
  * Prepaid orders require PAID (100% verified)
- Accurate COD amount passed to NCM:
  * 85% remaining balance for COD orders
  * 0.00 for Prepaid orders
- Idempotency guard: duplicate shipment dispatches are blocked
- CourierShipment record creation & Order status update to PROCESSING
- Courier status synchronization & status mapping to internal milestones without bypassing payment rules
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from marketplace.models import (
    CourierShipment,
    Order,
    OrderItem,
    OrderStatusHistory,
    Product,
)
from marketplace.ncm_service import NCMService

User = get_user_model()


class NCMDispatchTests(TestCase):
    def setUp(self):
        cache.clear()
        NCMService._fallback_branches_cache = None

        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_user(
            username="admin_ncm",
            email="admin_ncm@test.com",
            password="adminpassword123",
            role="admin",
            is_staff=True,
        )

        # Student user
        self.student = User.objects.create_user(
            username="buyer_student",
            email="buyer@test.com",
            password="password123",
            role="student",
        )

        # Seller user
        self.seller = User.objects.create_user(
            username="seller_user",
            email="seller@test.com",
            password="password123",
            role="student",
        )

        self.product = Product.objects.create(
            seller=self.seller,
            title="Loksewa Officer Preparation",
            description="Preparation Book",
            price=Decimal("1000.00"),
            stock=5,
            listing_status="ACTIVE",
            is_published=True,
        )

        self.mock_branches = [
            {"pk": 1, "code": "KTM", "name": "Kathmandu", "district_name": "Kathmandu"},
            {"pk": 2, "code": "PKR", "name": "Pokhara", "district_name": "Kaski"},
        ]

    def tearDown(self):
        cache.clear()
        NCMService._fallback_branches_cache = None

    def _create_test_order(self, is_cod=True, order_status="CONFIRMED", payment_status="PARTIALLY_PAID"):
        delivery_fee = Decimal("150.00")
        total_amount = Decimal("1000.00")
        final_total = total_amount + delivery_fee  # 1150.00

        if is_cod:
            cod_advance_required = (final_total * Decimal("0.15")).quantize(Decimal("0.01"))  # 172.50
            cod_remaining_balance = final_total - cod_advance_required  # 977.50
            cod_advance_paid = cod_advance_required if payment_status == "PARTIALLY_PAID" else Decimal("0.00")
            payment_method_type = "COD"
        else:
            cod_advance_required = Decimal("0.00")
            cod_remaining_balance = Decimal("0.00")
            cod_advance_paid = Decimal("0.00")
            payment_method_type = "PREPAID"

        order = Order.objects.create(
            student=self.student,
            total_amount=total_amount,
            delivery_fee=delivery_fee,
            payment_method_type=payment_method_type,
            is_cod=is_cod,
            cod_advance_rate=Decimal("15.00"),
            cod_advance_required=cod_advance_required,
            cod_advance_paid=cod_advance_paid,
            cod_remaining_balance=cod_remaining_balance,
            payment_status=payment_status,
            shipping_address="Hari Prasad\n9841234567\nGandaki, Kaski, Pokhara-8\nSrijana Chowk",
            contact_number="9841234567",
            shipping_address_snapshot={
                "full_name": "Hari Prasad",
                "phone_number": "9841234567",
                "province": "Gandaki",
                "district": "Kaski",
                "municipality": "Pokhara",
                "ward_number": "8",
                "tole_area": "Srijana Chowk",
                "ncm_destination_branch": "Pokhara",
                "ncm_delivery_type": "Door2Door",
            },
            status=order_status,
        )

        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price=self.product.price,
            fulfillment_status="PENDING",
            payout_status="PENDING",
        )
        return order

    # --- 1. PERMISSIONS GATING ---

    def test_dispatch_forbidden_for_non_admin(self):
        """Non-admin users cannot trigger courier dispatch."""
        self.client.force_authenticate(user=self.student)
        order = self._create_test_order()
        url = f"/api/marketplace/admin/orders/{order.id}/dispatch-ncm/"
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- 2. ORDER STATUS ELIGIBILITY ---

    def test_dispatch_rejected_for_unconfirmed_order(self):
        """Orders in PENDING_PAYMENT or PAYMENT_VERIFICATION cannot be dispatched."""
        self.client.force_authenticate(user=self.admin)
        order = self._create_test_order(order_status="PENDING_PAYMENT", payment_status="UNPAID")

        url = f"/api/marketplace/admin/orders/{order.id}/dispatch-ncm/"
        response = self.client.post(url, {})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only CONFIRMED or PROCESSING orders can be dispatched", response.json()["detail"])

    # --- 3. PAYMENT STATUS VERIFICATION (15% COD RULE) ---

    def test_dispatch_rejected_if_cod_advance_unverified(self):
        """A COD order with payment_status UNPAID cannot be dispatched."""
        self.client.force_authenticate(user=self.admin)
        order = self._create_test_order(is_cod=True, order_status="CONFIRMED", payment_status="UNPAID")

        url = f"/api/marketplace/admin/orders/{order.id}/dispatch-ncm/"
        response = self.client.post(url, {})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("The 15% advance payment must be verified first", response.json()["detail"])

    def test_dispatch_rejected_if_prepaid_not_fully_paid(self):
        """A Prepaid order with payment_status UNPAID or PARTIALLY_PAID cannot be dispatched."""
        self.client.force_authenticate(user=self.admin)
        order = self._create_test_order(is_cod=False, order_status="CONFIRMED", payment_status="UNPAID")

        url = f"/api/marketplace/admin/orders/{order.id}/dispatch-ncm/"
        response = self.client.post(url, {})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Full payment must be verified first", response.json()["detail"])

    # --- 4. SUCCESSFUL DISPATCH & COD CALCULATION ---

    @override_settings(NCM_API_TOKEN="mock_token_123")
    @patch.object(NCMService, "get_branches")
    @patch.object(NCMService, "create_order")
    def test_dispatch_cod_passes_85_balance_and_creates_shipment(self, mock_create_order, mock_get_branches):
        """
        Verify that for COD orders:
        - NCM cod_charge is set to order.cod_remaining_balance (977.50)
        - CourierShipment model is created with 1-to-1 relationship to Order
        - Order status updates to PROCESSING
        - Line items update to PROCESSING
        """
        self.client.force_authenticate(user=self.admin)
        order = self._create_test_order(is_cod=True, order_status="CONFIRMED", payment_status="PARTIALLY_PAID")

        mock_get_branches.return_value = self.mock_branches
        mock_create_order.return_value = {
            "success": True,
            "ncm_order_id": "1029384",
            "delivery_charge": 140.0,
            "cod_charge": 977.50,
            "delivery_type": "Door2Door",
            "active": True,
            "raw_response": {"orderid": 1029384, "charge": 140.0},
        }

        url = f"/api/marketplace/admin/orders/{order.id}/dispatch-ncm/"
        response = self.client.post(url, {})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify NCM create_order payload
        mock_create_order.assert_called_once()
        payload = mock_create_order.call_args[0][0]
        self.assertEqual(payload["cod_charge"], 977.50)  # Exactly 85% remaining balance
        self.assertEqual(payload["branch"], "Pokhara")
        self.assertEqual(payload["vref_id"], f"ORD-{order.id}")

        # Verify CourierShipment record
        shipment = CourierShipment.objects.get(order=order)
        self.assertEqual(shipment.ncm_order_id, "1029384")
        self.assertEqual(shipment.destination_branch, "Pokhara")
        self.assertEqual(shipment.cod_charge, Decimal("977.50"))
        self.assertEqual(shipment.actual_charge, Decimal("140.00"))
        self.assertEqual(shipment.courier_status, "Order Created")

        # Verify Order & Item statuses
        order.refresh_from_db()
        self.assertEqual(order.status, "PROCESSING")
        self.assertEqual(order.items.first().fulfillment_status, "PROCESSING")

        # Verify OrderStatusHistory
        history = OrderStatusHistory.objects.filter(order=order).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.new_status, "PROCESSING")
        self.assertIn("1029384", history.note)

    @override_settings(NCM_API_TOKEN="mock_token_123")
    @patch.object(NCMService, "get_branches")
    @patch.object(NCMService, "create_order")
    def test_dispatch_prepaid_passes_zero_cod_charge(self, mock_create_order, mock_get_branches):
        """Verify prepaid order passes cod_charge = 0.00 to NCM."""
        self.client.force_authenticate(user=self.admin)
        order = self._create_test_order(is_cod=False, order_status="CONFIRMED", payment_status="PAID")

        mock_get_branches.return_value = self.mock_branches
        mock_create_order.return_value = {
            "success": True,
            "ncm_order_id": "1029385",
            "delivery_charge": 120.0,
            "cod_charge": 0.0,
            "delivery_type": "Door2Door",
            "active": True,
        }

        url = f"/api/marketplace/admin/orders/{order.id}/dispatch-ncm/"
        response = self.client.post(url, {})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payload = mock_create_order.call_args[0][0]
        self.assertEqual(payload["cod_charge"], 0.0)

        shipment = CourierShipment.objects.get(order=order)
        self.assertEqual(shipment.cod_charge, Decimal("0.00"))

    # --- 5. IDEMPOTENCY / DUPLICATE PREVENTION ---

    @override_settings(NCM_API_TOKEN="mock_token_123")
    @patch.object(NCMService, "get_branches")
    @patch.object(NCMService, "create_order")
    def test_dispatch_duplicate_prevention(self, mock_create_order, mock_get_branches):
        """Calling dispatch when shipment already exists is rejected immediately without calling NCM."""
        self.client.force_authenticate(user=self.admin)
        order = self._create_test_order(is_cod=True, order_status="CONFIRMED", payment_status="PARTIALLY_PAID")

        # Create existing shipment
        CourierShipment.objects.create(
            order=order,
            provider="NCM",
            ncm_order_id="1029384",
            destination_branch="Pokhara",
            cod_charge=Decimal("977.50"),
        )

        url = f"/api/marketplace/admin/orders/{order.id}/dispatch-ncm/"
        response = self.client.post(url, {})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Shipment has already been created", response.json()["detail"])
        mock_create_order.assert_not_called()

    # --- 6. COURIER TRACKING SYNCHRONIZATION ---

    @override_settings(NCM_API_TOKEN="mock_token_123")
    @patch.object(NCMService, "track_order")
    def test_sync_courier_updates_status_and_history(self, mock_track_order):
        """Test sync_courier action fetches latest status and advances order milestones."""
        self.client.force_authenticate(user=self.admin)
        order = self._create_test_order(is_cod=True, order_status="PROCESSING", payment_status="PARTIALLY_PAID")
        shipment = CourierShipment.objects.create(
            order=order,
            provider="NCM",
            ncm_order_id="1029384",
            destination_branch="Pokhara",
            courier_status="Order Created",
            cod_charge=Decimal("977.50"),
        )

        mock_track_order.return_value = {
            "success": True,
            "data": {
                "status": "In Transit",
                "history": [
                    {"status": "Order Created", "timestamp": "2026-10-31 09:00"},
                    {"status": "Pickup Complete", "timestamp": "2026-10-31 10:30"},
                    {"status": "In Transit", "timestamp": "2026-10-31 11:15"},
                ],
            },
        }

        url = f"/api/marketplace/admin/orders/{order.id}/sync-courier/"
        response = self.client.post(url, {})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        shipment.refresh_from_db()
        self.assertEqual(shipment.courier_status, "In Transit")
        self.assertEqual(len(shipment.status_history), 3)

        # Mapped milestone: In Transit -> SHIPPED
        order.refresh_from_db()
        self.assertEqual(order.status, "SHIPPED")

    @override_settings(NCM_API_TOKEN="mock_token_123")
    @patch.object(NCMService, "track_order")
    def test_sync_delivery_does_not_auto_mark_cod_as_paid(self, mock_track_order):
        """
        CRITICAL BUSINESS RULE:
        When courier status updates to Delivered, order status moves to DELIVERED,
        BUT payment_status must NOT automatically become PAID without explicit admin remittance reconciliation.
        """
        self.client.force_authenticate(user=self.admin)
        order = self._create_test_order(is_cod=True, order_status="SHIPPED", payment_status="PARTIALLY_PAID")
        shipment = CourierShipment.objects.create(
            order=order,
            provider="NCM",
            ncm_order_id="1029384",
            destination_branch="Pokhara",
            courier_status="In Transit",
            cod_charge=Decimal("977.50"),
        )

        mock_track_order.return_value = {
            "success": True,
            "data": {
                "status": "Delivered",
                "history": [{"status": "Delivered", "timestamp": "2026-10-31 15:00"}],
            },
        }

        url = f"/api/marketplace/admin/orders/{order.id}/sync-courier/"
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        # Internal status is DELIVERED
        self.assertEqual(order.status, "DELIVERED")
        # Payment status MUST REMAIN PARTIALLY_PAID (advance only) until remittance is verified
        self.assertEqual(order.payment_status, "PARTIALLY_PAID")
        # Payout for seller should now be ELIGIBLE
        self.assertEqual(order.items.first().payout_status, "ELIGIBLE")

