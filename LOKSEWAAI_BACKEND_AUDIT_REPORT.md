# LoksewaAI Backend Current State Report

## 1. Audit Scope and Method
A read-only architecture audit was conducted on the `loksewa-Ai` repository focusing on the Django backend located in `apps/api/`. 
The inspection method included:
* Static analysis of `settings.py` for configurations and dependencies.
* Extracting and inspecting all Django models, fields, and relationships via a custom Python introspection script running within the virtual environment.
* Direct code review of critical service files like `QuestionSelectionService` (`exams/selection_service.py`).
* Checking URL routes and API app structure.
* **Limitations**: No runtime tests were executed against a populated database, no migrations were altered, and environment secrets were not exposed. Some analytics performance risks (N+1) require runtime verification.

## 2. Repository Overview
The repository is structured as a monorepo containing `apps/web` (Next.js) and `apps/api` (Django). 
The Django project (`backend`) contains the following major apps:
* `administration`, `ai_tutor`, `analytics`, `core`, `courses`, `exams`, `games`, `gamification`, `marketplace`, `notes`, `study_plan`, `subscriptions`, `support`.

## 3. Executive Summary
The backend demonstrates a solid, modern architecture with several well-implemented core concepts (like the Master Question Bank and Question Selection Service). However, it currently suffers from architectural duplication in critical areas (Exams, Payments, Notifications). The project is using SQLite locally and requires environment configuration changes to be ready for Supabase/PostgreSQL.

## 4. Module Status Matrix

| Module | Status | Evidence | Main Issue / Notes |
| ------ | ------ | -------- | ------------------ |
| Authentication | COMPLETE | `rest_framework_simplejwt` in `settings.py` | JWT authentication is properly configured. |
| Master Question Bank | COMPLETE | `exams.Question` model | Has `STATUS_CHOICES` for approval workflow. |
| QuestionSelectionService | COMPLETE | `selection_service.py` | Properly enforces `status='approved'` and distributions. |
| Cloud Storage | COMPLETE | `storages` & `settings.py` | S3/Cloudflare R2 is configured and ready. |
| User Architecture | COMPLETE | `core.User`, `support.StudentProfile` | 1-to-1 profiles correctly implemented. No user duplicates. |
| Course Architecture | PARTIAL | `courses.Course`, `Enrollment` | Well-structured, but disconnected from Marketplace products. |
| Study Materials | PARTIAL | `notes.StudyMaterial` | Model and workflow exist, needs frontend verification. |
| Gamification | PARTIAL | `gamification.GamificationProfile` | XP and profiles exist. |
| Analytics | NEEDS VERIFICATION | `analytics` app exists | Requires runtime verification for N+1 query risks. |
| Mock Exams | DUPLICATE | `ModelExam` vs `Examination` | Two overlapping architectures exist in the `exams` app. |
| Payments/Subscriptions | DUPLICATE | `SubscriptionPayment` vs `PaymentSubmission` | Parallel payment tracking architectures exist. |
| Notifications | DUPLICATE | `core.Notification` vs `subscriptions.Notification` | Two separate Notification models exist. |
| Marketplace | BROKEN | `Product` (type='COURSE') | Disconnected from the `courses` app enrollment flow. |
| Supabase/DB Readiness | MISSING | `DATABASES` in `settings.py` | Hardcoded to `sqlite3`, ignoring environment variables. |

## 5. Detailed Module-by-Module Audit

* **Master Question Bank**: Implemented excellently. Only one `Question` model exists. It handles multiple question types and tracks review workflows.
* **QuestionSelectionService**: Highly robust. Validated that it strictly filters by `status='approved'` and intelligently handles topic/difficulty distribution.
* **Games**: Uses `GameQuestion` which accurately references the central `Question` model. Not a duplicate architecture.
* **Study Materials**: Centralized in the `notes` app. Incorporates a solid moderation workflow (draft, pending_review, published).
* **Database Readiness**: `backend/settings.py` strictly uses `django.db.backends.sqlite3` and does not parse `DATABASE_URL`. This is a blocker for production deployment.

## 6. Model and Relationship Inventory
* **Users**: `core.User` -> `support.StudentProfile` | `core.TeacherProfile` | `gamification.GamificationProfile`.
* **Courses**: `Course` -> `CourseApplication` -> `Enrollment`.
* **Exams**: `ExamCategory` -> `Exam` -> `Paper` -> `Subject` -> `Chapter` -> `Topic`.
* **Questions**: `Topic` -> `Question` <- `QuestionSetQuestion` <- `QuestionSet`.

## 7. API Inventory
Discovered endpoints include: `api/admin/`, `api/analytics/`, `api/auth/...`, `api/games/`, `api/gamification/`, `api/marketplace/`, `api/notes/`, `api/notifications/`, `api/study-plan/`, `api/subscriptions/`, `api/support/`, `api/tutor/`.

## 8. Security and Permission Audit
JWT authentication is the standard across the API. The Question selection architecture provides server-side enforcement preventing unapproved questions from leaking to students. Further runtime testing is required to verify object-level permission enforcement (e.g., teachers approving their own questions).

## 9. Duplicate Architecture Audit
* **CONFIRMED DUPLICATE**: Mock Exams. `exams.ModelExam` and `exams.Examination` overlap significantly. `Examination` appears to be the newer, more robust implementation.
* **CONFIRMED DUPLICATE**: Payments. `subscriptions.SubscriptionPayment` and `marketplace.PaymentSubmission` manage identical workflows. 
* **CONFIRMED DUPLICATE**: Notifications. Both `core.Notification` and `subscriptions.Notification` exist.
* **NO DUPLICATE FOUND**: Question Models (Games properly reference core Questions) and User Models.

## 10. Broken or Risky Areas
* **CRITICAL**: Hardcoded SQLite in settings prevents cloud deployment.
* **HIGH**: Duplicate Payment structures will cause order fulfillment bugs. The Marketplace `Product` model has a `COURSE` type that does not integrate with the `Course` enrollment model.
* **MEDIUM**: Duplicate Mock Exam tables will cause fragmentation in student analytics.

## 11. Needs Verification
* Real-world query performance (N+1 issues) in Analytics and Gamification dashboards.
* Authorization barriers preventing teachers from modifying or approving content they did not create.

## 12. Remaining Backend Work
### P0 — Critical dependency/blocker
* Refactor `settings.py` to support `dj-database-url` for Supabase PostgreSQL integration.
### P1 — Core backend dependency
* Resolve the Mock Exam duplicate (`ModelExam` vs `Examination`).
* Consolidate `PaymentSubmission` and `SubscriptionPayment` into a single unified payment flow.
### P2 — Important feature
* Remove the standalone `Notification` model in `subscriptions` and rely purely on `core.Notification`.
### P3 — Enhancement
* Verify and optimize analytics queries for the teacher dashboard.

# Recommended Next Backend Phase

**Phase: Architecture Consolidation and Database Readiness**

1. **What should be built next**: Fix the P0 and P1 issues by configuring PostgreSQL (Supabase) readiness and eliminating the duplicate payment and exam architectures.
2. **Why it is the highest priority**: Deploying to production or migrating data with conflicting payment architectures and SQLite will cause data corruption and migration nightmares.
3. **What existing architecture it depends on**: Relies heavily on the existing `Course` and `Examination` models to serve as the surviving source of truth.
4. **Which modules must not be duplicated**: Payments and Exams.
5. **What must be verified before implementation**: Ensure no frontend pages are critically relying on the deprecated `ModelExam` structure.
6. **What should be implemented in that phase**: `dj-database-url` integration, dropping the `ModelExam` and duplicate payment tables, and unifying the checkout API.
7. **What should explicitly NOT be changed**: The `Question` model, `QuestionSelectionService`, and `Course` -> `Enrollment` flow must remain exactly as they are.

# Suggested Future Phase Order
1. Architecture Consolidation and Database Readiness (Current Recommendation)
2. Object-Level Permissions and Teacher Role Hardening (Verify teachers cannot approve own questions)
3. Analytics Optimization (Load testing and fixing N+1 queries)
4. Comprehensive API Testing and Documentation
