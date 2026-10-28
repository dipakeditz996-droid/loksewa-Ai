import datetime
import logging
import time

from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from subscriptions.permissions import HasActiveSubscription
from .knowledge import retrieve_knowledge_sources
from .models import Conversation, Message, TutorUsage
from .provider import (
    AIProviderConfigurationError,
    AIProviderError,
    AIProviderRateLimitError,
    AIProviderResponseError,
    AIProviderTimeoutError,
    AIProviderUnavailableError,
    GeminiProvider,
)
from .serializers import (
    AITutorAskRequestSerializer,
    ConversationDetailSerializer,
    ConversationSerializer,
    MessageSerializer,
)
from .services import AITutorService
from .throttling import AITutorRateThrottle

logger = logging.getLogger(__name__)
usage_logger = logging.getLogger('ai_tutor.usage')


def _get_ai_tutor_settings():
    """Fetches the singleton AdminSettings row (admin-configurable enable flag + daily limit)."""
    from core.models import AdminSettings
    return AdminSettings.get_settings()


class ConversationListView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(student=self.request.user)

    def perform_create(self, serializer):
        settings = _get_ai_tutor_settings()
        if not settings.enable_ai_tutor:
            raise PermissionDenied("AI Tutor is currently disabled by the administrator.")
        if settings.enforce_subscription_access and self.request.user.role not in ('teacher', 'admin', 'super-admin'):
            from subscriptions.access import has_active_subscription
            if not has_active_subscription(self.request.user):
                raise PermissionDenied(HasActiveSubscription.message)
        serializer.save(student=self.request.user)


class ConversationDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = ConversationDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(student=self.request.user)


class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        conversation_id = self.kwargs['conversation_id']
        return Message.objects.filter(
            conversation_id=conversation_id, 
            conversation__student=self.request.user
        )


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def post(self, request, conversation_id):
        ai_tutor_settings = _get_ai_tutor_settings()
        if not ai_tutor_settings.enable_ai_tutor:
            return Response(
                {"error": "AI Tutor is currently disabled by the administrator."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        content = request.data.get('content')
        if not content:
            return Response({"error": "Content is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            conversation = Conversation.objects.get(id=conversation_id, student=request.user)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)

        from subscriptions.entitlements import EntitlementService
        ai_allowed, ai_reason, ai_info = EntitlementService.check_ai_allowance(request.user)
        if not ai_allowed:
            return Response(
                {
                    "error": ai_reason,
                    "remaining": ai_info.get("remaining", 0),
                    "upgrade_url": ai_info.get("upgrade_url", "/student/plans")
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Today's usage record
        today = datetime.date.today()
        usage, created = TutorUsage.objects.get_or_create(student=request.user, date=today)

        # Save user message
        user_msg = Message.objects.create(
            conversation=conversation,
            role='user',
            content=content
        )
        
        # Generate AI response
        ai_service = AITutorService()
        try:
            response_text = ai_service.generate_response(conversation, content)
        except Exception:
            return Response(
                {"error": "AI Tutor service temporarily unavailable. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY
            )

        # Save AI message
        ai_msg = Message.objects.create(
            conversation=conversation,
            role='assistant',
            content=response_text
        )

        tokens_consumed = max(1, getattr(ai_service, 'last_token_count', 1))
        # Update usage and conversation timestamp
        usage.request_count += 1
        usage.token_usage += tokens_consumed
        usage.save()
        conversation.save() # Triggers updated_at

        # Record in central entitlement ledger
        EntitlementService.consume_ai_credits(
            user=request.user,
            tokens_used=tokens_consumed,
            conversation_id=conversation.id
        )

        return Response({
            "user_message": MessageSerializer(user_msg).data,
            "assistant_message": MessageSerializer(ai_msg).data
        })


class AITutorEndpointView(APIView):
    """
    POST /api/ai/tutor/
    Official low-cost, secure AI Tutor endpoint for Nepal Loksewa preparation.

    Enforces JWT authentication, session revocation, platform kill-switch,
    subscription allowances, rate limits, and bounded token/timeout generation.
    """
    permission_classes = [IsAuthenticated, HasActiveSubscription]
    throttle_classes = [AITutorRateThrottle]

    def post(self, request):
        # 1. Admin platform kill-switch
        ai_tutor_settings = _get_ai_tutor_settings()
        if not ai_tutor_settings.enable_ai_tutor:
            return Response(
                {
                    "error": "AI Tutor is currently disabled by the administrator.",
                    "code": "ai_tutor_disabled",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # 2. Input validation
        serializer = AITutorAskRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "error": "Invalid request parameters.",
                    "code": "invalid_input",
                    "details": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        validated = serializer.validated_data
        question = validated['question']
        target_lang = validated['language']
        user_context = validated.get('context', '')

        # 3. Check subscription & quota allowances
        from subscriptions.entitlements import EntitlementService
        ai_allowed, ai_reason, ai_info = EntitlementService.check_ai_allowance(request.user)
        if not ai_allowed:
            return Response(
                {
                    "error": ai_reason,
                    "code": "ai_allowance_exceeded",
                    "remaining": ai_info.get("remaining", 0),
                    "upgrade_url": ai_info.get("upgrade_url", "/student/plans"),
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # 4. Knowledge Retrieval (approved, published platform study materials)
        citations, reference_block = retrieve_knowledge_sources(question, student=request.user)
        source_unavailable = (len(citations) == 0)

        # 5. Build prompt & system instruction
        base_prompt = getattr(ai_tutor_settings, 'ai_tutor_base_prompt', '') or (
            "You are an expert AI Tutor for Loksewa exam preparation in Nepal. "
            "You provide accurate, clear, and structured answers."
        )

        lang_name = "Nepali" if target_lang == 'ne' else "English"
        system_instruction = (
            f"{base_prompt}\n\n"
            f"Language directive: Respond strictly in {lang_name}.\n"
            "Format instructions: Provide a clear, well-structured, objective explanation with bullet points where appropriate.\n"
        )

        if not source_unavailable:
            system_instruction += (
                f"{reference_block}\n"
                "Grounding rule: Use the verified platform study materials provided above. "
                "Cite their titles when explaining facts from them.\n"
            )
        else:
            system_instruction += (
                "Knowledge limitation: No verified platform study material was retrieved for this query. "
                "Act as a general Loksewa curriculum tutor based on standard syllabus principles. "
                "Do not invent fictitious statutes, citation numbers, or exam rulings.\n"
            )

        prompt_parts = []
        if user_context:
            prompt_parts.append(
                f"[Student Notes / Context - Unverified]:\n{user_context}\n"
                "(Note: The above context is provided directly by the student for this query.)\n"
            )
        prompt_parts.append(f"Question: {question}")
        full_prompt = "\n".join(prompt_parts)

        # 6. Call provider with bounded execution
        start_time = time.monotonic()
        provider = GeminiProvider()
        try:
            provider_resp = provider.generate_content(
                prompt=full_prompt,
                system_instruction=system_instruction,
            )
        except AIProviderConfigurationError:
            return Response(
                {
                    "error": "AI Tutor service is not configured. Please contact the administrator.",
                    "code": "provider_not_configured",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except AIProviderTimeoutError:
            return Response(
                {
                    "error": "AI Tutor request timed out. Please try again.",
                    "code": "provider_timeout",
                },
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )
        except AIProviderRateLimitError:
            return Response(
                {
                    "error": "AI Tutor provider is temporarily busy. Please try again shortly.",
                    "code": "provider_rate_limited",
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        except AIProviderResponseError:
            return Response(
                {
                    "error": "AI provider could not generate an answer for this query.",
                    "code": "provider_response_error",
                },
                status=status.HTTP_502_BAD_GATEWAY
            )
        except (AIProviderError, Exception) as e:
            logger.error("AI Tutor unexpected failure: %s", type(e).__name__)
            return Response(
                {
                    "error": "AI Tutor service is temporarily unavailable. Please try again later.",
                    "code": "provider_unavailable",
                },
                status=status.HTTP_502_BAD_GATEWAY
            )

        elapsed_ms = int((time.monotonic() - start_time) * 1000)

        # 7. Durable usage recording & Entitlement settlement
        tokens_consumed = max(1, provider_resp.total_tokens)
        today = datetime.date.today()
        usage, _ = TutorUsage.objects.get_or_create(student=request.user, date=today)
        usage.request_count += 1
        usage.token_usage += tokens_consumed
        usage.save(update_fields=['request_count', 'token_usage'])

        EntitlementService.consume_ai_credits(
            user=request.user,
            tokens_used=tokens_consumed,
        )

        # 8. Minimal metadata logging (no question content, no context, no PII)
        usage_logger.info(
            "AI tutor request completed",
            extra={
                "user_id": request.user.id,
                "model": provider_resp.model,
                "input_tokens": provider_resp.input_tokens,
                "output_tokens": provider_resp.output_tokens,
                "total_tokens": tokens_consumed,
                "status": "success",
                "latency_ms": elapsed_ms,
                "source_count": len(citations),
            }
        )

        # 9. Return structured response
        return Response({
            "answer": provider_resp.text,
            "language": target_lang,
            "citations": citations,
            "source_unavailable": source_unavailable,
            "model": provider_resp.model,
        }, status=status.HTTP_200_OK)
