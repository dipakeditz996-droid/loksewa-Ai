import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

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


_ACCOUNT_CREATED_HTML = """\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1f2937;">
  <h2 style="color:#4f46e5;margin:0 0 16px;">LoksewaAI</h2>
  <p style="font-size:15px;line-height:1.5;margin:0 0 16px;">
    An administrator created an account for you on LoksewaAI.
  </p>
  <div style="background:#f3f4f6;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
    <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">Username</p>
    <p style="font-size:18px;font-weight:bold;color:#111827;margin:0;">{username}</p>
  </div>
  <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0 0 20px;">
    To set your own password, go to the login page and use "Forgot password?" -
    we'll email you a verification code to confirm it's you.
  </p>
  <a href="{login_url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:10px 20px;border-radius:6px;">
    Go to Login
  </a>
  <p style="font-size:13px;color:#9ca3af;margin-top:32px;">LoksewaAI Team</p>
</div>
"""

_ACCOUNT_CREATED_TEXT = """\
LoksewaAI

An administrator created an account for you on LoksewaAI.

Username: {username}

To set your own password, go to {login_url} and use "Forgot password?" -
we'll email you a verification code to confirm it's you.

LoksewaAI Team
"""


def send_account_created_email(to_email, username):
    """Tells a student an administrator created their account. Deliberately
    never includes the admin-set temporary password itself - instead points
    at the existing self-service "Forgot password?" flow (core.views.
    ForgotPasswordView / core.otp), which emails its own OTP to confirm the
    student owns this address before letting them set a password. Never
    raises, same as send_otp_email - a delivery failure here shouldn't block
    account creation, which has already happened by the time this is called.
    """
    login_url = f'{settings.FRONTEND_URL.rstrip("/")}/login'
    text_body = _ACCOUNT_CREATED_TEXT.format(username=username, login_url=login_url)
    html_body = _ACCOUNT_CREATED_HTML.format(username=username, login_url=login_url)

    try:
        message = EmailMultiAlternatives(
            subject='Your LoksewaAI account has been created',
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        message.attach_alternative(html_body, 'text/html')
        message.send(fail_silently=False)
    except Exception:
        logger.exception('Account-created email send failed for %s', to_email)


def send_otp_email(to_email, code, purpose):
    """Sends a one-time code through Django's configured email backend
    (SMTP via Resend in production, console backend in local dev when
    EMAIL_HOST is unset - see backend/settings.py).

    Never raises - a delivery failure is logged, not surfaced to the
    caller, matching how the auth views already treat "did the email
    actually arrive" as best-effort. The OTP row itself was already
    created and stored before this is called, so the caller can always
    offer a resend regardless of whether this send succeeds.
    """
    subject, intro = _PURPOSE_COPY.get(purpose, _PURPOSE_COPY['password_reset'])
    text_body = _TEXT_TEMPLATE.format(intro=intro, code=code, ttl=_OTP_TTL_MINUTES)
    html_body = _HTML_TEMPLATE.format(intro=intro, code=code, ttl=_OTP_TTL_MINUTES)

    try:
        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        message.attach_alternative(html_body, 'text/html')
        message.send(fail_silently=False)
    except Exception:
        logger.exception('OTP email send failed (purpose=%s) for %s', purpose, to_email)
