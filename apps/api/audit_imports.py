import os
import sys
import importlib
import django
from django.conf import settings

# Setup django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

import_errors = []
total_files = 0

for root, dirs, files in os.walk(api_dir):
    if any(ignore in root for ignore in ["venv", "__pycache__", ".git", "node_modules", "migrations"]):
        continue
    for file in files:
        if file.endswith(".py") and file != "audit_imports.py" and file != "manage.py":
            total_files += 1
            rel_path = os.path.relpath(os.path.join(root, file), api_dir)
            module_name = rel_path.replace(os.sep, ".")[:-3]
            if module_name.endswith(".__init__"):
                module_name = module_name[:-9]
            
            if not module_name:
                continue

            try:
                importlib.import_module(module_name)
            except Exception as e:
                import_errors.append((rel_path, str(type(e).__name__), str(e)))

print(f"Total files scanned: {total_files}")
for err in import_errors:
    print(f"ERROR in {err[0]}: {err[1]} - {err[2]}")
if not import_errors:
    print("0 unresolved Python imports detected.")
