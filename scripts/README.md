# Developer & Maintenance Scripts

This directory contains utility and maintenance scripts for LoksewaAI developers.

## `scripts/maintenance/fix_academic_hierarchy.py`

- **Purpose**: One-time database reference hierarchy alignment script to configure PSC and License Exam categories, level tiers (4th, 5th, 7th level), ordering, and course linkages according to academic specifications.
- **When to run**: Only when initializing a brand new PostgreSQL database or resetting academic categories.
- **Execution**:
  ```bash
  cd apps/api
  python ../../scripts/maintenance/fix_academic_hierarchy.py
  ```
- **Safety**: Makes safe renames and status updates on exam categories; does not delete user attempts or examination questions.
