import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from django.apps import apps
from collections import defaultdict

models_dict = defaultdict(list)

for model in apps.get_models():
    if model._meta.app_label.startswith('django'):
        continue
    if model._meta.app_label in ['admin', 'auth', 'contenttypes', 'sessions']:
        continue
    models_dict[model.__name__].append(model._meta.app_label)

duplicate_models = {k: v for k, v in models_dict.items() if len(v) > 1}

print("Duplicate Model Names across apps:")
for k, v in duplicate_models.items():
    print(f"- {k} found in {v}")

print("\nAll Models:")
for app_config in apps.get_app_configs():
    if app_config.label in ['admin', 'auth', 'contenttypes', 'sessions']: continue
    if app_config.label.startswith('django'): continue
    print(f"\nApp: {app_config.label}")
    for model in app_config.get_models():
        print(f"  - {model.__name__}")
