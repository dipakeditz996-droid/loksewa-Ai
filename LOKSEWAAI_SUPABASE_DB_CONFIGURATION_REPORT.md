# LoksewaAI — Supabase PostgreSQL Configuration Report

**Status: Configuration completed; local verification required.**

Nothing in this phase has been executed against Supabase. No migration was run,
no data was written or deleted, no migration file was created or removed.

---

## 1. Audit findings (pre-change)

| Item | State found |
|---|---|
| `apps/api/.env` | **Did not exist** |
| Root `.env` | **Did not exist** |
| `.env` loading in Django | **None.** No `python-dotenv` / `django-environ` installed; neither `settings.py` nor `manage.py` read a `.env` file |
| `DATABASE_URL` | Unset at runtime |
| Active database | **SQLite** — `apps/api/db.sqlite3` (1.4 MB, modified more recently than the earlier "Supabase migrated" reports) |
| `dj-database-url` | Installed (3.1.2) and already wired into `settings.py` |
| PostgreSQL driver | `psycopg2-binary` 2.9.12 **already installed** — no new driver added |
| Dependency file | **None existed** for the backend |
| `.gitignore` | Already correct: `.env`, `.env.*`, with `!.env.example` negation. **No change needed** |
| Next.js Supabase usage | **None.** `apps/web` has no `@supabase/*` dependency; its only env var is `NEXT_PUBLIC_API_URL`. Architecture rule satisfied |
| Cloudflare R2 | Intact — `django-storages` + `boto3`, activated by `S3_ENDPOINT` |

**Conclusion:** the previous `LOKSEWAAI_SUPABASE_CONNECTION_REPORT.md` and
`LOKSEWAAI_SUPABASE_MIGRATION_REPORT.md` are **not reproducible from the current
repository state**. They may reflect a one-off shell session with ad-hoc
environment variables. Treat their claims (95 tables, all migrations applied) as
**unverified** until `dbcheck` confirms them.

---

## 2. Changes made

### `apps/api/backend/settings.py` (modified)

1. **Dependency-free `.env` loader.** ~25 lines of stdlib. Loads
   `apps/api/.env`, then `<repo root>/.env`. Real process environment variables
   always win, so PaaS/Docker deployments need no file. No new package added.
2. **Database configuration** — still `dj-database-url`, no duplicate config:
   - `DATABASE_URL` → Supabase transaction pooler (6543), used by the API process.
   - `DIRECT_URL` → Supabase direct/session connection (5432), selected
     **automatically** for `migrate`, `makemigrations`, `test`, `dbshell`,
     `showmigrations`, etc. Override with `DJANGO_DB_USE_DIRECT=1`.
   - `ssl_require=True` for any `postgres*` URL → `sslmode=require`. No
     certificates or credentials hardcoded.
   - PgBouncer correctness: when the URL is pooled, `CONN_MAX_AGE=0` and
     `DISABLE_SERVER_SIDE_CURSORS=True`.
   - `?pgbouncer=true` is stripped from the URL before parsing — it is a Prisma
     flag and psycopg2 raises `invalid connection option "pgbouncer"` on it.
   - **SQLite fallback retained** for local dev when `DATABASE_URL` is empty,
     clearly commented as development-only.
3. **Config hardening:** `DJANGO_SECRET_KEY` empty/unset handled; startup now
   **fails loudly** if `DEBUG=False` with the insecure default key; robust
   boolean parsing (`true/1/yes/on`); `ALLOWED_HOSTS` accepts both
   `DJANGO_ALLOWED_HOSTS` (space-separated) and `ALLOWED_HOSTS` (comma).
4. **CORS:** `CORS_ALLOW_ALL_ORIGINS=True` was hardcoded. Now driven by
   `CORS_ALLOWED_ORIGINS` (comma-separated); when unset, behaviour is unchanged.
   Added `CSRF_TRUSTED_ORIGINS`.
5. **JWT:** `SIGNING_KEY` reads `JWT_SECRET`, falling back to `SECRET_KEY`.
   Still SimpleJWT — no second auth system, no Supabase Auth.
6. **Production security block** when `DEBUG=False`: secure cookies,
   `SECURE_PROXY_SSL_HEADER`, nosniff, optional SSL redirect.
7. **R2 unchanged** apart from an empty-string guard on `S3_ENDPOINT`.
   Media stays in R2 via Django's storage abstraction; never in PostgreSQL.

Not changed: models, migrations, ORM usage, `USE_TZ=True`, `TIME_ZONE='UTC'`.

### `apps/api/core/management/commands/dbcheck.py` (new)

Read-only inspection command. Never writes, alters, drops or truncates.
Reports: active backend (PostgreSQL vs SQLite), masked host/port/user, sslmode,
pooled/cursor/`conn_max_age` settings, live server version and timezone, table
count, whether `django_migrations` exists, row counts for canonical tables,
presence of 35 canonical tables, and the pending-migration plan.
Passwords and full connection strings are never printed.

### `apps/api/.env.example` (new)

Documents `DATABASE_URL`, `DIRECT_URL`, `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`,
`DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`,
`JWT_SECRET`, all six `S3_*` variables, and optional AI/Redis keys.
Placeholders only — no real values.

### `apps/api/requirements.txt` (new)

Pinned to what is already in `apps/api/venv`, including `dj-database-url==3.1.2`
and `psycopg2-binary==2.9.12`. No second PostgreSQL driver introduced.

### `.gitignore`

No change required — already ignores `.env` and `.env.*` while keeping
`.env.example`.

---

## 3. Verification runbook

```powershell
cd "C:\Users\diwas\OneDrive\Documents\Desktop\loksewa website\apps\api"
.\venv\Scripts\Activate.ps1
```

### Step 1 — create `.env`

```powershell
Copy-Item .env.example .env
notepad .env
```

Fill in from Supabase → Project Settings → Database → Connection string (URI):

```env
DATABASE_URL=postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:5432/postgres
```

URL-encode the password if it contains `@ : / ? # [ ] %`
(`@`→`%40`, `#`→`%23`, `/`→`%2F`, `%`→`%25`).

### Step 2 — confirm PostgreSQL, and whether the database is empty

```powershell
python manage.py dbcheck
```

Required in the output:

```
Backend        : PostgreSQL
Status         : CONNECTED
VERDICT: Django is connected to PostgreSQL.
```

If it says `SQLite`, `.env` was not picked up — stop and fix that first.

Then read the `EXISTING SCHEMA` section:

- **`Tables found : 0`** → database is empty → proceed to Step 3.
- **Tables exist, `django_migrations` present, no rows in canonical tables** →
  schema already created by a previous run → proceed; `migrate` will be a no-op
  or apply only what is genuinely pending.
- **Tables exist AND `Tables containing DATA` is listed** → **STOP.** Send me
  that output before running anything else.
- **Tables exist but `django_migrations` does NOT** → **STOP.** The schema was
  not created by Django.

### Step 3 — validate before migrating

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py showmigrations
```

`makemigrations --check --dry-run` must report no changes. Switching backends is
infrastructure, not a model change — if it *does* report changes, send me the
output rather than generating a migration.

### Step 4 — migrate

```powershell
python manage.py migrate
```

### Step 5 — confirm

```powershell
python manage.py dbcheck --tables
```

Expect `Unapplied (planned): 0`, `All canonical tables present.`, and the
PostgreSQL verdict.

### Step 6 — Django Admin smoke test

```powershell
python manage.py createsuperuser
python manage.py runserver
```

Then open `http://127.0.0.1:8000/admin/`.

---

## 4. Warnings

- **Do not run `python manage.py test` while `DATABASE_URL` points at Supabase.**
  Django creates and drops a `test_postgres` database on that server. Run tests
  with `DATABASE_URL` commented out (SQLite), or against a separate test project.
- Never put `DATABASE_URL`, `DIRECT_URL`, the database password, or the Supabase
  `service_role` key into any `NEXT_PUBLIC_*` variable or `apps/web`.
  `apps/web/.env.local` must contain only `NEXT_PUBLIC_API_URL`.
- Do not commit `apps/api/.env`. Confirm with `git status` before committing.

---

## 5. Not claimed

Supabase connectivity, migration success and table counts are **not verified**
by this phase. They are verified only when you run the commands above and
`dbcheck` reports PostgreSQL with zero pending migrations.

## 6. Next phase (after verification)

Frontend → Django API integration, in order, starting with
**Admin Academic Hierarchy**, then **Master Question Bank**. No frontend files
were touched in this phase.
