# LoksewaAI — Master Academic Syllabus Architecture Report

## 1. Academic Architecture
LoksewaAI establishes a single canonical Master Academic Syllabus taxonomy powering all core educational modules across the platform:

```text
ExamCategory (e.g., PSC Exams)
    ↓
Exam [Level] (e.g., 5th Level)
    ↓
Exam [Preparation / Service] (e.g., Civil Sub Engineer)
    ↓
[Paper] (e.g., Paper I: General Studies & Technical Subject)
    ↓
Subject (e.g., Building Construction & Technology)
    ↓
Chapter (e.g., Foundation)
    ↓
Topic (e.g., Shallow Foundation, Deep Foundation)
```

This single hierarchy serves as the universal backbone for:
* **Study Materials / Notes**
* **Courses & Subscriptions**
* **Master Question Bank**
* **Topic-Wise Practice**
* **Objective & Subjective Exams**
* **Study Plans & Analytics**

---

## 2. Official Syllabus vs. Master Academic Syllabus

| Dimension | Official Syllabus (`/admin-dashboard/academic/syllabus`) | Master Academic Syllabus (`/admin-dashboard/study-materials`) |
| :--- | :--- | :--- |
| **Purpose** | Student-facing reference and official documents published by PSC / government bodies. | Internal canonical taxonomy powering notes, questions, exams, practice, and analytics. |
| **Data Format** | PDF documents, syllabus outlines, marking schemes, vacancy notices. | Relational database taxonomy: `Subject -> Chapter -> Topic` with strict parent-child foreign keys. |
| **Target Audience** | Prospective & enrolled students reviewing official PSC curriculum PDFs. | Platform engine, instructors structuring content, automated question selectors, exam generators. |
| **Independence** | **Preserved completely.** Independent module; not coupled to individual questions. | Universal hierarchy; all questions, notes, practice sets, and mock exams point here. |

---

## 3. Database Audit & Schema Resolution

### Existing Models Reused (Zero Duplicates Created):
* `ExamCategory` (`apps/api/exams/models.py`)
* `Exam` (`apps/api/exams/models.py`, self-referencing `parent` for Level $\rightarrow$ Preparation)
* `Paper` (`apps/api/exams/models.py`, links Exam to technical/general papers)
* `Subject` (`apps/api/exams/models.py`, foreign key `paper`)
* `Chapter` (`apps/api/exams/models.py`, foreign key `subject`)
* `Topic` (`apps/api/exams/models.py`, foreign key `chapter`)
* `StudyMaterial` (`apps/api/notes/models.py`, foreign keys `exam`, `subject`, `chapter`, `topic`)
* `Question` (`apps/api/exams/models.py`, foreign key `topic`)
* `Examination` (`apps/api/exams/models.py`, foreign keys `category`, `exam`, `course`, `subject`)
* `Course` (`apps/api/courses/models.py`, foreign key `exam`)
* `StudyTask` (`apps/api/study_plan/models.py`, foreign keys `subject`, `topic`)

### Unit vs. Chapter Resolution:
* In earlier schema revisions, `Unit` was used as a legacy model.
* Migration `apps/api/exams/migrations/0016_academic_hierarchy_restructure.py` definitively migrated `Unit` $\rightarrow$ `Chapter`.
* All foreign keys across `StudyMaterial`, `Question`, `Topic`, and `Examination` point cleanly to `Chapter`. No duplicate `Unit` or `Chapter` tables exist.
* Zero migration changes were needed; `python manage.py makemigrations --check --dry-run` reports **No changes detected**.

---

## 4. Notes Integration
Notes now link to the canonical academic hierarchy:
* When adding or editing a note, selecting an academic node (e.g. `Civil Sub Engineer -> Building Construction & Technology -> Foundation -> Shallow Foundation`) pre-fills the Category, Level, Preparation, Subject, Chapter, and Topic directly.
* Notes support existing standard types:
  * `Subjective Topicwise Notes [Detailed]` (Standard & AI)
  * `Objective Topicwise Notes [Detailed]` (Standard & AI)
  * `Revision Notes` (Subjective & Objective)
* Strict parent-child integrity validation is enforced on both backend and frontend.

---

## 5. Course, Practice, Exam & Question Bank Linkages
* **Courses:** Every `Course` has an `exam` foreign key mapping to the Preparation level (e.g., `Civil Sub Engineer`). Student course subscriptions grant access to notes and exams under that academic preparation.
* **Practice:** `QuestionSelectionService` dynamically queries questions using `topic__chapter__subject__paper__exam`, ensuring students practice within their canonical academic syllabus.
* **Exams:** Both Objective and Subjective exams link to `category`, `exam`, and `subject`. Topicwise mock exams filter question banks by canonical `topic_id`.
* **Question Bank:** Every `Question` has a direct `topic` foreign key (`Topic -> Chapter -> Subject -> Paper -> Exam -> Category`), guaranteeing zero duplication between question bank subjects and note subjects.

---

## 6. Admin Academic Tree & Notes UI
The Admin Notes page (`/admin-dashboard/study-materials`) now features an interactive dual-pane Master Academic Tree interface:
* **Left Panel — Master Academic Tree:**
  * Real-time search filter for subjects, chapters, and topics.
  * Hierarchical tree view with expand/collapse toggles and badges (codes, child counts, active/archived status).
  * Inline action menu for each node (`+ Add Chapter`, `+ Add Topic`, `Edit`, `Archive/Activate`, `Delete`).
* **Right Panel — Academic Node Details & Materials:**
  * Node header showing breadcrumb trail and real-time database usage statistics:
    * Notes count
    * Questions count
    * Exams count
    * Child nodes count
  * Context-aware action buttons:
    * Selecting Preparation displays `+ Add Subject`
    * Selecting Subject displays `+ Add Chapter` and `+ Upload Note`
    * Selecting Chapter displays `+ Add Topic` and `+ Upload Note`
    * Selecting Topic displays `+ Upload Note`
  * Safe Delete Protection: Intercepts deletion of any node referenced by notes, questions, exams, or child entities, displays exact dependency counts, and offers "Archive Instead" to prevent accidental data loss.

---

## 7. Verification & Test Results
* **Backend Django System Check:** `python manage.py check` $\rightarrow$ **0 issues**.
* **Database Migrations Check:** `python manage.py makemigrations --check --dry-run` $\rightarrow$ **No changes detected**.
* **TypeScript Compiler Check:** `npx tsc --noEmit` in `apps/web` $\rightarrow$ **0 errors**.
* **ESLint Check:** `npx eslint` on academic components and study materials page $\rightarrow$ **0 errors**.
* **Browser Verification:**
  * Verified end-to-end at `http://localhost:3000/admin-dashboard/study-materials`.
  * Verified Category $\rightarrow$ Level $\rightarrow$ Preparation selection.
  * Verified Master Academic Tree rendering with real database nodes.
  * Verified metrics display on node selection (e.g. 1 note, 25 questions, 1 exam).
  * Verified `+ Add Chapter` modal pre-filled with parent subject.
  * Verified `Add Note` navigation and academic classification inheritance.
  * Verified Safe Delete Protection modal dialog intercepting deletion with real dependency counts and `Archive Instead` recommendation.
