# 1. Backend Architecture Overview
The LoksewaAI backend is built on Django and Django REST Framework, integrating with a PostgreSQL database. The project follows a modular structure where features are separated into highly specific Django apps. Authentication utilizes JWT.

The architecture connects a central reference hierarchy (ExamCategory → Exam → Paper → Subject → Chapter → Topic) with Question Banks. Various features such as Practice Sessions, Mock Exams (Subjective and Objective), Gamification, Subscriptions, and Marketplace rely on this core hierarchy and the central user model.

# 2. Django Apps
Located in `apps/api/`, the active Django apps are:
- `core`: Central User model, profiles, global notifications
- `exams`: Core academic hierarchy, questions, practice sets, model exams, examinations
- `courses`: Course management, enrollment, course applications, teacher-student relationships
- `marketplace`: Products, payment methods, payment submissions, purchases
- `subscriptions`: Subscription plans, subscriptions, subscription payments, invoices
- `gamification`: Game profiles, referrals, XP transactions, motivations
- `games`: 1v1 Matches, Survival Games
- `notes`: Study materials and student progress/bookmarks
- `study_plan`: Study plan templates, daily tasks, study plans
- `analytics`: (Currently an empty or placeholder app, actual analytics are calculated in viewsets)
- `administration`: Audit logs, CSV imports
- `ai_tutor`: AI Conversations, Messages, Tutor usage
- `support`: Student profiles (extended), support tickets, FAQs, notification preferences

# 3. Database Models
- **USER / AUTH**: `User`, `TeacherProfile`, `StudentProfile` (in support), `Notification`
- **ACADEMIC**: `ExamCategory`, `Exam`, `Paper`, `Subject`, `Chapter`, `Topic`, `Course`
- **QUESTION SYSTEM**: `Question`, `QuestionCollection`, `CollectionRule`, `AIClassificationSuggestion`
- **PRACTICE**: `QuestionSet`, `QuestionSetQuestion`, `PracticeSession`, `QuestionAttempt`, `Bookmark`
- **MOCK EXAM**: `ModelExam`, `ModelExamAttempt`, `ModelExamAttemptAnswer`, `SubjectivePracticeSet`, `SubjectiveModelExam`, `SubjectiveAttempt`, `SubjectiveAnswer`, `Evaluation`, `Examination`, `ExaminationQuestion`, `ExaminationEligibility`, `ExaminationAttempt`, `StudentAnswer`
- **GAMES**: `GameProfile`, `GameMatch`, `GameQuestion`, `GameAnswer`, `SurvivalGame`, `SurvivalAnswer`
- **STUDY MATERIAL**: `StudyMaterial`, `StudentMaterialProgress`, `StudentMaterialBookmark`
- **ENROLLMENT**: `Enrollment`, `CourseApplication`
- **PROGRESS**: `UserTopicProgress`
- **STUDY PLAN**: `StudyPlanTemplate`, `StudyPlan`, `StudyTask`, `StudyPlanTemplateTask`
- **ANALYTICS**: Teacher analytics are aggregated via Django ORM (Count, Avg, Max) on `ExaminationAttempt` and `PracticeSession` rather than using standalone analytics tables.
- **MOTIVATION**: `Motivation`
- **TEACHER STUDENTS**: `TeacherCourseAssignment`, `TeacherStudentNote`, `TeacherMessage`
- **NOTIFICATIONS**: `Notification` (core), `Notification` (subscriptions), `NotificationPreference` (support)
- **SUPPORT**: `SupportTicket`, `SupportMessage`, `SupportAttachment`, `FAQ`, `FAQFeedback`
- **PAYMENTS / MARKETPLACE**: `Product`, `PaymentMethod`, `PaymentSubmission`, `Purchase`, `SubscriptionPlan`, `Subscription`, `SubscriptionPayment`, `Invoice`

# 4. Active Architecture
- **Academic Hierarchy**: `ExamCategory` → `Exam` → `Paper` → `Subject` → `Chapter` → `Topic`.
- **Enrollment / Purchasing**: `Product` (Marketplace) → `PaymentSubmission` → `Purchase` -> triggers `Enrollment` for `Course`.
- **Questions**: Central `Question` model acts as the master bank. Associated with tags, difficulty, and review fields (`status`, `reviewer_comment`, `reviewed_by`).

# 5. Legacy / Duplicate Architecture
- **Mock Exams**: There is a duplicate architecture. `ModelExam` (and related `ModelExamAttempt`) exists alongside `Examination` (and `ExaminationAttempt`). Both have robust model definitions, but `Examination` is richer with `eligibility_rules`, `instructions`, `result_visibility`, etc.
- **Notifications**: Duplicate `Notification` models exist in `core.models` and `subscriptions.models`.
- **Students**: `StudentProfile` exists in `support.models` while other profiles are in `core`.

# 6. API Inventory
*(Sample of key endpoints discovered via dump)*
- **Auth**: `POST /api/auth/signup/` (StudentSignupView, AllowAny), `POST /api/auth/admin-login/` (AllowAny)
- **Academic**: `GET /api/exams/`, `/api/subjects/`, `/api/topics/` (Public/Auth)
- **Questions**: `/api/questions/`, `/api/teacher/questions/` (TeacherQuestionViewSet), `/api/admin/questions/review-queue/` (AdminQuestionReviewViewSet)
- **Practice Sets**: `/api/teacher/practice-sets/`
- **Mock Exams**: `/api/teacher/mock-exams/`, `/api/model-exams/`
- **Teacher Students**: `/api/teacher/students/`, `/api/teacher/students/<id>/analytics/`
- **Study Materials**: `/api/teacher/study-materials/`, `/api/admin/study-materials/review-queue/`

# 7. Authentication & Authorization
- **JWT Authentication** is used across the board.
- **Teacher Enrollment**: Teachers do not self-register. `StudentSignupView` handles students, while teachers are created by admins.
- **Authorization Enforcement**: 
  - `TeacherStudentViewSet` uses `IsTeacher` permission and actively filters `User` queryset to only return students who have active `Enrollment` records in courses assigned to the requesting teacher (`TeacherCourseAssignment`).
  - Student endpoints typically restrict object access to `user=request.user` (e.g., `PracticeSessionViewSet`).

# 8. Master Question Bank
- **COMPLETE**. 
- The `Question` model has `status` (e.g., draft, pending_review, approved), `reviewer_comment`, and `reviewed_by`. 
- Teachers submit via `/api/teacher/questions/<id>/submit/`.
- Admins review/approve via `/api/admin/questions/review-queue/<id>/approve/`. (Self-approval was patched in a recent phase).
- Central source architecture exists: `Question` serves as the foreign key target for `QuestionSetQuestion`, `GameQuestion`, `ExaminationQuestion`, etc.

# 9. Practice Sets
- **FULLY FUNCTIONAL**. 
- Manual and auto-generated options exist. Teachers can manage them via `TeacherQuestionSetViewSet`.
- `PracticeSession` tracks the student's attempt, storing `correct_count`, `score`, and `time_taken_seconds`.

# 10. Mock Exams
- **PARTIALLY FUNCTIONAL** (Due to dual architecture).
- Both `ModelExam` and `Examination` exist. `Examination` supports detailed exam criteria (randomize, instructions, time limit). 
- **Exam Stability**: Because `ModelExam` and `Examination` link directly to `Question` via `ManyToManyField` or through models (`ExaminationQuestion`), if a `Question` is edited, it affects past and future exams. There is no `QuestionSnapshot` model.

# 11. Games
- **PARTIALLY FUNCTIONAL**.
- `GameMatch` (1v1) and `SurvivalGame` exist. They link to `Question`.
- Custom game configurations (Subject, Topic, Difficulty) are not explicitly supported by dedicated fields on the game models themselves, though they might be filtered at runtime when generating `GameQuestion`s.

# 12. Enrollment
- **COMPLETE**.
- `CourseApplication` handles requests. 
- A purchased `Product` tied to a `Course` generates a `Purchase`, which correctly provisions an `Enrollment` linking `Student` -> `Course`.

# 13. Student Progress
- **PARTIAL**.
- `UserTopicProgress` exists and stores `accuracy`, `progress`, and `status`. 
- Real learning activity is tracked (attempts update `UserTopicProgress`), but some teacher views mock course progress directly (e.g., hardcoded `45%` progress in `TeacherStudentViewSet.courses`).

# 14. Study Plan
- **PARTIALLY FUNCTIONAL**.
- Models exist: `StudyPlan`, `StudyPlanTemplate`, `StudyTask`. 
- It captures daily minutes, remaining days, and tasks, but robust background generation and streak maintenance may be reliant on frontend invocation rather than deep background task orchestration.

# 15. Motivation
- **PARTIAL**.
- Model `Motivation` exists.
- An endpoint `/api/gamification/daily-motivation/` serves daily motivation. The requirement that the same student on the same day shouldn't receive a different random message every refresh depends on how the view tracks delivery, which likely isn't cached persistently per user per day in the database.

# 16. Study Materials
- **COMPLETE**.
- `StudyMaterial` supports drafts, submit, and admin review (`AdminStudyMaterialViewSet`). 
- Status transitions handle visibility. Includes files and external URLs.

# 17. Teacher Students
- **COMPLETE**.
- Teacher A cannot see Teacher B's students. `TeacherStudentViewSet.get_queryset()` strictly filters students based on `TeacherCourseAssignment` intersecting with `Enrollment`.

# 18. Teacher Analytics
- **PARTIAL (Mixed)**.
- Calculations in `TeacherStudentViewSet` are **DATABASE AGGREGATION** (using Django `Avg`, `Count`, `Max` on `ExaminationAttempt` and `PracticeSession`).
- However, course progress is **MOCKED** (hardcoded to 100% or 45% in `courses` action).

# 19. Notifications
- **PARTIAL**.
- Real backend models exist (`Notification`). Events generate real objects for students.
- Duplicate models exist in `core` and `subscriptions`.

# 20. Teacher Settings
- **PARTIAL**.
- Profile updates, avatars, change password, and basic preferences exist (`TeacherProfileView`, `TeacherPreferencesView`).

# 21. Help & Support
- **PARTIAL**.
- `SupportTicket`, `SupportMessage`, `SupportAttachment` exist.
- Mostly student-to-admin facing. Teacher access to support is unclear.

# 22. Admin Backend
- **COMPLETE**.
- Full moderation queues exist for Questions, Practice Sets, Study Materials, and Referrals.

# 23. Payments
- **PARTIAL**.
- `PaymentSubmission`, `Purchase`, and `PaymentMethod` exist and handle manual approval flows (eSewa, bank transfer).
- Direct automated webhooks/gateway integration models do not seem fully implemented beyond the submission/verification state machine.

# 24. Marketplace
- **COMPLETE**.
- `Product` ties to `Course`. Manual order/payment pipeline functions successfully.

# 25. File / Media Storage
- **PARTIAL**.
- Standard Django `FileField` used for thumbnails, PDFs, and avatars.
- Missing robust CDN configuration models; relies heavily on standard Django `MEDIA_ROOT`.

# 26. Production Configuration
- **READY (Pending Supabase Secrets)**.
- `DATABASE_URL` is configured to use Supabase PostgreSQL via `dj_database_url`.

# 27. Migrations
- **CLEAN**. All existing models align with the active PostgreSQL schema migrated in previous phases.

# 28. Testing
- **PARTIAL**.
- Permissions and recent Phase 2A/2B enrollment/approval logic are heavily tested. 
- Core modules lack extensive edge-case coverage. Test suite runs, but some factory isolation issues exist (e.g., `test_permissions_and_phase2a.py` requires precise relationship setups).

# 29. Mock / Placeholder Data
- `seed_reference_data.py` exists with `--load-dev-data` generating `[DEV]` mock items.
- Hardcoded `45%` course progress found in `TeacherStudentViewSet.courses`.

# 30. Duplicate / Legacy Architecture
- **CRITICAL**: `ModelExam` vs `Examination`.
- **MINOR**: `Notification` (core) vs `Notification` (subscriptions).
- **MINOR**: `StudentProfile` located in `support` app instead of `core`.

# 31. Module Status Matrix

| Module | Models | APIs | Permissions | Real Data | Tests | Status |
|--------|--------|------|-------------|-----------|-------|--------|
| Auth | Yes | Yes | Yes | Yes | Partial | 🟢 COMPLETE |
| Student | Yes | Yes | Yes | Yes | Partial | 🟢 COMPLETE |
| Course | Yes | Yes | Yes | Yes | Partial | 🟢 COMPLETE |
| Enrollment | Yes | Yes | Yes | Yes | Yes | 🟢 COMPLETE |
| Question Bank | Yes | Yes | Yes | Yes | Partial | 🟢 COMPLETE |
| Question Approval | Yes | Yes | Yes | Yes | Yes | 🟢 COMPLETE |
| Question Selection | Yes | Yes | Yes | Yes | Weak | 🟡 PARTIAL |
| Practice | Yes | Yes | Yes | Yes | Partial | 🟢 COMPLETE |
| Mock | Yes | Yes | Yes | Yes | Partial | ⚠️ ARCHITECTURAL RISK |
| Games | Yes | Yes | Yes | Yes | Weak | 🟡 PARTIAL |
| Study Materials | Yes | Yes | Yes | Yes | Yes | 🟢 COMPLETE |
| Attempts | Yes | Yes | Yes | Yes | Partial | 🟢 COMPLETE |
| Results | Yes | Yes | Yes | Yes | Partial | 🟢 COMPLETE |
| Progress | Yes | Yes | Yes | Yes | Weak | 🟡 PARTIAL |
| Study Plan | Yes | Yes | Yes | Yes | Weak | 🟡 PARTIAL |
| Motivation | Yes | Yes | Yes | Yes | Weak | 🟡 PARTIAL |
| Teacher Students | Yes | Yes | Yes | Partial | Partial | 🟡 PARTIAL |
| Teacher Analytics | Yes | Yes | Yes | Partial | Partial | 🟡 PARTIAL |
| Notifications | Yes | Yes | Yes | Yes | Weak | ⚠️ ARCHITECTURAL RISK |
| Settings | Yes | Yes | Yes | Yes | Weak | 🟢 COMPLETE |
| Help & Support | Yes | Yes | Yes | Yes | Weak | 🟡 PARTIAL |
| Admin | Yes | Yes | Yes | Yes | Partial | 🟢 COMPLETE |
| Payments | Yes | Yes | Yes | Yes | Partial | 🟡 PARTIAL |
| Marketplace | Yes | Yes | Yes | Yes | Partial | 🟢 COMPLETE |

# 32. Critical Blockers
- **Duplicate Mock Architecture**: The frontend's dependence on `ModelExam` blocks the deprecation of legacy architecture and adoption of the richer `Examination` model.
- **Hardcoded Analytics**: Hardcoded progress in Teacher Analytics prevents accurate reporting.
- **Exam Instability**: Changing an approved Question mutates historical mock exams because there is no `QuestionSnapshot` table.

# 33. Recommended Next Phase
**Phase 2C: Database Cleanup and Development Data Preparation**
*(Followed closely by Phase 3: Consolidation of the Mock Exam Architecture to remove duplicates and introduce Question Snapshots).*

# 34. Exact Antigravity Prompt For Next Phase
```markdown
# LoksewaAI — Phase 2C: Database Cleanup and Development Data Preparation

We have completed the backend audit. 
Your task is to implement the safe DRY-RUN development data cleanup command that was designed in the recent safety audit.

1. Implement `cleanup_dev_data.py` management command.
2. Implement ONLY the `--dry-run` functionality initially.
3. Use the exact strict identification rules (exact string matching, not `__startswith`) defined in the safety audit.
4. Verify reverse dependencies (Enrollments, Purchases) to mark records as SAFE or UNSAFE to delete.
5. Do NOT include the `--confirm` deletion logic yet.

Verify the output of the dry run command against the database using `transaction.atomic()` dry-runs.
```
