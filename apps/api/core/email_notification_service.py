import html
import logging
import sys
import re
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

from .models import AdminEmailRecipient, AdminSettings, EmailDeliveryLog, StudentEmailTemplate

logger = logging.getLogger(__name__)

RESEND_API_URL = 'https://api.resend.com/emails'
RESEND_API_TIMEOUT_SECONDS = 10


def _sanitize_error_text(text: str) -> str:
    """Removes sensitive patterns (tokens, passwords, api keys) from error logs."""
    if not text:
        return ''
    cleaned = str(text)
    cleaned = re.sub(r'Bearer\s+[A-Za-z0-9_\-\.]+', 'Bearer [REDACTED]', cleaned)
    cleaned = re.sub(r'password[\'"]?\s*[:=]\s*[\'"][^\'"]+[\'"]', 'password=[REDACTED]', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'key[\'"]?\s*[:=]\s*[\'"][^\'"]+[\'"]', 'key=[REDACTED]', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\b\d{6}\b', '[CODE_REDACTED]', cleaned)  # Redact 6-digit OTP codes
    return cleaned[:1000]


def _get_base_frontend_url() -> str:
    base = getattr(settings, 'FRONTEND_URL', 'https://www.hemrajkc.com.np') or 'https://www.hemrajkc.com.np'
    base = str(base).strip().rstrip('/')
    if not base.startswith(('http://', 'https://')):
        base = f'https://{base}'
    # Canonical domain requirement: ensure non-canonical variants map to canonical production domain
    if base in ('https://hemrajkc.com', 'http://hemrajkc.com', 'https://hemrajkc.com.np', 'http://hemrajkc.com.np', 'https://www.hemrajkc.com', 'http://www.hemrajkc.com'):
        base = 'https://www.hemrajkc.com.np'
    return base


def _render_base_email_html(
    title: str,
    headline: str,
    content_html: str,
    action_button_label: Optional[str] = None,
    action_button_url: Optional[str] = None,
    badge_text: Optional[str] = None,
    badge_color: str = '#4f46e5',
) -> str:
    """Unified branded HTML template for LoksewaAI notifications."""
    frontend_url = _get_base_frontend_url()
    escaped_title = html.escape(title)
    escaped_headline = html.escape(headline)
    current_year = datetime.now().year

    button_markup = ''
    if action_button_label and action_button_url:
        full_url = action_button_url if action_button_url.startswith(('http://', 'https://')) else f"{frontend_url}{action_button_url}"
        escaped_label = html.escape(action_button_label)
        escaped_url = html.escape(full_url)
        button_markup = f"""
        <div style="text-align: center; margin: 32px 0 24px;">
          <a href="{escaped_url}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 13px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.25);">
            {escaped_label}
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0 0 16px; text-align: center;">
          Or copy and paste this URL into your browser:<br/>
          <a href="{escaped_url}" style="color: #4f46e5; word-break: break-all;">{escaped_url}</a>
        </p>
        """

    badge_markup = ''
    if badge_text:
        escaped_badge = html.escape(badge_text)
        badge_markup = f"""
        <span style="display: inline-block; background-color: {badge_color}15; color: {badge_color}; border: 1px solid {badge_color}40; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
          {escaped_badge}
        </span>
        """

    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{escaped_title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">LoksewaAI</span>
                    <span style="color: #c7d2fe; font-size: 13px; font-weight: 500; margin-left: 8px;">Automated Notification</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              {badge_markup}
              <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px; line-height: 1.4;">
                {escaped_headline}
              </h1>

              <div style="font-size: 15px; line-height: 1.6; color: #334155;">
                {content_html}
              </div>

              {button_markup}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; font-weight: 500;">
                LoksewaAI — Empowering Public Service Aspirants Across Nepal
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; {current_year} LoksewaAI. This is an automated message; please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _render_base_email_text(
    headline: str,
    content_text: str,
    action_button_label: Optional[str] = None,
    action_button_url: Optional[str] = None,
) -> str:
    """Plain-text alternative layout."""
    frontend_url = _get_base_frontend_url()
    lines = [
        "========================================",
        "LoksewaAI Automated Notification",
        "========================================",
        "",
        headline,
        "----------------------------------------",
        "",
        content_text.strip(),
    ]
    if action_button_label and action_button_url:
        full_url = action_button_url if action_button_url.startswith(('http://', 'https://')) else f"{frontend_url}{action_button_url}"
        lines.extend([
            "",
            f"{action_button_label}: {full_url}",
        ])
    lines.extend([
        "",
        "----------------------------------------",
        "LoksewaAI Team — https://www.hemrajkc.com.np",
    ])
    return "\n".join(lines)


def _deliver_transport_email(subject: str, text_body: str, html_body: str, to_email: str) -> None:
    """Low-level delivery via Resend HTTPS API (if configured) or Django mail backend (SMTP/console).
    Raises exception on delivery failure.
    """
    if getattr(settings, 'RESEND_API_KEY', None):
        response = requests.post(
            RESEND_API_URL,
            headers={'Authorization': f'Bearer {settings.RESEND_API_KEY}'},
            json={
                'from': settings.DEFAULT_FROM_EMAIL,
                'to': [to_email],
                'subject': subject,
                'html': html_body,
                'text': text_body,
            },
            timeout=RESEND_API_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    message.attach_alternative(html_body, 'text/html')
    message.send(fail_silently=False)


def process_email_delivery(log_id: int) -> bool:
    """Executes email delivery for an existing EmailDeliveryLog entry.
    Handles bounded retries and records sanitized outcomes.
    """
    try:
        log = EmailDeliveryLog.objects.get(id=log_id)
    except EmailDeliveryLog.DoesNotExist:
        logger.error("EmailDeliveryLog with id=%s does not exist", log_id)
        return False

    if log.status == 'sent':
        return True

    log.attempts += 1
    log.status = 'queued'
    log.save(update_fields=['attempts', 'status', 'updated_at'])

    text_body = log.metadata.get('text_body') or ''
    html_body = log.metadata.get('html_body') or ''

    try:
        _deliver_transport_email(
            subject=log.subject,
            text_body=text_body,
            html_body=html_body,
            to_email=log.recipient_email,
        )
        log.status = 'sent'
        log.sent_at = timezone.now()
        log.error_message = ''
        log.save(update_fields=['status', 'sent_at', 'error_message', 'updated_at'])
        logger.info("Successfully delivered email log_id=%s to %s", log.id, log.recipient_email)
        return True

    except Exception as exc:
        sanitized_err = _sanitize_error_text(str(exc))
        logger.warning(
            "Delivery attempt %d/%d failed for email log_id=%s to %s: %s",
            log.attempts, log.max_attempts, log.id, log.recipient_email, sanitized_err,
        )

        is_permanent = any(
            msg in sanitized_err.lower()
            for msg in ['invalid email', 'recipient address rejected', 'syntax error', '550 5.1.1', '501 5.1.3']
        )

        if is_permanent or log.attempts >= log.max_attempts:
            log.status = 'failed'
            log.error_message = sanitized_err
            log.save(update_fields=['status', 'error_message', 'updated_at'])
            return False
        else:
            log.status = 'retrying'
            log.error_message = sanitized_err
            log.save(update_fields=['status', 'error_message', 'updated_at'])

            # Retry after delay if in thread (skip thread spawn during test execution)
            if 'test' not in sys.argv and not getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
                def _retry_thread(retry_log_id):
                    time.sleep(2)
                    from django.db import connection
                    connection.close()
                    try:
                        process_email_delivery(retry_log_id)
                    finally:
                        connection.close()

                threading.Thread(target=_retry_thread, args=(log.id,), daemon=True).start()
            return False


def _dispatch_email_log(log_id: int) -> None:
    """Dispatches processing of an EmailDeliveryLog either synchronously,
    via Celery worker, or via daemon thread fallback.
    """
    if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False) or 'test' in sys.argv:
        process_email_delivery(log_id)
        return

    broker_url = getattr(settings, 'CELERY_BROKER_URL', '')
    has_real_broker = (
        broker_url
        and ('redis://' in broker_url or 'rediss://' in broker_url or 'amqp://' in broker_url)
        and not broker_url.startswith(('redis://localhost', 'redis://127.0.0.1', 'rediss://localhost', 'rediss://127.0.0.1'))
        and not any(marker in broker_url for marker in ('YOUR_', '<YOUR_', '[YOUR_'))
    )

    if has_real_broker:
        try:
            from backend.celery import app as celery_app
            pings = celery_app.control.ping(timeout=0.2)
            if pings:
                from .tasks import process_email_delivery_task
                process_email_delivery_task.apply_async(args=[log_id])
                return
        except Exception as ping_err:
            logger.debug("Celery worker check failed (%s); using daemon thread fallback.", ping_err)

    def _thread_worker(lid):
        from django.db import connection
        connection.close()
        try:
            process_email_delivery(lid)
        except Exception as err:
            logger.exception("Background thread failed processing email log_id=%s: %s", lid, err)
        finally:
            connection.close()

    t = threading.Thread(target=_thread_worker, args=(log_id,), daemon=True)
    t.start()


class EmailNotificationService:
    """Centralized Email Notification Service for LoksewaAI platform."""

    @classmethod
    def send(
        cls,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
        event_category: str = 'system',
        recipient_role: str = 'student',
        template_name: str = '',
        idempotency_key: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        immediate: bool = False,
        event_key: Optional[str] = None,
        user: Optional[Any] = None,
    ) -> Optional[EmailDeliveryLog]:
        """Creates delivery log entry, verifies admin kill switches & idempotency,
        and dispatches email delivery.
        """
        # Validate recipient email
        to_email = (to_email or '').strip().lower()
        if not to_email or '@' not in to_email:
            logger.warning("Attempted to send email to invalid address: %s", to_email)
            return None

        # Check global platform email kill switch
        admin_settings = AdminSettings.get_settings()
        if not admin_settings.notifications_enabled or not admin_settings.enable_email_notifications:
            logger.info("Email notifications globally disabled via AdminSettings; skipping email to %s", to_email)
            return None

        # Check student email preferences for optional events
        if recipient_role == 'student' and event_key:
            from core.notification_constants import MANDATORY_STUDENT_EVENTS
            if event_key not in MANDATORY_STUDENT_EVENTS:
                target_user = user
                if not target_user:
                    from django.contrib.auth import get_user_model
                    UserModel = get_user_model()
                    sid = (metadata or {}).get('student_id')
                    if sid:
                        target_user = UserModel.objects.filter(id=sid).first()
                    elif to_email:
                        target_user = UserModel.objects.filter(email__iexact=to_email).first()

                if target_user:
                    from support.models import NotificationPreference
                    prefs, _ = NotificationPreference.objects.get_or_create(user=target_user)
                    if not prefs.is_email_enabled(event_key):
                        logger.info("Student %s opted out of email for event '%s'; suppressing email delivery.", to_email, event_key)
                        return None

        # Check idempotency deduplication
        if idempotency_key:
            existing = EmailDeliveryLog.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                if existing.status in ('sent', 'queued', 'retrying'):
                    logger.info(
                        "Email with idempotency_key=%s already exists (status=%s); skipping duplicate send.",
                        idempotency_key, existing.status,
                    )
                    return existing

        meta_dict = dict(metadata or {})
        # Store rendered copies in metadata for asynchronous worker
        meta_dict['text_body'] = text_body
        meta_dict['html_body'] = html_body

        log = EmailDeliveryLog.objects.create(
            event_category=event_category,
            recipient_email=to_email,
            recipient_role=recipient_role,
            subject=subject,
            template_name=template_name,
            status='queued',
            idempotency_key=idempotency_key,
            attempts=0,
            max_attempts=3,
            metadata=meta_dict,
        )

        if immediate or getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False) or 'test' in sys.argv:
            process_email_delivery(log.id)
            log.refresh_from_db()
        else:
            _dispatch_email_log(log.id)

        return log

    @classmethod
    def notify_admins(
        cls,
        category: str,
        subject: str,
        headline: str,
        content_html: str,
        content_text: str,
        action_button_label: Optional[str] = None,
        action_button_url: Optional[str] = None,
        idempotency_prefix: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        badge_text: str = "Admin Notification",
        badge_color: str = "#4f46e5",
        event_key: Optional[str] = None,
    ) -> List[EmailDeliveryLog]:
        """Dispatches categorized administrative email notifications to all
        configured and active AdminEmailRecipient addresses subscribed to the category.
        """
        admin_settings = AdminSettings.get_settings()
        if not admin_settings.is_admin_event_enabled(category, event_key):
            logger.info("Admin email notification disabled via AdminSettings for category=%s event=%s", category, event_key)
            return []

        recipients = AdminEmailRecipient.objects.filter(is_active=True)
        matching_recipients = [
            r for r in recipients
            if r.is_subscribed_to(category, event_key)
        ]

        if not matching_recipients:
            logger.warning(
                "No active admin email recipients configured for event category '%s'. "
                "Setup an admin recipient in Admin Settings > Email.",
                category,
            )
            return []

        html_body = _render_base_email_html(
            title=subject,
            headline=headline,
            content_html=content_html,
            action_button_label=action_button_label,
            action_button_url=action_button_url,
            badge_text=badge_text,
            badge_color=badge_color,
        )
        text_body = _render_base_email_text(
            headline=headline,
            content_text=content_text,
            action_button_label=action_button_label,
            action_button_url=action_button_url,
        )

        logs = []
        for recipient in matching_recipients:
            recipient_key = f"{idempotency_prefix}:{recipient.email}" if idempotency_prefix else None
            log = cls.send(
                to_email=recipient.email,
                subject=f"[LoksewaAI Admin] {subject}",
                html_body=html_body,
                text_body=text_body,
                event_category=category,
                recipient_role='admin',
                template_name=f"admin_{category}",
                idempotency_key=recipient_key,
                metadata=metadata,
            )
            if log:
                logs.append(log)

        return logs

    # =========================================================================
    # Student Transactional Notifications
    # =========================================================================

    @classmethod
    def _resolve_student_template(
        cls,
        event_key: str,
        context: Dict[str, Any],
        default_subject: str,
        default_headline: str,
        default_content_html: str,
        default_content_text: str,
        action_button_label: Optional[str] = None,
        action_button_url: Optional[str] = None,
        badge_text: Optional[str] = None,
        badge_color: str = "#4f46e5",
    ) -> Optional[Dict[str, str]]:
        """Resolves student email copy from StudentEmailTemplate.
        Checks if event is enabled. If disabled, returns None to suppress delivery.
        Otherwise substitutes variables and wraps in branded base HTML layout.
        """
        try:
            from .models import StudentEmailTemplate
            if not StudentEmailTemplate.is_event_enabled(event_key):
                logger.info("Student email event '%s' is disabled via StudentEmailTemplate; suppressing send.", event_key)
                return None

            tpl = StudentEmailTemplate.get_template(event_key)
            if tpl:
                rendered = tpl.render(context)
                subject = rendered.get('subject') or default_subject
                content_html = rendered.get('body_html') or default_content_html
                content_text = rendered.get('body_text') or default_content_text
            else:
                subject = default_subject
                content_html = default_content_html
                content_text = default_content_text
        except Exception as e:
            logger.warning("Error resolving StudentEmailTemplate for event '%s': %s", event_key, e)
            subject = default_subject
            content_html = default_content_html
            content_text = default_content_text

        html_body = _render_base_email_html(
            title=subject,
            headline=default_headline,
            content_html=content_html,
            action_button_label=action_button_label,
            action_button_url=action_button_url,
            badge_text=badge_text,
            badge_color=badge_color,
        )
        text_body = _render_base_email_text(
            headline=default_headline,
            content_text=content_text,
            action_button_label=action_button_label,
            action_button_url=action_button_url,
        )

        return {
            'subject': subject,
            'html_body': html_body,
            'text_body': text_body,
        }

    @classmethod
    def send_student_welcome_email(cls, student) -> Optional[EmailDeliveryLog]:
        """Sends a welcome & email verification confirmation email to a registered student."""
        name = student.get_full_name() or student.username
        subject = "Welcome to LoksewaAI! Your account is verified"
        headline = f"Welcome aboard, {name}!"
        
        content_html = f"""
        <p>Your email has been successfully verified, and your LoksewaAI account is now active.</p>
        <p>With LoksewaAI, you have access to curated syllabus materials, real-time mock exams, AI tutoring, and comprehensive preparation tools tailored for public service examinations in Nepal.</p>
        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #475569;">
            <strong>Username:</strong> {html.escape(student.username)}<br/>
            <strong>Email:</strong> {html.escape(student.email)}
          </p>
        </div>
        <p>Start your exam preparation journey today by exploring our available mock examinations and study plans.</p>
        """

        content_text = f"""
Hello {name},

Your email has been successfully verified, and your LoksewaAI account is now active.

Username: {student.username}
Email: {student.email}

Start your exam preparation journey today by exploring our available mock examinations and study plans.
"""

        resolved = cls._resolve_student_template(
            event_key='welcome_email',
            context={'student_name': name, 'email': student.email, 'login_url': f"{_get_base_frontend_url()}/auth/login"},
            default_subject=subject,
            default_headline=headline,
            default_content_html=content_html,
            default_content_text=content_text,
            action_button_label="Go to Student Dashboard",
            action_button_url="/student",
            badge_text="Account Verified",
            badge_color="#16a34a",
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='registration',
            recipient_role='student',
            template_name='student_welcome',
            idempotency_key=f"welcome:{student.id}",
            metadata={'student_id': student.id, 'username': student.username},
            event_key='security_alerts',
            user=student,
        )

    @classmethod
    def send_student_payment_submitted_email(
        cls, student, title_ref: str, amount: Any, transaction_id: Optional[str] = None
    ) -> Optional[EmailDeliveryLog]:
        """Informs the student that their payment proof was submitted and is pending verification."""
        name = student.get_full_name() or student.username
        subject = f"Payment Received: {title_ref} (Verification in Progress)"
        headline = "Payment Submission Received"

        txn_row = f"<tr><td style='padding: 6px 0; color: #64748b;'><strong>Transaction ID:</strong></td><td style='padding: 6px 0; font-family: monospace;'>{html.escape(str(transaction_id))}</td></tr>" if transaction_id else ""

        content_html = f"""
        <p>Dear {html.escape(name)},</p>
        <p>We have received your payment proof for <strong>{html.escape(title_ref)}</strong>. Our verification team (and automated verification engine) is reviewing your submission.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>Package / Item:</strong></td><td style="padding: 6px 0; font-weight: 600;">{html.escape(title_ref)}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>Amount Submitted:</strong></td><td style="padding: 6px 0; font-weight: 600; color: #4f46e5;">Rs. {html.escape(str(amount))}</td></tr>
            {txn_row}
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>Status:</strong></td><td style="padding: 6px 0; color: #d97706; font-weight: 600;">Pending Verification</td></tr>
          </table>
        </div>
        <p style="font-size: 14px; color: #64748b;">You will receive another notification once your payment has been verified and your access is activated.</p>
        """

        content_text = f"""
Dear {name},

We have received your payment proof for {title_ref}.
Amount: Rs. {amount}
{f"Transaction ID: {transaction_id}" if transaction_id else ""}
Status: Pending Verification

You will receive an email as soon as verification is complete.
"""

        resolved = cls._resolve_student_template(
            event_key='payment_submitted',
            context={'student_name': name, 'title_ref': title_ref, 'amount': str(amount), 'transaction_id': str(transaction_id or '')},
            default_subject=subject,
            default_headline=headline,
            default_content_html=content_html,
            default_content_text=content_text,
            action_button_label="View Purchase Status",
            action_button_url="/student/purchases",
            badge_text="Payment Submitted",
            badge_color="#d97706",
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='payment',
            recipient_role='student',
            template_name='student_payment_submitted',
            idempotency_key=f"pay-sub:{student.id}:{transaction_id or title_ref}",
            metadata={'student_id': student.id, 'title': title_ref, 'amount': str(amount)},
            event_key='payment_submission',
            user=student,
        )

    @classmethod
    def send_student_payment_approved_email(
        cls,
        student,
        title_ref: str,
        amount: Optional[Any] = None,
        expiry_date: Optional[str] = None,
        receipt_number: Optional[str] = None,
    ) -> Optional[EmailDeliveryLog]:
        """Informs the student that their payment has been verified and their package/course is activated."""
        name = student.get_full_name() or student.username
        subject = f"Payment Verified: Access Activated for {title_ref}"
        headline = "Payment Verified — Access Activated!"

        details_rows = [
            f"<tr><td style='padding: 6px 0; color: #64748b; width: 140px;'><strong>Plan / Course:</strong></td><td style='padding: 6px 0; font-weight: 600;'>{html.escape(title_ref)}</td></tr>"
        ]
        if amount:
            details_rows.append(f"<tr><td style='padding: 6px 0; color: #64748b;'><strong>Amount Paid:</strong></td><td style='padding: 6px 0; font-weight: 600; color: #16a34a;'>Rs. {html.escape(str(amount))}</td></tr>")
        if receipt_number:
            details_rows.append(f"<tr><td style='padding: 6px 0; color: #64748b;'><strong>Receipt Number:</strong></td><td style='padding: 6px 0; font-family: monospace;'>{html.escape(receipt_number)}</td></tr>")
        if expiry_date:
            details_rows.append(f"<tr><td style='padding: 6px 0; color: #64748b;'><strong>Valid Until:</strong></td><td style='padding: 6px 0; font-weight: 600;'>{html.escape(str(expiry_date))}</td></tr>")

        details_html = "\n".join(details_rows)

        content_html = f"""
        <p>Dear {html.escape(name)},</p>
        <p>Great news! Your payment for <strong>{html.escape(title_ref)}</strong> has been verified. Your full access and entitlements are now active on your account.</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            {details_html}
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>Status:</strong></td><td style="padding: 6px 0; color: #16a34a; font-weight: 700;">ACTIVE</td></tr>
          </table>
        </div>
        <p>You can now take mock exams, access complete study materials, and engage with the AI Tutor for your selected courses.</p>
        """

        content_text = f"""
Dear {name},

Great news! Your payment for {title_ref} has been verified and your subscription/access is now ACTIVE.
{f"Amount: Rs. {amount}" if amount else ""}
{f"Receipt: {receipt_number}" if receipt_number else ""}
{f"Valid Until: {expiry_date}" if expiry_date else ""}

Access your enrolled courses and tests from your student dashboard.
"""

        resolved = cls._resolve_student_template(
            event_key='payment_approved',
            context={'student_name': name, 'title_ref': title_ref, 'amount': str(amount or ''), 'receipt_number': str(receipt_number or ''), 'action_url': f"{_get_base_frontend_url()}/student/purchases"},
            default_subject=subject,
            default_headline=headline,
            default_content_html=content_html,
            default_content_text=content_text,
            action_button_label="Access My Courses & Exams",
            action_button_url="/student/purchases",
            badge_text="Payment Approved",
            badge_color="#16a34a",
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='payment',
            recipient_role='student',
            template_name='student_payment_approved',
            idempotency_key=f"pay-app:{student.id}:{title_ref}:{receipt_number or ''}",
            metadata={'student_id': student.id, 'title': title_ref, 'receipt': receipt_number},
            event_key='payment_status',
            user=student,
        )

    @classmethod
    def send_student_payment_rejected_email(
        cls, student, title_ref: str, reason: str
    ) -> Optional[EmailDeliveryLog]:
        """Informs the student that their payment verification failed, including the actual administrator reason."""
        name = student.get_full_name() or student.username
        subject = f"Payment Verification Notice: {title_ref}"
        headline = "Payment Verification Unsuccessful"

        escaped_reason = html.escape(str(reason or 'Information provided did not match banking records.'))

        content_html = f"""
        <p>Dear {html.escape(name)},</p>
        <p>We could not verify your payment proof for <strong>{html.escape(title_ref)}</strong>.</p>
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.05em;">Reason for Rejection</p>
          <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.5;">
            {escaped_reason}
          </p>
        </div>
        <p style="font-size: 14px; color: #475569;">
          You can resubmit a clear screenshot or receipt with the correct transaction code from your purchases page. If you believe this is in error, please reach out to our support team.
        </p>
        """

        content_text = f"""
Dear {name},

We could not verify your payment proof for {title_ref}.

Reason provided by administrator:
{reason}

You can resubmit your payment evidence from your purchases page at https://www.hemrajkc.com.np/student/purchases.
"""

        resolved = cls._resolve_student_template(
            event_key='payment_rejected',
            context={'student_name': name, 'title_ref': title_ref, 'reason': str(reason or ''), 'action_url': f"{_get_base_frontend_url()}/student/purchases"},
            default_subject=subject,
            default_headline=headline,
            default_content_html=content_html,
            default_content_text=content_text,
            action_button_label="Resubmit Payment Proof",
            action_button_url="/student/purchases",
            badge_text="Verification Failed",
            badge_color="#dc2626",
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='payment',
            recipient_role='student',
            template_name='student_payment_rejected',
            idempotency_key=f"pay-rej:{student.id}:{title_ref}:{timezone.now().strftime('%Y%m%d%H%M')}",
            metadata={'student_id': student.id, 'title': title_ref, 'reason': reason},
            event_key='payment_status',
            user=student,
        )

    @classmethod
    def send_student_order_created_email(cls, order) -> Optional[EmailDeliveryLog]:
        """Informs the student that their marketplace order has been placed."""
        student = order.student
        name = student.get_full_name() or student.username
        subject = f"Order #{order.id} Placed Successfully — LoksewaAI Marketplace"
        headline = f"Thank you for your order, {name}!"

        items = order.items.select_related('product').all() if hasattr(order, 'items') else []
        items_rows = []
        for it in items:
            p_title = html.escape(it.product.title if it.product else 'Marketplace Product')
            p_price = getattr(it, 'price', None) or getattr(it, 'price_at_order', 0)
            items_rows.append(f"<tr><td style='padding: 6px 0; color: #334155;'>{p_title} &times; {it.quantity}</td><td style='padding: 6px 0; text-align: right; font-weight: 600;'>Rs. {p_price * it.quantity}</td></tr>")

        items_markup = "\n".join(items_rows) if items_rows else "<tr><td colspan='2' style='padding: 6px 0;'>Order details recorded.</td></tr>"

        pay_mode_label = dict(order.PAYMENT_MODE_CHOICES).get(order.payment_method_type, order.payment_method_type)
        cod_details = ""
        if order.is_cod:
            cod_details = f"""
            <tr><td style="padding: 6px 0; color: #64748b;">COD Advance (15%):</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #4f46e5;">Rs. {order.cod_advance_required}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Pay on Delivery:</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">Rs. {order.cod_remaining_balance}</td></tr>
            """

        content_html = f"""
        <p>Dear {html.escape(name)},</p>
        <p>Your order <strong>#{order.id}</strong> has been received and is being prepared.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="border-bottom: 1px solid #cbd5e1;"><th align="left" style="padding-bottom: 8px; color: #475569;">Item</th><th align="right" style="padding-bottom: 8px; color: #475569;">Total</th></tr>
            </thead>
            <tbody>
              {items_markup}
              <tr style="border-top: 1px solid #cbd5e1;">
                <td style="padding: 10px 0 6px; font-weight: 700; color: #0f172a;">Grand Total:</td>
                <td style="padding: 10px 0 6px; text-align: right; font-weight: 700; color: #4f46e5; font-size: 16px;">Rs. {order.total_amount}</td>
              </tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Payment Method:</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">{html.escape(pay_mode_label)}</td></tr>
              {cod_details}
            </tbody>
          </table>
        </div>
        """

        content_text = f"""
Dear {name},

Your order #{order.id} has been placed successfully.
Total Amount: Rs. {order.total_amount}
Payment Mode: {pay_mode_label}
{f"COD Advance Required: Rs. {order.cod_advance_required}" if order.is_cod else ""}

Track your order status at: https://www.hemrajkc.com.np/student/marketplace/orders
"""

        resolved = cls._resolve_student_template(
            event_key='order_confirmation',
            context={'student_name': name, 'order_id': str(order.id), 'total_amount': str(order.total_amount), 'items_summary': f"Order #{order.id}", 'tracking_url': f"{_get_base_frontend_url()}/student/marketplace/orders"},
            default_subject=subject,
            default_headline=headline,
            default_content_html=content_html,
            default_content_text=content_text,
            action_button_label="Track My Order",
            action_button_url="/student/marketplace/orders",
            badge_text="Order Placed",
            badge_color="#4f46e5",
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='marketplace',
            recipient_role='student',
            template_name='marketplace_order_created',
            idempotency_key=f"order-created:{order.id}",
            metadata={'order_id': order.id, 'student_id': student.id, 'total': str(order.total_amount)},
        )

    @classmethod
    def send_student_order_status_email(
        cls, order, new_status: str, note: Optional[str] = None
    ) -> Optional[EmailDeliveryLog]:
        """Informs the student of an order status change (e.g. Shipped, Delivered, Out for Delivery)."""
        student = order.student
        name = student.get_full_name() or student.username
        status_display = dict(order.STATUS_CHOICES).get(new_status, new_status)
        subject = f"Order #{order.id} Update: {status_display}"
        headline = f"Order #{order.id} is now {status_display}"

        note_markup = f"<p style='font-size: 14px; color: #64748b;'><em>Delivery Note: {html.escape(note)}</em></p>" if note else ""

        content_html = f"""
        <p>Dear {html.escape(name)},</p>
        <p>The status of your marketplace order <strong>#{order.id}</strong> has been updated to <strong>{html.escape(status_display)}</strong>.</p>
        <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 18px 20px; margin: 20px 0;">
          <p style="margin: 0 0 6px; font-size: 14px;"><strong>Order ID:</strong> #{order.id}</p>
          <p style="margin: 0 0 6px; font-size: 14px;"><strong>Current Status:</strong> <span style="font-weight: 700; color: #4f46e5;">{html.escape(status_display)}</span></p>
          <p style="margin: 0; font-size: 14px;"><strong>Total:</strong> Rs. {order.total_amount}</p>
        </div>
        {note_markup}
        """

        content_text = f"""
Dear {name},

The status of your order #{order.id} has changed to: {status_display}.
{f"Note: {note}" if note else ""}

Track your order at https://www.hemrajkc.com.np/student/marketplace/orders.
"""

        badge_color = "#16a34a" if new_status == 'DELIVERED' else ("#dc2626" if new_status == 'CANCELLED' else "#0284c7")
        status_key_map = {
            'processing': 'order_processing',
            'shipped': 'order_dispatched',
            'out_for_delivery': 'delivery_status_update',
            'delivered': 'order_delivered',
            'cancelled': 'order_cancelled',
        }
        event_key = status_key_map.get(str(new_status).lower(), 'delivery_status_update')

        resolved = cls._resolve_student_template(
            event_key=event_key,
            context={
                'student_name': name,
                'order_id': str(order.id),
                'status_message': f"Order #{order.id} is now {status_display}. {note or ''}".strip(),
                'carrier_name': getattr(order, 'courier_partner', 'Courier Partner') or 'Courier Partner',
                'tracking_number': getattr(order, 'tracking_number', 'N/A') or 'N/A',
                'reason': note or 'Status updated',
                'support_url': f"{_get_base_frontend_url()}/support",
                'tracking_url': f"{_get_base_frontend_url()}/student/marketplace/orders",
            },
            default_subject=subject,
            default_headline=headline,
            default_content_html=content_html,
            default_content_text=content_text,
            action_button_label="View Order Details",
            action_button_url="/student/marketplace/orders",
            badge_text=f"Status: {status_display}",
            badge_color=badge_color,
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='marketplace',
            recipient_role='student',
            template_name='marketplace_order_status',
            idempotency_key=f"order-status:{order.id}:{new_status}",
            metadata={'order_id': order.id, 'new_status': new_status},
        )

    # =========================================================================
    @classmethod
    def send_student_subscription_activated_email(
        cls, student, plan_name: str, expiry_date: Optional[str] = None, action_url: Optional[str] = None
    ) -> Optional[EmailDeliveryLog]:
        """Informs the student that their subscription plan has been activated."""
        name = student.get_full_name() or student.username
        context = {
            'student_name': name,
            'plan_name': plan_name,
            'expiry_date': str(expiry_date or 'Ongoing'),
            'action_url': action_url or f"{_get_base_frontend_url()}/student/exams",
        }
        resolved = cls._resolve_student_template(
            event_key='subscription_activated',
            context=context,
            default_subject="Your Subscription is Now Active",
            default_headline="Subscription Activated",
            default_content_html=f"<p>Hello {html.escape(name)},</p><p>Your subscription for <strong>{html.escape(plan_name)}</strong> is now active until <strong>{html.escape(str(expiry_date or 'Active'))}</strong>.</p>",
            default_content_text=f"Hello {name},\n\nYour subscription for {plan_name} is now active.",
            action_button_label="Start Practicing",
            action_button_url=action_url or "/student/exams",
            badge_text="Subscription Active",
            badge_color="#16a34a",
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='payment',
            recipient_role='student',
            template_name='subscription_activated',
            idempotency_key=f"sub-act:{student.id}:{plan_name}",
            metadata={'student_id': student.id, 'plan_name': plan_name},
            event_key='subscription_status',
            user=student,
        )

    @classmethod
    def send_student_subscription_expiry_reminder_email(
        cls, student, plan_name: str, days_left: int, expiry_date: Optional[str] = None, renewal_url: Optional[str] = None
    ) -> Optional[EmailDeliveryLog]:
        """Informs the student that their subscription will expire soon."""
        name = student.get_full_name() or student.username
        context = {
            'student_name': name,
            'plan_name': plan_name,
            'days_left': str(days_left),
            'expiry_date': str(expiry_date or 'Soon'),
            'renewal_url': renewal_url or f"{_get_base_frontend_url()}/student/pricing",
        }
        resolved = cls._resolve_student_template(
            event_key='subscription_expiry_reminder',
            context=context,
            default_subject=f"Your Subscription Expires in {days_left} Days",
            default_headline="Subscription Expiring Soon",
            default_content_html=f"<p>Hello {html.escape(name)},</p><p>Your subscription to <strong>{html.escape(plan_name)}</strong> expires in {days_left} days.</p>",
            default_content_text=f"Hello {name},\n\nYour subscription to {plan_name} expires in {days_left} days.",
            action_button_label="Renew Access",
            action_button_url=renewal_url or "/student/pricing",
            badge_text="Expiry Reminder",
            badge_color="#d97706",
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='payment',
            recipient_role='student',
            template_name='subscription_expiry_reminder',
            idempotency_key=f"sub-rem:{student.id}:{plan_name}:{days_left}",
            metadata={'student_id': student.id, 'plan_name': plan_name, 'days_left': days_left},
            event_key='subscription_expiry',
            user=student,
        )

    @classmethod
    def send_student_subscription_expired_email(
        cls, student, plan_name: str, renewal_url: Optional[str] = None
    ) -> Optional[EmailDeliveryLog]:
        """Informs the student that their subscription has expired."""
        name = student.get_full_name() or student.username
        context = {
            'student_name': name,
            'plan_name': plan_name,
            'renewal_url': renewal_url or f"{_get_base_frontend_url()}/student/pricing",
        }
        resolved = cls._resolve_student_template(
            event_key='subscription_expired',
            context=context,
            default_subject="Your LoksewaAI Subscription Has Expired",
            default_headline="Subscription Expired",
            default_content_html=f"<p>Hello {html.escape(name)},</p><p>Your subscription for <strong>{html.escape(plan_name)}</strong> has expired. Renew your plan to restore full access.</p>",
            default_content_text=f"Hello {name},\n\nYour subscription for {plan_name} has expired. Renew at {renewal_url or '/student/pricing'}.",
            action_button_label="Renew Plan",
            action_button_url=renewal_url or "/student/pricing",
            badge_text="Expired",
            badge_color="#dc2626",
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='payment',
            recipient_role='student',
            template_name='subscription_expired',
            idempotency_key=f"sub-exp:{student.id}:{plan_name}",
            metadata={'student_id': student.id, 'plan_name': plan_name},
            event_key='subscription_status',
            user=student,
        )

    @classmethod
    def send_student_course_access_email(
        cls, student, course_title: str, course_url: Optional[str] = None
    ) -> Optional[EmailDeliveryLog]:
        """Informs the student that new course or study plan access has been granted."""
        name = student.get_full_name() or student.username
        context = {
            'student_name': name,
            'course_title': course_title,
            'course_url': course_url or f"{_get_base_frontend_url()}/student/courses",
        }
        resolved = cls._resolve_student_template(
            event_key='course_access',
            context=context,
            default_subject=f"Access Granted: {course_title}",
            default_headline="New Course Access Activated",
            default_content_html=f"<p>Hello {html.escape(name)},</p><p>You have been enrolled in <strong>{html.escape(course_title)}</strong>. Your course materials and lectures are ready.</p>",
            default_content_text=f"Hello {name},\n\nYou now have access to {course_title}.\n\nOpen course: {course_url or '/student/courses'}",
            action_button_label="Go to Course",
            action_button_url=course_url or "/student/courses",
            badge_text="Course Access",
            badge_color="#4f46e5",
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='learning',
            recipient_role='student',
            template_name='course_access',
            idempotency_key=f"course-acc:{student.id}:{course_title}",
            metadata={'student_id': student.id, 'course_title': course_title},
            event_key='study_material_updates',
            user=student,
        )

    @classmethod
    def send_student_exam_announcement_email(
        cls, student, exam_title: str, exam_date: Optional[str] = None, action_url: Optional[str] = None
    ) -> Optional[EmailDeliveryLog]:
        """Informs the student of a new mock examination announcement."""
        name = student.get_full_name() or student.username
        context = {
            'student_name': name,
            'exam_title': exam_title,
            'exam_date': str(exam_date or 'See schedule'),
            'action_url': action_url or f"{_get_base_frontend_url()}/student/exams",
        }
        resolved = cls._resolve_student_template(
            event_key='exam_announcement',
            context=context,
            default_subject=f"New Exam Available: {exam_title}",
            default_headline="New Exam Announced",
            default_content_html=f"<p>Hello {html.escape(name)},</p><p>A new examination, <strong>{html.escape(exam_title)}</strong>, is now available. Scheduled date: {html.escape(str(exam_date or 'Self-paced'))}.</p>",
            default_content_text=f"Hello {name},\n\nNew exam announced: {exam_title} ({exam_date or 'Self-paced'}).",
            action_button_label="View Exam Details",
            action_button_url=action_url or "/student/exams",
            badge_text="Exam Announcement",
            badge_color="#4f46e5",
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='learning',
            recipient_role='student',
            template_name='exam_announcement',
            idempotency_key=f"exam-ann:{student.id}:{exam_title}",
            metadata={'student_id': student.id, 'exam_title': exam_title},
            event_key='exam_announcements',
            user=student,
        )

    @classmethod
    def send_student_exam_reminder_email(
        cls, student, exam_title: str, start_time: Optional[str] = None, action_url: Optional[str] = None
    ) -> Optional[EmailDeliveryLog]:
        """Informs the student of an approaching exam start time."""
        name = student.get_full_name() or student.username
        context = {
            'student_name': name,
            'exam_title': exam_title,
            'start_time': str(start_time or 'Soon'),
            'action_url': action_url or f"{_get_base_frontend_url()}/student/exams",
        }
        resolved = cls._resolve_student_template(
            event_key='exam_reminder',
            context=context,
            default_subject=f"Reminder: {exam_title} Starts Soon",
            default_headline="Upcoming Exam Reminder",
            default_content_html=f"<p>Hello {html.escape(name)},</p><p>This is a reminder that <strong>{html.escape(exam_title)}</strong> starts in <strong>{html.escape(str(start_time or 'shortly'))}</strong>.</p>",
            default_content_text=f"Hello {name},\n\nReminder: {exam_title} starts in {start_time or 'shortly'}.",
            action_button_label="Go to Exam Hall",
            action_button_url=action_url or "/student/exams",
            badge_text="Exam Reminder",
            badge_color="#d97706",
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='learning',
            recipient_role='student',
            template_name='exam_reminder',
            idempotency_key=f"exam-rem:{student.id}:{exam_title}",
            metadata={'student_id': student.id, 'exam_title': exam_title},
            event_key='exam_reminders',
            user=student,
        )

    @classmethod
    def send_student_result_published_email(
        cls, student, exam_title: str, score: Optional[str] = None, rank: Optional[str] = None, result_url: Optional[str] = None
    ) -> Optional[EmailDeliveryLog]:
        """Informs the student that their examination results are ready."""
        name = student.get_full_name() or student.username
        context = {
            'student_name': name,
            'exam_title': exam_title,
            'score': str(score or 'Published'),
            'rank': str(rank or 'Available on scorecard'),
            'result_url': result_url or f"{_get_base_frontend_url()}/student/exams",
        }
        resolved = cls._resolve_student_template(
            event_key='result_published',
            context=context,
            default_subject=f"Results Published: {exam_title}",
            default_headline="Exam Results Published",
            default_content_html=f"<p>Hello {html.escape(name)},</p><p>Results for <strong>{html.escape(exam_title)}</strong> are available. Score: <strong>{html.escape(str(score or 'Published'))}</strong>.</p>",
            default_content_text=f"Hello {name},\n\nResults for {exam_title} are published! Score: {score or 'Available on scorecard'}.",
            action_button_label="View Detailed Scorecard",
            action_button_url=result_url or "/student/exams",
            badge_text="Result Published",
            badge_color="#16a34a",
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='learning',
            recipient_role='student',
            template_name='result_published',
            idempotency_key=f"result-pub:{student.id}:{exam_title}",
            metadata={'student_id': student.id, 'exam_title': exam_title, 'score': str(score)},
            event_key='result_published',
            user=student,
        )

    @classmethod
    def send_student_announcement_email(
        cls, student, announcement_title: str, announcement_content: str, action_url: Optional[str] = None
    ) -> Optional[EmailDeliveryLog]:
        """Broadcasts an academic or administrative announcement to an enrolled student."""
        name = student.get_full_name() or student.username
        context = {
            'student_name': name,
            'announcement_title': announcement_title,
            'announcement_content': announcement_content,
            'action_url': action_url or f"{_get_base_frontend_url()}/student",
        }
        resolved = cls._resolve_student_template(
            event_key='student_announcement',
            context=context,
            default_subject=f"Announcement: {announcement_title}",
            default_headline="LoksewaAI Academic Notice",
            default_content_html=f"<p>Hello {html.escape(name)},</p><p><strong>{html.escape(announcement_title)}</strong></p><p>{html.escape(announcement_content)}</p>",
            default_content_text=f"Hello {name},\n\nAnnouncement: {announcement_title}\n\n{announcement_content}",
            action_button_label="Read More on Dashboard",
            action_button_url=action_url or "/student",
            badge_text="Announcement",
            badge_color="#4f46e5",
        )
        if not resolved:
            return None

        return cls.send(
            to_email=student.email,
            subject=resolved['subject'],
            html_body=resolved['html_body'],
            text_body=resolved['text_body'],
            event_category='announcement',
            recipient_role='student',
            template_name='student_announcement',
            idempotency_key=f"ann-std:{student.id}:{announcement_title[:30]}",
            metadata={'student_id': student.id, 'title': announcement_title},
            event_key='platform_announcements',
            user=student,
        )

    # =========================================================================
    # Admin System Notifications
    # =========================================================================

    @classmethod
    def send_admin_new_student_email(cls, student) -> List[EmailDeliveryLog]:
        """Notifies admin recipients of a new student registration."""
        subject = f"New Student Registration: {student.username}"
        headline = "New Student Registered"
        name = student.get_full_name() or student.username

        content_html = f"""
        <p>A new student account has registered on LoksewaAI:</p>
        <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 18px 20px; margin: 20px 0;">
          <p style="margin: 0 0 6px;"><strong>Name:</strong> {html.escape(name)}</p>
          <p style="margin: 0 0 6px;"><strong>Username:</strong> {html.escape(student.username)}</p>
          <p style="margin: 0 0 6px;"><strong>Email:</strong> {html.escape(student.email)}</p>
          <p style="margin: 0;"><strong>Registered At:</strong> {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}</p>
        </div>
        """

        content_text = f"""
New Student Registered:
Name: {name}
Username: {student.username}
Email: {student.email}
Time: {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}
"""

        return cls.notify_admins(
            category='registration',
            subject=subject,
            headline=headline,
            content_html=content_html,
            content_text=content_text,
            action_button_label="View in Users Management",
            action_button_url="/admin-dashboard/users",
            idempotency_prefix=f"admin-reg:{student.id}",
            metadata={'student_id': student.id, 'username': student.username},
            badge_text="Registration",
            badge_color="#4f46e5",
        )

    @classmethod
    def send_admin_payment_submitted_email(
        cls, payment_type: str, student, title: str, amount: Any, transaction_id: Optional[str] = None
    ) -> List[EmailDeliveryLog]:
        """Notifies admin recipients that a payment is awaiting verification."""
        name = student.get_full_name() or student.username
        subject = f"Payment Awaiting Verification: Rs. {amount} ({title})"
        headline = "New Payment Awaiting Verification"

        txn_line = f"<p style='margin: 0 0 6px;'><strong>Transaction ID:</strong> <span style='font-family: monospace;'>{html.escape(str(transaction_id))}</span></p>" if transaction_id else ""

        content_html = f"""
        <p>A student has submitted payment proof for verification:</p>
        <div style="background-color: #fffbeb; border-radius: 8px; border: 1px solid #fde68a; padding: 18px 20px; margin: 20px 0;">
          <p style="margin: 0 0 6px;"><strong>Type:</strong> {html.escape(payment_type)}</p>
          <p style="margin: 0 0 6px;"><strong>Student:</strong> {html.escape(name)} ({html.escape(student.email)})</p>
          <p style="margin: 0 0 6px;"><strong>Package / Item:</strong> {html.escape(title)}</p>
          <p style="margin: 0 0 6px;"><strong>Amount:</strong> <span style="font-weight: 700; color: #b45309;">Rs. {html.escape(str(amount))}</span></p>
          {txn_line}
          <p style="margin: 0;"><strong>Submitted:</strong> {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}</p>
        </div>
        """

        content_text = f"""
New Payment Proof Awaiting Verification:
Type: {payment_type}
Student: {name} ({student.email})
Item: {title}
Amount: Rs. {amount}
{f"Transaction ID: {transaction_id}" if transaction_id else ""}
Time: {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}
"""

        action_url = "/admin-dashboard/applications" if payment_type.lower() == 'subscription' else "/admin-dashboard/marketplace/payments"

        return cls.notify_admins(
            category='payment',
            subject=subject,
            headline=headline,
            content_html=content_html,
            content_text=content_text,
            action_button_label="Review Payment in Admin",
            action_button_url=action_url,
            idempotency_prefix=f"admin-pay-sub:{student.id}:{transaction_id or title}",
            metadata={'student_id': student.id, 'title': title, 'amount': str(amount)},
            badge_text="Payment Verification Needed",
            badge_color="#d97706",
        )

    @classmethod
    def send_admin_marketplace_order_email(cls, order) -> List[EmailDeliveryLog]:
        """Notifies admin recipients of a new marketplace order."""
        student = order.student
        name = student.get_full_name() or student.username
        subject = f"New Marketplace Order #{order.id} (Rs. {order.total_amount})"
        headline = f"New Marketplace Order #{order.id}"

        content_html = f"""
        <p>A new order has been placed on the marketplace:</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
          <p style="margin: 0 0 6px;"><strong>Order ID:</strong> #{order.id}</p>
          <p style="margin: 0 0 6px;"><strong>Customer:</strong> {html.escape(name)} ({html.escape(student.email)})</p>
          <p style="margin: 0 0 6px;"><strong>Total Amount:</strong> <span style="font-weight: 700; color: #4f46e5;">Rs. {order.total_amount}</span></p>
          <p style="margin: 0 0 6px;"><strong>Payment Mode:</strong> {html.escape(order.payment_method_type)}</p>
          <p style="margin: 0;"><strong>Time:</strong> {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}</p>
        </div>
        """

        content_text = f"""
New Marketplace Order:
Order ID: #{order.id}
Customer: {name} ({student.email})
Total: Rs. {order.total_amount}
Payment Mode: {order.payment_method_type}
"""

        return cls.notify_admins(
            category='marketplace',
            subject=subject,
            headline=headline,
            content_html=content_html,
            content_text=content_text,
            action_button_label="View Order in Admin",
            action_button_url="/admin-dashboard/marketplace/orders",
            idempotency_prefix=f"admin-order:{order.id}",
            metadata={'order_id': order.id, 'total': str(order.total_amount)},
            badge_text="Marketplace Order",
            badge_color="#4f46e5",
        )

    @classmethod
    def send_admin_security_alert_email(cls, user, event_type: str, details: str) -> List[EmailDeliveryLog]:
        """Notifies admin recipients of security-sensitive events."""
        subject = f"Security Alert: {event_type} ({user.username})"
        headline = f"Security Event: {event_type}"

        content_html = f"""
        <p>A security event occurred on the LoksewaAI platform:</p>
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
          <p style="margin: 0 0 6px;"><strong>Event:</strong> {html.escape(event_type)}</p>
          <p style="margin: 0 0 6px;"><strong>User:</strong> {html.escape(user.username)} ({html.escape(user.email)})</p>
          <p style="margin: 0 0 6px;"><strong>Details:</strong> {html.escape(details)}</p>
          <p style="margin: 0;"><strong>Timestamp:</strong> {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}</p>
        </div>
        """

        content_text = f"""
Security Event Alert:
Event: {event_type}
User: {user.username} ({user.email})
Details: {details}
Time: {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}
"""

        return cls.notify_admins(
            category='security',
            subject=subject,
            headline=headline,
            content_html=content_html,
            content_text=content_text,
            action_button_label="Audit Logs",
            action_button_url="/admin-dashboard/settings/security",
            idempotency_prefix=f"admin-sec:{user.id}:{event_type}:{timezone.now().strftime('%Y%m%d%H%M')}",
            metadata={'user_id': user.id, 'event': event_type},
            badge_text="Security Alert",
            badge_color="#dc2626",
        )

    @classmethod
    def send_admin_system_alert_email(cls, component: str, detail: str, priority: str = 'critical') -> List[EmailDeliveryLog]:
        """Notifies admin recipients of system or infrastructure errors."""
        subject = f"System Failure Alert: {component}"
        headline = f"System Error Detected in {component}"

        content_html = f"""
        <p>A system or third-party service exception was caught:</p>
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
          <p style="margin: 0 0 6px;"><strong>Component:</strong> {html.escape(component)}</p>
          <p style="margin: 0 0 6px;"><strong>Priority:</strong> {html.escape(priority.upper())}</p>
          <p style="margin: 0 0 6px;"><strong>Error Detail:</strong> <span style="font-family: monospace; font-size: 13px;">{html.escape(detail[:500])}</span></p>
          <p style="margin: 0;"><strong>Timestamp:</strong> {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}</p>
        </div>
        """

        content_text = f"""
System Error Detected:
Component: {component}
Priority: {priority.upper()}
Detail: {detail[:500]}
Time: {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}
"""

        return cls.notify_admins(
            category='system',
            subject=subject,
            headline=headline,
            content_html=content_html,
            content_text=content_text,
            idempotency_prefix=f"admin-sys:{component}:{timezone.now().strftime('%Y%m%d%H%M')}",
            metadata={'component': component, 'priority': priority},
            badge_text="System Alert",
            badge_color="#dc2626",
        )

    @classmethod
    def send_test_email(cls, to_email: str, admin_user=None) -> Dict[str, Any]:
        """Sends a diagnostic test email to verify SMTP / provider connectivity."""
        sender_name = admin_user.get_full_name() or admin_user.username if admin_user else "Administrator"
        subject = "LoksewaAI Test Notification — Email System Operational"
        headline = "Email System Test Succeeded"

        provider_host = getattr(settings, 'EMAIL_HOST', 'Console/LocMem Backend') or 'Console Backend'
        provider_port = getattr(settings, 'EMAIL_PORT', '-')
        from_address = getattr(settings, 'DEFAULT_FROM_EMAIL', 'onboarding@resend.dev')

        content_html = f"""
        <p>Hello,</p>
        <p>This is a test notification dispatched from the <strong>LoksewaAI Centralized Email Notification System</strong>.</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-weight: 700; color: #166534; font-size: 13px; text-transform: uppercase;">Diagnostics</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 4px 0; color: #64748b; width: 140px;"><strong>Dispatched By:</strong></td><td style="padding: 4px 0;">{html.escape(sender_name)}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;"><strong>Server Time:</strong></td><td style="padding: 4px 0;">{timezone.now().strftime('%Y-%m-%d %H:%M:%S %Z')}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;"><strong>SMTP Host:</strong></td><td style="padding: 4px 0; font-family: monospace;">{html.escape(str(provider_host))}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;"><strong>SMTP Port:</strong></td><td style="padding: 4px 0; font-family: monospace;">{html.escape(str(provider_port))}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;"><strong>From Address:</strong></td><td style="padding: 4px 0;">{html.escape(str(from_address))}</td></tr>
          </table>
        </div>
        <p style="font-size: 14px; color: #64748b;">If you received this message, your SMTP credentials and delivery pipelines are functioning properly.</p>
        """

        content_text = f"""
LoksewaAI Test Notification
Dispatched by: {sender_name}
Server Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S %Z')}
SMTP Host: {provider_host}
SMTP Port: {provider_port}
From Address: {from_address}

Email delivery is operational.
"""

        html_body = _render_base_email_html(
            title=subject,
            headline=headline,
            content_html=content_html,
            action_button_label="Return to Admin Settings",
            action_button_url="/admin-dashboard/settings",
            badge_text="System Diagnostic Test",
            badge_color="#16a34a",
        )
        text_body = _render_base_email_text(
            headline=headline,
            content_text=content_text,
            action_button_label="Return to Admin Settings",
            action_button_url="/admin-dashboard/settings",
        )

        log = cls.send(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            event_category='test',
            recipient_role='admin',
            template_name='test_diagnostic',
            immediate=True,
            metadata={'dispatched_by': sender_name},
        )

        if log and log.status == 'sent':
            return {
                'success': True,
                'message': f"Test email sent successfully to {to_email}.",
                'log_id': log.id,
            }
        else:
            err = log.error_message if log else "Delivery failed or was cancelled by settings kill-switch."
            return {
                'success': False,
                'message': f"Failed to send test email to {to_email}: {err}",
                'log_id': log.id if log else None,
                'error': err,
            }
