"""Comprehensive test suite for LoksewaAI Phase 3A AI Tutor backend endpoint.

Tests:
- Input validation (missing question, empty question, max lengths, language choices, context bounds)
- Authentication and session security (anonymous, inactive user, revoked token/password change)
- Permissions and subscription/entitlement enforcement (platform kill-switch, daily limits, active package)
- Rate limiting (DRF UserRateThrottle)
- Missing/unconfigured API key handling
- Provider execution with mocks (success, timeouts, upstream 429, upstream 5xx)
- Knowledge quality (citations present when approved sources exist vs source_unavailable=True when not)
- Safe error handling (no secrets or stack traces leaked)
- Durable usage tracking (TutorUsage and UsageLedger)
"""
import datetime
from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import AdminSettings, User
from exams.models import Exam, ExamCategory, Paper, Subject
from notes.models import StudyMaterial
from subscriptions.models import Subscription, SubscriptionPlan, UsageLedger
from .models import TutorUsage
from .provider import (
    AIProviderConfigurationError,
    AIProviderRateLimitError,
    AIProviderTimeoutError,
    AIProviderUnavailableError,
    GeminiProvider,
    ProviderResponse,
)

ENDPOINT_URL = '/api/ai/tutor/'


class AITutorEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

        # Create student user
        self.password = "SecureStudentPass123!"
        self.student = User.objects.create_user(
            username="student_tutor_test",
            email="student_tutor@example.com",
            password=self.password,
            role="student",
            is_active=True,
        )

        # Authenticate via JWT
        self.refresh = RefreshToken.for_user(self.student)
        self.access_token = str(self.refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')

        # Clean AdminSettings
        self.settings = AdminSettings.get_settings()
        self.settings.enable_ai_tutor = True
        self.settings.enforce_subscription_access = False
        self.settings.ai_tutor_daily_message_limit = 20
        self.settings.save()

        # Create curriculum hierarchy for knowledge tests
        self.category = ExamCategory.objects.create(name='Civil Service')
        self.exam = Exam.objects.create(category=self.category, name='Section Officer')
        self.paper = Paper.objects.create(exam=self.exam, name='Governance')
        self.subject = Subject.objects.create(paper=self.paper, name='Constitution')

    def tearDown(self):
        cache.clear()

    # -------------------------------------------------------------------------
    # 1. Input Validation Tests
    # -------------------------------------------------------------------------

    def test_missing_question_returns_400(self):
        resp = self.client.post(ENDPOINT_URL, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data['code'], 'invalid_input')
        self.assertIn('question', resp.data['details'])

    def test_empty_or_whitespace_question_returns_400(self):
        resp = self.client.post(ENDPOINT_URL, {'question': '   '})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('question', resp.data['details'])

    def test_question_too_short_returns_400(self):
        resp = self.client.post(ENDPOINT_URL, {'question': 'a'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('question', resp.data['details'])

    def test_question_exceeding_max_length_returns_400(self):
        long_q = "What is governance? " * 60  # > 1000 chars
        resp = self.client.post(ENDPOINT_URL, {'question': long_q})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('question', resp.data['details'])

    def test_unsupported_language_returns_400(self):
        resp = self.client.post(ENDPOINT_URL, {
            'question': 'Explain federalism',
            'language': 'spanish'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('language', resp.data['details'])

    def test_context_exceeding_max_length_returns_400(self):
        long_ctx = "Nepal civil service notes " * 80  # > 1500 chars
        resp = self.client.post(ENDPOINT_URL, {
            'question': 'Explain federalism',
            'context': long_ctx
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('context', resp.data['details'])

    # -------------------------------------------------------------------------
    # 2. Authentication & Session Security Tests
    # -------------------------------------------------------------------------

    def test_unauthenticated_request_returns_401(self):
        self.client.credentials()  # Remove authorization header
        resp = self.client.post(ENDPOINT_URL, {'question': 'What is public administration?'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_user_token_returns_401(self):
        self.student.is_active = False
        self.student.save(update_fields=['is_active'])

        resp = self.client.post(ENDPOINT_URL, {'question': 'What is public administration?'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_password_change_invalidates_outstanding_token(self):
        self.student.set_password("NewPassword999!Changed")
        self.student.save(update_fields=['password'])

        resp = self.client.post(ENDPOINT_URL, {'question': 'What is public administration?'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    # -------------------------------------------------------------------------
    # 3. Permissions & Entitlement Enforcement Tests
    # -------------------------------------------------------------------------

    def test_blocked_when_platform_ai_tutor_disabled(self):
        self.settings.enable_ai_tutor = False
        self.settings.save()

        resp = self.client.post(ENDPOINT_URL, {'question': 'Explain constitutional bodies'})
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(resp.data['code'], 'ai_tutor_disabled')

    def test_blocked_when_daily_limit_reached(self):
        self.settings.ai_tutor_daily_message_limit = 2
        self.settings.save()

        TutorUsage.objects.create(
            student=self.student,
            date=datetime.date.today(),
            request_count=2
        )

        resp = self.client.post(ENDPOINT_URL, {'question': 'Explain the judiciary'})
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(resp.data['code'], 'ai_allowance_exceeded')

    def test_blocked_when_subscription_enforcement_on_and_student_has_no_plan(self):
        self.settings.enforce_subscription_access = True
        self.settings.save()

        resp = self.client.post(ENDPOINT_URL, {'question': 'Explain parliamentary democracy'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_allowed_when_student_has_active_subscription(self):
        self.settings.enforce_subscription_access = True
        self.settings.save()

        plan = SubscriptionPlan.objects.create(
            name='Officer Gold',
            slug='officer-gold',
            price=2500,
            status='ACTIVE',
            is_published=True,
            ai_tutor_enabled=True,
        )
        Subscription.objects.create(
            student=self.student,
            plan=plan,
            status='ACTIVE',
            source='PAID',
        )

        with patch.object(GeminiProvider, 'generate_content') as mock_gen:
            mock_gen.return_value = ProviderResponse(
                text="Parliamentary democracy in Nepal features a bicameral federal parliament.",
                model="gemini-2.0-flash-lite",
                input_tokens=40,
                output_tokens=30,
                total_tokens=70,
            )
            resp = self.client.post(ENDPOINT_URL, {'question': 'Explain parliamentary democracy'})
            self.assertEqual(resp.status_code, status.HTTP_200_OK)

    # -------------------------------------------------------------------------
    # 4. Provider Success, Retrieval & Grounding Tests
    # -------------------------------------------------------------------------

    @patch.object(GeminiProvider, 'generate_content')
    def test_successful_response_with_grounded_citations(self, mock_gen):
        # Create approved published study material
        material = StudyMaterial.objects.create(
            title="Directive Principles of the State",
            exam=self.exam,
            subject=self.subject,
            content="The Directive Principles and Policies of the State are guided by the constitution.",
            status="published",
            available_to_ai_tutor=True,
        )

        mock_gen.return_value = ProviderResponse(
            text="The Directive Principles guide socioeconomic development and state governance.",
            model="gemini-2.0-flash-lite",
            input_tokens=120,
            output_tokens=65,
            total_tokens=185,
        )

        resp = self.client.post(ENDPOINT_URL, {
            'question': 'Tell me about Directive Principles of the State in Nepal',
            'language': 'english',
        })

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['language'], 'en')
        self.assertEqual(resp.data['model'], 'gemini-2.0-flash-lite')
        self.assertFalse(resp.data['source_unavailable'])
        self.assertEqual(len(resp.data['citations']), 1)
        self.assertEqual(resp.data['citations'][0]['id'], material.id)
        self.assertEqual(resp.data['citations'][0]['title'], "Directive Principles of the State")
        self.assertEqual(resp.data['citations'][0]['type'], "study_material")

    @patch.object(GeminiProvider, 'generate_content')
    def test_successful_response_without_approved_sources_indicates_source_unavailable(self, mock_gen):
        mock_gen.return_value = ProviderResponse(
            text="General concepts of ecology and biodiversity...",
            model="gemini-2.0-flash-lite",
            input_tokens=50,
            output_tokens=40,
            total_tokens=90,
        )

        resp = self.client.post(ENDPOINT_URL, {
            'question': 'Explain quantum physics in deep space',
            'language': 'ne',
        })

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['language'], 'ne')
        self.assertTrue(resp.data['source_unavailable'])
        self.assertEqual(resp.data['citations'], [])

    @patch.object(GeminiProvider, 'generate_content')
    def test_client_context_is_passed_safely_as_unverified(self, mock_gen):
        mock_gen.return_value = ProviderResponse(
            text="Answer incorporating user notes.",
            model="gemini-2.0-flash-lite",
            input_tokens=80,
            output_tokens=30,
            total_tokens=110,
        )

        resp = self.client.post(ENDPOINT_URL, {
            'question': 'What is public debt management?',
            'context': 'I heard internal debt is 1100 billion NPR.',
        })

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Verify the prompt sent to mock_gen explicitly tags context as unverified
        call_kwargs = mock_gen.call_args.kwargs
        self.assertIn('[Student Notes / Context - Unverified]', call_kwargs['prompt'])
        self.assertIn('1100 billion NPR', call_kwargs['prompt'])

    # -------------------------------------------------------------------------
    # 5. Provider Failure & Error Handling Tests (Safe without secret leakage)
    # -------------------------------------------------------------------------

    @patch.object(GeminiProvider, 'generate_content')
    def test_missing_api_key_returns_503_safely(self, mock_gen):
        mock_gen.side_effect = AIProviderConfigurationError("AI provider not configured")

        resp = self.client.post(ENDPOINT_URL, {'question': 'Explain administrative law'})
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(resp.data['code'], 'provider_not_configured')
        self.assertNotIn('GEMINI_API_KEY', str(resp.data))

    @patch.object(GeminiProvider, 'generate_content')
    def test_provider_timeout_returns_504(self, mock_gen):
        mock_gen.side_effect = AIProviderTimeoutError("Upstream timeout")

        resp = self.client.post(ENDPOINT_URL, {'question': 'Explain administrative law'})
        self.assertEqual(resp.status_code, status.HTTP_504_GATEWAY_TIMEOUT)
        self.assertEqual(resp.data['code'], 'provider_timeout')

    @patch.object(GeminiProvider, 'generate_content')
    def test_provider_rate_limit_returns_429(self, mock_gen):
        mock_gen.side_effect = AIProviderRateLimitError("Upstream quota exhausted")

        resp = self.client.post(ENDPOINT_URL, {'question': 'Explain administrative law'})
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(resp.data['code'], 'provider_rate_limited')

    @patch.object(GeminiProvider, 'generate_content')
    def test_provider_upstream_error_returns_502(self, mock_gen):
        mock_gen.side_effect = AIProviderUnavailableError("Server error 503")

        resp = self.client.post(ENDPOINT_URL, {'question': 'Explain administrative law'})
        self.assertEqual(resp.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(resp.data['code'], 'provider_unavailable')

    @patch.object(GeminiProvider, 'generate_content')
    def test_no_secret_or_stack_trace_leakage_in_error_responses(self, mock_gen):
        secret_key_mock = "AIzaSySecretFakeGeminiKey12345"
        mock_gen.side_effect = Exception(f"Internal crash at https://generativelanguage.googleapis.com key={secret_key_mock}")

        resp = self.client.post(ENDPOINT_URL, {'question': 'Explain civil service values'})
        self.assertEqual(resp.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertNotIn(secret_key_mock, str(resp.data))
        self.assertNotIn("Traceback", str(resp.data))
        self.assertNotIn("googleapis", str(resp.data))

    # -------------------------------------------------------------------------
    # 6. Durable Usage & Ledger Settlement Tests
    # -------------------------------------------------------------------------

    @patch.object(GeminiProvider, 'generate_content')
    def test_usage_and_ledger_updated_after_successful_generation(self, mock_gen):
        mock_gen.return_value = ProviderResponse(
            text="Good governance involves accountability, transparency, and rule of law.",
            model="gemini-2.0-flash-lite",
            input_tokens=25,
            output_tokens=35,
            total_tokens=60,
        )

        resp = self.client.post(ENDPOINT_URL, {'question': 'What are pillars of good governance?'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        usage = TutorUsage.objects.get(student=self.student, date=datetime.date.today())
        self.assertEqual(usage.request_count, 1)
        self.assertEqual(usage.token_usage, 60)

        ledger_entry = UsageLedger.objects.filter(
            student=self.student,
            feature='ai_credits',
            event_type='CONSUME'
        ).first()
        self.assertIsNotNone(ledger_entry)
        self.assertEqual(ledger_entry.amount, 60)

    # -------------------------------------------------------------------------
    # 7. DRF Throttling Tests
    # -------------------------------------------------------------------------

    @patch.object(GeminiProvider, 'generate_content')
    def test_rate_throttling_tripped_after_rapid_requests(self, mock_gen):
        mock_gen.return_value = ProviderResponse(
            text="Response",
            model="gemini-2.0-flash-lite",
            input_tokens=10,
            output_tokens=10,
            total_tokens=20,
        )

        from ai_tutor.throttling import AITutorRateThrottle
        orig_rates = getattr(AITutorRateThrottle, 'THROTTLE_RATES', None)
        AITutorRateThrottle.THROTTLE_RATES = {'ai_tutor': '3/minute'}
        try:
            statuses = []
            for _ in range(5):
                r = self.client.post(ENDPOINT_URL, {'question': 'Valid test question?'})
                statuses.append(r.status_code)
            self.assertIn(status.HTTP_429_TOO_MANY_REQUESTS, statuses)
        finally:
            AITutorRateThrottle.THROTTLE_RATES = orig_rates
