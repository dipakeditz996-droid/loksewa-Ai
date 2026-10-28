"""Unit tests for GeminiProvider service layer."""
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from ai_tutor.provider import (
    AIProviderConfigurationError,
    AIProviderError,
    AIProviderRateLimitError,
    AIProviderResponseError,
    AIProviderTimeoutError,
    AIProviderUnavailableError,
    GeminiProvider,
    ProviderResponse,
)


class GeminiProviderUnitTests(SimpleTestCase):
    def test_missing_api_key_raises_configuration_error(self):
        with patch.object(GeminiProvider, 'get_api_key', return_value=""):
            provider = GeminiProvider(api_key="")
            with self.assertRaises(AIProviderConfigurationError) as cm:
                provider.generate_content("Hello")
            self.assertIn("not configured", str(cm.exception))

    def test_default_model_and_bounds_applied(self):
        with patch.object(GeminiProvider, 'get_api_key', return_value="fake-key"):
            with patch('google.genai.Client') as mock_client_cls:
                mock_client = MagicMock()
                mock_client_cls.return_value = mock_client
                mock_response = MagicMock()
                mock_response.text = "Sample response text"
                mock_response.usage_metadata.prompt_token_count = 15
                mock_response.usage_metadata.candidates_token_count = 25
                mock_response.usage_metadata.total_token_count = 40
                mock_response.candidates = [MagicMock(finish_reason="STOP")]
                mock_client.models.generate_content.return_value = mock_response

                provider = GeminiProvider(api_key="fake-key")
                res = provider.generate_content("What is Loksewa?")

                self.assertIsInstance(res, ProviderResponse)
                self.assertEqual(res.text, "Sample response text")
                self.assertEqual(res.model, "gemini-2.0-flash-lite")
                self.assertEqual(res.total_tokens, 40)
                mock_client.models.generate_content.assert_called_once()
                call_kwargs = mock_client.models.generate_content.call_args.kwargs
                self.assertEqual(call_kwargs['model'], "gemini-2.0-flash-lite")
                self.assertEqual(call_kwargs['config'].max_output_tokens, 800)

    def test_timeout_translates_to_provider_timeout_error(self):
        with patch.object(GeminiProvider, 'get_api_key', return_value="fake-key"):
            with patch('google.genai.Client') as mock_client_cls:
                mock_client = MagicMock()
                mock_client_cls.return_value = mock_client
                mock_client.models.generate_content.side_effect = TimeoutError("Request timed out")

                provider = GeminiProvider(api_key="fake-key")
                with self.assertRaises(AIProviderTimeoutError):
                    provider.generate_content("What is the constitution?")

    def test_empty_response_text_raises_response_error(self):
        with patch.object(GeminiProvider, 'get_api_key', return_value="fake-key"):
            with patch('google.genai.Client') as mock_client_cls:
                mock_client = MagicMock()
                mock_client_cls.return_value = mock_client
                mock_response = MagicMock()
                mock_response.text = "   "  # Blank
                mock_response.candidates = [MagicMock(finish_reason="SAFETY")]
                mock_client.models.generate_content.return_value = mock_response

                provider = GeminiProvider(api_key="fake-key")
                with self.assertRaises(AIProviderResponseError):
                    provider.generate_content("Unsafe prompt")
