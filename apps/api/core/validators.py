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

NEPAL_DISTRICTS = (
    # Koshi Province (14)
    "Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga",
    "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung", "Terhathum", "Udayapur",
    # Madhesh Province (8)
    "Bara", "Dhanusha", "Mahottari", "Parsa", "Rautahat", "Saptari", "Sarlahi", "Siraha",
    # Bagmati Province (13)
    "Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu", "Kavrepalanchok",
    "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap", "Rasuwa", "Sindhuli", "Sindhupalchok",
    # Gandaki Province (11)
    "Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang", "Myagdi",
    "Nawalpur", "Parbat", "Syangja", "Tanahun",
    # Lumbini Province (12)
    "Arghakhanchi", "Banke", "Bardiya", "Dang", "Gulmi", "Kapilvastu",
    "Palpa", "Parasi", "Pyuthan", "Rolpa", "Rukum East", "Rupandehi",
    # Karnali Province (10)
    "Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu",
    "Rukum West", "Salyan", "Surkhet",
    # Sudurpashchim Province (9)
    "Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula",
    "Doti", "Kailali", "Kanchanpur",
)

NEPAL_DISTRICTS_LOWER = {d.lower() for d in NEPAL_DISTRICTS}


def is_valid_nepal_district(district):
    """True if `district` matches one of the canonical 77 districts of Nepal."""
    if not district or not isinstance(district, str):
        return False
    # Also support common alternate spellings/suffixes (e.g. Kavre -> Kavrepalanchok, Nawalparasi)
    d = district.strip().lower()
    if d in NEPAL_DISTRICTS_LOWER:
        return True
    aliases = {
        'kavre': 'kavrepalanchok',
        'sindhupalchowk': 'sindhupalchok',
        'nawalparasi': 'nawalpur',
        'rukum': 'rukum west',
    }
    return aliases.get(d) in NEPAL_DISTRICTS_LOWER


DISTRICT_TO_PROVINCE = {
    # Koshi Province (14)
    "bhojpur": "Koshi Province", "dhankuta": "Koshi Province", "ilam": "Koshi Province",
    "jhapa": "Koshi Province", "khotang": "Koshi Province", "morang": "Koshi Province",
    "okhaldhunga": "Koshi Province", "panchthar": "Koshi Province", "sankhuwasabha": "Koshi Province",
    "solukhumbu": "Koshi Province", "sunsari": "Koshi Province", "taplejung": "Koshi Province",
    "terhathum": "Koshi Province", "udayapur": "Koshi Province",
    # Madhesh Province (8)
    "bara": "Madhesh Province", "dhanusha": "Madhesh Province", "mahottari": "Madhesh Province",
    "parsa": "Madhesh Province", "rautahat": "Madhesh Province", "saptari": "Madhesh Province",
    "sarlahi": "Madhesh Province", "siraha": "Madhesh Province",
    # Bagmati Province (13)
    "bhaktapur": "Bagmati Province", "chitwan": "Bagmati Province", "dhading": "Bagmati Province",
    "dolakha": "Bagmati Province", "kathmandu": "Bagmati Province", "kavrepalanchok": "Bagmati Province",
    "kavre": "Bagmati Province", "lalitpur": "Bagmati Province", "makwanpur": "Bagmati Province",
    "nuwakot": "Bagmati Province", "ramechhap": "Bagmati Province", "rasuwa": "Bagmati Province",
    "sindhuli": "Bagmati Province", "sindhupalchok": "Bagmati Province", "sindhupalchowk": "Bagmati Province",
    # Gandaki Province (11)
    "baglung": "Gandaki Province", "gorkha": "Gandaki Province", "kaski": "Gandaki Province",
    "lamjung": "Gandaki Province", "manang": "Gandaki Province", "mustang": "Gandaki Province",
    "myagdi": "Gandaki Province", "nawalpur": "Gandaki Province", "parbat": "Gandaki Province",
    "syangja": "Gandaki Province", "tanahun": "Gandaki Province",
    # Lumbini Province (12)
    "arghakhanchi": "Lumbini Province", "banke": "Lumbini Province", "bardiya": "Lumbini Province",
    "dang": "Lumbini Province", "gulmi": "Lumbini Province", "kapilvastu": "Lumbini Province",
    "palpa": "Lumbini Province", "parasi": "Lumbini Province", "nawalparasi": "Lumbini Province",
    "pyuthan": "Lumbini Province", "rolpa": "Lumbini Province", "rukum east": "Lumbini Province",
    "rupandehi": "Lumbini Province",
    # Karnali Province (10)
    "dailekh": "Karnali Province", "dolpa": "Karnali Province", "humla": "Karnali Province",
    "jajarkot": "Karnali Province", "jumla": "Karnali Province", "kalikot": "Karnali Province",
    "mugu": "Karnali Province", "rukum west": "Karnali Province", "rukum": "Karnali Province",
    "salyan": "Karnali Province", "surkhet": "Karnali Province",
    # Sudurpashchim Province (9)
    "achham": "Sudurpashchim Province", "baitadi": "Sudurpashchim Province", "bajhang": "Sudurpashchim Province",
    "bajura": "Sudurpashchim Province", "dadeldhura": "Sudurpashchim Province", "darchula": "Sudurpashchim Province",
    "doti": "Sudurpashchim Province", "kailali": "Sudurpashchim Province", "kanchanpur": "Sudurpashchim Province",
}


def get_nepal_province_for_district(district):
    """Return the canonical Nepal province for a district name."""
    if not district or not isinstance(district, str):
        return ''
    return DISTRICT_TO_PROVINCE.get(district.strip().lower(), '')


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
