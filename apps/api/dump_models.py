import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.apps import apps

with open('backend_models_dump.txt', 'w', encoding='utf-8') as f:
    for app in apps.get_app_configs():
        if app.name.startswith('django') or app.name.startswith('rest_framework') or app.name in ['admin', 'auth', 'contenttypes', 'sessions', 'messages', 'staticfiles', 'corsheaders', 'storages', 'axes']:
            continue
        
        f.write(f'\n--- App: {app.name} ---\n')
        for model in app.get_models():
            f.write(f'Model: {model.__name__}\n')
            for field in model._meta.get_fields():
                field_type = field.get_internal_type() if hasattr(field, 'get_internal_type') else type(field).__name__
                f.write(f'  - {field.name}: {field_type}\n')
