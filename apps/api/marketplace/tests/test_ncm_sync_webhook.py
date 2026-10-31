from decimal import Decimal
from unittest.mock import patch
from io import StringIO
from django.test import TestCase, override_settings
from django.urls import reverse
from django.core.management import call_command
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User
from marketplace.models import Product, Order, OrderItem, CourierShipment, OrderStatusHistory


class NCMSyncAndWebhookTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="student_sync",
            email="student_sync@test.com",
            password="testpassword123",
            role="STUDENT"
        )
        self.seller = User.objects.create_user(
            username="seller_sync",
            email="seller_sync@test.com",
            password="testpassword123",
            role="STUDENT"
        )
        self.product = Product.objects.create(
            title="Loksewa Officer Sync Book",
            price=Decimal("1000.00"),
            stock=10,
            listing_status="ACTIVE",
            seller=self.seller
        )

        # Create confirmed COD order with 15% advance paid
        self.order_cod = Order.objects.create(
            student=self.user,
            total_amount=Decimal("1000.00"),
            delivery_fee=Decimal("100.00"),
            status="CONFIRMED",
            payment_method_type="COD",
            payment_status="PARTIALLY_PAID",
            is_cod=True,
            cod_advance_rate=Decimal("15.00"),
            cod_advance_required=Decimal("165.00"),
            cod_advance_paid=Decimal("165.00"),
            cod_remaining_balance=Decimal("935.00"),
            shipping_address="Pokhara-8, Kaski",
            contact_number="9841234567"
        )
        self.order_item_cod = OrderItem.objects.create(
            order=self.order_cod,
            product=self.product,
            quantity=1,
            price=Decimal("1000.00"),
            commission_amount=Decimal("50.00"),
            seller_earning=Decimal("950.00"),
            fulfillment_status="PROCESSING",
            payout_status="PENDING"
        )
        self.shipment_cod = CourierShipment.objects.create(
            order=self.order_cod,
            provider="NCM",
            ncm_order_id="NCM-COD-001",
            tracking_id="TRK-COD-001",
            vref_id="ORD-COD-001",
            destination_branch="Pokhara",
            origin_branch="Kathmandu",
            courier_status="Order Created",
            cod_charge=Decimal("935.00"),
            quoted_charge=Decimal("100.00")
        )

    @override_settings(NCM_WEBHOOK_SECRET="super-secret-webhook-key")
    def test_webhook_unauthorized_without_secret(self):
        url = reverse('ncm-webhook')
        resp = self.client.post(url, {
            "order_id": "NCM-COD-001",
            "status": "In Transit"
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(NCM_WEBHOOK_SECRET="super-secret-webhook-key")
    def test_webhook_authorized_with_header(self):
        url = reverse('ncm-webhook')
        resp = self.client.post(
            url,
            {
                "order_id": "NCM-COD-001",
                "status": "In Transit",
                "remarks": "Package departed Kathmandu central hub"
            },
            format='json',
            HTTP_X_NCM_WEBHOOK_SECRET="super-secret-webhook-key"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['order_status'], "SHIPPED")
        self.assertEqual(resp.data['courier_status'], "In Transit")

        self.order_cod.refresh_from_db()
        self.assertEqual(self.order_cod.status, "SHIPPED")
        self.order_item_cod.refresh_from_db()
        self.assertEqual(self.order_item_cod.fulfillment_status, "SHIPPED")

    @override_settings(NCM_WEBHOOK_SECRET="super-secret-webhook-key")
    def test_webhook_authorized_with_bearer_token(self):
        url = reverse('ncm-webhook')
        resp = self.client.post(
            url,
            {
                "order_id": "NCM-COD-001",
                "status": "Out For Delivery"
            },
            format='json',
            HTTP_AUTHORIZATION="Bearer super-secret-webhook-key"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['order_status'], "OUT_FOR_DELIVERY")

    @override_settings(NCM_WEBHOOK_SECRET="super-secret-webhook-key")
    def test_webhook_finds_by_tracking_id(self):
        url = reverse('ncm-webhook')
        resp = self.client.post(
            url,
            {
                "tracking_id": "TRK-COD-001",
                "status": "In Transit"
            },
            format='json',
            HTTP_X_NCM_WEBHOOK_SECRET="super-secret-webhook-key"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['order_id'], self.order_cod.id)

    @override_settings(NCM_WEBHOOK_SECRET="super-secret-webhook-key")
    def test_webhook_delivered_strictly_preserves_cod_payment_status(self):
        """
        Critical Rule Verification:
        Delivering a COD order transitions internal order status to DELIVERED and marks items ELIGIBLE,
        but payment_status MUST REMAIN PARTIALLY_PAID until admin verifies courier cash remittance.
        """
        url = reverse('ncm-webhook')
        resp = self.client.post(
            url,
            {
                "order_id": "NCM-COD-001",
                "status": "Delivered",
                "history": [
                    {"status": "Delivered", "timestamp": "2026-10-31T12:00:00Z", "location": "Pokhara"}
                ]
            },
            format='json',
            HTTP_X_NCM_WEBHOOK_SECRET="super-secret-webhook-key"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.order_cod.refresh_from_db()
        self.assertEqual(self.order_cod.status, "DELIVERED")
        # Strict payment assertion:
        self.assertEqual(self.order_cod.payment_status, "PARTIALLY_PAID")

        # Item checks
        self.order_item_cod.refresh_from_db()
        self.assertEqual(self.order_item_cod.fulfillment_status, "DELIVERED")
        self.assertEqual(self.order_item_cod.payout_status, "ELIGIBLE")

    @override_settings(NCM_WEBHOOK_SECRET="super-secret-webhook-key")
    def test_webhook_unknown_shipment_returns_404(self):
        url = reverse('ncm-webhook')
        resp = self.client.post(
            url,
            {
                "order_id": "NON-EXISTENT-ID",
                "status": "In Transit"
            },
            format='json',
            HTTP_X_NCM_WEBHOOK_SECRET="super-secret-webhook-key"
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    @patch('marketplace.management.commands.sync_ncm_shipments.NCMService.track_order')
    def test_management_command_sync_ncm_shipments(self, mock_track):
        mock_track.return_value = {
            "status": "In Transit",
            "tracking_id": "TRK-COD-UPDATED",
            "history": [
                {"status": "Order Created", "time": "2026-10-31 10:00:00"},
                {"status": "In Transit", "time": "2026-10-31 11:30:00"}
            ]
        }

        out = StringIO()
        call_command('sync_ncm_shipments', stdout=out)

        self.order_cod.refresh_from_db()
        self.assertEqual(self.order_cod.status, "SHIPPED")

        self.shipment_cod.refresh_from_db()
        self.assertEqual(self.shipment_cod.courier_status, "In Transit")
        self.assertEqual(self.shipment_cod.tracking_id, "TRK-COD-UPDATED")
        self.assertIsNotNone(self.shipment_cod.last_synced_at)
        self.assertIn("1 transitioned", out.getvalue())

