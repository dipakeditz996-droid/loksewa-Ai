# LoksewaAI Reference Data Seed Report

## 1. Existing Data Architecture
The discovered model hierarchy forming the backbone of the LoksewaAI educational catalog relies on several integrated apps. The mandatory hierarchical structure is:
- **Academic Hierarchy**: `ExamCategory` -> `Exam` -> `Paper` -> `Subject` -> `Chapter` -> `Topic`
- **Curriculum Catalog**: `Course` (optionally linked to `Exam`)
- **Subscription Catalog**: `SubscriptionPlan`
- **Marketplace Catalog**: `Product` (Products of type `COURSE` link directly to `Course` objects to facilitate enrollment).

## 2. Seed Mechanism Created
- **Command Path**: `apps/api/core/management/commands/seed_reference_data.py`
- **Execution**: Can be safely executed using `python manage.py seed_reference_data` (with `--load-dev-data` to load optional development samples).
- **Architecture Chosen**: A custom Django Management Command utilizing Django's built-in `get_or_create()` ORM patterns. This guarantees native database transaction integrity, is perfectly compatible with the Supabase/PostgreSQL pooler, and leverages standard Django architecture rather than one-off external scripts.

## 3. Verified Production Data Found
- **Found**: None. No official Loksewa curriculum data, exam structures, or production JSON fixtures exist in the repository.

## 4. Data NOT Found
The following official, real-world data must be manually supplied or mapped into JSON arrays to serve as production records:
- Official Loksewa `ExamCategory` names (e.g., Kharidar, Nayab Subba, Section Officer).
- Official `Exam`, `Paper`, `Subject`, `Chapter`, and `Topic` breakdowns.
- Official `Course` configurations.
- Pricing and structure for official `SubscriptionPlan` offerings.

## 5. Development/Test Data
- **Created**: YES
- **Description**: Since no official production curriculum exists, an embedded placeholder sample dataset was prepared and explicitly marked as `[DEV]`.
- **Safety**: The development data is strictly isolated behind the `--load-dev-data` flag and will **not** execute or populate when run normally in production environments.

## 6. Idempotency Verification
- **First execution result**: SUCCESS. Seeded the entire DEV catalog flawlessly.
- **Second execution result**: SUCCESS. Command detected existing records and skipped duplication.
- **Duplicate prevention**: `get_or_create()` reliably mapped unique structural dependencies (like `course_slug` and `category` name identifiers), preventing duplicate entries during consecutive executions.

## 7. Database Records Created
Upon running `--load-dev-data`, exactly the following records were generated:
- `ExamCategory`: 1
- `Exam`: 1
- `Paper`: 1
- `Subject`: 1
- `Chapter`: 1
- `Topic`: 2
- `Course`: 1
- `SubscriptionPlan`: 1
- `Product`: 1

## 8. Validation
- **Django system check**: `python manage.py check` confirmed 0 internal consistency issues.
- **Seed validation**: Database table count inspection confirmed all expected entries were inserted.
- **Relationship validation**: `Product.course` correctly linked to the created `Course` entity, mapping the `COURSE` product type appropriately for enrollments.
- **Errors**: No errors encountered.

## 9. Required Input From Project Owner
- Real-world Loksewa curriculum data (Categories, Exams, Subjects, Topics) structured as a JSON file matching the model hierarchy.
- Official course offerings, prices, and subscription plan definitions.

## 10. Recommended Next Action
Provide the official Loksewa JSON curriculum file so the `seed_reference_data` management command can be updated to load production-ready models rather than `[DEV]` placeholders.
