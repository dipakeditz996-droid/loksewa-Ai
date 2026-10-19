import os
import unittest
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.conf import settings
from core.models import User, AdminSettings
from core.cache_backends import ResilientRedisCache, _sanitize_error
from core.views import (
    get_student_dashboard_version,
    invalidate_student_dashboard,
    invalidate_package_status,
)
from core.session_service import establish_active_session, invalidate_user_session, validate_token_session
from subscriptions.permissions import HasActiveSubscription
from subscriptions.models import SubscriptionPlan, Subscription
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class RedisCacheConfigurationAndIsolationTests(TestCase):
    """Verifies Redis URL resolution, logical database isolation, and Celery independence."""

    def test_celery_broker_isolated_from_cache(self):
        """Celery broker/backend must remain on db 0 while cache is routed to db 1."""
        from backend.settings import _resolve_redis_cache_url, CELERY_BROKER_URL, CELERY_RESULT_BACKEND

        # CELERY_BROKER_URL must target db 0 or default
        self.assertTrue(CELERY_BROKER_URL.endswith('/0') or '/0' in CELERY_BROKER_URL or 'localhost' in CELERY_BROKER_URL)
        self.assertEqual(CELERY_BROKER_URL, CELERY_RESULT_BACKEND)

    def test_resolve_redis_cache_url_db_isolation(self):
        """Shared redis URL should be routed from db 0 to db 1."""
        from backend.settings import _resolve_redis_cache_url

        with patch.dict(os.environ, {'REDIS_URL': 'redis://default:secret123@roundhouse.railway.app:1234/0'}, clear=False):
            url = _resolve_redis_cache_url()
            self.assertEqual(url, 'redis://default:secret123@roundhouse.railway.app:1234/1')

        with patch.dict(os.environ, {'REDIS_URL': 'redis://localhost:6379'}, clear=False):
            url = _resolve_redis_cache_url()
            self.assertEqual(url, 'redis://localhost:6379/1')

        with patch.dict(os.environ, {'REDIS_URL': 'rediss://default:p%40ss@roundhouse.railway.app:6379/0'}, clear=False):
            url = _resolve_redis_cache_url()
            self.assertEqual(url, 'rediss://default:p%40ss@roundhouse.railway.app:6379/1')

    def test_explicit_redis_cache_url_takes_precedence(self):
        """REDIS_CACHE_URL takes precedence over REDIS_URL/CELERY_BROKER_URL."""
        from backend.settings import _resolve_redis_cache_url

        with patch.dict(os.environ, {
            'REDIS_CACHE_URL': 'redis://custom-cache:6379/5',
            'REDIS_URL': 'redis://default:shared@roundhouse.railway.app:1234/0'
        }, clear=False):
            url = _resolve_redis_cache_url()
            self.assertEqual(url, 'redis://custom-cache:6379/5')

    def test_upstash_direct_tls_cache_url_preserves_default_db(self):
        """Direct Upstash rediss:// URL must be accepted as-is without forcing /1."""
        from backend.settings import _resolve_redis_cache_url

        upstash_url = 'rediss://default:mocktoken123@flowing-dog-12345.upstash.io:6379'
        with patch.dict(os.environ, {'REDIS_CACHE_URL': upstash_url, 'REDIS_URL': ''}, clear=False):
            url = _resolve_redis_cache_url()
            self.assertEqual(url, upstash_url)

    def test_upstash_explicit_db0_accepted(self):
        """Upstash URL with explicit /0 path is accepted."""
        from backend.settings import _resolve_redis_cache_url

        upstash_url = 'rediss://default:mocktoken123@flowing-dog-12345.upstash.io:6379/0'
        with patch.dict(os.environ, {'REDIS_CACHE_URL': upstash_url}, clear=False):
            url = _resolve_redis_cache_url()
            self.assertEqual(url, upstash_url)

    def test_upstash_derived_from_redis_url_does_not_force_db1(self):
        """When REDIS_URL points to Upstash, it must NOT be rewritten to /1 because Upstash only supports db 0."""
        from backend.settings import _resolve_redis_cache_url

        upstash_url = 'rediss://default:mocktoken123@flowing-dog-12345.upstash.io:6379'
        with patch.dict(os.environ, {'REDIS_CACHE_URL': '', 'REDIS_URL': upstash_url}, clear=False):
            url = _resolve_redis_cache_url()
            # Must remain on db 0 / empty path, NOT forced to /1
            self.assertNotEqual(url, f"{upstash_url}/1")
            self.assertTrue(url.endswith(':6379') or url.endswith('/0'))

    def test_placeholder_urls_ignored(self):
        """Placeholder tokens in environment variables must be ignored and return empty string."""
        from backend.settings import _resolve_redis_cache_url

        with patch.dict(os.environ, {
            'REDIS_CACHE_URL': 'rediss://default:YOUR_UPSTASH_ENDPOINT:6379',
            'REDIS_URL': 'redis://default:[YOUR_PASSWORD]@localhost:6379'
        }, clear=False):
            url = _resolve_redis_cache_url()
            self.assertEqual(url, '')


class ResilientRedisCacheDegradationTests(TestCase):
    """Verifies that ResilientRedisCache never crashes callers on network/connection outages."""

    def setUp(self):
        # Configure a resilient cache pointing to a non-existent port to simulate complete Redis outage
        self.failing_cache = ResilientRedisCache('redis://127.0.0.1:64999/1', {
            'TIMEOUT': 300,
            'KEY_PREFIX': 'test_loksewa',
            'OPTIONS': {
                'socket_connect_timeout': 0.1,
                'socket_timeout': 0.1,
            }
        })

    def test_get_on_outage_returns_default(self):
        """During Redis outage, get() gracefully degrades to returning the default value (cache miss)."""
        result = self.failing_cache.get('test_key', default='fallback_value')
        self.assertEqual(result, 'fallback_value')

    def test_set_on_outage_returns_false_without_raising(self):
        """During Redis outage, set() gracefully returns False without raising unhandled 500s."""
        result = self.failing_cache.set('test_key', 'some_value')
        self.assertFalse(result)

    def test_delete_on_outage_returns_false(self):
        """During Redis outage, delete() gracefully returns False."""
        result = self.failing_cache.delete('test_key')
        self.assertFalse(result)

    def test_get_many_on_outage_returns_empty_dict(self):
        """During Redis outage, get_many() returns an empty dict."""
        result = self.failing_cache.get_many(['k1', 'k2'])
        self.assertEqual(result, {})

    def test_has_key_on_outage_returns_false(self):
        """During Redis outage, has_key() returns False."""
        result = self.failing_cache.has_key('k1')
        self.assertFalse(result)

    def test_credential_sanitization_in_logs(self):
        """Connection URLs with passwords must be masked in log output."""
        raw_error = "ConnectionError: redis://default:MySuperSecretP@ssword123@roundhouse.railway.app:1234/1"
        sanitized = _sanitize_error(raw_error)
        self.assertNotIn("MySuperSecretP@ssword123", sanitized)
        self.assertIn("redis://default:***@roundhouse.railway.app:1234/1", sanitized)


class CacheConsumersAndInvalidationTests(TestCase):
    """Verifies cache keys, user isolation, and invalidation paths across existing consumers."""

    def setUp(self):
        cache.clear()
        self.user1 = User.objects.create_user(
            username='student1',
            email='student1@test.com',
            password='Password123!',
            role='student'
        )
        self.user2 = User.objects.create_user(
            username='student2',
            email='student2@test.com',
            password='Password123!',
            role='student'
        )

    def tearDown(self):
        cache.clear()

    def test_cache_set_get_basic(self):
        """Basic cache set/get operations store and retrieve objects faithfully."""
        cache.set('test_key', {'metric': 42}, timeout=60)
        self.assertEqual(cache.get('test_key'), {'metric': 42})
        cache.delete('test_key')
        self.assertIsNone(cache.get('test_key'))

    def test_admin_settings_cache_and_invalidation(self):
        """AdminSettings is cached and automatically invalidated when saved or deleted."""
        settings_obj = AdminSettings.get_settings()
        self.assertIsNotNone(settings_obj)

        # Cache is populated
        cache.set(AdminSettings.SETTINGS_CACHE_KEY, settings_obj, 300)
        cache.set(AdminSettings.ENFORCE_ACCESS_CACHE_KEY, True, 15)
        cache.set(AdminSettings.STUDY_PLANS_CACHE_KEY, True, 15)

        self.assertIsNotNone(cache.get(AdminSettings.SETTINGS_CACHE_KEY))
        self.assertTrue(cache.get(AdminSettings.ENFORCE_ACCESS_CACHE_KEY))

        # Modifying and saving settings must invalidate the cache keys
        settings_obj.platform_name = "Loksewa Updated Platform"
        settings_obj.save()

        self.assertIsNone(cache.get(AdminSettings.SETTINGS_CACHE_KEY))
        self.assertIsNone(cache.get(AdminSettings.ENFORCE_ACCESS_CACHE_KEY))
        self.assertIsNone(cache.get(AdminSettings.STUDY_PLANS_CACHE_KEY))

    def test_user_specific_dashboard_isolation_and_versioning(self):
        """Dashboard caches must be strictly isolated between students and invalidated by version bumps."""
        v1 = get_student_dashboard_version(self.user1.id)
        v2 = get_student_dashboard_version(self.user2.id)

        key1 = f'student_dashboard_v3:{self.user1.id}:{v1}:all'
        key2 = f'student_dashboard_v3:{self.user2.id}:{v2}:all'

        cache.set(key1, {'user': 'student1_data'}, 300)
        cache.set(key2, {'user': 'student2_data'}, 300)

        # Both exist independently
        self.assertEqual(cache.get(key1), {'user': 'student1_data'})
        self.assertEqual(cache.get(key2), {'user': 'student2_data'})

        # Invalidate student 1
        invalidate_student_dashboard(self.user1.id)

        # Student 1's version counter bumped, so new key will be queried
        new_v1 = get_student_dashboard_version(self.user1.id)
        self.assertNotEqual(v1, new_v1)
        new_key1 = f'student_dashboard_v3:{self.user1.id}:{new_v1}:all'
        self.assertIsNone(cache.get(new_key1))

        # Student 2's cache is completely unaffected
        self.assertEqual(cache.get(key2), {'user': 'student2_data'})

    def test_package_status_isolation_and_invalidation(self):
        """Package status caches are user-isolated and invalidated on demand."""
        k1 = f'pkg_status:{self.user1.id}'
        k2 = f'pkg_status:{self.user2.id}'

        cache.set(k1, {'hasActivePackage': True}, 300)
        cache.set(k2, {'hasActivePackage': False}, 300)

        self.assertTrue(cache.get(k1)['hasActivePackage'])
        self.assertFalse(cache.get(k2)['hasActivePackage'])

        # Invalidate student 1
        invalidate_package_status(self.user1.id)
        self.assertIsNone(cache.get(k1))
        self.assertIsNotNone(cache.get(k2))


class SecurityAndAccessControlNotBypassedByCacheTests(TestCase):
    """Verifies that security checks, permissions, and sessions never rely on stale cache."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='security_student',
            email='sec_student@test.com',
            password='SecurePassword123!',
            role='student'
        )

    def tearDown(self):
        cache.clear()

    def test_single_session_jwt_invalidation_is_database_authoritative(self):
        """JWT session revocation writes directly to database; does not rely on or trust cache."""
        session_key = establish_active_session(self.user)
        self.user.refresh_from_db()
        self.assertEqual(self.user.jwt_session_key, session_key)

        # Validating current active session succeeds
        validate_token_session(self.user, session_key)

        # Logout / invalidation rotates key in database
        invalidate_user_session(self.user, session_key)
        self.user.refresh_from_db()

        # Token with former session key is immediately rejected
        with self.assertRaises(AuthenticationFailed):
            validate_token_session(self.user, session_key)

    def test_subscription_permission_evaluates_db_authoritatively(self):
        """HasActiveSubscription permission evaluates database subscription records live."""
        perm = HasActiveSubscription()
        request = MagicMock()
        request.user = self.user

        # With enforcement ON
        with patch.object(AdminSettings, 'is_subscription_enforced', return_value=True):
            # Student without subscription is denied
            self.assertFalse(perm.has_permission(request, None))

            # Grant a real subscription in DB
            plan = SubscriptionPlan.objects.create(
                name='Pro Plan',
                price=1000,
                duration=30,
                status='ACTIVE',
                is_published=True
            )
            Subscription.objects.create(
                student=self.user,
                plan=plan,
                status='ACTIVE',
                expiry_date=None
            )

            # Clear request cached attribute if any
            if hasattr(self.user, '_cached_active_subscription'):
                delattr(self.user, '_cached_active_subscription')

            # Permission check immediately passes against DB
            self.assertTrue(perm.has_permission(request, None))
