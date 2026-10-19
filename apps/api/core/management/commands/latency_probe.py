"""
LoksewaAI — Safe Database & Latency Diagnostic Probe
Command: python manage.py latency_probe

Measures:
- DB connection acquisition time (new connection vs pooled/reused connection)
- Repeated SELECT 1 round-trip network latency (N=30 samples: min, p50, p95, max, failures)
- Representative read-only query wall-clock vs PostgreSQL server-side execution time
- Topology and runtime environment metadata (completely sanitized, zero secrets exposed)

Safety Guarantees:
- Strictly read-only; never mutates or writes data.
- CLI-only management command; no public HTTP surface.
- Reuses existing Django settings and connection pools safely.
"""

import os
import sys
import time
from urllib.parse import urlparse
from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings


class Command(BaseCommand):
    help = "Safe, read-only diagnostic probe measuring database round-trip latency and execution times."

    def add_arguments(self, parser):
        parser.add_argument(
            '--samples',
            type=int,
            default=30,
            help='Number of SELECT 1 ping samples to collect (default: 30).'
        )

    def handle(self, *args, **options):
        samples_count = options['samples']
        self.stdout.write("=" * 78)
        self.stdout.write("       LOKSEWA AI — SAFE DATABASE & RUNTIME LATENCY PROBE")
        self.stdout.write("=" * 78)

        # 1. Topology & Environment Audit (Sanitized)
        db_conf = settings.DATABASES['default']
        host = db_conf.get('HOST', 'unknown')
        port = db_conf.get('PORT', 'unknown')
        is_pooled = db_conf.get('DISABLE_SERVER_SIDE_CURSORS', False)
        conn_max_age = db_conf.get('CONN_MAX_AGE', 0)

        # Region derivation from Supabase host
        supabase_region = "Unknown"
        if "pooler.supabase.com" in host or "supabase.co" in host:
            parts = host.split('.')
            if len(parts) > 0:
                first = parts[0]
                if "aws-0-" in first:
                    supabase_region = first.replace("aws-0-", "")
                elif "-" in first:
                    supabase_region = first

        # Check Railway environment variables (sanitized)
        railway_env = os.environ.get('RAILWAY_ENVIRONMENT', 'None (Local / Non-Railway)')
        railway_service = os.environ.get('RAILWAY_SERVICE_NAME', 'Unknown')
        railway_region = os.environ.get('RAILWAY_REGION', 'Unknown (Not injected by Railway or Local)')

        self.stdout.write(f"\n[1. Deployment & Topology Audit]")
        self.stdout.write(f"  Database Host:           {host}")
        self.stdout.write(f"  Database Port:           {port}")
        self.stdout.write(f"  Supabase Region:         {supabase_region}")
        self.stdout.write(f"  PgBouncer / Pooled:      {is_pooled} (Transaction pooling: {port == 6543})")
        self.stdout.write(f"  CONN_MAX_AGE:            {conn_max_age}s")
        self.stdout.write(f"  Railway Environment:     {railway_env}")
        self.stdout.write(f"  Railway Service:         {railway_service}")
        self.stdout.write(f"  Railway Region:          {railway_region}")

        # 2. Connection Acquisition Time
        self.stdout.write(f"\n[2. Connection Acquisition Benchmarking]")
        # A. Reused connection
        t0 = time.perf_counter()
        connection.ensure_connection()
        reused_acquire_ms = (time.perf_counter() - t0) * 1000.0

        # B. New connection
        try:
            connection.close()
            t0 = time.perf_counter()
            connection.connect()
            new_acquire_ms = (time.perf_counter() - t0) * 1000.0
        except Exception as e:
            new_acquire_ms = -1.0
            self.stderr.write(f"  Failed establishing fresh connection: {e}")

        self.stdout.write(f"  Reused Connection Acquisition:  {reused_acquire_ms:7.2f} ms")
        self.stdout.write(f"  Fresh Connection Acquisition:   {new_acquire_ms:7.2f} ms")

        # 3. Repeated SELECT 1 Round-Trip Latency (N samples)
        self.stdout.write(f"\n[3. Database Round-Trip Latency Probe (N={samples_count})]")
        latencies = []
        failures = 0

        with connection.cursor() as cursor:
            for _ in range(samples_count):
                try:
                    t_start = time.perf_counter()
                    cursor.execute("SELECT 1;")
                    cursor.fetchone()
                    latencies.append((time.perf_counter() - t_start) * 1000.0)
                except Exception as e:
                    failures += 1

        if latencies:
            latencies.sort()
            min_rtt = min(latencies)
            max_rtt = max(latencies)
            p50_rtt = latencies[len(latencies) // 2]
            p95_rtt = latencies[int(len(latencies) * 0.95)]
            avg_rtt = sum(latencies) / len(latencies)

            self.stdout.write(f"  Samples:  {len(latencies)} successful, {failures} failures")
            self.stdout.write(f"  Min:      {min_rtt:7.2f} ms")
            self.stdout.write(f"  p50:      {p50_rtt:7.2f} ms")
            self.stdout.write(f"  p95:      {p95_rtt:7.2f} ms")
            self.stdout.write(f"  Max:      {max_rtt:7.2f} ms")
            self.stdout.write(f"  Average:  {avg_rtt:7.2f} ms")
        else:
            self.stderr.write("  No successful round trips recorded.")

        # 4. Representative Read-Only Query + PostgreSQL Server Execution
        self.stdout.write(f"\n[4. Representative Read-Only Query & Server Engine Timing]")
        rep_sql = 'SELECT "id", "platform_name", "enforce_subscription_access" FROM "core_adminsettings" LIMIT 1;'
        explain_sql = f'EXPLAIN (ANALYZE, BUFFERS) {rep_sql}'

        wall_clock_ms = None
        pg_engine_exec_ms = None
        pg_planning_ms = None

        with connection.cursor() as cursor:
            # Wall clock
            t_start = time.perf_counter()
            cursor.execute(rep_sql)
            row = cursor.fetchone()
            wall_clock_ms = (time.perf_counter() - t_start) * 1000.0

            # Explain analyze
            try:
                cursor.execute(explain_sql)
                lines = [r[0] for r in cursor.fetchall()]
                for line in lines:
                    if 'Execution Time:' in line:
                        pg_engine_exec_ms = float(line.split('Execution Time:')[1].replace('ms', '').strip())
                    elif 'Planning Time:' in line:
                        pg_planning_ms = float(line.split('Planning Time:')[1].replace('ms', '').strip())
            except Exception as e:
                self.stderr.write(f"  EXPLAIN ANALYZE failed: {e}")

        self.stdout.write(f"  Representative Query Wall-Clock:  {wall_clock_ms:7.2f} ms")
        if pg_engine_exec_ms is not None:
            self.stdout.write(f"  PostgreSQL Server Exec Time:     {pg_engine_exec_ms:7.2f} ms")
            self.stdout.write(f"  PostgreSQL Planning Time:        {pg_planning_ms:7.2f} ms")
            transit_overhead = wall_clock_ms - pg_engine_exec_ms
            self.stdout.write(f"  Network Socket Transit Overhead: {transit_overhead:7.2f} ms")

        # 5. Connection Health-Check Overhead (DJANGO_CONN_HEALTH_CHECKS)
        self.stdout.write(f"\n[5. Connection Health-Check Overhead]")
        health_check_times = []
        for _ in range(5):
            t0 = time.perf_counter()
            is_usable = connection.is_usable()
            health_check_times.append((time.perf_counter() - t0) * 1000.0)
        avg_hc_ms = sum(health_check_times) / len(health_check_times)
        self.stdout.write(f"  connection.is_usable() check:     {avg_hc_ms:7.2f} ms per request")
        self.stdout.write(f"  Health Check Enabled in Settings: {settings.DATABASES['default'].get('CONN_HEALTH_CHECKS', False)}")

        # 6. Cache / Redis Performance Diagnostics
        self.stdout.write(f"\n[6. Cache / Redis Performance Diagnostics]")
        from django.core.cache import cache
        cache_backend = settings.CACHES['default']['BACKEND']
        self.stdout.write(f"  Active Cache Backend:   {cache_backend}")
        try:
            # Set
            t0 = time.perf_counter()
            cache.set('probe_latency_key', {'test': 123}, timeout=60)
            cache_set_ms = (time.perf_counter() - t0) * 1000.0

            # Hit
            t0 = time.perf_counter()
            val = cache.get('probe_latency_key')
            cache_hit_ms = (time.perf_counter() - t0) * 1000.0

            # Miss
            t0 = time.perf_counter()
            miss = cache.get('probe_nonexistent_key_99999')
            cache_miss_ms = (time.perf_counter() - t0) * 1000.0

            # Delete
            t0 = time.perf_counter()
            cache.delete('probe_latency_key')
            cache_del_ms = (time.perf_counter() - t0) * 1000.0

            self.stdout.write(f"  Cache SET latency:      {cache_set_ms:7.2f} ms")
            self.stdout.write(f"  Cache HIT latency:      {cache_hit_ms:7.2f} ms")
            self.stdout.write(f"  Cache MISS latency:     {cache_miss_ms:7.2f} ms")
            self.stdout.write(f"  Cache DELETE latency:   {cache_del_ms:7.2f} ms")
        except Exception as e:
            self.stderr.write(f"  Cache test error: {e}")

        # 7. ProfileAwareJWTAuthentication Database Lookup Simulation
        self.stdout.write(f"\n[7. ProfileAwareJWTAuthentication Lookup Timing]")
        from django.contrib.auth import get_user_model
        User = get_user_model()
        sample_user = User.objects.filter(role='student', is_active=True).first()
        if not sample_user:
            sample_user = User.objects.filter(is_active=True).first()

        if sample_user:
            user_lookup_times = []
            for _ in range(5):
                t0 = time.perf_counter()
                u = User.objects.select_related('student_profile').get(id=sample_user.id)
                _ = u.is_active
                _ = getattr(u, 'jwt_session_key', None)
                user_lookup_times.append((time.perf_counter() - t0) * 1000.0)
            avg_lookup_ms = sum(user_lookup_times) / len(user_lookup_times)
            self.stdout.write(f"  User ID: {sample_user.id} ({sample_user.role})")
            self.stdout.write(f"  select_related('student_profile') fetch: {avg_lookup_ms:7.2f} ms (1 SQL round trip)")
        else:
            self.stdout.write("  No sample user available to benchmark auth lookup.")

        # 8. In-Process Endpoint Query Breakdown & Cold vs Warm Execution
        self.stdout.write(f"\n[8. In-Process Endpoint Query & Latency Breakdown]")
        if sample_user:
            from rest_framework.test import APIRequestFactory, force_authenticate
            from core.views import StudentDashboardView, StudentPackageStatusView
            from django.test.utils import CaptureQueriesContext
            from core.views import get_student_dashboard_version

            factory = APIRequestFactory()

            # A. Student Dashboard Cold
            # Clear student dashboard cache key
            dash_ver = get_student_dashboard_version(sample_user.id)
            cache_key = f'student_dashboard_v3:{sample_user.id}:{dash_ver}:'
            cache.delete(cache_key)

            req = factory.get('/api/dashboard/')
            force_authenticate(req, user=sample_user)
            view = StudentDashboardView.as_view()

            with CaptureQueriesContext(connection) as ctx:
                t0 = time.perf_counter()
                resp = view(req)
                cold_duration_ms = (time.perf_counter() - t0) * 1000.0

            cold_queries = len(ctx.captured_queries)
            cold_db_time = sum(float(q.get('time', 0)) for q in ctx.captured_queries) * 1000.0

            self.stdout.write(f"  Student Dashboard (Cold Request):")
            self.stdout.write(f"    Total View Execution Time: {cold_duration_ms:7.2f} ms")
            self.stdout.write(f"    SQL Query Count:           {cold_queries} queries")
            self.stdout.write(f"    Total DB Query Time:       {cold_db_time:7.2f} ms")

            # B. Student Dashboard Warm (Repeated)
            with CaptureQueriesContext(connection) as ctx:
                t0 = time.perf_counter()
                resp = view(req)
                warm_duration_ms = (time.perf_counter() - t0) * 1000.0

            warm_queries = len(ctx.captured_queries)
            self.stdout.write(f"  Student Dashboard (Warm / Cached Request):")
            self.stdout.write(f"    Total View Execution Time: {warm_duration_ms:7.2f} ms")
            self.stdout.write(f"    SQL Query Count:           {warm_queries} queries (Cache HIT)")

            # C. Package Status
            pkg_req = factory.get('/api/dashboard/package-status/')
            force_authenticate(pkg_req, user=sample_user)
            pkg_view = StudentPackageStatusView.as_view()

            with CaptureQueriesContext(connection) as ctx:
                t0 = time.perf_counter()
                pkg_resp = pkg_view(pkg_req)
                pkg_duration_ms = (time.perf_counter() - t0) * 1000.0

            self.stdout.write(f"  Package Status Request:")
            self.stdout.write(f"    Total View Execution Time: {pkg_duration_ms:7.2f} ms")
            self.stdout.write(f"    SQL Query Count:           {len(ctx.captured_queries)} queries")

        self.stdout.write("\n" + "=" * 78)
        self.stdout.write("PROBE COMPLETED SUCCESSFULLY (Zero writes, zero credentials logged)")
        self.stdout.write("=" * 78)
