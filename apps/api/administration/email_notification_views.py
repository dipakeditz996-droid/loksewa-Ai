import logging
from django.conf import settings
from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.email_notification_service import EmailNotificationService
from core.models import AdminEmailRecipient, AdminSettings, EmailDeliveryLog
from .email_notification_serializers import (
    AdminEmailRecipientSerializer,
    EmailDeliveryLogSerializer,
    SendTestEmailSerializer,
)
from .permissions import IsAdminUser

logger = logging.getLogger(__name__)


class AdminEmailRecipientListView(APIView):
    """GET /api/admin/email-recipients/ - List all configured admin email recipients.
    POST /api/admin/email-recipients/ - Add a new admin email recipient.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        recipients = AdminEmailRecipient.objects.all().order_by('-created_at')
        serializer = AdminEmailRecipientSerializer(recipients, many=True)
        return Response({'recipients': serializer.data})

    def post(self, request):
        serializer = AdminEmailRecipientSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        recipient = serializer.save()
        return Response(AdminEmailRecipientSerializer(recipient).data, status=status.HTTP_201_CREATED)


class AdminEmailRecipientDetailView(APIView):
    """GET /api/admin/email-recipients/<id>/ - Retrieve single recipient.
    PATCH /api/admin/email-recipients/<id>/ - Update recipient (toggle active, update categories/name).
    DELETE /api/admin/email-recipients/<id>/ - Remove recipient.
    """
    permission_classes = [IsAdminUser]

    def _get_object(self, pk):
        try:
            return AdminEmailRecipient.objects.get(pk=pk)
        except AdminEmailRecipient.DoesNotExist:
            return None

    def get(self, request, pk):
        recipient = self._get_object(pk)
        if not recipient:
            return Response({'error': 'Recipient not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminEmailRecipientSerializer(recipient).data)

    def patch(self, request, pk):
        recipient = self._get_object(pk)
        if not recipient:
            return Response({'error': 'Recipient not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminEmailRecipientSerializer(recipient, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        updated = serializer.save()
        return Response(AdminEmailRecipientSerializer(updated).data)

    def delete(self, request, pk):
        recipient = self._get_object(pk)
        if not recipient:
            return Response({'error': 'Recipient not found.'}, status=status.HTTP_404_NOT_FOUND)
        recipient.delete()
        return Response({'detail': 'Recipient removed successfully.'}, status=status.HTTP_200_OK)


class AdminSendTestEmailView(APIView):
    """POST /api/admin/email-recipients/test-email/ - Dispatches a diagnostic test email
    to verify provider connectivity and record delivery health.
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        recipient_id = request.data.get('recipient_id')
        to_email = None

        if recipient_id:
            try:
                rec = AdminEmailRecipient.objects.get(pk=recipient_id)
                to_email = rec.email
            except AdminEmailRecipient.DoesNotExist:
                return Response({'error': 'Selected recipient ID does not exist.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            serializer = SendTestEmailSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            to_email = serializer.validated_data['recipient_email']

        result = EmailNotificationService.send_test_email(to_email=to_email, admin_user=request.user)
        status_code = status.HTTP_200_OK if result.get('success') else status.HTTP_502_BAD_GATEWAY
        return Response(result, status=status_code)


class AdminEmailDeliveryLogsView(APIView):
    """GET /api/admin/email-delivery-logs/ - List recent delivery logs with category, status, and search filters."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        category = (request.query_params.get('category') or '').strip().lower()
        log_status = (request.query_params.get('status') or '').strip().lower()
        search = (request.query_params.get('search') or '').strip()

        try:
            limit = min(int(request.query_params.get('limit', 50)), 200)
            offset = max(int(request.query_params.get('offset', 0)), 0)
        except ValueError:
            limit = 50
            offset = 0

        qs = EmailDeliveryLog.objects.all()

        if category:
            qs = qs.filter(event_category=category)
        if log_status:
            qs = qs.filter(status=log_status)
        if search:
            qs = qs.filter(
                Q(recipient_email__icontains=search) |
                Q(subject__icontains=search) |
                Q(idempotency_key__icontains=search)
            )

        total_count = qs.count()
        logs = qs.order_by('-created_at')[offset:offset + limit]

        serializer = EmailDeliveryLogSerializer(logs, many=True)
        return Response({
            'count': total_count,
            'limit': limit,
            'offset': offset,
            'results': serializer.data,
        })


class AdminEmailDeliveryHealthView(APIView):
    """GET /api/admin/email-delivery-logs/health/ - Overall health metrics and provider status
    without exposing sensitive credentials.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        total = EmailDeliveryLog.objects.count()
        sent = EmailDeliveryLog.objects.filter(status='sent').count()
        failed = EmailDeliveryLog.objects.filter(status='failed').count()
        retrying = EmailDeliveryLog.objects.filter(status='retrying').count()
        queued = EmailDeliveryLog.objects.filter(status='queued').count()

        resolved = sent + failed
        success_rate = round((sent / resolved * 100.0), 1) if resolved > 0 else 100.0

        smtp_host = getattr(settings, 'EMAIL_HOST', '')
        smtp_port = getattr(settings, 'EMAIL_PORT', None)
        smtp_user = getattr(settings, 'EMAIL_HOST_USER', '')
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '')
        has_resend = bool(getattr(settings, 'RESEND_API_KEY', None))
        has_smtp = bool(smtp_host)

        provider_name = "Resend HTTPS API" if has_resend else ("SMTP Relay" if has_smtp else "Development Console / In-Memory")

        admin_recipients_count = AdminEmailRecipient.objects.filter(is_active=True).count()
        admin_settings = AdminSettings.get_settings()

        return Response({
            'health': {
                'total_dispatched': total,
                'sent': sent,
                'failed': failed,
                'retrying': retrying,
                'queued': queued,
                'success_rate_percent': success_rate,
            },
            'provider': {
                'type': provider_name,
                'host': smtp_host or ('api.resend.com' if has_resend else 'console/locmem'),
                'port': smtp_port if has_smtp else (443 if has_resend else None),
                'user': smtp_user,
                'from_email': from_email,
                'configured': has_smtp or has_resend,
            },
            'configuration': {
                'email_notifications_enabled': admin_settings.notifications_enabled and admin_settings.enable_email_notifications,
                'active_admin_recipients': admin_recipients_count,
            },
        })

