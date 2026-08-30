"""Real TOTP-based two-factor authentication for admin accounts (Admin
Settings > Security > Two-Factor Authentication). Uses pyotp (RFC 6238) so
any standard authenticator app (Google Authenticator, Authy, 1Password,
etc.) works - no custom protocol.

Design notes:
  - AdminSettings.enable_two_factor_auth is a platform-wide switch for
    whether 2FA can be set up/used at all. Per-user enrollment
    (User.is_2fa_enabled) is separate and opt-in, so turning the switch on
    never locks out an admin who hasn't set it up yet.
  - A secret is written to User.totp_secret as soon as setup starts, but
    is_2fa_enabled only flips to True after the user proves they can
    generate a valid code with it - an unconfirmed secret never gates login.
  - Backup codes are shown once, in plaintext, at confirmation time, then
    only ever stored hashed.
"""
import hashlib
import secrets

import pyotp
from django.utils import timezone

BACKUP_CODE_COUNT = 10


def generate_secret():
    return pyotp.random_base32()


def get_provisioning_uri(user, secret, issuer='LoksewaAI'):
    return pyotp.totp.TOTP(secret).provisioning_uri(name=user.email or user.username, issuer_name=issuer)


def verify_totp_code(secret, code):
    if not secret or not code:
        return False
    try:
        return pyotp.TOTP(secret).verify(code.strip(), valid_window=1)
    except Exception:
        return False


def _hash_backup_code(code):
    return hashlib.sha256(code.encode()).hexdigest()


def generate_backup_codes(user):
    """Creates BACKUP_CODE_COUNT fresh codes for the user, replacing any
    existing ones, and returns the plaintext list (only ever available here,
    at generation time)."""
    from .models import TwoFactorBackupCode

    TwoFactorBackupCode.objects.filter(user=user).delete()

    plaintext_codes = []
    rows = []
    for _ in range(BACKUP_CODE_COUNT):
        code = '-'.join(secrets.token_hex(2) for _ in range(2))  # e.g. 'a1b2-c3d4'
        plaintext_codes.append(code)
        rows.append(TwoFactorBackupCode(user=user, code_hash=_hash_backup_code(code)))
    TwoFactorBackupCode.objects.bulk_create(rows)
    return plaintext_codes


def verify_and_consume_backup_code(user, code):
    """Returns True and marks the code used if it matches an unused backup
    code for this user. Each code works exactly once."""
    from .models import TwoFactorBackupCode

    code_hash = _hash_backup_code(code.strip())
    match = TwoFactorBackupCode.objects.filter(user=user, code_hash=code_hash, used_at__isnull=True).first()
    if not match:
        return False
    match.used_at = timezone.now()
    match.save(update_fields=['used_at'])
    return True


def verify_login_code(user, code):
    """A login-time code can be either a live TOTP code or an unused backup
    code - tries both."""
    return verify_totp_code(user.totp_secret, code) or verify_and_consume_backup_code(user, code)
