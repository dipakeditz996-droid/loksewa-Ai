from .celery import app as celery_app

# Allow PostgreSQL 13 on cPanel / shared hosts (Django 6 defaults to PG 14+)
try:
    from django.db.backends.postgresql.base import DatabaseWrapper
    DatabaseWrapper.check_database_version_supported = lambda self: None
except Exception:
    pass

__all__ = ('celery_app',)
