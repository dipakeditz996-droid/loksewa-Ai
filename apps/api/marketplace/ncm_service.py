"""
Nepal Can Move (NCM) Courier & Logistics Service Integration.

Dedicated, resilient service client for interacting with the Nepal Can Move API.
Supports branch retrieval (with multi-tier caching), live rate calculation,
shipment creation, tracking, order details, and bulk status inquiries.

Security & Reliability Guarantees:
- Never exposes NCM credentials in client code, logs, or error responses.
- Sanitizes sensitive customer PII (phone numbers, full names, addresses) in logs.
- Strict timeout configuration (connect timeout = 5s, read timeout = 15s).
- Safe retry strategy for idempotent GET requests only.
- Shipment creation (POST /v1/order/create) is NEVER automatically retried on ambiguous timeouts.
"""

from typing import Any, Dict, List, Optional, Union
import logging
import re
import time
import requests
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger("marketplace.ncm_service")

# --- CUSTOM EXCEPTIONS ---

class NCMError(Exception):
    """Base exception for all Nepal Can Move courier errors."""
    pass


class NCMConfigurationError(NCMError):
    """Raised when required NCM settings or API credentials are missing or invalid."""
    pass


class NCMConnectionError(NCMError):
    """
    Raised when connection to NCM API times out, drops, or fails at network level.
    The `is_ambiguous` flag indicates whether the request may have already been
    processed by NCM (e.g. read timeout on POST).
    """
    def __init__(self, message: str, is_ambiguous: bool = False, original_exc: Optional[Exception] = None):
        super().__init__(message)
        self.is_ambiguous = is_ambiguous
        self.original_exc = original_exc


class NCMAPIError(NCMError):
    """Raised when NCM returns an HTTP error or an unexpected/malformed response payload."""
    def __init__(self, message: str, status_code: Optional[int] = None, response_body: Optional[Any] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


class NCMValidationError(NCMError):
    """Raised when client-side parameter validation fails before sending request to NCM."""
    pass


# --- SANITIZATION HELPERS ---

def sanitize_phone(phone: Optional[str]) -> str:
    """Mask phone number for safe logging (e.g. 9812345678 -> 98****5678)."""
    if not phone:
        return "[EMPTY]"
    clean = re.sub(r"\s+", "", str(phone))
    if len(clean) >= 7:
        return f"{clean[:2]}****{clean[-4:]}"
    return "***"


def sanitize_text(text: Optional[str]) -> str:
    """Mask name or address for safe logging."""
    if not text:
        return "[EMPTY]"
    cleaned = str(text).strip()
    if len(cleaned) <= 3:
        return "***"
    return f"{cleaned[:2]}***{cleaned[-1:]}"


def sanitize_payload_for_logging(data: Any) -> Any:
    """Recursively sanitize sensitive fields in a payload dict for logging."""
    if not isinstance(data, dict):
        return data
    sensitive_keys = {"phone", "phone2", "name", "address", "instruction"}
    safe = {}
    for k, v in data.items():
        if k in ("phone", "phone2"):
            safe[k] = sanitize_phone(v)
        elif k in ("name", "address", "instruction"):
            safe[k] = sanitize_text(v)
        elif isinstance(v, dict):
            safe[k] = sanitize_payload_for_logging(v)
        elif isinstance(v, list):
            safe[k] = [sanitize_payload_for_logging(item) for item in v]
        else:
            safe[k] = v
    return safe


# --- DELIVERY TYPE MAPPINGS ---

# Map frontend/internal delivery types to the 'type' query parameter expected by /v1/shipping-rate
RATE_DELIVERY_TYPE_MAP = {
    "door2door": "Pickup/Collect",
    "pickup/collect": "Pickup/Collect",
    "branch2door": "Send",
    "send": "Send",
    "door2branch": "D2B",
    "d2b": "D2B",
    "branch2branch": "B2B",
    "b2b": "B2B",
}


class NCMService:
    """
    Client service for official Nepal Can Move (NCM) REST API.
    """

    DEFAULT_CONNECT_TIMEOUT = 5.0
    DEFAULT_READ_TIMEOUT = 15.0
    BRANCHES_CACHE_KEY = "ncm:branches:list"
    BRANCHES_CACHE_TTL = 86400  # 24 hours in seconds

    # In-memory backup cache to survive Redis interruptions without crashing
    _fallback_branches_cache: Optional[List[Dict[str, Any]]] = None

    def __init__(
        self,
        api_token: Optional[str] = None,
        base_url: Optional[str] = None,
        default_origin_branch: Optional[str] = None,
        timeout: Optional[Union[float, tuple]] = None,
        session: Optional[requests.Session] = None,
    ):
        config = None
        try:
            from .models import NCMConfiguration
            config = NCMConfiguration.get_settings()
        except Exception:
            config = None

        if api_token is not None:
            self.api_token = api_token.strip()
        elif config and config.get_effective_token():
            self.api_token = config.get_effective_token().strip()
        else:
            self.api_token = getattr(settings, "NCM_API_TOKEN", "").strip()

        if base_url is not None:
            raw_base = base_url.strip()
        elif config and config.get_effective_base_url():
            raw_base = config.get_effective_base_url().strip()
        else:
            raw_base = getattr(settings, "NCM_BASE_URL", "").strip()

        if not raw_base:
            env = getattr(settings, "NCM_ENVIRONMENT", "demo").lower()
            if config:
                env = config.environment.lower()
            if env == "production":
                raw_base = "https://portal.nepalcanmove.com/api/"
            else:
                raw_base = "https://demo.nepalcanmove.com/api/"

        if not raw_base.endswith("/"):
            raw_base += "/"
        self.base_url = raw_base

        if default_origin_branch is not None:
            self.default_origin_branch = default_origin_branch.strip()
        elif config and config.default_origin_branch:
            self.default_origin_branch = config.default_origin_branch.strip()
        else:
            self.default_origin_branch = (
                getattr(settings, "NCM_DEFAULT_ORIGIN_BRANCH", "Kathmandu")
            ).strip()

        self.timeout = (
            timeout
            if timeout is not None
            else (self.DEFAULT_CONNECT_TIMEOUT, self.DEFAULT_READ_TIMEOUT)
        )

        self._session = session or requests.Session()

    def test_connection(self) -> Dict[str, Any]:
        """
        Diagnostic check to test NCM API connectivity and authentication.
        Performs a safe, read-only GET request to list branches.
        NEVER creates a shipment.
        Measures round-trip response time and updates NCMConfiguration telemetry.
        """
        start_time = time.perf_counter()
        config = None
        try:
            from .models import NCMConfiguration
            config = NCMConfiguration.get_settings()
        except Exception:
            pass

        if not self.api_token:
            error_msg = "API Token is not configured. Please set NCM_API_TOKEN in environment or configuration."
            if config:
                config.connection_status = "error"
                config.last_connection_tested_at = timezone.now()
                config.last_connection_latency_ms = None
                config.last_connection_error = error_msg
                config.save(update_fields=["connection_status", "last_connection_tested_at", "last_connection_latency_ms", "last_connection_error"])
            return {
                "success": False,
                "error": error_msg,
                "latency_ms": None,
                "environment": config.environment if config else "unknown",
            }

        try:
            branches = self.get_branches(force_refresh=True)
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            if config:
                config.connection_status = "connected"
                config.last_connection_tested_at = timezone.now()
                config.last_connection_latency_ms = latency_ms
                config.last_connection_error = ""
                config.save(update_fields=["connection_status", "last_connection_tested_at", "last_connection_latency_ms", "last_connection_error"])
            return {
                "success": True,
                "latency_ms": latency_ms,
                "branch_count": len(branches),
                "environment": config.environment if config else "demo",
                "base_url": self.base_url,
                "default_origin_branch": self.default_origin_branch,
            }
        except Exception as exc:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            safe_error = str(exc)
            if config:
                config.connection_status = "error"
                config.last_connection_tested_at = timezone.now()
                config.last_connection_latency_ms = latency_ms
                config.last_connection_error = safe_error
                config.save(update_fields=["connection_status", "last_connection_tested_at", "last_connection_latency_ms", "last_connection_error"])
            return {
                "success": False,
                "error": safe_error,
                "latency_ms": latency_ms,
                "environment": config.environment if config else "unknown",
                "base_url": self.base_url,
            }

    def is_configured(self) -> bool:
        """Check if NCM service has valid API credentials configured."""
        return bool(self.api_token and self.base_url)

    def _get_auth_headers(self) -> Dict[str, str]:
        """Build request headers with Token authentication."""
        if not self.api_token:
            raise NCMConfigurationError(
                "Nepal Can Move API Token (NCM_API_TOKEN) is not configured in settings or environment."
            )
        return {
            "Authorization": f"Token {self.api_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _build_url(self, endpoint: str) -> str:
        """Construct full API URL from relative endpoint."""
        clean_endpoint = endpoint.lstrip("/")
        return f"{self.base_url}{clean_endpoint}"

    def _execute_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        allow_retries: bool = True,
        max_retries: int = 2,
    ) -> requests.Response:
        """
        Execute an HTTP request with error handling and safe retries for idempotent operations.
        Never retries POST requests when allow_retries is False.
        """
        url = self._build_url(endpoint)
        headers = self._get_auth_headers()
        method_upper = method.upper()

        # Enforce that non-idempotent creations never retry automatically
        if method_upper == "POST" and endpoint.endswith("create"):
            allow_retries = False

        attempt = 0
        last_exception = None

        while attempt <= (max_retries if allow_retries else 0):
            attempt += 1
            try:
                logger.debug(
                    "NCM API Request: %s %s (Attempt %d)",
                    method_upper,
                    url,
                    attempt,
                )
                response = self._session.request(
                    method=method_upper,
                    url=url,
                    headers=headers,
                    params=params,
                    json=json_data,
                    timeout=self.timeout,
                )

                # Check for HTTP errors
                if response.status_code >= 400:
                    # Do not retry 4xx client errors
                    if 400 <= response.status_code < 500:
                        logger.warning(
                            "NCM API Client Error %d for %s %s: %s",
                            response.status_code,
                            method_upper,
                            url,
                            response.text[:200],
                        )
                        raise NCMAPIError(
                            f"NCM API client error {response.status_code}: {response.text[:200]}",
                            status_code=response.status_code,
                            response_body=response.text,
                        )
                    # 5xx server errors can be retried if allow_retries is True
                    if allow_retries and attempt <= max_retries:
                        time.sleep(0.5 * attempt)
                        continue
                    raise NCMAPIError(
                        f"NCM API server error {response.status_code}: {response.text[:200]}",
                        status_code=response.status_code,
                        response_body=response.text,
                    )

                return response

            except requests.exceptions.Timeout as exc:
                last_exception = exc
                is_read_timeout = not isinstance(exc, requests.exceptions.ConnectTimeout)
                logger.warning(
                    "NCM API Timeout on %s %s (Attempt %d, ReadTimeout=%s)",
                    method_upper,
                    url,
                    attempt,
                    is_read_timeout,
                )
                if allow_retries and attempt <= max_retries:
                    time.sleep(0.5 * attempt)
                    continue

                # Ambiguous timeout check:
                # If a POST shipment creation timed out while waiting for read response,
                # the server might have created the shipment! Flag it as ambiguous.
                is_ambiguous = (method_upper == "POST" and is_read_timeout)
                raise NCMConnectionError(
                    f"NCM API request timed out on {method_upper} {endpoint}: {exc}",
                    is_ambiguous=is_ambiguous,
                    original_exc=exc,
                ) from exc

            except requests.exceptions.ConnectionError as exc:
                last_exception = exc
                logger.warning(
                    "NCM API Connection Error on %s %s (Attempt %d): %s",
                    method_upper,
                    url,
                    attempt,
                    exc,
                )
                if allow_retries and attempt <= max_retries:
                    time.sleep(0.5 * attempt)
                    continue
                raise NCMConnectionError(
                    f"NCM API network connection failed for {method_upper} {endpoint}: {exc}",
                    is_ambiguous=False,
                    original_exc=exc,
                ) from exc

            except requests.exceptions.RequestException as exc:
                raise NCMConnectionError(
                    f"Unexpected NCM request failure: {exc}",
                    original_exc=exc,
                ) from exc

        # If loop finishes without returning or raising
        raise NCMConnectionError(
            f"Failed after {attempt} attempts: {last_exception}",
            original_exc=last_exception,
        )

    # --------------------------------------------------------------------------
    # 1. BRANCHES (GET /v2/branches)
    # --------------------------------------------------------------------------

    def get_branches(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Fetch available NCM branches with district and covered areas.
        Utilizes Django cache with a 24-hour TTL and in-memory fallback.
        """
        if not force_refresh:
            try:
                cached_branches = cache.get(self.BRANCHES_CACHE_KEY)
                if cached_branches and isinstance(cached_branches, list):
                    return cached_branches
            except Exception as e:
                logger.warning("Cache access error during NCM get_branches: %s", e)

        # Make API call
        try:
            response = self._execute_request(
                method="GET",
                endpoint="v2/branches",
                allow_retries=True,
            )
            try:
                data = response.json()
            except ValueError as exc:
                raise NCMAPIError(
                    f"Invalid JSON returned from NCM branches API: {response.text[:200]}",
                    status_code=response.status_code,
                    response_body=response.text,
                ) from exc

            if not isinstance(data, list):
                # Some APIs wrap in {"results": [...]} or {"data": [...]}
                if isinstance(data, dict) and "results" in data and isinstance(data["results"], list):
                    data = data["results"]
                elif isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
                    data = data["data"]
                else:
                    raise NCMAPIError(
                        f"Expected branch list from NCM, received unexpected type: {type(data)}",
                        status_code=response.status_code,
                        response_body=data,
                    )

            # Store in Django cache and in-memory fallback
            try:
                cache.set(self.BRANCHES_CACHE_KEY, data, timeout=self.BRANCHES_CACHE_TTL)
            except Exception as e:
                logger.warning("Failed to store NCM branches in cache: %s", e)

            NCMService._fallback_branches_cache = data
            logger.info("Successfully fetched and cached %d NCM branches", len(data))
            return data

        except (NCMConnectionError, NCMAPIError) as exc:
            # Check if we have an in-memory or stale cached copy as fallback
            if NCMService._fallback_branches_cache:
                logger.warning(
                    "NCM branch fetch failed (%s). Falling back to in-memory backup with %d branches.",
                    exc,
                    len(NCMService._fallback_branches_cache),
                )
                return NCMService._fallback_branches_cache

            # Try reading stale from cache if force_refresh was True
            if force_refresh:
                try:
                    stale = cache.get(self.BRANCHES_CACHE_KEY)
                    if stale and isinstance(stale, list):
                        logger.warning(
                            "NCM branch fetch failed (%s). Falling back to stale cache with %d branches.",
                            exc,
                            len(stale),
                        )
                        return stale
                except Exception:
                    pass

            raise

    # --------------------------------------------------------------------------
    # 2. RATE CALCULATION (GET /v1/shipping-rate)
    # --------------------------------------------------------------------------

    def calculate_rate(
        self,
        destination_branch: str,
        source_branch: Optional[str] = None,
        delivery_type: str = "Door2Door",
    ) -> Dict[str, Any]:
        """
        Calculate shipping rate between branches for the given delivery type.
        Query params:
          - creation: origin branch (e.g. Kathmandu)
          - destination: destination branch (e.g. Pokhara)
          - type: rate type (Pickup/Collect for Door2Door, Send for Branch2Door, etc.)
        """
        dest = str(destination_branch or "").strip()
        if not dest:
            raise NCMValidationError("destination_branch is required for delivery rate calculation.")

        src = str(source_branch or self.default_origin_branch or "").strip()
        if not src:
            raise NCMValidationError("source_branch is required for delivery rate calculation.")

        # Map delivery type to NCM rate query parameter
        normalized_type = delivery_type.strip().lower()
        ncm_type = RATE_DELIVERY_TYPE_MAP.get(normalized_type, delivery_type.strip())

        params = {
            "creation": src,
            "destination": dest,
            "type": ncm_type,
        }

        response = self._execute_request(
            method="GET",
            endpoint="v1/shipping-rate",
            params=params,
            allow_retries=True,
        )

        try:
            data = response.json()
        except ValueError as exc:
            raise NCMAPIError(
                f"Invalid JSON returned from NCM shipping-rate API: {response.text[:200]}",
                status_code=response.status_code,
                response_body=response.text,
            ) from exc

        # Response schema: {"charge": 120.0} or {"charge": "120"}
        if not isinstance(data, dict) or "charge" not in data:
            raise NCMAPIError(
                f"NCM shipping-rate response missing 'charge' field: {data}",
                status_code=response.status_code,
                response_body=data,
            )

        try:
            charge = float(data["charge"])
        except (ValueError, TypeError) as exc:
            raise NCMAPIError(
                f"Invalid rate value in 'charge' field: {data['charge']}",
                status_code=response.status_code,
                response_body=data,
            ) from exc

        return {
            "success": True,
            "charge": charge,
            "source_branch": src,
            "destination_branch": dest,
            "delivery_type": delivery_type,
            "raw_response": data,
        }

    # --------------------------------------------------------------------------
    # 3. SHIPMENT CREATION (POST /v1/order/create)
    # --------------------------------------------------------------------------

    def create_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a courier shipment in NCM.

        Required fields in order_data:
          - name: Recipient full name
          - phone: Primary phone number
          - address: Full shipping street/ward address
          - branch: Destination branch name
          - package: Package description/item contents
          - vref_id: Vendor reference identifier (e.g. Loksewa order_number)

        Optional fields:
          - phone2: Secondary phone number (default: "")
          - fbranch: Origin branch (default: self.default_origin_branch)
          - instruction: Special delivery instructions (default: "")
          - delivery_type: "Door2Door" (default: "Door2Door")
          - weight: Package weight in kg (default: 1.0)
          - cod_charge: Amount to collect on delivery (default: 0.0)

        CRITICAL RELIABILITY RULE:
        This method will NEVER automatically retry on connection read timeouts to prevent
        duplicate courier shipments and duplicate charges.
        """
        # Validate required fields
        required_fields = ["name", "phone", "address", "branch", "package", "vref_id"]
        missing = [f for f in required_fields if not order_data.get(f)]
        if missing:
            raise NCMValidationError(f"Missing required fields for NCM order creation: {', '.join(missing)}")

        # Validate COD amount
        raw_cod = order_data.get("cod_charge", 0.0)
        try:
            cod_charge = float(raw_cod)
            if cod_charge < 0:
                raise ValueError("COD charge cannot be negative")
        except (ValueError, TypeError) as exc:
            raise NCMValidationError(f"Invalid cod_charge value: {raw_cod}") from exc

        # Validate weight
        raw_weight = order_data.get("weight", 1.0)
        try:
            weight = float(raw_weight)
            if weight <= 0:
                weight = 1.0
        except (ValueError, TypeError):
            weight = 1.0

        payload = {
            "name": str(order_data["name"]).strip(),
            "phone": str(order_data["phone"]).strip(),
            "phone2": str(order_data.get("phone2") or "").strip(),
            "cod_charge": cod_charge,
            "address": str(order_data["address"]).strip(),
            "fbranch": str(order_data.get("fbranch") or self.default_origin_branch).strip(),
            "branch": str(order_data["branch"]).strip(),
            "package": str(order_data["package"]).strip(),
            "vref_id": str(order_data["vref_id"]).strip(),
            "instruction": str(order_data.get("instruction") or "").strip(),
            "delivery_type": str(order_data.get("delivery_type") or "Door2Door").strip(),
            "weight": weight,
        }

        # Safe sanitized logging
        logger.info(
            "Creating NCM courier shipment for ref %s -> destination %s (COD: %.2f)",
            payload["vref_id"],
            payload["branch"],
            payload["cod_charge"],
            extra={"sanitized_data": sanitize_payload_for_logging(payload)},
        )

        response = self._execute_request(
            method="POST",
            endpoint="v1/order/create",
            json_data=payload,
            allow_retries=False,  # Strict non-retry policy
        )

        try:
            data = response.json()
        except ValueError as exc:
            raise NCMAPIError(
                f"Invalid JSON returned from NCM order creation API: {response.text[:200]}",
                status_code=response.status_code,
                response_body=response.text,
            ) from exc

        # Response schema:
        # {"orderid": 1029384, "delivery_charge": 120.0, "delivery_type": "Door2Door", ...}
        if not isinstance(data, dict) or "orderid" not in data:
            raise NCMAPIError(
                f"NCM order creation response missing 'orderid': {data}",
                status_code=response.status_code,
                response_body=data,
            )

        ncm_order_id = str(data["orderid"])
        delivery_charge = float(data.get("delivery_charge", 0.0))
        returned_cod = float(data.get("cod_charge", cod_charge))

        logger.info(
            "Successfully created NCM shipment: orderid=%s, ref=%s, charge=%.2f",
            ncm_order_id,
            payload["vref_id"],
            delivery_charge,
        )

        return {
            "success": True,
            "ncm_order_id": ncm_order_id,
            "delivery_charge": delivery_charge,
            "cod_charge": returned_cod,
            "delivery_type": data.get("delivery_type", payload["delivery_type"]),
            "active": data.get("active", True),
            "raw_response": data,
        }

    # --------------------------------------------------------------------------
    # 4. TRACK ORDER (GET /v1/order/status)
    # --------------------------------------------------------------------------

    def track_order(self, ncm_order_id: Union[str, int]) -> Dict[str, Any]:
        """
        Fetch status and tracking timeline for an NCM order.
        Endpoint: GET /v1/order/status?id=<order_id>
        """
        oid = str(ncm_order_id).strip()
        if not oid:
            raise NCMValidationError("ncm_order_id is required to track order.")

        response = self._execute_request(
            method="GET",
            endpoint="v1/order/status",
            params={"id": oid},
            allow_retries=True,
        )

        try:
            data = response.json()
        except ValueError as exc:
            raise NCMAPIError(
                f"Invalid JSON returned from NCM tracking API: {response.text[:200]}",
                status_code=response.status_code,
                response_body=response.text,
            ) from exc

        return {
            "success": True,
            "ncm_order_id": oid,
            "data": data,
        }

    # --------------------------------------------------------------------------
    # 5. ORDER DETAILS (GET /v1/order)
    # --------------------------------------------------------------------------

    def get_order_details(self, ncm_order_id: Union[str, int]) -> Dict[str, Any]:
        """
        Fetch complete order record from NCM.
        Endpoint: GET /v1/order?id=<order_id>
        """
        oid = str(ncm_order_id).strip()
        if not oid:
            raise NCMValidationError("ncm_order_id is required to fetch order details.")

        response = self._execute_request(
            method="GET",
            endpoint="v1/order",
            params={"id": oid},
            allow_retries=True,
        )

        try:
            data = response.json()
        except ValueError as exc:
            raise NCMAPIError(
                f"Invalid JSON returned from NCM order details API: {response.text[:200]}",
                status_code=response.status_code,
                response_body=response.text,
            ) from exc

        return {
            "success": True,
            "ncm_order_id": oid,
            "data": data,
        }

    # --------------------------------------------------------------------------
    # 6. BULK ORDER STATUSES (POST /v1/orders/statuses)
    # --------------------------------------------------------------------------

    def get_order_statuses(self, ncm_order_ids: List[Union[str, int]]) -> Dict[str, Any]:
        """
        Fetch statuses for multiple NCM orders in a single request.
        Endpoint: POST /v1/orders/statuses with {"orders": [id1, id2, ...]}
        """
        if not ncm_order_ids:
            raise NCMValidationError("ncm_order_ids list cannot be empty.")

        clean_ids = []
        for raw_id in ncm_order_ids:
            try:
                clean_ids.append(int(raw_id))
            except (ValueError, TypeError):
                clean_ids.append(str(raw_id).strip())

        response = self._execute_request(
            method="POST",
            endpoint="v1/orders/statuses",
            json_data={"orders": clean_ids},
            allow_retries=True,  # Idempotent status check can be retried safely
        )

        try:
            data = response.json()
        except ValueError as exc:
            raise NCMAPIError(
                f"Invalid JSON returned from NCM bulk statuses API: {response.text[:200]}",
                status_code=response.status_code,
                response_body=response.text,
            ) from exc

        return {
            "success": True,
            "count": len(clean_ids),
            "data": data,
        }
