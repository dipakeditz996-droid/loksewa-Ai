from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .models import Conversation, Message, TutorUsage
from .serializers import ConversationSerializer, ConversationDetailSerializer, MessageSerializer
from .services import AITutorService
from subscriptions.permissions import HasActiveSubscription
import datetime


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

        # Usage limiting (admin-configurable via AdminSettings.ai_tutor_daily_message_limit)
        today = datetime.date.today()
        usage, created = TutorUsage.objects.get_or_create(student=request.user, date=today)

        if usage.request_count >= ai_tutor_settings.ai_tutor_daily_message_limit:
            return Response(
                {"error": "Daily limit reached. Please try again tomorrow."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Save user message
        user_msg = Message.objects.create(
            conversation=conversation,
            role='user',
            content=content
        )
        
        # Generate AI response
        ai_service = AITutorService()
        response_text = ai_service.generate_response(conversation, content)

        # Save AI message
        ai_msg = Message.objects.create(
            conversation=conversation,
            role='assistant',
            content=response_text
        )

        # Update usage and conversation timestamp
        usage.request_count += 1
        usage.token_usage += ai_service.last_token_count
        usage.save()
        conversation.save() # Triggers updated_at

        return Response({
            "user_message": MessageSerializer(user_msg).data,
            "assistant_message": MessageSerializer(ai_msg).data
        })
