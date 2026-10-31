"""
LoksewaAI — NCM Phase 13 Automatic Courier Dispatch Test Suite
Tests all 20 required points for automatic shipment creation after admin payment approval,
strict payment eligibility, idempotent dispatch, ambiguous timeout duplicate prevention,
and status synchronization.
"""

from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APITestCase
from django.test import override_settings

from core.models import User
from marketplace.models import (
    Order, OrderItem, Product, DeliveryAddress, PaymentMethod,
    PaymentSubmission, CourierShipment, NCMConfiguration, CODRemittance
)
from marketplace.ncm_service import (
    NCMConnectionError, NCMAPIError, NCMError
)
from marketplace.dispatch_service import execute_ncm_dispatch


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class NCMPhase13AutoDispatchTests(APITestCase):
    def setUp(self):
        # 1. Admin user
        self.admin = User.objects.create_user(
            username='admin_phase13',
            password='Password123!',
            email='admin13@loksewa.com',
            role='admin',
            is_staff=True
        )

        # 2. Student user
        self.student = User.objects.create_user(
            username='student_phase13',
            password='Password123!',
            email='student13@loksewa.com',
            role='student',
            first_name='Kiran',
            last_name='Thapa'
        )

        # 3. Product
        self.product = Product.objects.create(
            title='Loksewa Kharidar Comprehensive Guide',
            category='NEW_BOOK',
            price=Decimal('1000.00'),
            stock=25,
            is_published=True,
            listing_status='ACTIVE'
        )

        # 4. Delivery Address
        self.address = DeliveryAddress.objects.create(
            student=self.student,
            full_name='Kiran Thapa',
            phone_number='9841234567',
            province='Gandaki',
            district='Kaski',
            municipality='Pokhara Metropolitan',
            ward_number='8',
            tole_area='Srijana Chowk',
            is_default=True
        )

        # 5. Payment Method
        self.payment_method = PaymentMethod.objects.create(
            method_type='ESEWA',
            display_name='eSewa Loksewa',
            account_name='Loksewa Payment',
            account_number='9841000000',
            is_active=True
        )

        # 6. Dummy payment screenshot
        self.screenshot = SimpleUploadedFile(
            name='phase13_receipt.jpg',
            content=b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb',
            content_type='image/jpeg'
        )

        # 7. Configure NCM
        self.config = NCMConfiguration.get_settings()
        self.config.is_enabled = True
        self.config.environment = 'demo'
        self.config.custom_base_url = 'https://demo.nepalcanmove.com/api/'
        self.config.custom_api_token = 'token_phase13_secret_123'
        self.config.default_origin_branch = 'Kathmandu'
        self.config.live_rates_enabled = True
        self.config.auto_sync_enabled = True
        self.config.webhook_enabled = True
        self.config.save()

        # Mock active branches list
        self.mock_branches = [
            {'name': 'Kathmandu', 'code': 'KTM', 'district_name': 'Kathmandu'},
            {'name': 'Pokhara', 'code': 'PKR', 'district_name': 'Kaski'},
            {'name': 'Biratnagar', 'code': 'BRT', 'district_name': 'Morang'},
            {'name': 'Nepalgunj', 'code': 'NPJ', 'district_name': 'Banke'},
        ]

    def _create_cod_order(self):
        """Creates a verified COD order for testing."""
        order = Order.objects.create(
            student=self.student,
            status='PENDING_PAYMENT',
            payment_status='UNPAID',
            payment_method_type='COD',
            is_cod=True,
            total_amount=Decimal('1000.00'),
            delivery_fee=Decimal('100.00'),
            shipping_address='Srijana Chowk, Ward 8, Pokhara Metropolitan, Kaski, Gandaki',
            contact_number='9841234567',
            shipping_address_snapshot={
                'full_name': 'Kiran Thapa',
                'phone_number': '9841234567',
                'province': 'Gandaki',
                'district': 'Kaski',
                'municipality': 'Pokhara Metropolitan',
                'ward_number': '8',
                'tole_area': 'Srijana Chowk',
                'ncm_destination_branch': 'Pokhara',
                'ncm_delivery_type': 'Door2Door',
            }
        )
        order.calculate_cod_amounts()
        order.save()
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price=Decimal('1000.00')
        )
        return order

    def _create_prepaid_order(self):
        """Creates a prepaid order for testing."""
        order = Order.objects.create(
            student=self.student,
            status='PENDING_PAYMENT',
            payment_status='UNPAID',
            payment_method_type='PREPAID',
            is_cod=False,
            total_amount=Decimal('1000.00'),
            delivery_fee=Decimal('100.00'),
            shipping_address='Srijana Chowk, Ward 8, Pokhara Metropolitan, Kaski, Gandaki',
            contact_number='9841234567',
            shipping_address_snapshot={
                'full_name': 'Kiran Thapa',
                'phone_number': '9841234567',
                'province': 'Gandaki',
                'district': 'Kaski',
                'municipality': 'Pokhara Metropolitan',
                'ward_number': '8',
                'tole_area': 'Srijana Chowk',
                'ncm_destination_branch': 'Pokhara',
                'ncm_delivery_type': 'Door2Door',
            }
        )
        order.calculate_cod_amounts()
        order.save()
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price=Decimal('1000.00')
        )
        return order

    # --------------------------------------------------------------------------
    # 1. Payment submission does NOT create an NCM order
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_01_payment_submission_does_not_create_ncm_order(self, mock_create):
        order = self._create_cod_order()
        submission = PaymentSubmission.objects.create(
            student=self.student,
            order=order,
            payment_method=self.payment_method,
            transaction_id='TXN_SUBMIT_ONLY',
            expected_amount=order.cod_advance_required,
            submitted_amount=order.cod_advance_required,
            is_cod_advance=True,
            status='PENDING'
        )

        mock_create.assert_not_called()
        self.assertEqual(CourierShipment.objects.filter(order=order).count(), 0)
        order.refresh_from_db()
        self.assertEqual(order.ncm_dispatch_status, 'NOT_REQUESTED')
        self.assertEqual(order.status, 'PENDING_PAYMENT')

    # --------------------------------------------------------------------------
    # 2. Unapproved payment does NOT create an NCM order
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_02_unapproved_payment_does_not_create_ncm_order(self, mock_create):
        order = self._create_cod_order()
        submission = PaymentSubmission.objects.create(
            student=self.student,
            order=order,
            payment_method=self.payment_method,
            transaction_id='TXN_PENDING_STATE',
            expected_amount=order.cod_advance_required,
            submitted_amount=order.cod_advance_required,
            is_cod_advance=True,
            status='PENDING'
        )

        self.assertEqual(submission.status, 'PENDING')
        mock_create.assert_not_called()
        self.assertEqual(CourierShipment.objects.filter(order=order).count(), 0)

    # --------------------------------------------------------------------------
    # 3. Rejected payment does NOT create an NCM order
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_03_rejected_payment_does_not_create_ncm_order(self, mock_create):
        order = self._create_cod_order()
        submission = PaymentSubmission.objects.create(
            student=self.student,
            order=order,
            payment_method=self.payment_method,
            transaction_id='TXN_REJECT_TEST',
            expected_amount=order.cod_advance_required,
            submitted_amount=order.cod_advance_required,
            is_cod_advance=True,
            status='PENDING'
        )

        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            f'/api/marketplace/admin/payment-submissions/{submission.id}/review/',
            {'action': 'REJECT', 'rejection_reason': 'Blurry screenshot'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        submission.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(submission.status, 'REJECTED')
        self.assertEqual(order.status, 'PENDING_PAYMENT')
        self.assertEqual(order.payment_status, 'UNPAID')
        self.assertEqual(order.ncm_dispatch_status, 'NOT_REQUESTED')

        mock_create.assert_not_called()
        self.assertEqual(CourierShipment.objects.filter(order=order).count(), 0)

    # --------------------------------------------------------------------------
    # 4. Admin approval triggers automatic dispatch
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.get_branches')
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_04_admin_approval_triggers_automatic_dispatch(self, mock_create, mock_branches):
        mock_branches.return_value = self.mock_branches
        mock_create.return_value = {
            'success': True,
            'ncm_order_id': 'NCM-1004',
            'delivery_charge': 110.0,
            'cod_charge': 935.0,
            'delivery_type': 'Door2Door',
            'raw_response': {'orderid': 1004}
        }

        order = self._create_cod_order()
        submission = PaymentSubmission.objects.create(
            student=self.student,
            order=order,
            payment_method=self.payment_method,
            transaction_id='TXN_APPROVE_TRIGGER',
            expected_amount=order.cod_advance_required,
            submitted_amount=order.cod_advance_required,
            is_cod_advance=True,
            status='PENDING'
        )

        self.client.force_authenticate(user=self.admin)
        # Use captureOnCommitCallbacks to execute on_commit hooks synchronously in test
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                f'/api/marketplace/admin/payment-submissions/{submission.id}/review/',
                {'action': 'APPROVE'},
                format='json'
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.status, 'PROCESSING')
        self.assertEqual(order.payment_status, 'PARTIALLY_PAID')
        self.assertEqual(order.ncm_dispatch_status, 'CREATED')

        self.assertTrue(hasattr(order, 'courier_shipment'))
        shipment = order.courier_shipment
        self.assertEqual(shipment.ncm_order_id, 'NCM-1004')
        self.assertEqual(shipment.tracking_id, 'NCM-1004')
        self.assertEqual(shipment.destination_branch, 'Pokhara')

    # --------------------------------------------------------------------------
    # 5. COD dispatch sends exactly the remaining 85%
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.get_branches')
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_05_cod_dispatch_sends_exactly_remaining_85_percent(self, mock_create, mock_branches):
        mock_branches.return_value = self.mock_branches
        mock_create.return_value = {
            'success': True,
            'ncm_order_id': 'NCM-1005',
            'delivery_charge': 100.0,
            'cod_charge': 935.0,
            'raw_response': {'orderid': 1005}
        }

        order = self._create_cod_order()
        # Order total: 1000 + 100 fee = 1100. 15% advance: 165. Remaining balance: 935.00
        self.assertEqual(order.cod_remaining_balance, Decimal('935.00'))

        submission = PaymentSubmission.objects.create(
            student=self.student,
            order=order,
            payment_method=self.payment_method,
            transaction_id='TXN_COD_85_TEST',
            expected_amount=order.cod_advance_required,
            submitted_amount=order.cod_advance_required,
            is_cod_advance=True,
            status='PENDING'
        )

        self.client.force_authenticate(user=self.admin)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                f'/api/marketplace/admin/payment-submissions/{submission.id}/review/',
                {'action': 'APPROVE'},
                format='json'
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        mock_create.assert_called_once()
        called_payload = mock_create.call_args[0][0]
        # COD charge MUST be exactly 935.0 (remaining 85%), never 1100, never 0
        self.assertEqual(called_payload['cod_charge'], 935.0)

    # --------------------------------------------------------------------------
    # 6. Prepaid dispatch sends zero COD
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.get_branches')
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_06_prepaid_dispatch_sends_zero_cod(self, mock_create, mock_branches):
        mock_branches.return_value = self.mock_branches
        mock_create.return_value = {
            'success': True,
            'ncm_order_id': 'NCM-1006',
            'delivery_charge': 100.0,
            'cod_charge': 0.0,
            'raw_response': {'orderid': 1006}
        }

        order = self._create_prepaid_order()
        submission = PaymentSubmission.objects.create(
            student=self.student,
            order=order,
            payment_method=self.payment_method,
            transaction_id='TXN_PREPAID_ZERO_COD',
            expected_amount=order.final_total,
            submitted_amount=order.final_total,
            is_cod_advance=False,
            status='PENDING'
        )

        self.client.force_authenticate(user=self.admin)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                f'/api/marketplace/admin/payment-submissions/{submission.id}/review/',
                {'action': 'APPROVE'},
                format='json'
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'PAID')

        mock_create.assert_called_once()
        called_payload = mock_create.call_args[0][0]
        self.assertEqual(called_payload['cod_charge'], 0.0)

    # --------------------------------------------------------------------------
    # 7. Repeated approval does not create duplicate shipments
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.get_branches')
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_07_repeated_approval_does_not_create_duplicate_shipments(self, mock_create, mock_branches):
        mock_branches.return_value = self.mock_branches
        mock_create.return_value = {
            'success': True,
            'ncm_order_id': 'NCM-1007',
            'delivery_charge': 100.0,
            'cod_charge': 935.0,
            'raw_response': {'orderid': 1007}
        }

        order = self._create_cod_order()
        submission = PaymentSubmission.objects.create(
            student=self.student,
            order=order,
            payment_method=self.payment_method,
            transaction_id='TXN_DUP_TEST',
            expected_amount=order.cod_advance_required,
            submitted_amount=order.cod_advance_required,
            is_cod_advance=True,
            status='PENDING'
        )

        self.client.force_authenticate(user=self.admin)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                f'/api/marketplace/admin/payment-submissions/{submission.id}/review/',
                {'action': 'APPROVE'},
                format='json'
            )

        # Attempt to dispatch again directly via dispatch service
        res2 = execute_ncm_dispatch(order.id)
        self.assertEqual(res2['status'], 'ALREADY_DISPATCHED')

        # At most 1 CourierShipment exists in the database
        self.assertEqual(CourierShipment.objects.filter(order=order).count(), 1)
        self.assertEqual(mock_create.call_count, 1)

    # --------------------------------------------------------------------------
    # 8. Concurrent approval requests remain safe
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.get_branches')
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_08_concurrent_approval_requests_remain_safe(self, mock_create, mock_branches):
        mock_branches.return_value = self.mock_branches
        mock_create.return_value = {
            'success': True,
            'ncm_order_id': 'NCM-1008',
            'delivery_charge': 100.0,
            'cod_charge': 935.0,
            'raw_response': {'orderid': 1008}
        }

        order = self._create_cod_order()
        order.status = 'CONFIRMED'
        order.payment_status = 'PARTIALLY_PAID'
        order.cod_advance_paid = order.cod_advance_required
        order.save()

        # Simulate first execution
        res1 = execute_ncm_dispatch(order.id)
        self.assertEqual(res1['status'], 'CREATED')

        # Simulate concurrent second execution
        res2 = execute_ncm_dispatch(order.id)
        self.assertEqual(res2['status'], 'ALREADY_DISPATCHED')

        self.assertEqual(CourierShipment.objects.filter(order=order).count(), 1)
        self.assertEqual(mock_create.call_count, 1)

    # --------------------------------------------------------------------------
    # 9. External NCM API failure is recorded
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.get_branches')
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_09_external_ncm_api_failure_is_recorded(self, mock_create, mock_branches):
        mock_branches.return_value = self.mock_branches
        mock_create.side_effect = NCMAPIError("Server error from NCM (HTTP 500)", status_code=500)

        order = self._create_cod_order()
        submission = PaymentSubmission.objects.create(
            student=self.student,
            order=order,
            payment_method=self.payment_method,
            transaction_id='TXN_FAIL_REC',
            expected_amount=order.cod_advance_required,
            submitted_amount=order.cod_advance_required,
            is_cod_advance=True,
            status='PENDING'
        )

        self.client.force_authenticate(user=self.admin)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                f'/api/marketplace/admin/payment-submissions/{submission.id}/review/',
                {'action': 'APPROVE'},
                format='json'
            )

        order.refresh_from_db()
        self.assertEqual(order.ncm_dispatch_status, 'FAILED')
        self.assertIn("Server error from NCM", order.ncm_dispatch_last_error)
        self.assertEqual(order.ncm_dispatch_attempts, 1)
        self.assertEqual(CourierShipment.objects.filter(order=order).count(), 0)

    # --------------------------------------------------------------------------
    # 10. Ambiguous timeout does NOT cause blind duplicate creation
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.lookup_order_by_vref')
    @patch('marketplace.ncm_service.NCMService.get_branches')
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_10_ambiguous_timeout_does_not_cause_blind_duplicate_creation(self, mock_create, mock_branches, mock_lookup):
        mock_branches.return_value = self.mock_branches
        # Simulate ambiguous timeout after POST was sent
        mock_create.side_effect = NCMConnectionError("Read timed out on create", is_ambiguous=True)
        # Reconciliation lookup also cannot find it
        mock_lookup.return_value = None

        order = self._create_cod_order()
        order.status = 'CONFIRMED'
        order.payment_status = 'PARTIALLY_PAID'
        order.cod_advance_paid = order.cod_advance_required
        order.save()

        res = execute_ncm_dispatch(order.id)
        self.assertEqual(res['status'], 'MANUAL_REVIEW_REQUIRED')

        order.refresh_from_db()
        self.assertEqual(order.ncm_dispatch_status, 'MANUAL_REVIEW_REQUIRED')
        self.assertIn("Ambiguous network timeout", order.ncm_dispatch_last_error)

        # Attempting dispatch again without force_retry must NOT call create_order again
        mock_create.reset_mock()
        res2 = execute_ncm_dispatch(order.id, force_retry=False)
        self.assertEqual(res2['status'], 'MANUAL_REVIEW_REQUIRED')
        mock_create.assert_not_called()
        self.assertEqual(CourierShipment.objects.filter(order=order).count(), 0)

    # --------------------------------------------------------------------------
    # 11. Safe transient retry works
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.get_branches')
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_11_safe_transient_retry_works(self, mock_create, mock_branches):
        mock_branches.return_value = self.mock_branches
        # Non-ambiguous connection error (e.g. refused before sending)
        mock_create.side_effect = NCMConnectionError("Connection refused before request sent", is_ambiguous=False)

        order = self._create_cod_order()
        order.status = 'CONFIRMED'
        order.payment_status = 'PARTIALLY_PAID'
        order.cod_advance_paid = order.cod_advance_required
        order.save()

        res = execute_ncm_dispatch(order.id)
        self.assertEqual(res['status'], 'FAILED')
        self.assertTrue(res['retry_scheduled'])

        order.refresh_from_db()
        self.assertEqual(order.ncm_dispatch_attempts, 1)
        self.assertIsNotNone(order.ncm_dispatch_next_retry)

    # --------------------------------------------------------------------------
    # 12. Admin manual retry remains idempotent
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.get_branches')
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_12_admin_manual_retry_remains_idempotent(self, mock_create, mock_branches):
        mock_branches.return_value = self.mock_branches
        mock_create.return_value = {
            'success': True,
            'ncm_order_id': 'NCM-RETRY-OK',
            'delivery_charge': 100.0,
            'cod_charge': 935.0,
            'raw_response': {'orderid': 9999}
        }

        order = self._create_cod_order()
        order.status = 'CONFIRMED'
        order.payment_status = 'PARTIALLY_PAID'
        order.cod_advance_paid = order.cod_advance_required
        order.ncm_dispatch_status = 'FAILED'
        order.ncm_dispatch_last_error = 'Network blip'
        order.save()

        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f'/api/marketplace/admin/orders/{order.id}/retry-dispatch/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.ncm_dispatch_status, 'CREATED')
        self.assertEqual(CourierShipment.objects.filter(order=order).count(), 1)

        # Calling retry again when already dispatched returns 400 with duplicate prevented message
        res2 = self.client.post(f'/api/marketplace/admin/orders/{order.id}/retry-dispatch/')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Shipment already exists", res2.json()['detail'])

    # --------------------------------------------------------------------------
    # 13. NCM tracking ID is persisted
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.get_branches')
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_13_ncm_tracking_id_is_persisted(self, mock_create, mock_branches):
        mock_branches.return_value = self.mock_branches
        mock_create.return_value = {
            'success': True,
            'ncm_order_id': 'NCM-TRK-777',
            'delivery_charge': 120.0,
            'cod_charge': 935.0,
            'raw_response': {'orderid': 'NCM-TRK-777', 'tracking_id': 'TRK-PKR-007'}
        }

        order = self._create_cod_order()
        order.status = 'CONFIRMED'
        order.payment_status = 'PARTIALLY_PAID'
        order.cod_advance_paid = order.cod_advance_required
        order.save()

        res = execute_ncm_dispatch(order.id)
        self.assertEqual(res['status'], 'CREATED')

        shipment = CourierShipment.objects.get(order=order)
        self.assertEqual(shipment.ncm_order_id, 'NCM-TRK-777')
        self.assertEqual(shipment.vref_id, f"ORD-{order.id}")
        self.assertIn('orderid', shipment.raw_response)

    # --------------------------------------------------------------------------
    # 14. Webhook updates the shipment status
    # --------------------------------------------------------------------------
    def test_14_webhook_updates_the_shipment_status(self):
        order = self._create_cod_order()
        order.status = 'PROCESSING'
        order.payment_status = 'PARTIALLY_PAID'
        order.save()

        shipment = CourierShipment.objects.create(
            order=order,
            provider='NCM',
            ncm_order_id='NCM-HOOK-14',
            tracking_id='NCM-HOOK-14',
            vref_id=f"ORD-{order.id}",
            origin_branch='Kathmandu',
            destination_branch='Pokhara',
            courier_status='Order Created'
        )

        # Incoming webhook event: in transit -> SHIPPED
        payload = {
            'order_id': 'NCM-HOOK-14',
            'status': 'in transit',
            'remarks': 'Package in transit to Pokhara hub'
        }
        res = self.client.post('/api/marketplace/webhooks/ncm/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        shipment.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(shipment.courier_status, 'in transit')
        self.assertEqual(order.status, 'SHIPPED')

    # --------------------------------------------------------------------------
    # 15. Scheduled polling updates the shipment status
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.track_order')
    def test_15_scheduled_polling_updates_the_shipment_status(self, mock_track):
        order = self._create_cod_order()
        order.status = 'PROCESSING'
        order.payment_status = 'PARTIALLY_PAID'
        order.save()

        shipment = CourierShipment.objects.create(
            order=order,
            provider='NCM',
            ncm_order_id='NCM-POLL-15',
            tracking_id='NCM-POLL-15',
            vref_id=f"ORD-{order.id}",
            origin_branch='Kathmandu',
            destination_branch='Pokhara',
            courier_status='Order Created'
        )

        mock_track.return_value = {
            'success': True,
            'ncm_order_id': 'NCM-POLL-15',
            'data': {
                'status': 'out for delivery',
                'tracking_id': 'TRK-POLL-15',
                'history': [{'status': 'out for delivery', 'time': '2026-10-31 10:00:00'}]
            }
        }

        call_command('sync_ncm_shipments', limit=10, force=True)

        shipment.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(shipment.courier_status, 'out for delivery')
        self.assertEqual(order.status, 'OUT_FOR_DELIVERY')

    # --------------------------------------------------------------------------
    # 16. Delivered COD order is NOT marked fully paid automatically
    # --------------------------------------------------------------------------
    def test_16_delivered_cod_order_not_marked_fully_paid_automatically(self):
        order = self._create_cod_order()
        order.status = 'OUT_FOR_DELIVERY'
        order.payment_status = 'PARTIALLY_PAID'
        order.save()

        shipment = CourierShipment.objects.create(
            order=order,
            provider='NCM',
            ncm_order_id='NCM-COD-DELIVERED',
            tracking_id='NCM-COD-DELIVERED',
            vref_id=f"ORD-{order.id}",
            origin_branch='Kathmandu',
            destination_branch='Pokhara',
            courier_status='out for delivery'
        )

        # Webhook marks delivery
        payload = {
            'order_id': 'NCM-COD-DELIVERED',
            'status': 'delivered',
            'remarks': 'Delivered to recipient Kiran Thapa'
        }
        res = self.client.post('/api/marketplace/webhooks/ncm/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.status, 'DELIVERED')
        # STRICT RULE: COD order payment_status remains PARTIALLY_PAID until admin verifies remittance
        self.assertEqual(order.payment_status, 'PARTIALLY_PAID')

    # --------------------------------------------------------------------------
    # 17. Prepaid payment state is preserved
    # --------------------------------------------------------------------------
    def test_17_prepaid_payment_state_is_preserved(self):
        order = self._create_prepaid_order()
        order.status = 'SHIPPED'
        order.payment_status = 'PAID'
        order.save()

        shipment = CourierShipment.objects.create(
            order=order,
            provider='NCM',
            ncm_order_id='NCM-PREPAID-DELIVERED',
            tracking_id='NCM-PREPAID-DELIVERED',
            vref_id=f"ORD-{order.id}",
            origin_branch='Kathmandu',
            destination_branch='Pokhara',
            courier_status='in transit'
        )

        payload = {
            'order_id': 'NCM-PREPAID-DELIVERED',
            'status': 'delivered'
        }
        self.client.post('/api/marketplace/webhooks/ncm/', payload, format='json')

        order.refresh_from_db()
        self.assertEqual(order.status, 'DELIVERED')
        self.assertEqual(order.payment_status, 'PAID')

    # --------------------------------------------------------------------------
    # 18. Invalid or out-of-order webhook cannot regress order state
    # --------------------------------------------------------------------------
    def test_18_invalid_or_out_of_order_webhook_cannot_regress_order_state(self):
        order = self._create_cod_order()
        order.status = 'DELIVERED'
        order.payment_status = 'PARTIALLY_PAID'
        order.save()

        shipment = CourierShipment.objects.create(
            order=order,
            provider='NCM',
            ncm_order_id='NCM-REGRESS-TEST',
            tracking_id='NCM-REGRESS-TEST',
            vref_id=f"ORD-{order.id}",
            origin_branch='Kathmandu',
            destination_branch='Pokhara',
            courier_status='delivered'
        )

        # Delayed webhook with 'in transit' arrives after DELIVERED
        payload = {
            'order_id': 'NCM-REGRESS-TEST',
            'status': 'in transit'
        }
        res = self.client.post('/api/marketplace/webhooks/ncm/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        # Order status must NOT regress back to SHIPPED!
        self.assertEqual(order.status, 'DELIVERED')

    # --------------------------------------------------------------------------
    # 19. Selected destination branch is preserved through dispatch
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.get_branches')
    @patch('marketplace.ncm_service.NCMService.create_order')
    def test_19_selected_destination_branch_is_preserved_through_dispatch(self, mock_create, mock_branches):
        mock_branches.return_value = self.mock_branches
        mock_create.return_value = {
            'success': True,
            'ncm_order_id': 'NCM-BRANCH-TEST',
            'delivery_charge': 100.0,
            'cod_charge': 935.0,
            'raw_response': {'orderid': 8888}
        }

        order = self._create_cod_order()
        order.status = 'CONFIRMED'
        order.payment_status = 'PARTIALLY_PAID'
        order.cod_advance_paid = order.cod_advance_required
        order.save()

        execute_ncm_dispatch(order.id)

        mock_create.assert_called_once()
        payload = mock_create.call_args[0][0]
        # Must match student's persisted branch 'Pokhara' exactly without substitution
        self.assertEqual(payload['branch'], 'Pokhara')

    # --------------------------------------------------------------------------
    # 20. Reconcile endpoint allows linking or reset
    # --------------------------------------------------------------------------
    @patch('marketplace.ncm_service.NCMService.lookup_order_by_vref')
    def test_20_reconcile_endpoint_allows_linking_or_reset(self, mock_lookup):
        order = self._create_cod_order()
        order.status = 'CONFIRMED'
        order.payment_status = 'PARTIALLY_PAID'
        order.cod_advance_paid = order.cod_advance_required
        order.ncm_dispatch_status = 'MANUAL_REVIEW_REQUIRED'
        order.ncm_dispatch_last_error = 'Ambiguous timeout'
        order.save()

        # Case A: Reconciliation finds the order in NCM
        mock_lookup.return_value = {
            'orderid': '991122',
            'delivery_charge': 110.0,
            'cod_charge': 935.0,
            'branch': 'Pokhara',
            'raw_response': {'orderid': '991122'}
        }

        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f'/api/marketplace/admin/orders/{order.id}/reconcile-dispatch/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.ncm_dispatch_status, 'CREATED')
        self.assertEqual(order.status, 'PROCESSING')
        self.assertEqual(order.courier_shipment.ncm_order_id, '991122')

        # Case B: If not found, admin can reset to FAILED
        order2 = self._create_cod_order()
        order2.status = 'CONFIRMED'
        order2.payment_status = 'PARTIALLY_PAID'
        order2.cod_advance_paid = order2.cod_advance_required
        order2.ncm_dispatch_status = 'MANUAL_REVIEW_REQUIRED'
        order2.save()

        mock_lookup.return_value = None
        res_fail = self.client.post(f'/api/marketplace/admin/orders/{order2.id}/reconcile-dispatch/', {'reset_to_failed': True}, format='json')
        self.assertEqual(res_fail.status_code, status.HTTP_200_OK)
        order2.refresh_from_db()
        self.assertEqual(order2.ncm_dispatch_status, 'FAILED')

