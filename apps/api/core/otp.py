import hashlib
import secrets
from datetime import timedelta

from django.utils import timezone

from .emailjs_service import send_otp_email
from .models import EmailOTP

OTP_TTL_MINUTES = 10
MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 60


class OTPError(Exception):
    """User-facing OTP failure (invalid code, expired, too many attempts,
    or resending too soon)."""


def _hash_code(code):
    return hashlib.sha256(code.encode()).hexdigest()


def create_and_send_otp(email, purpose):
    """Generates a 6-digit code, stores its hash, and emails it via
    EmailJS. Rate-limited to one send per RESEND_COOLDOWN_SECONDS per
    (email, purpose) so a single email can't be used to hammer EmailJS's
    quota."""
    email = email.strip().lower()

    recent = EmailOTP.objects.filter(email=email, purpose=purpose).order_by('-created_at').first()
    if recent:
        elapsed = (timezone.now() - recent.created_at).total_seconds()
        if elapsed < RESEND_COOLDOWN_SECONDS:
            raise OTPError(f'Please wait {int(RESEND_COOLDOWN_SECONDS - elapsed)} seconds before requesting another code.')

    code = f"{secrets.randbelow(1000000):06d}"
    EmailOTP.objects.create(
        email=email,
        purpose=purpose,
        code_hash=_hash_code(code),
        expires_at=timezone.now() + timedelta(minutes=OTP_TTL_MINUTES),
    )
    send_otp_email(email, code, purpose)


RECOVERY_TTL_MINUTES = 10
RECOVERY_RESEND_COOLDOWN_SECONDS = 30


def generate_recovery_code(email, generated_by):
    """Admin-triggered equivalent of create_and_send_otp for the
    'admin_recovery' purpose: generates a code with the same security
    properties (cryptographically random, hashed, short-lived, single-use,
    attempt-capped) but does NOT email it - the admin relays it to the
    student through a secure support channel instead. Returns the plaintext
    code exactly once; it is never stored or logged in plaintext.

    Rate-limited the same way as create_and_send_otp, so a compromised or
    careless admin session can't be used to spam codes for one student."""
    email = email.strip().lower()

    recent = EmailOTP.objects.filter(email=email, purpose='admin_recovery').order_by('-created_at').first()
    if recent:
        elapsed = (timezone.now() - recent.created_at).total_seconds()
        if elapsed < RECOVERY_RESEND_COOLDOWN_SECONDS:
            raise OTPError(f'Please wait {int(RECOVERY_RESEND_COOLDOWN_SECONDS - elapsed)} seconds before generating another code.')

    code = f"{secrets.randbelow(1000000):06d}"
    EmailOTP.objects.create(
        email=email,
        purpose='admin_recovery',
        code_hash=_hash_code(code),
        expires_at=timezone.now() + timedelta(minutes=RECOVERY_TTL_MINUTES),
        generated_by=generated_by,
    )
    return code


def verify_otp(email, purpose, code):
    """Verifies `code` against the most recent unused OTP for (email,
    purpose) and marks it used on success. Raises OTPError with a
    user-facing message on any failure."""
    email = email.strip().lower()
    code = (code or '').strip()

    otp = EmailOTP.objects.filter(email=email, purpose=purpose, is_used=False).order_by('-created_at').first()
    if not otp:
        raise OTPError('No verification code found for this email. Please request a new one.')
    if timezone.now() > otp.expires_at:
        raise OTPError('This code has expired. Please request a new one.')
    if otp.attempts >= MAX_ATTEMPTS:
        raise OTPError('Too many incorrect attempts. Please request a new code.')
    if otp.code_hash != _hash_code(code):
        otp.attempts += 1
        otp.save(update_fields=['attempts'])
        raise OTPError('Invalid verification code.')

    otp.is_used = True
    otp.save(update_fields=['is_used'])
