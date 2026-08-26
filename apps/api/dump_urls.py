import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.urls import get_resolver
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSetMixin

def get_urls(resolver, prefix=''):
    urls = []
    for pattern in resolver.url_patterns:
        if hasattr(pattern, 'url_patterns'):
            # it's a URLResolver
            new_prefix = prefix + str(pattern.pattern)
            urls.extend(get_urls(pattern, new_prefix))
        else:
            # it's a URLPattern
            url = prefix + str(pattern.pattern)
            view = pattern.callback
            view_name = view.__name__ if hasattr(view, '__name__') else view.__class__.__name__
            if hasattr(view, 'view_class'):
                view_class = view.view_class
                view_name = view_class.__name__
                
                # Extract auth/permissions if possible
                auth = [a.__name__ for a in getattr(view_class, 'authentication_classes', [])]
                perms = [p.__name__ for p in getattr(view_class, 'permission_classes', [])]
                serializer = getattr(view_class, 'serializer_class', None)
                serializer_name = serializer.__name__ if serializer else 'None'
                
                urls.append({
                    'url': url,
                    'view': view_name,
                    'auth': auth,
                    'perms': perms,
                    'serializer': serializer_name
                })
            else:
                urls.append({
                    'url': url,
                    'view': view_name,
                    'auth': [],
                    'perms': [],
                    'serializer': 'None'
                })
    return urls

urls = get_urls(get_resolver())
with open('backend_urls_dump.txt', 'w', encoding='utf-8') as f:
    for u in urls:
        if 'admin' in u['url'] and 'api' not in u['url']: continue # skip django admin
        f.write(f"URL: {u['url']}\n")
        f.write(f"View: {u['view']}\n")
        f.write(f"Auth: {', '.join(u['auth'])}\n")
        f.write(f"Perms: {', '.join(u['perms'])}\n")
        f.write(f"Serializer: {u['serializer']}\n")
        f.write("-" * 40 + "\n")
