"""
LoksewaAI — Redis Cache Connectivity Verification Command
Command: python manage.py verify_redis_cache

Safety contract:
  - Read-only outside the diagnostic round-trip key (written then immediately deleted).
  - Never prints connection URLs, passwords, tokens, or any environment variable values.
  - Always cleans up the diagnostic key, even on failure.
  - Exits with code 0 on full PASS; code 1 on any FAIL so CI/Railway logs surface it.

Key diagnostics:
  1. Configured backend class name (distinguishes ResilientRedisCache from LocMemCache).
  2. Redis PING — bypasses ResilientRedisCache's silent catch-all to confirm the actual
     Redis server is reachable and responding.
  3. Cache round-trip SET / GET / DELETE via Django's high-level cache API (verifies
     key-prefix, serialization, and expiry pipeline end-to-end).
"""

import sys
import uuid
import time
import re

from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.conf import settings


# Sanitize credentials from any error string that happens to include a URL
_RE_CREDENTIALS = re.compile(
    r'((?:redis|rediss)://[^:/\s]*:).+@([a-zA-Z0-9.\-]+(?::\d+)?(?:/[^\s]*)?)'
)


def _safe_error(exc: Exception) -> str:
    """Return a sanitized, single-line error string (no URLs, passwords, tokens)."""
    raw = str(exc)
    sanitized = _RE_CREDENTIALS.sub(r'\1***@\2', raw)
    # Truncate extremely long messages that might embed binary or full stack traces.
    return sanitized[:300]


def _get_backend_class_name() -> str:
    """Return the configured cache backend class name (safe to print)."""
    try:
        cache_config = settings.CACHES.get('default', {})
        return cache_config.get('BACKEND', 'unknown')
    except Exception:
        return 'unknown'


def _is_resilient_redis_backend() -> bool:
    """Return True if the active cache backend is ResilientRedisCache."""
    return 'ResilientRedisCache' in _get_backend_class_name()


def _ping_redis_directly() -> tuple[bool, str]:
    """
    Issue a raw PING through the underlying Redis client, bypassing
    ResilientRedisCache's exception-suppressing wrappers.

    Returns (success: bool, detail: str).
    """
    try:
        # Django's RedisCache (and our ResilientRedisCache subclass) exposes
        # the pool-based client factory via get_client() or _cache.
        # We try the public interface first, then fall back to the private attr.
        client = None

        # Django 4.2+ RedisCache: cache._cache is the redis-py client factory
        if hasattr(cache, '_cache'):
            client_factory = cache._cache
            # redis-py ConnectionPool-backed client
            if hasattr(client_factory, 'get_client'):
                client = client_factory.get_client()
            elif hasattr(client_factory, 'ping'):
                client = client_factory
            elif hasattr(client_factory, 'client'):
                client = client_factory.client()

        # Fallback: try Django's RedisCache internal getter (Django 4.2 style)
        if client is None and hasattr(cache, 'get_client'):
            client = cache.get_client()

        if client is None:
            return False, 'Could not resolve underlying Redis client from cache backend'

        t0 = time.perf_counter()
        response = client.ping()
        elapsed_ms = (time.perf_counter() - t0) * 1000

        if response is True or response == b'PONG' or response == 'PONG':
            return True, f'PONG received in {elapsed_ms:.1f} ms'
        return False, f'Unexpected PING response type: {type(response).__name__}'

    except Exception as exc:
        return False, _safe_error(exc)


def _roundtrip_cache() -> tuple[bool, str]:
    """
    Perform a unique SET -> GET -> DELETE round-trip via Django's cache API.

    Uses a `loksewa_diag:` key prefix with a UUID suffix so it can never
    collide with real application keys. Always cleans up.
    """
    diag_key = f'loksewa_diag:{uuid.uuid4().hex}'
    expected_value = {'verify': True, 'phase': '2H'}

    try:
        # 1. SET (Django BaseCache.set returns None in standard spec)
        cache.set(diag_key, expected_value, timeout=30)

        # 2. GET (verify write equality)
        retrieved = cache.get(diag_key)
        if retrieved is None:
            return False, 'cache.get() returned None after cache.set() (write failed or key not stored)'
        if retrieved != expected_value:
            return False, (
                f'Value mismatch: expected {expected_value!r}, '
                f'got {retrieved!r}'
            )

        # 3. DELETE (verify cleanup)
        cache.delete(diag_key)
        post_delete = cache.get(diag_key)
        if post_delete is not None:
            return False, 'cache.delete() failed to remove diagnostic key'

        return True, 'SET -> GET -> DELETE succeeded'

    except Exception as exc:
        return False, _safe_error(exc)

    finally:
        # Always attempt cleanup; ignore errors here.
        try:
            cache.delete(diag_key)
        except Exception:
            pass


class Command(BaseCommand):
    help = (
        'Verify production Redis cache connectivity. '
        'Prints PASS/FAIL for backend class, PING, and round-trip. '
        'Never prints credentials, URLs, or tokens. '
        'Exits with code 1 if any check fails.'
    )

    def handle(self, *args, **options):
        self.stdout.write('=' * 66)
        self.stdout.write('  LOKSEWA AI — Redis Cache Connectivity Verification')
        self.stdout.write('=' * 66)

        overall_pass = True

        # ── 1. Backend class ──────────────────────────────────────────────
        backend_name = _get_backend_class_name()
        is_resilient = _is_resilient_redis_backend()
        is_locmem = 'LocMemCache' in backend_name or 'locmem' in backend_name.lower()

        self.stdout.write(f'\n[1] Configured backend : {backend_name}')

        if is_resilient:
            self.stdout.write('    Status            : REDIS (ResilientRedisCache active)')
        elif is_locmem:
            self.stdout.write('    Status            : LOCMEM FALLBACK (Redis NOT configured)')
            self.stdout.write(
                '    NOTE: Set REDIS_CACHE_URL to a valid rediss:// or redis:// URL '
                'in Railway environment variables to activate Redis caching.'
            )
            overall_pass = False
        else:
            self.stdout.write(f'    Status            : UNKNOWN backend type')
            overall_pass = False

        # ── 2. Redis PING (bypasses resilient wrapper) ────────────────────
        self.stdout.write('\n[2] Redis PING (direct client, bypasses resilient wrapper)')

        if not is_resilient:
            self.stdout.write('    SKIP — backend is not ResilientRedisCache; no Redis client to PING')
        else:
            ping_ok, ping_detail = _ping_redis_directly()
            status_label = 'PASS' if ping_ok else 'FAIL'
            self.stdout.write(f'    Result            : {status_label}')
            self.stdout.write(f'    Detail            : {ping_detail}')
            if not ping_ok:
                overall_pass = False

        # ── 3. Cache round-trip ───────────────────────────────────────────
        self.stdout.write('\n[3] Cache round-trip  SET -> GET -> DELETE')
        rt_ok, rt_detail = _roundtrip_cache()
        rt_label = 'PASS' if rt_ok else 'FAIL'
        self.stdout.write(f'    Result            : {rt_label}')
        self.stdout.write(f'    Detail            : {rt_detail}')
        if not rt_ok:
            overall_pass = False

        # ── Summary ───────────────────────────────────────────────────────
        self.stdout.write('\n' + '=' * 66)
        if overall_pass:
            self.stdout.write('OVERALL: PASS -- Redis cache is operational')
        else:
            self.stdout.write('OVERALL: FAIL -- one or more checks did not pass')
        self.stdout.write('=' * 66 + '\n')

        if not overall_pass:
            sys.exit(1)
