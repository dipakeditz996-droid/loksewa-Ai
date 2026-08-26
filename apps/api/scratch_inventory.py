import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.apps import apps
from django.db.models import Count

def dump_inventory():
    output = []
    for app_config in apps.get_app_configs():
        if app_config.name.startswith('django.') or app_config.name in ['corsheaders', 'rest_framework', 'rest_framework_simplejwt', 'corsheaders', 'token_blacklist']:
            continue
        output.append(f"\n--- App: {app_config.name} ---")
        for model in app_config.get_models():
            try:
                count = model.objects.count()
                output.append(f"{model.__name__}: {count}")
            except Exception as e:
                output.append(f"{model.__name__}: ERROR ({e})")
                
    with open('inventory.txt', 'w') as f:
        f.write("\n".join(output))
    print("Inventory dumped to inventory.txt")

if __name__ == '__main__':
    dump_inventory()
