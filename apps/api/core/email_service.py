import html
import logging

import requests
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

RESEND_API_URL = 'https://api.resend.com/emails'
RESEND_API_TIMEOUT_SECONDS = 10


def _send_email(subject, text_body, html_body, to_email, event_category='security', template_name=''):
    """Sends one email, preferring Resend's HTTPS API (RESEND_API_KEY) over
    Django's configured mail backend when both are available. The HTTPS API
    call is bounded by RESEND_API_TIMEOUT_SECONDS regardless of platform
    network config, unlike the SMTP backend which can hang indefinitely if
    the host throttles/blocks outbound SMTP - see settings.py's
    RESEND_API_KEY comment. Never raises: callers treat "did it actually
    send" as best-effort and always keep the OTP row so a resend is
    possible either way.
    Logs delivery status to EmailDeliveryLog without storing sensitive codes.
    """
    from .models import EmailDeliveryLog
    from django.utils import timezone
    import re

    log = None
    try:
        log = EmailDeliveryLog.objects.create(
            event_category=event_category,
            recipient_email=to_email,
            recipient_role='student',
            subject=subject,
            template_name=template_name or 'transactional',
            status='queued',
            attempts=1,
        )
    except Exception as log_err:
        logger.debug("Could not initialize EmailDeliveryLog: %s", log_err)

    if settings.RESEND_API_KEY:
        try:
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
            if log:
                log.status = 'sent'
                log.sent_at = timezone.now()
                log.error_message = ''
                log.save(update_fields=['status', 'sent_at', 'error_message', 'updated_at'])
            return
        except Exception as exc:
            logger.exception('Resend API email send failed for %s', to_email)
            if log:
                clean_err = re.sub(r'\b\d{6}\b', '[CODE_REDACTED]', str(exc))
                log.status = 'failed'
                log.error_message = clean_err[:500]
                log.save(update_fields=['status', 'error_message', 'updated_at'])
            return

    try:
        message = EmailMultiAlternatives(
            subject=subject, body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL, to=[to_email],
        )
        message.attach_alternative(html_body, 'text/html')
        message.send(fail_silently=False)
        if log:
            log.status = 'sent'
            log.sent_at = timezone.now()
            log.error_message = ''
            log.save(update_fields=['status', 'sent_at', 'error_message', 'updated_at'])
    except Exception as exc:
        logger.exception('SMTP email send failed for %s', to_email)
        if log:
            clean_err = re.sub(r'\b\d{6}\b', '[CODE_REDACTED]', str(exc))
            log.status = 'failed'
            log.error_message = clean_err[:500]
            log.save(update_fields=['status', 'error_message', 'updated_at'])


_PURPOSE_COPY = {
    'signup': (
        'Verify your LoksewaAI account',
        'Welcome to LoksewaAI. Use the code below to verify your email and finish creating your account.',
    ),
    'password_reset': (
        'Reset your LoksewaAI password',
        'Use the code below to reset your LoksewaAI password.',
    ),
}

_OTP_TTL_MINUTES = 10

_HTML_TEMPLATE = """\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1f2937;">
  <h2 style="color:#4f46e5;margin:0 0 16px;">LoksewaAI</h2>
  <p style="font-size:15px;line-height:1.5;margin:0 0 24px;">{intro}</p>
  <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
    <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111827;">{code}</span>
  </div>
  <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0 0 8px;">
    This code will expire in {ttl} minutes.
  </p>
  <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0;">
    If you did not request this code, you can safely ignore this email.
  </p>
  <p style="font-size:13px;color:#9ca3af;margin-top:32px;">LoksewaAI Team</p>
</div>
"""

_TEXT_TEMPLATE = """\
LoksewaAI

{intro}

Your verification code is: {code}

This code will expire in {ttl} minutes.

If you did not request this code, you can safely ignore this email.

LoksewaAI Team
"""


def send_account_created_email(
    to_email,
    username,
    password=None,
    full_name='',
    phone='',
    package_names=None,
    enrolled_courses=None,
    target_exam=None,
    expiry_date=None,
    login_url=None,
):
    """Sends account credentials, temporary password, and access details to a student.
    Ensures the login redirection points to the production login URL (https://www.hemrajkc.com.np/login).
    Never raises, matching the best-effort email contract across this service.
    """
    if not login_url:
        base_frontend = getattr(settings, 'FRONTEND_URL', 'https://www.hemrajkc.com.np') or 'https://www.hemrajkc.com.np'
        base_frontend = str(base_frontend).strip().rstrip('/')
        if not base_frontend or 'localhost' in base_frontend or '127.0.0.1' in base_frontend:
            base_frontend = 'https://www.hemrajkc.com.np'
        login_url = f'{base_frontend}/login'

    if not login_url.startswith(('http://', 'https://')):
        login_url = f'https://{login_url}'

    display_name = (full_name or '').strip() or str(username)
    escaped_display_name = html.escape(display_name)
    escaped_username = html.escape(str(username))
    escaped_email = html.escape(str(to_email))
    escaped_password = html.escape(str(password)) if password else None
    escaped_phone = html.escape(str(phone)) if phone else None
    escaped_target_exam = html.escape(str(target_exam)) if target_exam else None
    escaped_expiry = html.escape(str(expiry_date)) if expiry_date else None

    # Account credentials rows
    credentials_rows = [
        f'<tr><td style="padding: 7px 0; color: #64748b; width: 140px; vertical-align: top;"><strong>Username:</strong></td>'
        f'<td style="padding: 7px 0; color: #0f172a; font-weight: 600; font-size: 15px;">{escaped_username}</td></tr>',
        f'<tr><td style="padding: 7px 0; color: #64748b; vertical-align: top;"><strong>Email:</strong></td>'
        f'<td style="padding: 7px 0; color: #0f172a; font-size: 15px;">{escaped_email}</td></tr>',
    ]

    if escaped_password:
        credentials_rows.append(
            f'<tr><td style="padding: 7px 0; color: #64748b; vertical-align: top;"><strong>Password:</strong></td>'
            f'<td style="padding: 7px 0; color: #4f46e5; font-family: Consolas, Monaco, monospace; font-weight: 700; font-size: 16px;">{escaped_password}</td></tr>'
        )

    if escaped_phone:
        credentials_rows.append(
            f'<tr><td style="padding: 7px 0; color: #64748b; vertical-align: top;"><strong>Phone:</strong></td>'
            f'<td style="padding: 7px 0; color: #0f172a; font-size: 15px;">{escaped_phone}</td></tr>'
        )

    credentials_html = '\n      '.join(credentials_rows)

    # Course & package enrollment rows
    enrollment_rows = []
    if package_names:
        pkg_str = html.escape(', '.join(package_names) if isinstance(package_names, (list, tuple, set)) else str(package_names))
        enrollment_rows.append(
            f'<tr><td style="padding: 7px 0; color: #166534; width: 140px; vertical-align: top;"><strong>Package:</strong></td>'
            f'<td style="padding: 7px 0; color: #14532d; font-weight: 600; font-size: 15px;">{pkg_str}</td></tr>'
        )

    if enrolled_courses:
        crs_str = html.escape(', '.join(enrolled_courses) if isinstance(enrolled_courses, (list, tuple, set)) else str(enrolled_courses))
        enrollment_rows.append(
            f'<tr><td style="padding: 7px 0; color: #166534; vertical-align: top;"><strong>Enrolled Courses:</strong></td>'
            f'<td style="padding: 7px 0; color: #14532d; font-size: 15px;">{crs_str}</td></tr>'
        )

    if escaped_target_exam:
        enrollment_rows.append(
            f'<tr><td style="padding: 7px 0; color: #166534; vertical-align: top;"><strong>Target Preparation:</strong></td>'
            f'<td style="padding: 7px 0; color: #14532d; font-size: 15px;">{escaped_target_exam}</td></tr>'
        )

    if escaped_expiry:
        enrollment_rows.append(
            f'<tr><td style="padding: 7px 0; color: #166534; vertical-align: top;"><strong>Access Valid Until:</strong></td>'
            f'<td style="padding: 7px 0; color: #14532d; font-size: 15px; font-weight: 600;">{escaped_expiry}</td></tr>'
        )

    if enrollment_rows:
        enrollment_section_html = f"""\
  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px 20px; margin: 0 0 24px;">
    <p style="margin: 0 0 12px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #15803d;">Enrolled Course / Package Access</p>
    <table style="width: 100%; border-collapse: collapse;">
      {chr(10).join(enrollment_rows)}
    </table>
  </div>
"""
    else:
        enrollment_section_html = ""

    if password:
        password_note = "Please log in using your temporary password and update it in your profile settings for security."
    else:
        password_note = 'To set your own password, go to the login page and use "Forgot password?" - we\'ll email you a verification code to confirm it\'s you.'

    html_body = f"""\
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; color: #1f2937; background: #ffffff;">
  <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px;">
    <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 700;">LoksewaAI</h2>
  </div>

  <p style="font-size: 16px; line-height: 1.5; margin: 0 0 12px; color: #111827;">
    Hello <strong>{escaped_display_name}</strong>,
  </p>
  <p style="font-size: 15px; line-height: 1.5; margin: 0 0 20px; color: #4b5563;">
    An administrator has created your student account on <strong>LoksewaAI</strong>. Below are your login credentials and account access details:
  </p>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 0 0 24px;">
    <p style="margin: 0 0 12px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Account Credentials</p>
    <table style="width: 100%; border-collapse: collapse;">
      {credentials_html}
    </table>
  </div>

  {enrollment_section_html}

  <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0 0 22px;">
    {password_note}
  </p>

  <div style="text-align: center; margin: 0 0 24px;">
    <a href="{login_url}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 6px;">
      Go to Login
    </a>
  </div>

  <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0 0 24px; text-align: center;">
    Or open this link directly in your browser: <br/>
    <a href="{login_url}" style="color: #4f46e5; word-break: break-all;">{login_url}</a>
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
  <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">LoksewaAI Team</p>
</div>
"""

    text_lines = [
        "LoksewaAI",
        "",
        f"Hello {display_name},",
        "",
        "An administrator has created your student account on LoksewaAI.",
        "",
        "--- ACCOUNT CREDENTIALS ---",
        f"Username: {username}",
        f"Email: {to_email}",
    ]
    if password:
        text_lines.append(f"Password: {password}")
    if phone:
        text_lines.append(f"Phone: {phone}")

    if package_names or enrolled_courses or target_exam or expiry_date:
        text_lines.extend(["", "--- ENROLLED COURSE & PACKAGE ACCESS ---"])
        if package_names:
            p_str = ', '.join(package_names) if isinstance(package_names, (list, tuple, set)) else str(package_names)
            text_lines.append(f"Package: {p_str}")
        if enrolled_courses:
            c_str = ', '.join(enrolled_courses) if isinstance(enrolled_courses, (list, tuple, set)) else str(enrolled_courses)
            text_lines.append(f"Courses: {c_str}")
        if target_exam:
            text_lines.append(f"Target Preparation: {target_exam}")
        if expiry_date:
            text_lines.append(f"Access Valid Until: {expiry_date}")

    text_lines.extend([
        "",
        password_note,
        "",
        f"Login Link: {login_url}",
        "",
        "LoksewaAI Team",
    ])
    text_body = "\n".join(text_lines)

    _send_email('Your LoksewaAI account has been created', text_body, html_body, to_email, event_category='registration', template_name='account_created')


_PASSWORD_CHANGED_HTML = """\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1f2937;">
  <h2 style="color:#4f46e5;margin:0 0 16px;">LoksewaAI</h2>
  <p style="font-size:15px;line-height:1.5;margin:0 0 16px;">
    Your LoksewaAI {role} password was changed successfully.
  </p>
  <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0 0 20px;">
    If you made this change, no further action is needed. If you did not
    change your password, contact your platform administrator immediately -
    your account may be compromised.
  </p>
  <p style="font-size:13px;color:#9ca3af;margin-top:32px;">LoksewaAI Team</p>
</div>
"""

_PASSWORD_CHANGED_TEXT = """\
LoksewaAI

Your LoksewaAI {role} password was changed successfully.

If you made this change, no further action is needed. If you did not
change your password, contact your platform administrator immediately -
your account may be compromised.

LoksewaAI Team
"""


def send_password_changed_email(to_email, role='account'):
    """Best-effort security notice after a self-service password change
    (administration.self_service_views.AdminChangePasswordView). Never
    includes the old or new password. Never raises - a delivery failure
    must not undo an already-successful password change, same contract as
    every other function in this module.
    """
    text_body = _PASSWORD_CHANGED_TEXT.format(role=role)
    html_body = _PASSWORD_CHANGED_HTML.format(role=role)
    _send_email('Your LoksewaAI password was changed', text_body, html_body, to_email, event_category='security', template_name='password_changed')


def send_otp_email(to_email, code, purpose):
    """Sends a one-time code via Resend's HTTPS API when RESEND_API_KEY is
    set, else Django's configured mail backend (SMTP via Resend, or the
    console backend in local dev when EMAIL_HOST is unset too - see
    backend/settings.py).

    Never raises - a delivery failure is logged, not surfaced to the
    caller, matching how the auth views already treat "did the email
    actually arrive" as best-effort. The OTP row itself was already
    created and stored before this is called, so the caller can always
    offer a resend regardless of whether this send succeeds.
    """
    subject, intro = _PURPOSE_COPY.get(purpose, _PURPOSE_COPY['password_reset'])
    text_body = _TEXT_TEMPLATE.format(intro=intro, code=code, ttl=_OTP_TTL_MINUTES)
    html_body = _HTML_TEMPLATE.format(intro=intro, code=code, ttl=_OTP_TTL_MINUTES)

    category = 'registration' if purpose == 'signup' else 'security'
    _send_email(subject, text_body, html_body, to_email, event_category=category, template_name=f'{purpose}_otp')
