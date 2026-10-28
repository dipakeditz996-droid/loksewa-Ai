"""Admin Cache Invalidation Service.

Centralized invalidation for administration-level cached aggregations,
reference trees, and overview statistics.

Ensures updates, deletions, approvals, and mutations immediately reflect
across admin dashboards without waiting for TTL expirations or leaving stale
state behind.
"""
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Canonical cache key definitions
CACHE_KEY_DASHBOARD_STATS = 'admin:dashboard:stats'
CACHE_KEY_EXAMS_OVERVIEW = 'admin:exams:overview'
CACHE_KEY_MARKETPLACE_OVERVIEW = 'admin:marketplace:overview'
CACHE_KEY_AI_TUTOR_OVERVIEW = 'admin:ai_tutor:overview'
CACHE_KEY_SYLLABUS_TREE = 'admin:syllabus:tree'
CACHE_KEY_SYLLABUS_STATS = 'admin:syllabus:stats'
CACHE_KEY_COLLECTIONS_LIST = 'admin:collections:list'
CACHE_KEY_PACKAGES_LIST = 'admin:packages:list'
CACHE_KEY_DATA_SAFETY_OVERVIEW = 'admin:data_safety:overview'


CACHE_KEY_EXAMS_VERSION = 'admin:exams:version'


class AdminCacheService:
    @staticmethod
    def get_exams_version():
        try:
            val = cache.get(CACHE_KEY_EXAMS_VERSION)
            if val is None:
                cache.set(CACHE_KEY_EXAMS_VERSION, 1, 86400 * 30)
                return 1
            return val
        except Exception:
            return 1

    @staticmethod
    def invalidate_dashboard_stats():
        """Invalidate the admin dashboard overview metrics."""
        try:
            cache.delete(CACHE_KEY_DASHBOARD_STATS)
        except Exception as e:
            logger.warning("Failed to invalidate %s: %s", CACHE_KEY_DASHBOARD_STATS, e)

    @staticmethod
    def invalidate_exams_overview():
        """Invalidate exams statistics and recent examinations overview."""
        try:
            try:
                cache.incr(CACHE_KEY_EXAMS_VERSION)
            except Exception:
                cur = cache.get(CACHE_KEY_EXAMS_VERSION) or 1
                cache.set(CACHE_KEY_EXAMS_VERSION, cur + 1, 86400 * 30)
            cache.delete_many([
                CACHE_KEY_EXAMS_OVERVIEW,
                CACHE_KEY_DASHBOARD_STATS,
            ])
        except Exception as e:
            logger.warning("Failed to invalidate exams overview cache: %s", e)

    @staticmethod
    def invalidate_marketplace_overview():
        """Invalidate marketplace counts, revenue metrics, and orders overview."""
        try:
            cache.delete_many([
                CACHE_KEY_MARKETPLACE_OVERVIEW,
                CACHE_KEY_DASHBOARD_STATS,
            ])
        except Exception as e:
            logger.warning("Failed to invalidate marketplace overview cache: %s", e)

    @staticmethod
    def invalidate_ai_tutor_overview():
        """Invalidate AI tutor conversation metrics and usage trends."""
        try:
            cache.delete_many([
                CACHE_KEY_AI_TUTOR_OVERVIEW,
                CACHE_KEY_DASHBOARD_STATS,
            ])
        except Exception as e:
            logger.warning("Failed to invalidate AI tutor overview cache: %s", e)

    @staticmethod
    def invalidate_syllabus_tree():
        """Invalidate cached academic syllabus hierarchy tree and stats."""
        try:
            cache.delete_many([
                CACHE_KEY_SYLLABUS_TREE,
                CACHE_KEY_SYLLABUS_STATS,
                CACHE_KEY_DASHBOARD_STATS,
            ])
        except Exception as e:
            logger.warning("Failed to invalidate syllabus tree cache: %s", e)

    @staticmethod
    def invalidate_collections():
        """Invalidate cached question collection lists."""
        try:
            cache.delete(CACHE_KEY_COLLECTIONS_LIST)
        except Exception as e:
            logger.warning("Failed to invalidate collections cache: %s", e)

    @staticmethod
    def invalidate_analytics():
        """Invalidate time-series analytics caches for all standard periods."""
        try:
            keys = [
                'admin:analytics:7d',
                'admin:analytics:30d',
                'admin:analytics:90d',
                'admin:analytics:1y',
                'admin:analytics:students:7d',
                'admin:analytics:students:30d',
                'admin:analytics:students:90d',
                'admin:analytics:students:1y',
            ]
            cache.delete_many(keys)
        except Exception as e:
            logger.warning("Failed to invalidate analytics cache: %s", e)

    @staticmethod
    def invalidate_packages():
        """Invalidate cached subscription packages lists."""
        try:
            cache.delete_many([
                CACHE_KEY_PACKAGES_LIST,
                CACHE_KEY_DASHBOARD_STATS,
            ])
        except Exception as e:
            logger.warning("Failed to invalidate packages cache: %s", e)

    @staticmethod
    def invalidate_data_safety():
        """Invalidate cached data safety and backup overview metrics."""
        try:
            cache.delete(CACHE_KEY_DATA_SAFETY_OVERVIEW)
        except Exception as e:
            logger.warning("Failed to invalidate data safety cache: %s", e)
