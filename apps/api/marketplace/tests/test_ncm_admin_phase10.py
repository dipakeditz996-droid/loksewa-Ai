from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.utils import timezone
from django.conf import settings
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from marketplace.models import (
    Order, OrderItem, Product, CourierShipment,
    NCMConfiguration, NCMWebhookEvent, CourierSyncLog, CODRemittance
)
from marketplace.ncm_service import NCMError


class NCMAdminPhase10Tests(APITestCase):
    def setUp(self):
        # Admin user
        self.admin = User.objects.create_user(
            username='courieradmin',
            password='Password123!',
            email='admin@loksewa.com',
            role='admin',
            is_staff=True
        )

        # Non-admin student user
        self.student = User.objects.create_user(
            username='studentuser',
            password='Password123!',
            email='student@loksewa.com',
            role='student'
        )

        # Create a sample product and order
        self.product = Product.objects.create(
            title='Loksewa Officer General Knowledge',
            category='NEW_BOOK',
            price=Decimal('1000.00'),
            stock=10,
            listing_status='ACTIVE'
        )

        # Pre-configure NCMConfiguration
        self.config = NCMConfiguration.get_settings()
        self.config.is_enabled = True
        self.config.environment = 'demo'
        self.config.custom_base_url = 'https://demo.nepalcanmove.com/api/'
        self.config.custom_api_token = 'ncm_demo_token_12345678'
        self.config.default_origin_branch = 'Kathmandu'
        self.config.live_rates_enabled = True
        self.config.fallback_rules_enabled = False
        self.config.auto_sync_enabled = True
        self.config.webhook_enabled = True
        self.config.save()

    # 1. PERMISSIONS
    def test_unauthenticated_cannot_access_courier_settings(self):
        response = self.client.get('/api/marketplace/admin/courier/settings/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_student_cannot_access_courier_settings(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/marketplace/admin/courier/settings/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # 2. CONFIGURATION READ & MASKING
    def test_admin_can_read_settings_and_secrets_are_masked(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/marketplace/admin/courier/settings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertTrue(data['is_enabled'])
        self.assertEqual(data['environment'], 'demo')
        self.assertEqual(data['default_origin_branch'], 'Kathmandu')
        # Secret token must be masked
        self.assertIn('masked_token', data)
        self.assertTrue(data['masked_token'].startswith('ncm_'))
        self.assertTrue(data['masked_token'].endswith('5678'))
        self.assertIn('****', data['masked_token'])
        # Raw token must NOT be in response
        self.assertNotIn('ncm_demo_token_12345678', str(data))
        self.assertIn('webhook_endpoint_url', data)

    # 3. CONFIGURATION UPDATE
    def test_admin_can_update_settings(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'is_enabled': True,
            'default_origin_branch': 'Pokhara',
            'live_rates_enabled': False,
            'fallback_rules_enabled': True,
            'auto_sync_enabled': False,
        }
        response = self.client.patch('/api/marketplace/admin/courier/settings/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.config.refresh_from_db()
        self.assertEqual(self.config.default_origin_branch, 'Pokhara')
        self.assertFalse(self.config.live_rates_enabled)
        self.assertTrue(self.config.fallback_rules_enabled)
        self.assertFalse(self.config.auto_sync_enabled)

    # 4. PRODUCTION SWITCH CONFIRMATION SAFETY GUARD
    def test_switch_to_production_requires_explicit_confirmation(self):
        self.client.force_authenticate(user=self.admin)
        # Attempt switch without confirmation
        response = self.client.patch('/api/marketplace/admin/courier/settings/', {'environment': 'production'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirmation", response.json()['detail'].lower())

        # Switch with explicit confirmation
        response = self.client.patch(
            '/api/marketplace/admin/courier/settings/',
            {'environment': 'production', 'confirm_production': True},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.config.refresh_from_db()
        self.assertEqual(self.config.environment, 'production')

    # 5. TEST CONNECTION DIAGNOSTIC (NEVER CREATES SHIPMENT)
    @patch('marketplace.ncm_service.NCMService.get_branches')
    def test_connection_success(self, mock_get_branches):
        mock_get_branches.return_value = [{'name': 'Kathmandu'}, {'name': 'Pokhara'}]
        self.client.force_authenticate(user=self.admin)

        initial_shipments = CourierShipment.objects.count()
        response = self.client.post('/api/marketplace/admin/courier/test-connection/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertTrue(data['success'])
        self.assertEqual(data['branch_count'], 2)
        self.assertIsNotNone(data['latency_ms'])
        # Guarantees zero courier shipments were created during diagnostic
        self.assertEqual(CourierShipment.objects.count(), initial_shipments)

        self.config.refresh_from_db()
        self.assertEqual(self.config.connection_status, 'connected')

    @patch('marketplace.ncm_service.NCMService.get_branches')
    def test_connection_failure_updates_status(self, mock_get_branches):
        mock_get_branches.side_effect = NCMError("Authentication failed: invalid token")
        self.client.force_authenticate(user=self.admin)

        response = self.client.post('/api/marketplace/admin/courier/test-connection/')
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        data = response.json()

        self.assertFalse(data['success'])
        self.assertIn("Authentication failed", data['error'])
        self.config.refresh_from_db()
        self.assertEqual(self.config.connection_status, 'error')

    # 6. BRANCHES CACHE REFRESH
    @patch('marketplace.ncm_service.NCMService.get_branches')
    def test_admin_branches_list_and_refresh(self, mock_get_branches):
        mock_get_branches.return_value = [{'name': 'Kathmandu'}, {'name': 'Butwal'}]
        self.client.force_authenticate(user=self.admin)

        get_res = self.client.get('/api/marketplace/admin/courier/branches/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.json()['count'], 2)

        refresh_res = self.client.post('/api/marketplace/admin/courier/branches/')
        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        self.assertTrue(refresh_res.json()['refreshed'])

    # 7. WEBHOOK MANAGEMENT & PROCESSING TOGGLE
    def test_webhook_management_and_toggle(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/marketplace/admin/courier/webhook-management/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('webhook_endpoint_url', data)
        self.assertTrue(data['webhook_enabled'])

        # Toggle disabled
        toggle_res = self.client.post(
            '/api/marketplace/admin/courier/webhook-management/',
            {'action': 'toggle_enabled'},
            format='json'
        )
        self.assertEqual(toggle_res.status_code, status.HTTP_200_OK)
        self.assertFalse(toggle_res.json()['webhook_enabled'])

        # Webhook endpoint should now reject calls with 503
        webhook_call = self.client.post('/api/marketplace/webhooks/ncm/', {'order_id': '123'}, format='json')
        self.assertEqual(webhook_call.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    # 8. COURIER OVERVIEW METRICS
    def test_courier_overview_metrics(self):
        # Create a COD order and a prepaid order
        order_cod = Order.objects.create(
            student=self.student,
            total_amount=Decimal('1000.00'),
            delivery_fee=Decimal('100.00'),
            is_cod=True,
            cod_advance_paid=Decimal('165.00'),
            cod_remaining_balance=Decimal('935.00'),
            status='CONFIRMED',
            payment_status='PARTIALLY_PAID'
        )
        shipment1 = CourierShipment.objects.create(
            order=order_cod,
            provider='NCM',
            ncm_order_id='NCM-TEST-001',
            destination_branch='Kathmandu',
            courier_status='Order Created',
            cod_charge=Decimal('935.00')
        )
        CODRemittance.objects.create(
            order=order_cod,
            courier_shipment=shipment1,
            expected_amount=Decimal('935.00'),
            status='PENDING'
        )

        order_prepaid = Order.objects.create(
            student=self.student,
            total_amount=Decimal('500.00'),
            delivery_fee=Decimal('50.00'),
            is_cod=False,
            status='SHIPPED',
            payment_status='PAID'
        )
        CourierShipment.objects.create(
            order=order_prepaid,
            provider='NCM',
            ncm_order_id='NCM-TEST-002',
            destination_branch='Pokhara',
            courier_status='In Transit',
            cod_charge=Decimal('0.00')
        )

        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/marketplace/admin/courier/overview/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        metrics = data['metrics']
        self.assertEqual(metrics['total_shipments'], 2)
        self.assertEqual(metrics['pending_pickup'], 1)
        self.assertEqual(metrics['in_transit'], 1)
        self.assertEqual(metrics['remittance_pending_count'], 1)
        self.assertEqual(metrics['remittance_pending_amount'], 935.0)

    # 9. COD REMITTANCE MANAGEMENT & DUPLICATE PROTECTION
    def test_cod_remittance_verification_workflow(self):
        order = Order.objects.create(
            student=self.student,
            total_amount=Decimal('1000.00'),
            delivery_fee=Decimal('100.00'),
            is_cod=True,
            cod_advance_paid=Decimal('165.00'),
            cod_remaining_balance=Decimal('935.00'),
            status='PROCESSING',
            payment_status='PARTIALLY_PAID'
        )
        shipment = CourierShipment.objects.create(
            order=order,
            provider='NCM',
            ncm_order_id='NCM-COD-888',
            destination_branch='Biratnagar',
            courier_status='Order Created',
            cod_charge=Decimal('935.00')
        )
        remittance = CODRemittance.objects.create(
            order=order,
            courier_shipment=shipment,
            expected_amount=Decimal('935.00'),
            status='PENDING'
        )

        # STRICT RULE CHECK: Simulated courier delivery does NOT mark order as PAID!
        shipment.apply_status_update(new_courier_status='Delivered')
        order.refresh_from_db()
        self.assertEqual(order.status, 'DELIVERED')
        self.assertEqual(order.payment_status, 'PARTIALLY_PAID')  # Still PARTIALLY_PAID!
        self.assertEqual(order.cod_remaining_balance, Decimal('935.00'))

        # Now authorized admin verifies actual courier remittance deposit
        self.client.force_authenticate(user=self.admin)
        verify_url = f'/api/marketplace/admin/courier/cod-remittance/{remittance.id}/verify/'
        verify_res = self.client.post(verify_url, {
            'remitted_amount': '935.00',
            'reference_number': 'NCM-BANK-DEP-9901',
            'notes': 'Deposited to corporate account'
        }, format='json')
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)

        # Verify Order is now settled and fully PAID
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'PAID')
        self.assertEqual(order.cod_remaining_balance, Decimal('0.00'))

        remittance.refresh_from_db()
        self.assertEqual(remittance.status, 'VERIFIED')
        self.assertEqual(remittance.verified_by, self.admin)
        self.assertIsNotNone(remittance.verified_at)

        # DUPLICATE PROTECTION: Attempting to verify again must fail!
        dup_res = self.client.post(verify_url, {'remitted_amount': '935.00'}, format='json')
        self.assertEqual(dup_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been verified", dup_res.json()['detail'])

    # 10. MANUAL BATCH SYNC TRIGGER
    @patch('marketplace.ncm_service.NCMService.track_order')
    def test_manual_batch_sync_trigger(self, mock_track):
        mock_track.return_value = {
            'status': 'Out for Delivery',
            'tracking_id': 'TRK-999',
            'history': [{'status': 'Out for Delivery', 'timestamp': timezone.now().isoformat()}]
        }
        order = Order.objects.create(
            student=self.student,
            total_amount=Decimal('500.00'),
            is_cod=False,
            status='PROCESSING',
            payment_status='PAID'
        )
        shipment = CourierShipment.objects.create(
            order=order,
            provider='NCM',
            ncm_order_id='NCM-SYNC-101',
            courier_status='Order Created'
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/marketplace/admin/courier/sync/', {'limit': 10}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertTrue(data['success'])
        self.assertEqual(data['shipments_checked'], 1)
        self.assertEqual(data['shipments_updated'], 1)

        shipment.refresh_from_db()
        self.assertEqual(shipment.courier_status, 'Out for Delivery')
        self.assertEqual(shipment.order.status, 'OUT_FOR_DELIVERY')

        # Check CourierSyncLog
        self.assertEqual(CourierSyncLog.objects.filter(status='SUCCESS').count(), 1)
