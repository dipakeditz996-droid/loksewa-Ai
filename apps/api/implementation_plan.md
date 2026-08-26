# Phase 1: Database Readiness and Architecture Consolidation

This plan addresses database readiness for PostgreSQL and safely maps out the migration path for duplicate architectures found during the audit.

## User Review Required

> [!WARNING]
> Please review the consolidation plans carefully. Consolidating databases means some models will be marked for safe removal. No data will be dropped in this phase without migration.

## Open Questions

> [!IMPORTANT]
> 1. Are there any existing production users relying on the old `ModelExam` structure, or is it safe to fully migrate them to `Examination` and drop `ModelExam`?
> 2. Should purchasing a `COURSE` type product in the Marketplace automatically trigger a `CourseApplication` or an `Enrollment` immediately?

## Proposed Changes

### Database Readiness

- **Current**: Django `settings.py` hardcodes SQLite.
- **Change**: Integrate `dj-database-url` into `settings.py`.
- **Logic**:
  - If `DATABASE_URL` exists in `.env`, use PostgreSQL configuration (with connection pooling settings).
  - If not, safely fallback to the existing `db.sqlite3` for local development.
- **Dependency**: Add `dj-database-url` to the backend environment.

---

### Duplicate Architecture Consolidation

#### 1. Mock Exams (`ModelExam` vs `Examination`)
- **Decision**: **Consolidate** around `Examination`.
- **Reason**: `Examination` is the newer, more robust model that supports `ExaminationQuestion` (reusing the Master Question Bank) and `ExaminationEligibility` for fine-grained access control. `ModelExam` has older, simpler fields.
- **Action**: Mark `ModelExam` and related views as deprecated. Point frontend consumers to `Examination`. A safe data migration script will be created to move existing `ModelExam` attempts to `ExaminationAttempt` if needed.

#### 2. Payment Architectures (`SubscriptionPayment` vs `PaymentSubmission`)
- **Decision**: **Consolidate** around `subscriptions.SubscriptionPayment`.
- **Reason**: `SubscriptionPayment` is already natively integrated with `CourseApplication`. Having `marketplace.PaymentSubmission` run in parallel risks split-brain logic for order fulfillment.
- **Action**: Adapt `SubscriptionPayment` to handle one-off marketplace purchases, or safely rename it to a unified `Payment` model. Update `Purchase` to link to this unified model.

#### 3. Notifications (`core.Notification` vs `subscriptions.Notification`)
- **Decision**: **Consolidate** around `core.Notification`.
- **Reason**: `core.Notification` is highly detailed with priority and actionable URLs. `subscriptions.Notification` is a subset of this functionality.
- **Action**: Safely drop `subscriptions.Notification` and migrate existing code to trigger `core.Notification`.

#### 4. Course Marketplace Integration
- **Disconnect Found**: A `Product` with `type='COURSE'` currently results in a `Purchase`, but never creates a `CourseApplication` or `Enrollment` in the `courses` app.
- **Proposed Fix**: Add a `course` ForeignKey to `marketplace.Product` (similar to `SubscriptionPlan`). Create a Django signal or service method so that when a `PaymentSubmission`/`Purchase` is marked as `APPROVED` for a `COURSE` product, it automatically provisions an `Enrollment` for the student.

## Verification Plan

### Automated Tests
- `python manage.py check` to ensure model relationships are valid.
- Verify `settings.py` loads successfully without `DATABASE_URL`.

### Manual Verification
- Attempt to start the server.
- Verify the admin panel loads the unified payment and notification structures safely.
