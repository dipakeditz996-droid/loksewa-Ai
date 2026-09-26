import django, os, sys, time, json
sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from django.db import connection, reset_queries
from django.contrib.auth import get_user_model
from django.urls import resolve

User = get_user_model()
student = User.objects.filter(role='student').first()
admin = User.objects.filter(role='admin').first()

factory = APIRequestFactory()

def test_cache_hit(name, path, user):
    match = resolve(path)
    view = match.func.view_class.as_view() if hasattr(match.func, 'view_class') else match.func
    
    # 1st request (populates cache)
    req1 = factory.get(path)
    force_authenticate(req1, user=user)
    view(req1, **match.kwargs)
    
    # 2nd request (measures cache hit)
    reset_queries()
    t0 = time.time()
    req2 = factory.get(path)
    force_authenticate(req2, user=user)
    resp = view(req2, **match.kwargs)
    if hasattr(resp, 'render'):
        resp.render()
    t1 = time.time()
    
    duration_ms = round((t1 - t0) * 1000, 2)
    query_count = len(connection.queries)
    print(f"WARM CACHE HIT -> {name} ({path}): {duration_ms} ms | {query_count} DB queries | Status: {resp.status_code}")

if __name__ == '__main__':
    print("Testing warm cache hits (return visits):")
    test_cache_hit("Student Context", "/api/student/context/", student)
    test_cache_hit("Student Dashboard", "/api/dashboard/", student)
    test_cache_hit("Admin Dashboard Stats", "/api/admin/dashboard/stats/", admin)
