"""Password validators driven by the admin-configurable AdminSettings.security
fields (apps/web Admin Settings > Security tab), instead of static values in
settings.py. Wired into AUTH_PASSWORD_VALIDATORS so every real password-set
path (signup, admin-create-user, change-password) enforces whatever the
admin currently has configured.
"""
import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

NEPAL_PHONE_PATTERN = re.compile(r'^9[678]\d{8}$')


def is_valid_nepal_phone(phone):
    """True if `phone` is a 10-digit Nepali mobile number (96/97/98-prefixed),
    after stripping spaces, hyphens, and an optional +977/977 country code.
    This is the project's phone-validation convention - used for both
    registration and any other Nepal-phone field going forward."""
    if not phone:
        return False
    cleaned = re.sub(r'[\s-]', '', phone)
    cleaned = re.sub(r'^(\+?977)', '', cleaned)
    return bool(NEPAL_PHONE_PATTERN.match(cleaned))


def _security_settings():
    from core.models import AdminSettings
    return AdminSettings.get_settings()


class DynamicMinimumLengthValidator:
    """Same job as Django's own MinimumLengthValidator, but the minimum comes
    from AdminSettings.password_min_length instead of a fixed constant."""

    def validate(self, password, user=None):
        min_length = _security_settings().password_min_length
        if len(password) < min_length:
            raise ValidationError(
                _("This password is too short. It must contain at least %(min_length)d characters."),
                code='password_too_short',
                params={'min_length': min_length},
            )

    def get_help_text(self):
        return _("Your password must contain at least %(min_length)d characters.") % {
            'min_length': _security_settings().password_min_length,
        }


class AdminConfiguredComplexityValidator:
    """Uppercase / number / special-character requirements, each
    independently toggleable via AdminSettings.security."""

    def validate(self, password, user=None):
        settings = _security_settings()
        errors = []
        if settings.password_require_uppercase and not any(c.isupper() for c in password):
            errors.append(_("This password must contain at least one uppercase letter."))
        if settings.password_require_numbers and not any(c.isdigit() for c in password):
            errors.append(_("This password must contain at least one number."))
        if settings.password_require_special_chars and not any(not c.isalnum() for c in password):
            errors.append(_("This password must contain at least one special character."))
        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        settings = _security_settings()
        requirements = []
        if settings.password_require_uppercase:
            requirements.append(_("an uppercase letter"))
        if settings.password_require_numbers:
            requirements.append(_("a number"))
        if settings.password_require_special_chars:
            requirements.append(_("a special character"))
        if not requirements:
            return ""
        return _("Your password must contain %(requirements)s.") % {
            'requirements': ", ".join(requirements),
        }
