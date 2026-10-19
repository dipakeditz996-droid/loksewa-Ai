import logging
import re
from typing import Any, Dict, List, Optional
from django.core.cache.backends.base import DEFAULT_TIMEOUT
from django.core.cache.backends.redis import RedisCache
import redis

logger = logging.getLogger(__name__)

# Mask passwords/credentials in error messages: e.g. redis://user:password@host
_RE_CREDENTIALS = re.compile(r'(://[^:/\s]*:).+@([a-zA-Z0-9.-]+(?::\d+)?(?:/[^\s]*)?)')


def _sanitize_error(error: Any) -> str:
    """Sanitize passwords or auth secrets from error strings before logging."""
    return _RE_CREDENTIALS.sub(r'\1***@\2', str(error))


class ResilientRedisCache(RedisCache):
    """
    A production-grade, failure-resilient Redis cache backend.

    Subclasses Django's official RedisCache backend and wraps all operations
    with graceful degradation when Redis is temporarily unreachable, restarted,
    or facing connection timeouts.

    Key behaviors:
    - On Redis failure, read operations return default/miss instead of raising 500s.
    - Write/delete operations log a warning and no-op safely.
    - Credential sanitization ensures connection URLs/passwords never leak in logs.
    - Authoritative database operations, security checks, and permission checks
      remain strictly enforced (cache outage causes cache-miss -> DB evaluation).
    """

    def add(self, key: str, value: Any, timeout: Any = DEFAULT_TIMEOUT, version: Optional[int] = None) -> bool:
        try:
            return super().add(key, value, timeout=timeout, version=version)
        except (redis.exceptions.RedisError, ConnectionError, TimeoutError, OSError) as e:
            logger.warning("Redis cache 'add' failed for key '%s': %s", key, _sanitize_error(e))
            return False

    def get(self, key: str, default: Any = None, version: Optional[int] = None) -> Any:
        try:
            return super().get(key, default=default, version=version)
        except (redis.exceptions.RedisError, ConnectionError, TimeoutError, OSError) as e:
            logger.warning("Redis cache 'get' failed for key '%s': %s", key, _sanitize_error(e))
            return default

    def set(self, key: str, value: Any, timeout: Any = DEFAULT_TIMEOUT, version: Optional[int] = None) -> bool:
        try:
            return super().set(key, value, timeout=timeout, version=version)
        except (redis.exceptions.RedisError, ConnectionError, TimeoutError, OSError) as e:
            logger.warning("Redis cache 'set' failed for key '%s': %s", key, _sanitize_error(e))
            return False

    def touch(self, key: str, timeout: Any = DEFAULT_TIMEOUT, version: Optional[int] = None) -> bool:
        try:
            return super().touch(key, timeout=timeout, version=version)
        except (redis.exceptions.RedisError, ConnectionError, TimeoutError, OSError) as e:
            logger.warning("Redis cache 'touch' failed for key '%s': %s", key, _sanitize_error(e))
            return False

    def delete(self, key: str, version: Optional[int] = None) -> bool:
        try:
            return super().delete(key, version=version)
        except (redis.exceptions.RedisError, ConnectionError, TimeoutError, OSError) as e:
            logger.warning("Redis cache 'delete' failed for key '%s': %s", key, _sanitize_error(e))
            return False

    def get_many(self, keys: List[str], version: Optional[int] = None) -> Dict[str, Any]:
        try:
            return super().get_many(keys, version=version)
        except (redis.exceptions.RedisError, ConnectionError, TimeoutError, OSError) as e:
            logger.warning("Redis cache 'get_many' failed: %s", _sanitize_error(e))
            return {}

    def has_key(self, key: str, version: Optional[int] = None) -> bool:
        try:
            return super().has_key(key, version=version)
        except (redis.exceptions.RedisError, ConnectionError, TimeoutError, OSError) as e:
            logger.warning("Redis cache 'has_key' failed for key '%s': %s", key, _sanitize_error(e))
            return False

    def incr(self, key: str, delta: int = 1, version: Optional[int] = None) -> int:
        try:
            return super().incr(key, delta=delta, version=version)
        except (redis.exceptions.RedisError, ConnectionError, TimeoutError, OSError) as e:
            logger.warning("Redis cache 'incr' failed for key '%s': %s", key, _sanitize_error(e))
            raise

    def set_many(self, data: Dict[str, Any], timeout: Any = DEFAULT_TIMEOUT, version: Optional[int] = None) -> List[Any]:
        try:
            return super().set_many(data, timeout=timeout, version=version)
        except (redis.exceptions.RedisError, ConnectionError, TimeoutError, OSError) as e:
            logger.warning("Redis cache 'set_many' failed: %s", _sanitize_error(e))
            return list(data.keys())

    def delete_many(self, keys: List[str], version: Optional[int] = None) -> None:
        try:
            return super().delete_many(keys, version=version)
        except (redis.exceptions.RedisError, ConnectionError, TimeoutError, OSError) as e:
            logger.warning("Redis cache 'delete_many' failed: %s", _sanitize_error(e))
            return None

    def clear(self) -> bool:
        try:
            return super().clear()
        except (redis.exceptions.RedisError, ConnectionError, TimeoutError, OSError) as e:
            logger.warning("Redis cache 'clear' failed: %s", _sanitize_error(e))
            return False
