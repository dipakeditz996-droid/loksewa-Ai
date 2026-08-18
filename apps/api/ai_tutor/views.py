from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Conversation, Message, TutorUsage
from .serializers import ConversationSerializer, ConversationDetailSerializer, MessageSerializer
from .services import AITutorService
import datetime

# Max requests per day per user
MAX_DAILY_REQUESTS = 20

class ConversationListView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(student=self.request.user)

    def perform_create(self, serializer):
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
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        content = request.data.get('content')
        if not content:
            return Response({"error": "Content is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            conversation = Conversation.objects.get(id=conversation_id, student=request.user)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)

        # Usage limiting
        today = datetime.date.today()
        usage, created = TutorUsage.objects.get_or_create(student=request.user, date=today)
        
        if usage.request_count >= MAX_DAILY_REQUESTS:
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
        usage.save()
        conversation.save() # Triggers updated_at

        return Response({
            "user_message": MessageSerializer(user_msg).data,
            "assistant_message": MessageSerializer(ai_msg).data
        })
