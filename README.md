# LoksewaAI — Platform Monorepo

LoksewaAI is a comprehensive exam preparation, syllabus exploration, and learning platform tailored for Nepalese Public Service Commission (Loksewa / PSC) and engineering licensure candidates.

---

## 🏛️ Monorepo Architecture

The repository is organized as a pnpm Turborepo monorepo:

```
├── apps/
│   ├── web/                     # Next.js 16 (App Router) frontend
│   └── api/                     # Django 6.1 + Django REST Framework backend
├── packages/
│   ├── ui/                      # Shared design system & React components
│   ├── types/                   # Shared TypeScript models and enums
│   ├── utils/                   # Shared utility functions
│   ├── eslint-config/           # Monorepo ESLint configurations
│   └── typescript-config/       # Base tsconfig presets
├── docs/
│   ├── reports/                 # Historical implementation, audit, and QA reports
│   └── roadmap/                 # Project roadmap and specification documentation
├── scripts/
│   └── maintenance/             # Maintenance and reference data seeding scripts
├── railway.json                 # Backend deployment configuration
├── vercel.json                  # Frontend Vercel deployment configuration
└── turbo.json                   # Turborepo task pipeline configuration
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `>= 18.0.0`
- **pnpm**: `^9.0.0`
- **Python**: `3.11+`
- **PostgreSQL**: Supabase or local instance

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dipakeditz996-droid/loksewa-Ai.git
   cd "loksewa website"
   ```

2. **Install Node.js dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment:**
   - Copy `apps/api/.env.example` to `apps/api/.env` and update secrets.
   - Configure frontend environment variables in `apps/web/.env.local`.

---

## 💻 Development

### Run Everything Concurrently

```bash
pnpm dev
```

### Run Frontend Only

```bash
pnpm --filter web dev
```
Accessible at [http://localhost:3000](http://localhost:3000).

### Run Backend Only

```bash
cd apps/api
# Activate virtual environment
.\venv\Scripts\Activate.ps1   # Windows PowerShell
# source venv/bin/activate    # Linux / macOS

python manage.py runserver 8000
```
API accessible at [http://localhost:8000/api/](http://localhost:8000/api/).

---

## 🧪 Verification & Build

### Type Checking & Linting

```bash
# Type check all workspaces
pnpm check-types

# Lint all workspaces
pnpm lint
```

### Production Build

```bash
# Build Next.js web application
pnpm --filter web build
```

### Django Backend Health Check

```bash
cd apps/api
python manage.py check
python manage.py makemigrations --check --dry-run
```

---

## 📂 Documentation & History

- Comprehensive system and backend audit reports are archived under [`docs/reports/`](docs/reports/).
- Project roadmap and specification documents are located in [`docs/roadmap/`](docs/roadmap/).
- Database maintenance utilities are preserved in [`scripts/maintenance/`](scripts/maintenance/).
