import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send'

_PURPOSE_COPY = {
    'signup': (
        'Verify your LoksewaAI account',
        'Use this code to verify your email and finish creating your account.',
    ),
    'password_reset': (
        'Reset your LoksewaAI password',
        'Use this code to reset your password.',
    ),
}


def send_otp_email(to_email, code, purpose):
    """Sends a one-time code via EmailJS's REST API. Uses the account's
    private key as the strict-mode access token so this call is authorized
    to run server-side (not from a browser origin), which is what lets OTP
    generation/verification stay entirely on the backend while EmailJS
    handles delivery.

    Never raises - a delivery failure is logged, not surfaced to the caller.
    The auth views already treat "did the email actually arrive" as
    best-effort (same as the pre-existing password-reset flow did with
    Django's send_mail), so an EmailJS outage degrades to "no email arrives"
    rather than a 500.

    template_params includes several common aliases for the code/recipient
    (otp_code/passcode/code, to_email/email) since the exact variable names
    depend on how the EmailJS template (template_ff2dd35) is authored -
    unused keys are simply ignored by EmailJS.
    """
    subject, intro = _PURPOSE_COPY.get(purpose, _PURPOSE_COPY['password_reset'])
    payload = {
        'service_id': settings.EMAILJS_SERVICE_ID,
        'template_id': settings.EMAILJS_TEMPLATE_ID,
        'user_id': settings.EMAILJS_PUBLIC_KEY,
        'accessToken': settings.EMAILJS_PRIVATE_KEY,
        'template_params': {
            'to_email': to_email,
            'email': to_email,
            'subject': subject,
            'message': intro,
            'otp_code': code,
            'passcode': code,
            'code': code,
        },
    }
    try:
        response = requests.post(EMAILJS_API_URL, json=payload, timeout=10)
        if response.status_code >= 300:
            logger.error('EmailJS send failed (%s) for %s: %s', response.status_code, to_email, response.text[:300])
    except Exception:
        logger.exception('EmailJS request failed for %s', to_email)
