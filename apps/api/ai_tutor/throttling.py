"""DRF rate-throttling for LoksewaAI Tutor endpoints.

Applies per-user request throttling backed by Django's cache backend.
In production with Redis (REDIS_CACHE_URL or REDIS_URL), counters are
shared across gunicorn/celery workers. In local development or fallback,
LocMemCache applies per-process rate limits.
"""
from rest_framework.throttling import UserRateThrottle


class AITutorRateThrottle(UserRateThrottle):
    """Limits AI Tutor queries per user to mitigate abuse and runaway provider costs.

    Scope: 'ai_tutor' (configured via REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['ai_tutor'],
    defaulting to 20/minute).
    """
    scope = 'ai_tutor'
