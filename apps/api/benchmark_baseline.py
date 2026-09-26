import django, os, sys, time, json
sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from django.db import connection, reset_queries
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import resolve

# Enable query logging
settings.DEBUG = True

User = get_user_model()
student = User.objects.filter(role='student').first()
admin = User.objects.filter(role='admin').first()
teacher = User.objects.filter(role='teacher').first()

factory = APIRequestFactory()

def benchmark_endpoint(name, path, user, method='GET', data=None):
    reset_queries()
    match = resolve(path)
    
    if method == 'GET':
        request = factory.get(path)
    else:
        request = factory.post(path, data=json.dumps(data) if data else None, content_type='application/json')
        
    force_authenticate(request, user=user)
    
    t0 = time.time()
    try:
        if hasattr(match.func, 'view_class'):
            response = match.func.view_class.as_view()(request, **match.kwargs)
        else:
            response = match.func(request, **match.kwargs)
        if hasattr(response, 'render'):
            response.render()
        status = response.status_code
        payload_size = len(response.content) if hasattr(response, 'content') else 0
    except Exception as exc:
        status = f"ERR: {exc}"
        payload_size = 0
    t1 = time.time()
    
    total_time_ms = round((t1 - t0) * 1000, 2)
    query_count = len(connection.queries)
    db_time_ms = round(sum(float(q.get('time', 0)) for q in connection.queries) * 1000, 2)
    python_time_ms = round(max(0, total_time_ms - db_time_ms), 2)
    
    # Check for duplicate queries (N+1)
    raw_queries = [q['sql'] for q in connection.queries]
    unique_queries = set(raw_queries)
    duplicate_count = query_count - len(unique_queries)
    
    print(f"=== {name} ({path}) ===")
    print(f"  Status: {status} | Payload: {payload_size} bytes ({round(payload_size/1024, 2)} KB)")
    print(f"  Total Duration: {total_time_ms} ms (DB: {db_time_ms} ms, Python: {python_time_ms} ms)")
    print(f"  DB Queries: {query_count} (Duplicates/N+1: {duplicate_count})")
    if duplicate_count > 0:
        # print some duplicate queries
        from collections import Counter
        counts = Counter(raw_queries)
        for sql, cnt in counts.most_common(3):
            if cnt > 1:
                print(f"    [Repeated {cnt}x]: {sql[:120]}...")
    print()
    return {
        'name': name,
        'path': path,
        'status': status,
        'payload_bytes': payload_size,
        'total_ms': total_time_ms,
        'db_ms': db_time_ms,
        'python_ms': python_time_ms,
        'query_count': query_count,
        'duplicate_queries': duplicate_count,
    }

if __name__ == '__main__':
    print("==================================================")
    print(" LOKSEWAAI PERFORMANCE ENGINEERING - BASELINE AUDIT")
    print("==================================================")
    print(f"Active DB Host: {connection.settings_dict.get('HOST')}")
    print(f"Active DB Port: {connection.settings_dict.get('PORT')}")
    print(f"CONN_MAX_AGE: {connection.settings_dict.get('CONN_MAX_AGE')}")
    print()
    
    results = []
    
    # 1. Auth / Me
    results.append(benchmark_endpoint("Auth Current User", "/api/auth/me/", student))
    
    # 2. Student Context
    results.append(benchmark_endpoint("Student Context", "/api/student/context/", student))
    
    # 3. Student Dashboard
    results.append(benchmark_endpoint("Student Dashboard", "/api/dashboard/", student))
    
    # 4. Student Notes / Syllabus Portal
    results.append(benchmark_endpoint("Notes & Syllabus Portal", "/api/notes/student/portal/", student))
    
    # 5. Examinations List (Mock exams / practice exams)
    results.append(benchmark_endpoint("Student Examinations List", "/api/exams/examinations/", student))
    
    # 6. Admin Dashboard Stats
    results.append(benchmark_endpoint("Admin Dashboard Stats", "/api/admin/dashboard/stats/", admin))
    
    # 7. Teacher Dashboard
    results.append(benchmark_endpoint("Teacher Dashboard", "/api/teacher/dashboard/", teacher))
    
    # 8. Teacher Students List
    results.append(benchmark_endpoint("Teacher Students List", "/api/teacher/students/", teacher))
    
    # 9. Games Weekly Quiz
    results.append(benchmark_endpoint("Games Weekly Quiz", "/api/games/weekly-quiz/current/", student))
    
    with open('baseline_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    print("Baseline saved to baseline_results.json")
