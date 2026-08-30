from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, GenericViewSet
from rest_framework.mixins import ListModelMixin, CreateModelMixin, RetrieveModelMixin
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import (
    StudentProfile, NotificationPreference,
    SupportTicket, SupportMessage, FAQ, FAQFeedback
)
from .serializers import (
    StudentProfileSerializer, ChangePasswordSerializer,
    FocusModePreferenceSerializer,
    NotificationPreferenceSerializer,
    SupportTicketListSerializer, SupportTicketCreateSerializer,
    SupportTicketDetailSerializer,
    SupportMessageSerializer, SupportMessageCreateSerializer,
    FAQSerializer, FAQFeedbackSerializer
)


def get_or_create_profile(user):
    """Get or auto-create a StudentProfile for a user."""
    profile, _ = StudentProfile.objects.get_or_create(user=user)
    return profile


def get_or_create_notification_prefs(user):
    """Get or auto-create NotificationPreference for a user."""
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    return prefs


class StudentProfileView(APIView):
    """
    GET  — Retrieve the current student's profile.
    PATCH — Update profile fields (name, phone, target, preferences, privacy).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        serializer = StudentProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        profile = get_or_create_profile(request.user)
        serializer = StudentProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class FocusModePreferenceView(APIView):
    """
    The student's persistent Focus Mode ("Do Not Disturb") preference.

    GET   -> {"focus_mode_enabled": bool}
    PATCH -> {"focus_mode_enabled": bool}

    Scoped to request.user, defaulting to False for a student who has never
    touched the toggle (StudentProfile is auto-created on first read).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        return Response(FocusModePreferenceSerializer(profile).data)

    def patch(self, request):
        profile = get_or_create_profile(request.user)
        serializer = FocusModePreferenceSerializer(
            profile, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        return self.patch(request)


class ProfilePhotoView(APIView):
    """
    POST — Upload a new profile photo. Accepts multipart/form-data with a 'photo' field.
    DELETE — Remove current profile photo.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    MAX_SIZE = 5 * 1024 * 1024  # 5 MB

    def post(self, request):
        photo = request.FILES.get('photo')
        if not photo:
            return Response(
                {'detail': 'No photo file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if photo.content_type not in self.ALLOWED_TYPES:
            return Response(
                {'detail': f'Invalid file type. Allowed: {", ".join(self.ALLOWED_TYPES)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if photo.size > self.MAX_SIZE:
            return Response(
                {'detail': 'File too large. Maximum size is 5 MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.core.files.storage import default_storage
        from django.conf import settings as django_settings
        import os
        
        ext = photo.name.rsplit('.', 1)[-1] if '.' in photo.name else 'jpg'
        filename = f"avatars/avatar_{request.user.id}.{ext}"
        
        # Delete existing avatar if needed to save space
        if request.user.avatar:
            old_path = request.user.avatar.replace(django_settings.MEDIA_URL, "")
            if default_storage.exists(old_path):
                default_storage.delete(old_path)
                
        # Save new avatar to storage (will use R2 if configured, local otherwise)
        saved_path = default_storage.save(filename, photo)
        
        # Build URL for the saved file
        avatar_url = request.build_absolute_uri(default_storage.url(saved_path))
        
        request.user.avatar = avatar_url
        request.user.save(update_fields=['avatar'])

        return Response({'avatar': avatar_url})

    def delete(self, request):
        request.user.avatar = None
        request.user.save(update_fields=['avatar'])
        return Response({'avatar': None})


class ChangePasswordView(APIView):
    """
    PATCH — Change the authenticated user's password.
    Validates current password and enforces Django's password validators.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password changed successfully.'})


class NotificationPreferenceView(APIView):
    """
    GET  — Retrieve notification preferences.
    PATCH — Update notification preferences.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        prefs = get_or_create_notification_prefs(request.user)
        serializer = NotificationPreferenceSerializer(prefs)
        return Response(serializer.data)

    def patch(self, request):
        prefs = get_or_create_notification_prefs(request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SupportTicketViewSet(ListModelMixin, CreateModelMixin, RetrieveModelMixin, GenericViewSet):
    """
    Student-facing support ticket CRUD.
    Students can only see/interact with their own tickets.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SupportTicket.objects.filter(student=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return SupportTicketCreateSerializer
        if self.action == 'retrieve':
            return SupportTicketDetailSerializer
        return SupportTicketListSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    @action(detail=True, methods=['patch'], url_path='close')
    def close_ticket(self, request, pk=None):
        ticket = self.get_object()  # already filtered by student
        if ticket.status == 'closed':
            return Response(
                {'detail': 'Ticket is already closed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        ticket.status = 'closed'
        ticket.closed_at = timezone.now()
        ticket.save(update_fields=['status', 'closed_at', 'updated_at'])
        return Response(SupportTicketDetailSerializer(ticket).data)

    @action(detail=True, methods=['get', 'post'], url_path='messages')
    def messages(self, request, pk=None):
        ticket = self.get_object()

        if request.method == 'GET':
            msgs = ticket.messages.all()
            serializer = SupportMessageSerializer(msgs, many=True)
            return Response(serializer.data)

        # POST — add a message
        ser = SupportMessageCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        msg = SupportMessage.objects.create(
            ticket=ticket,
            sender=request.user,
            message=ser.validated_data['message'],
            is_staff_reply=False
        )
        # Reopen if waiting for student
        if ticket.status == 'waiting_student':
            ticket.status = 'open'
            ticket.save(update_fields=['status', 'updated_at'])

        from core.notification_service import NotificationService
        NotificationService.notify_admins(
            notif_type='support',
            title='New Ticket Reply',
            message=f"{request.user.get_full_name() or request.user.username} replied to ticket '{ticket.subject}' (#{ticket.ticket_number}).",
            action_url=f'/admin-dashboard/support/{ticket.id}',
            priority='important' if ticket.priority in ('high', 'urgent') else 'normal',
        )

        return Response(
            SupportMessageSerializer(msg).data,
            status=status.HTTP_201_CREATED
        )


class FAQViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    """
    Public-ish FAQ list. Requires authentication but no admin role.
    """
    permission_classes = [IsAuthenticated]
    queryset = FAQ.objects.filter(is_active=True)
    serializer_class = FAQSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search', '').strip()
        category = self.request.query_params.get('category', '').strip()
        if search:
            qs = qs.filter(question__icontains=search)
        if category:
            qs = qs.filter(category=category)
        return qs

    @action(detail=True, methods=['post'], url_path='feedback')
    def feedback(self, request, pk=None):
        faq = self.get_object()
        ser = FAQFeedbackSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        feedback, created = FAQFeedback.objects.update_or_create(
            faq=faq, user=request.user,
            defaults={
                'is_helpful': ser.validated_data['is_helpful'],
                'feedback_text': ser.validated_data.get('feedback_text', ''),
            }
        )

        # Update counts
        faq.helpful_count = faq.feedbacks.filter(is_helpful=True).count()
        faq.not_helpful_count = faq.feedbacks.filter(is_helpful=False).count()
        faq.save(update_fields=['helpful_count', 'not_helpful_count'])

        return Response({'detail': 'Feedback recorded. Thank you!'})


class HelpCategoryView(APIView):
    """Returns the list of help categories for the Help Center UI."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        categories = [
            {'key': 'exams', 'name': 'Exams & Tests', 'icon': 'FileText',
             'description': 'Questions about mock exams, practice tests, and results'},
            {'key': 'question_bank', 'name': 'Question Bank', 'icon': 'BookOpen',
             'description': 'Help with questions, answer explanations, and reporting errors'},
            {'key': 'ai_tutor', 'name': 'AI Tutor', 'icon': 'MessageSquare',
             'description': 'Using the AI Tutor for study help and recommendations'},
            {'key': 'study_plan', 'name': 'Study Plan', 'icon': 'Target',
             'description': 'Creating and managing your study schedule'},
            {'key': 'practice', 'name': 'Practice', 'icon': 'Trophy',
             'description': 'Practice sessions, progress tracking, and performance'},
            {'key': 'marketplace', 'name': 'Marketplace', 'icon': 'ShoppingBag',
             'description': 'Purchasing study materials and order management'},
            {'key': 'account', 'name': 'Account & Security', 'icon': 'Shield',
             'description': 'Password, login, and account security'},
            {'key': 'payments', 'name': 'Payments', 'icon': 'CreditCard',
             'description': 'Payment methods, refunds, and billing'},
            {'key': 'technical', 'name': 'Technical Issues', 'icon': 'Wrench',
             'description': 'App performance, bugs, and connectivity problems'},
        ]
        return Response(categories)


class AccountDeactivateView(APIView):
    """
    POST — Deactivate the student's account.
    Requires password confirmation.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        password = request.data.get('password', '')
        if not request.user.check_password(password):
            return Response(
                {'detail': 'Incorrect password.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        request.user.is_active = False
        request.user.save(update_fields=['is_active'])
        return Response({'detail': 'Account deactivated successfully.'})


class AccountDeleteView(APIView):
    """
    POST — Permanently delete the student's account.
    Requires password + explicit confirmation text.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        password = request.data.get('password', '')
        confirmation = request.data.get('confirmation', '')

        if confirmation != 'DELETE MY ACCOUNT':
            return Response(
                {'detail': 'Please type "DELETE MY ACCOUNT" to confirm.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(password):
            return Response(
                {'detail': 'Incorrect password.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Soft-delete: deactivate and anonymize
        user = request.user
        user.is_active = False
        user.email = f"deleted_{user.id}@deleted.local"
        user.first_name = "Deleted"
        user.last_name = "User"
        user.save()

        return Response({'detail': 'Account has been permanently deleted.'})
