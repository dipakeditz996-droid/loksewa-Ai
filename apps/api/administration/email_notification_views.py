import logging
from django.conf import settings
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.email_notification_service import (
    EmailNotificationService,
    _render_base_email_html,
    _render_base_email_text,
)
from core.models import AdminEmailRecipient, AdminSettings, EmailDeliveryLog, StudentEmailTemplate
from core.student_email_defaults import STUDENT_EMAIL_NOTIFICATION_DEFAULTS
from core.notification_constants import ADMIN_NOTIFICATION_TAXONOMY
from administration.models import AuditLog
from .email_notification_serializers import (
    AdminEmailRecipientSerializer,
    EmailDeliveryLogSerializer,
    SendTestEmailSerializer,
    StudentEmailTemplateSerializer,
    StudentEmailTemplatePreviewSerializer,
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
        AuditLog.objects.create(
            actor=request.user,
            action='ADMIN_EMAIL_RECIPIENT_CREATED',
            entity_type='AdminEmailRecipient',
            entity_id=str(recipient.id),
            details={
                'email': recipient.email,
                'name': recipient.name,
                'categories': recipient.event_categories,
                'events': recipient.subscribed_events,
            },
        )
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
        AuditLog.objects.create(
            actor=request.user,
            action='ADMIN_EMAIL_RECIPIENT_UPDATED',
            entity_type='AdminEmailRecipient',
            entity_id=str(updated.id),
            details={
                'email': updated.email,
                'name': updated.name,
                'is_active': updated.is_active,
                'categories': updated.event_categories,
                'events': updated.subscribed_events,
            },
        )
        return Response(AdminEmailRecipientSerializer(updated).data)

    def delete(self, request, pk):
        recipient = self._get_object(pk)
        if not recipient:
            return Response({'error': 'Recipient not found.'}, status=status.HTTP_404_NOT_FOUND)
        rec_id = recipient.id
        rec_email = recipient.email
        recipient.delete()
        AuditLog.objects.create(
            actor=request.user,
            action='ADMIN_EMAIL_RECIPIENT_DELETED',
            entity_type='AdminEmailRecipient',
            entity_id=str(rec_id),
            details={'email': rec_email},
        )
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
        counts = EmailDeliveryLog.objects.aggregate(
            total=Count('id'),
            sent=Count('id', filter=Q(status='sent')),
            failed=Count('id', filter=Q(status='failed')),
            retrying=Count('id', filter=Q(status='retrying')),
            queued=Count('id', filter=Q(status='queued')),
        )
        total = counts['total'] or 0
        sent = counts['sent'] or 0
        failed = counts['failed'] or 0
        retrying = counts['retrying'] or 0
        queued = counts['queued'] or 0

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




class AdminNotificationEventsView(APIView):
    """GET /api/admin/notification-events/ - Retrieve admin event taxonomy and global enable/disable state.
    PATCH /api/admin/notification-events/ - Toggle individual events or categories globally.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        admin_settings = AdminSettings.get_settings()
        events_state = admin_settings.admin_notification_events or {}
        
        # Build enriched taxonomy with active boolean flags
        taxonomy_data = []
        for cat_id, cat_info in ADMIN_NOTIFICATION_TAXONOMY.items():
            cat_key = f"category:{cat_id}"
            cat_enabled = events_state.get(cat_key, True)
            events_list = []
            for ev in cat_info['events']:
                ev_key = ev['key']
                ev_enabled = events_state.get(ev_key, True)
                events_list.append({
                    'key': ev_key,
                    'label': ev['label'],
                    'enabled': ev_enabled and cat_enabled,
                    'is_explicitly_disabled': not ev_enabled or not cat_enabled,
                })
            taxonomy_data.append({
                'id': cat_id,
                'label': cat_info['label'],
                'description': cat_info['description'],
                'category_enabled': cat_enabled,
                'events': events_list,
            })

        return Response({
            'notifications_enabled': admin_settings.notifications_enabled,
            'enable_email_notifications': admin_settings.enable_email_notifications,
            'enable_in_app_notifications': admin_settings.enable_in_app_notifications,
            'events_state': events_state,
            'categories': taxonomy_data,
        })

    def patch(self, request):
        events_update = request.data.get('events')
        if not isinstance(events_update, dict):
            return Response({'error': "'events' object is required."}, status=status.HTTP_400_BAD_REQUEST)

        admin_settings = AdminSettings.get_settings()
        current_events = dict(admin_settings.admin_notification_events or {})

        for k, v in events_update.items():
            if isinstance(k, str) and isinstance(v, bool):
                current_events[k] = v

        admin_settings.admin_notification_events = current_events
        admin_settings.save(update_fields=['admin_notification_events', 'updated_at'])

        AuditLog.objects.create(
            actor=request.user,
            action='ADMIN_NOTIFICATION_EVENTS_UPDATED',
            entity_type='AdminSettings',
            entity_id=str(admin_settings.id),
            details={'updated_events': events_update},
        )

        return Response({
            'message': 'Admin notification events updated successfully.',
            'events_state': current_events,
        })



class StudentEmailTemplateListView(APIView):
    """GET /api/admin/student-email-notifications/ - List all student notification templates."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        StudentEmailTemplate.ensure_defaults()
        category = (request.query_params.get('category') or '').strip().lower()

        qs = StudentEmailTemplate.objects.all().select_related('updated_by')
        if category:
            qs = qs.filter(category=category)

        serializer = StudentEmailTemplateSerializer(qs, many=True)

        categories = [
            {'id': 'account', 'label': 'Account & Security', 'description': 'Registration, OTP, password recovery, and security alerts.'},
            {'id': 'payment', 'label': 'Payments & Subscriptions', 'description': 'Payment proofs, approval/rejection, and subscription lifecycle.'},
            {'id': 'marketplace', 'label': 'Marketplace & Orders', 'description': 'Physical books, orders, dispatch, and delivery tracking.'},
            {'id': 'learning', 'label': 'Learning & Exams', 'description': 'Course access, exam announcements, reminders, and result scorecards.'},
        ]

        return Response({
            'categories': categories,
            'templates': serializer.data,
        })


class StudentEmailTemplateDetailView(APIView):
    """GET /api/admin/student-email-notifications/<event_key>/ - Retrieve single template.
    PATCH /api/admin/student-email-notifications/<event_key>/ - Update subject, body, or active status.
    """
    permission_classes = [IsAdminUser]

    def _get_object(self, event_key):
        return StudentEmailTemplate.get_template(event_key)

    def get(self, request, event_key):
        tpl = self._get_object(event_key)
        if not tpl:
            return Response({'error': 'Template not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(StudentEmailTemplateSerializer(tpl).data)

    def patch(self, request, event_key):
        tpl = self._get_object(event_key)
        if not tpl:
            return Response({'error': 'Template not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = StudentEmailTemplateSerializer(tpl, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        updated = serializer.save(updated_by=request.user)

        AuditLog.objects.create(
            actor=request.user,
            action='STUDENT_EMAIL_TEMPLATE_UPDATED',
            entity_type='StudentEmailTemplate',
            entity_id=str(updated.id),
            details={
                'event_key': updated.event_key,
                'name': updated.name,
                'is_enabled': updated.is_enabled,
                'subject': updated.subject,
            },
        )

        return Response(StudentEmailTemplateSerializer(updated).data)


class StudentEmailTemplatePreviewView(APIView):
    """POST /api/admin/student-email-notifications/<event_key>/preview/ - Live preview of rendered template."""
    permission_classes = [IsAdminUser]

    def post(self, request, event_key):
        tpl = StudentEmailTemplate.get_template(event_key)
        if not tpl:
            return Response({'error': 'Template not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = StudentEmailTemplatePreviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        subject_template = data.get('subject') or tpl.subject
        html_template = data.get('body_html') or tpl.body_html
        text_template = data.get('body_text') or tpl.body_text or ''

        context = dict(tpl.sample_context or {})
        if data.get('context'):
            context.update(data['context'])

        # Substitute variables
        rendered_subject = subject_template
        rendered_content_html = html_template
        rendered_content_text = text_template

        for k, v in context.items():
            pattern = f"{{{{{k}}}}}"
            str_v = str(v) if v is not None else ''
            rendered_subject = rendered_subject.replace(pattern, str_v)
            rendered_content_html = rendered_content_html.replace(pattern, str_v)
            rendered_content_text = rendered_content_text.replace(pattern, str_v)

        rendered_html = _render_base_email_html(
            title=rendered_subject,
            headline=tpl.name,
            content_html=rendered_content_html,
            action_button_label="Open Dashboard",
            action_button_url="/student",
            badge_text=tpl.get_category_display() if hasattr(tpl, 'get_category_display') else tpl.category,
            badge_color="#4f46e5",
        )
        rendered_text = _render_base_email_text(
            headline=tpl.name,
            content_text=rendered_content_text,
            action_button_label="Open Dashboard",
            action_button_url="/student",
        )

        return Response({
            'event_key': tpl.event_key,
            'name': tpl.name,
            'subject': rendered_subject,
            'rendered_html': rendered_html,
            'rendered_text': rendered_text,
            'context_used': context,
        })


class StudentEmailTemplateResetView(APIView):
    """POST /api/admin/student-email-notifications/<event_key>/reset/ - Reset template to system defaults."""
    permission_classes = [IsAdminUser]

    def post(self, request, event_key):
        tpl = StudentEmailTemplate.get_template(event_key)
        if not tpl:
            return Response({'error': 'Template not found.'}, status=status.HTTP_404_NOT_FOUND)

        default_item = next((d for d in STUDENT_EMAIL_NOTIFICATION_DEFAULTS if d['event_key'] == event_key), None)
        if not default_item:
            return Response({'error': 'Default template definition not found.'}, status=status.HTTP_404_NOT_FOUND)

        tpl.subject = default_item['subject']
        tpl.body_html = default_item['body_html']
        tpl.body_text = default_item.get('body_text', '')
        tpl.is_enabled = default_item.get('is_enabled', True)
        tpl.updated_by = request.user
        tpl.save(update_fields=['subject', 'body_html', 'body_text', 'is_enabled', 'updated_by', 'updated_at'])

        AuditLog.objects.create(
            actor=request.user,
            action='STUDENT_EMAIL_TEMPLATE_RESET',
            entity_type='StudentEmailTemplate',
            entity_id=str(tpl.id),
            details={'event_key': tpl.event_key},
        )

        return Response({
            'message': f"Template for '{tpl.name}' reset to system default.",
            'template': StudentEmailTemplateSerializer(tpl).data,
        })
