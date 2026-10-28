"""Google Gemini AI provider service for LoksewaAI Tutor.

Implements a secure, bounded, low-cost client using the official Google Gen AI
Python SDK (google-genai). Handles timeouts, rate limits, missing credentials,
and upstream failures safely without leaking keys or internal traces.
"""
from dataclasses import dataclass
import logging
import os
from typing import Optional

from django.conf import settings

logger = logging.getLogger(__name__)


# -----------------------------------------------------------------------------
# Exception Hierarchy
# -----------------------------------------------------------------------------

class AIProviderError(Exception):
    """Base exception for all AI provider failures."""
    default_code = "ai_provider_error"

    def __init__(self, message: str = "AI service error", code: Optional[str] = None):
        super().__init__(message)
        self.code = code or self.default_code


class AIProviderConfigurationError(AIProviderError):
    """Raised when provider credentials or essential configurations are missing."""
    default_code = "provider_not_configured"


class AIProviderTimeoutError(AIProviderError):
    """Raised when an upstream AI request exceeds the bounded timeout."""
    default_code = "provider_timeout"


class AIProviderRateLimitError(AIProviderError):
    """Raised when the upstream AI provider returns a 429 rate limit or quota exhaustion."""
    default_code = "provider_rate_limited"


class AIProviderUnavailableError(AIProviderError):
    """Raised when the upstream AI provider is unreachable or returns 5xx."""
    default_code = "provider_unavailable"


class AIProviderResponseError(AIProviderError):
    """Raised when the upstream provider returns an empty, blocked, or malformed response."""
    default_code = "provider_response_error"


# -----------------------------------------------------------------------------
# Provider Response Value Object
# -----------------------------------------------------------------------------

@dataclass(frozen=True)
class ProviderResponse:
    text: str
    model: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    finish_reason: str = "STOP"


# -----------------------------------------------------------------------------
# Gemini Provider Service
# -----------------------------------------------------------------------------

class GeminiProvider:
    """Manages bounded generation requests to Google Gemini models."""

    # Default model: lightweight, cost-effective Flash-Lite model
    DEFAULT_MODEL = "gemini-2.0-flash-lite"
    DEFAULT_TIMEOUT_SECONDS = 15.0
    DEFAULT_MAX_OUTPUT_TOKENS = 800

    @classmethod
    def get_api_key(cls) -> str:
        key = getattr(settings, "GEMINI_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "")
        return key.strip()

    @classmethod
    def get_model(cls) -> str:
        model = getattr(settings, "GEMINI_MODEL", "") or os.environ.get("GEMINI_MODEL", "")
        return model.strip() or cls.DEFAULT_MODEL

    @classmethod
    def get_timeout(cls) -> float:
        val = getattr(settings, "GEMINI_REQUEST_TIMEOUT", None)
        if val is None:
            raw = os.environ.get("GEMINI_REQUEST_TIMEOUT", "")
            val = float(raw) if raw.strip() else cls.DEFAULT_TIMEOUT_SECONDS
        return float(val)

    @classmethod
    def get_max_output_tokens(cls) -> int:
        val = getattr(settings, "GEMINI_MAX_OUTPUT_TOKENS", None)
        if val is None:
            raw = os.environ.get("GEMINI_MAX_OUTPUT_TOKENS", "")
            val = int(raw) if raw.strip() else cls.DEFAULT_MAX_OUTPUT_TOKENS
        return int(val)

    @classmethod
    def is_configured(cls) -> bool:
        return bool(cls.get_api_key())

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, timeout: Optional[float] = None):
        self._api_key = (api_key or self.get_api_key()).strip()
        self.model = (model or self.get_model()).strip()
        self.timeout = timeout if timeout is not None else self.get_timeout()

    def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        max_output_tokens: Optional[int] = None,
        temperature: float = 0.3,
    ) -> ProviderResponse:
        """Sends a bounded generation request to Google Gemini.

        Raises specialized AIProviderError subclasses on failure.
        Never prints or logs the API key.
        """
        if not self._api_key:
            logger.warning("Gemini generation skipped: GEMINI_API_KEY is not configured.")
            raise AIProviderConfigurationError("AI Tutor service is not configured. Please contact the administrator.")

        output_tokens = max_output_tokens or self.get_max_output_tokens()

        try:
            from google import genai
            from google.genai import types
            from google.genai import errors as genai_errors
        except ImportError as e:
            logger.error("google-genai package is not installed: %s", e)
            raise AIProviderUnavailableError("AI provider SDK is unavailable on the server.") from e

        # Initialize the official google-genai Client with bounded HTTP timeout
        try:
            http_options = types.HttpOptions(timeout=int(self.timeout * 1000))  # milliseconds
            client = genai.Client(api_key=self._api_key, http_options=http_options)
        except Exception as e:
            logger.error("Failed to initialize Google Gen AI Client: %s", type(e).__name__)
            raise AIProviderUnavailableError("Could not initialize AI provider client.") from e

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            max_output_tokens=output_tokens,
            temperature=temperature,
        )

        try:
            response = client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config,
            )
        except genai_errors.APIError as e:
            status_code = getattr(e, "code", None) or getattr(e, "status_code", None)
            logger.warning("Gemini API error occurred (status=%s): %s", status_code, type(e).__name__)
            if status_code == 429:
                raise AIProviderRateLimitError("AI Tutor provider is temporarily busy. Please try again shortly.") from e
            elif status_code and 500 <= status_code < 600:
                raise AIProviderUnavailableError("AI Tutor upstream service is temporarily unavailable.") from e
            raise AIProviderError("AI Tutor provider request failed.") from e
        except (TimeoutError, Exception) as e:
            err_name = type(e).__name__.lower()
            if "timeout" in err_name:
                logger.warning("Gemini API request timed out after %ss: %s", self.timeout, type(e).__name__)
                raise AIProviderTimeoutError("AI Tutor request timed out. Please try again.") from e
            logger.error("Unexpected error during Gemini content generation: %s", type(e).__name__)
            raise AIProviderUnavailableError("AI Tutor service temporarily unavailable.") from e

        # Validate response content
        if not response:
            raise AIProviderResponseError("AI provider returned an empty response.")

        answer_text = getattr(response, "text", "") or ""
        if not answer_text.strip():
            # Check if filtered by safety or content policy
            candidates = getattr(response, "candidates", None) or []
            finish_reason = "UNKNOWN"
            if candidates:
                finish_reason = str(getattr(candidates[0], "finish_reason", "FILTERED"))
            logger.warning("Gemini generated empty response text (finish_reason=%s).", finish_reason)
            raise AIProviderResponseError("AI provider could not generate an answer for this query.")

        # Extract usage metadata safely
        usage = getattr(response, "usage_metadata", None)
        in_tokens = int(getattr(usage, "prompt_token_count", 0) or 0)
        out_tokens = int(getattr(usage, "candidates_token_count", 0) or 0)
        tot_tokens = int(getattr(usage, "total_token_count", 0) or (in_tokens + out_tokens or 1))

        candidates = getattr(response, "candidates", None) or []
        finish_reason = "STOP"
        if candidates:
            finish_reason = str(getattr(candidates[0], "finish_reason", "STOP"))

        return ProviderResponse(
            text=answer_text.strip(),
            model=self.model,
            input_tokens=in_tokens,
            output_tokens=out_tokens,
            total_tokens=tot_tokens,
            finish_reason=finish_reason,
        )
