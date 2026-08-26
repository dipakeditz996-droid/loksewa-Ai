# LoksewaAI DEV Data Cleanup Safety Audit

## 1. Current DEV Records Identified
The `--load-dev-data` flag of `seed_reference_data.py` creates DEV records for the following models:
- **ExamCategory**
- **Exam**
- **Paper**
- **Subject**
- **Chapter**
- **Topic**
- **Course**
- **Product**
- **SubscriptionPlan**

## 2. Current DEV Identification Method
Currently, DEV records are identified solely by the string prefix `[DEV]` in their `name` or `title` fields (and `dev-` in the `Course` slug). 

## 3. Seed Command Analysis
- **Command Behavior**: Embeds hardcoded template JSON dictionaries.
- **`--load-dev-data`**: Skips production data lookup and injects placeholder records.
- **Idempotency**: Implemented via Django's `get_or_create()`. Running the script multiple times (once, twice, three times) results in the EXACT SAME records with no duplicates created.
- **Duplicate Behavior**: Does not duplicate.
- **`[DEV]` Marking**: Sourced from the hardcoded payload, explicitly baked into the string name/title fields.

## 4. Dependency Map
The hierarchy relies on standard ForeignKey relationships.
- Deleting `ExamCategory` cascades to `Exam` -> `Paper` -> `Subject` -> `Chapter` -> `Topic`.
- `Course` is independent of the Exam hierarchy in the seed data.
- `Product` has a `SET_NULL` FK to `Course`.
- `SubscriptionPlan` has no hierarchical dependencies.

The safe deletion order (child first, then parent) to avoid integrity constraint violations is:
```text
Product
Topic
Chapter
Subject
Paper
Exam
ExamCategory
Course
SubscriptionPlan
```
Note: Deleting `ExamCategory` first would cascade, but explicitly deleting from the bottom up prevents lock contentions or ORM batch deletion issues.

## 5. Transactional/User Dependencies
DEV records created by the seed script do not natively attach to users, payments, or enrollments during the seed process. 
However, after creation, they CAN be referenced by real users:
- **Course**: `Enrollment`, `CourseApplication`
- **Product**: `Purchase`, `PaymentSubmission`
- **SubscriptionPlan**: `Subscription`, `SubscriptionPayment`

Classification for items with transactional dependencies:
- **UNSAFE**: Since real students could technically browse to a DEV Course or Product and trigger an Enrollment or Purchase, deleting a DEV Course or Product that has associated enrollments/purchases would break database integrity or silently destroy student access history.

## 6. Safety Assessment
- `Topic`, `Chapter`, `Subject`, `Paper`, `Exam`, `ExamCategory`: **NEEDS VERIFICATION** (Could be referenced by Questions/MockExams)
- `Course`: **UNSAFE** (Could be referenced by Enrollments/Applications)
- `Product`: **UNSAFE** (Could be referenced by Purchases/PaymentSubmissions)
- `SubscriptionPlan`: **UNSAFE** (Could be referenced by Subscriptions)

## 7. Is `[DEV]` Sufficient?
**NO.**
- **Question A**: Can `[DEV]` accidentally match a real production record? **Yes.** An admin or teacher could legitimately name a test or course "[DEV] System Test" or similar.
- **Question B**: Can a DEV record exist without `[DEV]`? **No**, the seed script guarantees it's injected with the prefix.
- **Question C**: Can two different DEV seed runs create indistinguishable records? **Yes.**
- **Question D**: Can a production record become linked to a DEV record? **Yes.** A student can enroll in a DEV course.
- **Question E**: Can the cleanup command prove a record was created by `--load-dev-data`? **No.** There is no metadata, ID range, or flag to differentiate a script-seeded record from a manually created record named "[DEV]...".

## 8. Proposed Identification Strategy
Since modifying production schema to add an `is_seed_data` boolean is discouraged, the safest minimal strategy is:
1. Define a strict list of exact string names/slugs based on the `seed_reference_data.py` template payload. 
2. Do not blindly search for `__startswith='[DEV]'`. Instead, search for the EXACT names like `"[DEV] Kharidar Preparation"`.
3. Before deletion, the script MUST assert that the DEV records have **ZERO** reverse dependencies from transactional tables (e.g., `Course.enrollments.count() == 0`).

## 9. Proposed Cleanup Command
```bash
python manage.py cleanup_dev_data --dry-run
python manage.py cleanup_dev_data --confirm
```

## 10. Dry-Run Behavior
The `--dry-run` flag will NOT delete anything. It will query the exact matched names and traverse reverse dependencies. It will output:
```text
DEV CLEANUP DRY RUN

ExamCategory: 1
Exam: 1
Paper: 1
Subject: 1
Chapter: 1
Topic: 2
Course: 1
SubscriptionPlan: 1
Product: 1

BLOCKED:
Course ID 5 -> referenced by Enrollment ID 12 (UNSAFE TO DELETE)
Product ID 3 -> referenced by Purchase ID 8 (UNSAFE TO DELETE)

SAFE TO DELETE:
Topic ID 1, Topic ID 2, Chapter ID 1 ...

No data was modified.
```

## 11. Confirmation Mechanism
The script will refuse to delete if `--confirm` is missing. When `--confirm` is passed, it will prompt:
`Type DELETE DEV DATA to continue:`
If the user types anything else, it will abort.

## 12. Transaction Safety
The deletion phase will be wrapped in `with transaction.atomic():`. If any record fails to delete (e.g., due to a `ProtectedError` from a transactional dependency that slipped past the check), an exception will be raised, the entire block will roll back, and no partial deletions will occur.

## 13. Dependency-Safe Deletion Order
```text
Product
Topic
Chapter
Subject
Paper
Exam
ExamCategory
Course
SubscriptionPlan
```

## 14. Accidental Deletion Risks
- Deleting an `ExamCategory` cascades to all nested topics. If an admin manually moved a production `Exam` into the `[DEV]` `ExamCategory`, the production `Exam` would be destroyed.
- Deleting a `Course` that has active student `Enrollment`s will result in cascading deletion of the enrollments or orphan records depending on `on_delete` settings.

## 15. Implementation Recommendation
**SAFE TO IMPLEMENT DRY-RUN CLEANUP ONLY**
Destructive cleanup should not be implemented until the `--dry-run` command can be run and manually verified against the production database to ensure no real users have interacted with the DEV entities.

## 16. Exact Recommended Next Action
Implement `cleanup_dev_data.py` with ONLY the `--dry-run` functionality, run it against the staging/production database to analyze real-world constraints, and review the output before authorizing the `--confirm` deletion logic.
