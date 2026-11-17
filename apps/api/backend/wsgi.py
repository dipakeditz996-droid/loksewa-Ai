"""
WSGI config for backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Allow PostgreSQL 13 on cPanel / shared hosts (Django 6 defaults to PG 14+)
try:
    from django.db.backends.base.base import BaseDatabaseWrapper
    BaseDatabaseWrapper.check_database_version_supported = lambda self: None
    from django.db.backends.postgresql.base import DatabaseWrapper
    DatabaseWrapper.check_database_version_supported = lambda self: None
    from django.db.backends.postgresql.features import DatabaseFeatures
    DatabaseFeatures.minimum_database_version = (10,)
except Exception:
    pass

application = get_wsgi_application()
