import os
import ast

def get_apps(base_dir):
    apps = []
    for entry in os.scandir(base_dir):
        if entry.is_dir() and os.path.exists(os.path.join(entry.path, 'models.py')):
            apps.append(entry.name)
    return apps

def extract_classes(filepath):
    classes = []
    if not os.path.exists(filepath):
        return classes
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                classes.append(node.name)
    except Exception as e:
        pass
    return classes

def check_file_exists(filepath):
    return os.path.exists(filepath)

apps_dir = 'apps/api'
apps = get_apps(apps_dir)
apps.sort()

matrix = []
matrix.append("| Module | Models | Serializer | API | Permissions | Frontend Consumer | Status |")
matrix.append("| ------ | ------ | ---------- | --- | ----------- | ----------------- | ------ |")

for app in apps:
    app_path = os.path.join(apps_dir, app)
    
    models = extract_classes(os.path.join(app_path, 'models.py'))
    serializers = extract_classes(os.path.join(app_path, 'serializers.py'))
    views = extract_classes(os.path.join(app_path, 'views.py'))
    
    has_urls = check_file_exists(os.path.join(app_path, 'urls.py'))
    has_permissions = check_file_exists(os.path.join(app_path, 'permissions.py'))
    
    model_count = len([m for m in models if not m.endswith('Meta')])
    serializer_count = len([s for s in serializers if not s.endswith('Meta')])
    view_count = len(views)
    
    api_status = 'Yes' if has_urls and view_count > 0 else 'Partial' if view_count > 0 else 'No'
    perm_status = 'Yes' if has_permissions else 'No'
    
    models_str = str(model_count)
    serializers_str = str(serializer_count)
    
    # Very basic status assumption
    status = 'Needs Review'
    
    matrix.append(f"| {app} | {models_str} | {serializers_str} | {api_status} | {perm_status} | TBD | {status} |")

print('\n'.join(matrix))
