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

        self.stdout.write("\n" + "=" * 78)
        self.stdout.write("PROBE COMPLETED SUCCESSFULLY (Zero writes, zero credentials logged)")
        self.stdout.write("=" * 78)
