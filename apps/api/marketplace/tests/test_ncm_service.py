"""
Unit tests for Nepal Can Move (NCM) Service Integration Layer (Phase 2).

All tests use mocked HTTP responses and do not communicate with external/production APIs.
"""

from unittest.mock import MagicMock, patch
import json
import requests
from django.core.cache import cache
from django.test import TestCase

from marketplace.ncm_service import (
    NCMService,
    NCMError,
    NCMConfigurationError,
    NCMConnectionError,
    NCMAPIError,
    NCMValidationError,
    sanitize_phone,
    sanitize_text,
    sanitize_payload_for_logging,
)


class NCMServiceTests(TestCase):
    def setUp(self):
        cache.clear()
        NCMService._fallback_branches_cache = None
        self.api_token = "test_ncm_secret_token_123"
        self.base_url = "https://demo.nepalcanmove.com/api/"
        self.service = NCMService(
            api_token=self.api_token,
            base_url=self.base_url,
            default_origin_branch="Kathmandu",
        )

    def tearDown(self):
        cache.clear()
        NCMService._fallback_branches_cache = None

    # --- 1. CONFIGURATION & AUTHENTICATION ---

    def test_client_initialization_and_configured_state(self):
        """Test configured state detection."""
        self.assertTrue(self.service.is_configured())
        self.assertEqual(self.service.api_token, self.api_token)
        self.assertEqual(self.service.base_url, "https://demo.nepalcanmove.com/api/")
        self.assertEqual(self.service.default_origin_branch, "Kathmandu")

    def test_missing_api_token_raises_configuration_error(self):
        """Test that missing API token raises NCMConfigurationError when making calls."""
        unconfigured = NCMService(api_token="", base_url=self.base_url)
        self.assertFalse(unconfigured.is_configured())
        with self.assertRaises(NCMConfigurationError):
            unconfigured._get_auth_headers()

    def test_auth_headers_format(self):
        """Test standard Token authentication header format."""
        headers = self.service._get_auth_headers()
        self.assertEqual(headers["Authorization"], f"Token {self.api_token}")
        self.assertEqual(headers["Content-Type"], "application/json")
        self.assertEqual(headers["Accept"], "application/json")

    # --- 2. BRANCH LISTING & CACHING ---

    @patch("requests.Session.request")
    def test_get_branches_success_and_caching(self, mock_request):
        """Test branch listing, caching in Django cache, and avoiding redundant HTTP calls."""
        mock_branches = [
            {"pk": 1, "code": "KTM", "name": "Kathmandu", "district_name": "Kathmandu"},
            {"pk": 2, "code": "PKR", "name": "Pokhara", "district_name": "Kaski"},
        ]
        mock_response = MagicMock(status_code=200)
        mock_response.json.return_value = mock_branches
        mock_request.return_value = mock_response

        # First call: hits API and caches
        branches = self.service.get_branches(force_refresh=False)
        self.assertEqual(len(branches), 2)
        self.assertEqual(branches[0]["name"], "Kathmandu")
        self.assertEqual(mock_request.call_count, 1)

        # Second call: hits cache, does not hit API
        cached_branches = self.service.get_branches(force_refresh=False)
        self.assertEqual(len(cached_branches), 2)
        self.assertEqual(mock_request.call_count, 1)  # Call count remains 1!

        # Third call with force_refresh=True: hits API again
        refreshed_branches = self.service.get_branches(force_refresh=True)
        self.assertEqual(len(refreshed_branches), 2)
        self.assertEqual(mock_request.call_count, 2)

    @patch("requests.Session.request")
    def test_get_branches_fallback_on_failure(self, mock_request):
        """Test fallback to in-memory backup cache when live API fails."""
        # Prime the cache first
        NCMService._fallback_branches_cache = [
            {"pk": 1, "code": "KTM", "name": "Kathmandu (Fallback)"}
        ]

        # Simulate API failure
        mock_request.side_effect = requests.exceptions.ConnectionError("NCM API Unreachable")

        # Call with force_refresh: should fall back gracefully
        result = self.service.get_branches(force_refresh=True)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["name"], "Kathmandu (Fallback)")

    # --- 3. RATE CALCULATION ---

    @patch("requests.Session.request")
    def test_calculate_rate_success(self, mock_request):
        """Test successful shipping rate calculation with type mapping."""
        mock_response = MagicMock(status_code=200)
        mock_response.json.return_value = {"charge": 120.0}
        mock_request.return_value = mock_response

        result = self.service.calculate_rate(
            destination_branch="Pokhara",
            source_branch="Kathmandu",
            delivery_type="Door2Door",
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["charge"], 120.0)
        self.assertEqual(result["source_branch"], "Kathmandu")
        self.assertEqual(result["destination_branch"], "Pokhara")

        # Verify query parameters sent to NCM
        mock_request.assert_called_once()
        _, kwargs = mock_request.call_args
        self.assertEqual(kwargs["params"]["creation"], "Kathmandu")
        self.assertEqual(kwargs["params"]["destination"], "Pokhara")
        self.assertEqual(kwargs["params"]["type"], "Pickup/Collect")  # Mapped from Door2Door

    def test_calculate_rate_validation_missing_destination(self):
        """Test that missing destination branch raises NCMValidationError."""
        with self.assertRaises(NCMValidationError):
            self.service.calculate_rate(destination_branch="")

    @patch("requests.Session.request")
    def test_calculate_rate_invalid_charge_response(self, mock_request):
        """Test handling when NCM returns an invalid rate format."""
        mock_response = MagicMock(status_code=200)
        mock_response.json.return_value = {"charge": "NOT_A_NUMBER"}
        mock_request.return_value = mock_response

        with self.assertRaises(NCMAPIError):
            self.service.calculate_rate(destination_branch="Pokhara")

    # --- 4. SHIPMENT CREATION & IDEMPOTENCY / RETRY GUARD ---

    @patch("requests.Session.request")
    def test_create_order_request_construction_and_success(self, mock_request):
        """Test shipment creation payload construction and response parsing."""
        mock_response = MagicMock(status_code=200)
        mock_response.json.return_value = {
            "orderid": 1029384,
            "delivery_charge": 140.0,
            "cod_charge": 850.0,
            "delivery_type": "Door2Door",
            "active": True,
            "delivered_date": None,
        }
        mock_request.return_value = mock_response

        order_data = {
            "name": "Ram Bahadur",
            "phone": "9812345678",
            "phone2": "9841234567",
            "cod_charge": 850.0,
            "address": "Baneshwor, Ward 10, Kathmandu",
            "branch": "Pokhara",
            "package": "Loksewa GK & IQ Guide Book",
            "vref_id": "ORD-20261031-001",
            "instruction": "Call before delivery",
            "delivery_type": "Door2Door",
            "weight": 1.5,
        }

        result = self.service.create_order(order_data)

        self.assertTrue(result["success"])
        self.assertEqual(result["ncm_order_id"], "1029384")
        self.assertEqual(result["delivery_charge"], 140.0)
        self.assertEqual(result["cod_charge"], 850.0)

        # Verify request parameters
        mock_request.assert_called_once()
        method, url = mock_request.call_args[0] if mock_request.call_args[0] else (
            mock_request.call_args[1].get("method"), mock_request.call_args[1].get("url")
        )
        kwargs = mock_request.call_args[1]
        self.assertEqual(kwargs.get("method") or method, "POST")
        self.assertEqual(kwargs["json"]["vref_id"], "ORD-20261031-001")
        self.assertEqual(kwargs["json"]["branch"], "Pokhara")
        self.assertEqual(kwargs["json"]["cod_charge"], 850.0)
        self.assertEqual(kwargs["json"]["fbranch"], "Kathmandu")

    @patch("requests.Session.request")
    def test_create_order_never_retries_on_timeout(self, mock_request):
        """
        CRITICAL RELIABILITY TEST:
        Ensure that create_order NEVER automatically retries when a read timeout occurs,
        and marks the error as ambiguous to protect against duplicate shipments.
        """
        mock_request.side_effect = requests.exceptions.ReadTimeout("Server took too long to respond")

        order_data = {
            "name": "Sita Sharma",
            "phone": "9801234567",
            "address": "Lalitpur",
            "branch": "Biratnagar",
            "package": "Course Book",
            "vref_id": "ORD-20261031-TIMEOUT-001",
        }

        with self.assertRaises(NCMConnectionError) as ctx:
            self.service.create_order(order_data)

        # Must be flagged as ambiguous
        self.assertTrue(ctx.exception.is_ambiguous)
        # Must have been called EXACTLY ONCE (no automatic retry!)
        self.assertEqual(mock_request.call_count, 1)

    def test_create_order_validation_errors(self):
        """Test missing required fields and negative COD validation."""
        # Missing name
        with self.assertRaises(NCMValidationError):
            self.service.create_order({
                "phone": "9812345678",
                "address": "Kathmandu",
                "branch": "Pokhara",
                "package": "Book",
                "vref_id": "ORD-001",
            })

        # Negative COD
        with self.assertRaises(NCMValidationError):
            self.service.create_order({
                "name": "Ram",
                "phone": "9812345678",
                "address": "Kathmandu",
                "branch": "Pokhara",
                "package": "Book",
                "vref_id": "ORD-001",
                "cod_charge": -50.0,
            })

    # --- 5. TRACKING & ORDER DETAILS ---

    @patch("requests.Session.request")
    def test_track_order_success(self, mock_request):
        """Test order tracking response parsing."""
        mock_response = MagicMock(status_code=200)
        mock_response.json.return_value = {
            "status": "In Transit",
            "history": [
                {"timestamp": "2026-10-31 09:00", "status": "Pickup Complete"},
                {"timestamp": "2026-10-31 11:30", "status": "In Transit"},
            ],
        }
        mock_request.return_value = mock_response

        res = self.service.track_order("1029384")
        self.assertTrue(res["success"])
        self.assertEqual(res["ncm_order_id"], "1029384")
        self.assertEqual(res["data"]["status"], "In Transit")
        self.assertEqual(len(res["data"]["history"]), 2)

    @patch("requests.Session.request")
    def test_get_order_details_success(self, mock_request):
        """Test full order details fetch."""
        mock_response = MagicMock(status_code=200)
        mock_response.json.return_value = {
            "orderid": 1029384,
            "name": "Ram Bahadur",
            "status": "Dispatched",
            "cod_charge": 850.0,
        }
        mock_request.return_value = mock_response

        res = self.service.get_order_details(1029384)
        self.assertTrue(res["success"])
        self.assertEqual(res["data"]["orderid"], 1029384)

    @patch("requests.Session.request")
    def test_get_order_statuses_bulk(self, mock_request):
        """Test bulk status retrieval."""
        mock_response = MagicMock(status_code=200)
        mock_response.json.return_value = [
            {"orderid": 1029384, "status": "In Transit"},
            {"orderid": 1029385, "status": "Delivered"},
        ]
        mock_request.return_value = mock_response

        res = self.service.get_order_statuses([1029384, "1029385"])
        self.assertTrue(res["success"])
        self.assertEqual(res["count"], 2)

    def test_get_order_statuses_empty_list_raises_validation(self):
        """Test empty order ID list raises NCMValidationError."""
        with self.assertRaises(NCMValidationError):
            self.service.get_order_statuses([])

    # --- 6. ERROR HANDLING & HTTP RESILIENCE ---

    @patch("requests.Session.request")
    def test_server_error_500_raises_api_error(self, mock_request):
        """Test HTTP 500 error raises NCMAPIError."""
        mock_response = MagicMock(status_code=500, text="Internal Server Error")
        mock_request.return_value = mock_response

        with self.assertRaises(NCMAPIError) as ctx:
            self.service.get_order_details("1029384")
        self.assertEqual(ctx.exception.status_code, 500)

    @patch("requests.Session.request")
    def test_invalid_json_response_raises_api_error(self, mock_request):
        """Test non-JSON response raises NCMAPIError."""
        mock_response = MagicMock(status_code=200, text="<html>502 Bad Gateway</html>")
        mock_response.json.side_effect = ValueError("No JSON object could be decoded")
        mock_request.return_value = mock_response

        with self.assertRaises(NCMAPIError):
            self.service.get_order_details("1029384")

    # --- 7. SANITIZATION & LOGGING SECURITY ---

    def test_pii_and_secret_sanitization(self):
        """Test phone numbers and personal text are masked for logging."""
        self.assertEqual(sanitize_phone("9812345678"), "98****5678")
        self.assertEqual(sanitize_phone("984100"), "***")
        self.assertEqual(sanitize_phone(""), "[EMPTY]")

        self.assertEqual(sanitize_text("Hari"), "Ha***i")
        self.assertEqual(sanitize_text("AB"), "***")
        self.assertEqual(sanitize_text(""), "[EMPTY]")

        payload = {
            "name": "Ram Bahadur",
            "phone": "9812345678",
            "phone2": "9841234567",
            "address": "Baneshwor, Kathmandu",
            "vref_id": "ORD-12345",
            "cod_charge": 850.0,
            "branch": "Pokhara",
        }
        sanitized = sanitize_payload_for_logging(payload)

        # Sensitive fields must be masked
        self.assertEqual(sanitized["phone"], "98****5678")
        self.assertEqual(sanitized["phone2"], "98****4567")
        self.assertNotIn("Ram Bahadur", sanitized["name"])
        self.assertNotIn("Baneshwor, Kathmandu", sanitized["address"])

        # Non-sensitive operational fields must remain intact
        self.assertEqual(sanitized["vref_id"], "ORD-12345")
        self.assertEqual(sanitized["cod_charge"], 850.0)
        self.assertEqual(sanitized["branch"], "Pokhara")
