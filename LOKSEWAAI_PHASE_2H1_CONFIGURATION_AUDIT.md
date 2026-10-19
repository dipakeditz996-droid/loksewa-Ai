# LoksewaAI — Phase 2H.1: Production Backend Configuration Audit

**Audit Date:** 2026-10-19  
**Status:** Completed & Validated  
**Scope:** Django Backend Configuration, Railway Deployment Topology, Supabase PgBouncer, Redis Cache Architecture, Request Latency Decomposition  
**Tests Passed:** 25/25 (`core.tests.test_dashboard`, `core.tests.test_redis_cache`, `core.tests.test_single_active_session`)  

---

## 1. Production Redis Architecture & Verification

### 1.1 Cache Backend Selection & Fallback Logic
The cache configuration in [`apps/api/backend/settings.py`](file:///c:/Users/diwas/OneDrive/Desktop/loksewa%20website/apps/api/backend/settings.py) uses `_resolve_redis_cache_url()`:
1. **Explicit Cache Configuration:** Checks `REDIS_CACHE_URL` first.
2. **Derived Configuration with Isolation:** If `REDIS_CACHE_URL` is unset, it derives from `REDIS_URL` or `CELERY_BROKER_URL`, specifically rewriting the path to `/1` to isolate Django's shared cache from Celery's operational queue (`/0`).
3. **Placeholder & Sanitization Guards:** Ignores any placeholder tokens (`YOUR_UPSTASH_ENDPOINT`, `[YOUR_`, `default:[YOUR_PASSWORD]`).
4. **Backend Activation:**
   - If a valid Redis URL is resolved: Activates `core.cache_backends.ResilientRedisCache` with TLS (`rediss://`) support, a 3-second socket timeout, and 30-second health check intervals.
   - If no valid Redis URL is found (e.g., local developer machine without Docker or standard test runs): Safely falls back to `django.core.cache.backends.locmem.LocMemCache` (capped at 5,000 entries).

### 1.2 Multi-Worker Cache Sharing vs. In-Process LocMemCache
In production, Railway runs Gunicorn with 3 concurrent workers:
```bash
gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3 --timeout 120
```
- **If Redis is active (`ResilientRedisCache`):**  
  All 3 Gunicorn workers communicate with the centralized Redis instance. When Worker A populates a student dashboard payload, Worker B and Worker C immediately hit the cache (<1 ms, 0 SQL queries). Cache hits are 100% shared across the entire fleet.
- **If Redis is unconfigured or offline (`LocMemCache` fallback):**  
  `LocMemCache` stores data in the local memory of the specific Python process. Each Gunicorn worker maintains a private, isolated cache dictionary. A request handled by Worker A leaves Worker B and Worker C with a cold cache miss, causing unpredictable 2.5s+ latency spikes when load balancers alternate workers.
- **Verification Rule:**  
  *LocMemCache observed during local diagnostic runs does NOT reflect production behavior.* In production, if `REDIS_URL` or `REDIS_CACHE_URL` is injected in Railway service variables, Redis is active.

### 1.3 Failure Resilience & Security Non-Bypass
[`apps/api/core/cache_backends.py`](file:///c:/Users/diwas/OneDrive/Desktop/loksewa%20website/apps/api/core/cache_backends.py) implements `ResilientRedisCache`:
- All cache methods (`get`, `set`, `add`, `delete`, `get_many`, `set_many`) catch `redis.exceptions.RedisError`, `ConnectionError`, `TimeoutError`, and `OSError`.
- On read failure (`get`), it logs a credential-sanitized warning and returns `default` (cache miss) instead of crashing with HTTP 500.
- On write failure (`set`), it logs and no-ops safely.
- **Security & Authorization Invariant:** Cache failure causes graceful fallback to authoritative PostgreSQL evaluations. Permissions, JWT revocation checks, and single-active-session validation are never bypassed or relaxed during a cache outage.

---

## 2. Railway Deployment Region Audit

### 2.1 Configuration Evidence
- **Repository Manifests:** [`railway.json`](file:///c:/Users/diwas/OneDrive/Desktop/loksewa%20website/railway.json) and [`apps/api/railway.json`](file:///c:/Users/diwas/OneDrive/Desktop/loksewa%20website/apps/api/railway.json) define build (`NIXPACKS`) and deploy (`gunicorn`) parameters, but omit the optional `deploy.region` parameter.
- **Default Deployment Region:** Railway defaults newly created services to **US West (`us-west1` in Oregon)** or **US East (`us-east4` in Virginia)**.
- **Available Railway Regions:**
  1. `us-west1` (Oregon, USA)
  2. `us-east4` (Virginia, USA)
  3. `europe-west4` (Amsterdam, Netherlands)
  4. `asia-southeast1` (Singapore)

### 2.2 Proximity to Supabase PostgreSQL
- Supabase PostgreSQL is verified in **AWS Seoul (`ap-northeast-2`)**.
- **Neither Railway nor Render offers an AWS Seoul or Tokyo datacenter.**
- Singapore (`asia-southeast1`) is the closest geographical region provided by Railway. Network RTT from Singapore to Seoul is approximately **65–75 ms**, compared to **~180–220 ms** from North America.
- **Uncertainty Requiring Manual Check:**  
  Because the Railway CLI requires interactive browser login (`railway login`), the currently running region must be confirmed directly in the Railway Web Dashboard under **Project > Backend Service > Settings > Service > Region**.

---

## 3. Django Connection Health Checks Audit

### 3.1 Mapping & Mechanism
In `apps/api/backend/settings.py`:
```python
_conn_health_checks = _env_bool('DJANGO_CONN_HEALTH_CHECKS', True)
DATABASES = {
    'default': dj_database_url.parse(
        _active_db_url,
        conn_max_age=_conn_max_age,
        conn_health_checks=_conn_health_checks,
        ssl_require=_is_postgres,
    )
}
```
Django 4.1+ (currently running **Django 6.1**) executes `connection.is_usable()` whenever a persistent connection (`CONN_MAX_AGE > 0`) is retrieved from the connection pool.

### 3.2 What `is_usable()` Does & Its Latency Cost
- `connection.is_usable()` sends a synchronous `SELECT 1;` query over the database socket before allowing the application's first query to run.
- When the database is located overseas (Seoul RTT ~205 ms), this health check adds **~205 ms of sequential latency to every single incoming HTTP request**.
- If `is_usable()` fails (connection died), Django cleanly discards the dead socket and opens a fresh connection.

### 3.3 Compatibility with Supabase PgBouncer & `CONN_MAX_AGE`
- Supabase's transaction pooler (port 6543) terminates client connections if idle for extended periods.
- In `settings.py`, `CONN_MAX_AGE` is intentionally capped at **60 seconds** when pooled (`_is_pooled = True`), and `DISABLE_SERVER_SIDE_CURSORS = True`.
- Because Django automatically closes and discards connections older than 60 seconds at the end of each request, stale connection buildup is already bounded by time.
- **What happens if `CONN_HEALTH_CHECKS` is disabled?**
  - Django skips the upfront `SELECT 1;` query, saving ~205 ms on every request.
  - If a connection dropped silently during its 60-second lifespan, the first query might encounter an `OperationalError` / `connection closed`.
- **Controlled Testing Requirement:**  
  Do not toggle `DJANGO_CONN_HEALTH_CHECKS` in production without verifying whether Supabase PgBouncer terminates idle connections within the 60-second window during low-traffic periods.

---

## 4. Latency Measurement Quality & Breakdown

### 4.1 Decomposing the "0.34 ms vs. 2.3 s" Discrepancy
In Phase 2H, an in-process warm dashboard benchmark executed in **0.34 ms**, yet real-world authenticated requests take **~2.1–2.3 seconds**. This difference is explained by decomposing the full HTTP request path:

```
Full Authenticated HTTP Request Lifecycle (Remote Database)
┌─────────────────────────────────────────────────────────────┬──────────────┐
│ Phase                                                       │ Latency      │
├─────────────────────────────────────────────────────────────┼──────────────┤
│ 1. Browser/Client Network Flight to Railway Backend         │ ~80 - 150 ms │
│ 2. Reverse Proxy / Gunicorn Request Queue Dispatch          │ ~2 - 10 ms   │
│ 3. Django Security, CORS, Session Middleware                │ ~1 - 3 ms    │
│ 4. DB Connection Health Check (SELECT 1; to Seoul)          │ ~205 ms      │
│ 5. JWT Auth User Lookup (SELECT user + profile from Seoul)   │ ~247 ms      │
│ 6. Single Active Session Check (in-memory string match)     │ < 0.1 ms     │
│ 7. View Execution:                                          │              │
│    - Case A: Cache Hit (Redis)                              │ 0.34 ms      │
│    - Case B: Cold Miss / Worker LocMem (11 SQL Queries)     │ ~2,400 ms    │
│ 8. JSON Serialization & HTTP Response Transmission          │ ~5 - 15 ms   │
└─────────────────────────────────────────────────────────────┴──────────────┘
```

**Key Takeaways:**
1. **Pre-View Overhead:** Before the view executes, **~452 ms** is spent across 2 sequential round trips (`SELECT 1;` health check + `SELECT core_user` auth lookup).
2. **Cold Cache Impact:** If the cache misses (or if Gunicorn workers have separate `LocMemCache` spaces), 11 sequential queries execute at ~220 ms each = **~2,420 ms**.
3. **Warm Cache Best Case:** On an active Redis hit, total request time is ~550 ms (client network + 452 ms auth/health check + 0.34 ms view). If Railway is moved to Singapore (~70 ms RTT), this drops to ~220 ms.

### 4.2 Methodology Correction: Connection Acquisition
The Phase 2H benchmark reported:
- `Reused Connection Acquisition: 1,930 ms`
- `Fresh Connection Acquisition: 1,447 ms`

**Explanation:** In `latency_probe.py`, `connection.ensure_connection()` was called as the very first operation of the process when no socket existed. It was not measuring a *reused* connection; it was measuring the **initial TLS connection handshake** over a ~200 ms link (DNS + TCP 3-way handshake + TLS negotiation + PostgreSQL auth handshake + PgBouncer startup packet).  
Once established, a true in-memory reused connection acquisition in Django takes **< 0.01 ms**. The probe report has been noted to prevent misinterpretation.

---

## 5. Safest Optimization Sequence

| Candidate | Evidence & Rationale | Expected Benefit | Risks & Mitigations | Rollback Procedure |
|---|---|---|---|---|
| **A. Railway Region to Singapore (`asia-southeast1`)** | Database is in Seoul (`ap-northeast-2`). Current US region has ~220 ms RTT; Singapore has ~70 ms RTT. | **~60% latency reduction** across every single database query. Cold dashboard drops from ~3.5s to ~1.1s. Pre-view auth drops from ~450ms to ~140ms. | Minimal. Zero code changes. Zero data migration (DB stays on Supabase). Brief 30s restart of Gunicorn during redeploy. | Re-select US region in Railway dashboard. |
| **B. Verify Shared Redis Cache Configuration** | Gunicorn has 3 workers. If Redis is missing, workers use isolated in-process `LocMemCache`, causing cold misses across workers. | Guarantees all dashboard requests after the first are served in <1 ms with 0 SQL queries across all workers. | Zero. `ResilientRedisCache` already has fallback guards and credential sanitization. | Remove/revert `REDIS_CACHE_URL` environment variable. |
| **C. Tune Connection Health Checks (`DJANGO_CONN_HEALTH_CHECKS`)** | `is_usable()` costs ~205 ms on every request. `CONN_MAX_AGE=60` already limits connection age to 60 seconds. | Eliminates 1 full round trip (~70–205 ms) on every HTTP request. | If PgBouncer drops idle sockets within 60s, a request might encounter `OperationalError`. Requires controlled test under idle conditions. | Set `DJANGO_CONN_HEALTH_CHECKS=1` in Railway. |
| **D. Consolidate Cold Dashboard Queries** | 11 sequential queries run on cold requests, totaling ~2,400 ms of DB time. | Merging 3 analytics queries into conditional aggregations saves ~200–600 ms on cold loads. | Low to moderate. Requires thorough regression testing to ensure exact match of stats and progress scores. | Revert git commit via CI/CD. |

---

## 6. Exact Next Recommended Action

1. **Step 1 (Human Action in Railway Console — Zero Code):**
   - Open Railway Project Dashboard > Backend Service > **Settings > Service > Region**.
   - If currently in US, change the dropdown to **`asia-southeast1` (Singapore)**.
   - Verify that `REDIS_URL` or `REDIS_CACHE_URL` is configured in the Service **Variables** tab.
2. **Step 2 (Verification via Management Command):**
   - Once the service restarts in Singapore, run:
     ```bash
     python manage.py latency_probe --samples 30
     ```
   - Confirm that `SELECT 1;` p50 drops from **~221 ms** down to **~65–75 ms**.
3. **Step 3 (Controlled Connection Health-Check Test):**
   - In a non-peak window, test setting `DJANGO_CONN_HEALTH_CHECKS=0` and monitor Gunicorn error logs for 15 minutes to confirm zero stale-connection drops under `CONN_MAX_AGE=60`.
