# LoksewaAI — Admin Examination Analytics & Results Frontend Integration

Scope: connect the Admin Examination **Analytics** and **Results** pages to the real
Django APIs. Canonical architecture only (`Examination → ExaminationAttempt →
StudentAnswer`). No mock data, no hardcoded tokens, no deprecated `ModelExam` APIs.

---

## 1. Files changed

| File | Change |
|---|---|
| `apps/web/lib/api/admin-exams.ts` | **Modified** — added TypeScript types for the analytics & results payloads, typed `getAnalytics`, added `getResults`, corrected the `exam_type` / `status` unions |
| `apps/web/lib/format.ts` | **New** — `formatDuration`, `formatNumber`, `formatDateTime` |
| `apps/web/components/admin/exams/ExamStateViews.tsx` | **New** — `describeApiError`, `ApiErrorState`, `EmptyState`, skeleton components |
| `apps/web/components/admin/exams/StatTile.tsx` | **New** — compact metric tile |
| `apps/web/components/admin/exams/ExamStatusBadge.tsx` | **New** — status pill covering the full backend status set |
| `apps/web/app/admin-dashboard/exams/[id]/layout.tsx` | **Rewritten** — real examination header + section tabs, shared error handling |
| `apps/web/app/admin-dashboard/exams/[id]/page.tsx` | **Rewritten** — real exam overview (was an "API Integration Pending" stub) |
| `apps/web/app/admin-dashboard/exams/[id]/analytics/page.tsx` | **Rewritten** — real analytics dashboard (was a stub) |
| `apps/web/app/admin-dashboard/exams/[id]/results/page.tsx` | **Rewritten** — real results table (was a stub) |

No backend file was modified. No file under `apps/web/app/student/**` or any student
component/context was touched.

---

## 2. APIs connected

Routes confirmed from `apps/api/administration/urls.py` (`ExaminationViewSet`
registered at `admin/exams`, mounted under `/api/admin/`), not assumed:

| Endpoint | Used by |
|---|---|
| `GET /api/admin/exams/{id}/` | Header, overview page |
| `GET /api/admin/exams/{id}/analytics/` | Analytics page |
| `GET /api/admin/exams/{id}/results/` | Results page |

Confirmed **supported** results query params (read from
`ExaminationViewSet.results`): `page`, `page_size`, `passed`, `status`, `search`,
`ordering`. All six are used; nothing beyond them is sent.

All calls go through the existing `apiClient` in `apps/web/lib/api/client.ts`
(JWT from storage, silent refresh on 401, admin-aware redirect, JSON parsing).
No `fetch(..., { Authorization: ... })`, no token literals.

---

## 3. Components / pages updated

**Exam detail layout** — real title, exam type, category / position / subject, status
badge, "Back to exams", and a tab bar (Overview · Questions · Analytics · Results).
Loads `getExam` once; the overview page reuses the same React Query cache entry.

**Analytics page**
- Summary: Total Attempts, Completed, In Progress, Average Score (+ average %),
  Highest, Lowest, Pass Rate. Compact tiles, no oversized cards or gradients.
- Time performance: average / fastest / slowest, rendered through `formatDuration`
  (`125 → 2m 05s`, `3665 → 1h 01m 05s`); never raw seconds.
- Score distribution: bar chart fed **directly** from `score_distribution`; the browser
  does no bucketing. Rendered with **recharts** (already a project dependency).
- Difficulty performance: Easy / Medium / Hard from `difficulty_performance`
  (responses + accuracy, authoritative). Correct / incorrect / skipped per level are a
  plain regrouping of the `question_performance` rows the same response already
  contains — no estimation. Levels absent from the response render an explicit
  "No responses recorded" row.
- Question performance: sortable by accuracy, searchable, paginated **client-side at 10
  per page** because this endpoint returns the full array with no server pagination.

**Results page** — Rank · Student (name + email from the API) · Score (+ %) · Correct ·
Incorrect · Skipped · Time · Status, plus an expandable row showing started/submitted
timestamps, attempt status and rank.

---

## 4. Mock data removed

The three `exams/[id]/**` pages were "API Integration Pending" placeholders left behind
after a previous mock removal; all three now render real API data. `apps/web/lib/mock/`
is empty and was left alone. A grep over `app/admin-dashboard/exams/**` and
`lib/api/admin-exams.ts` finds no mock arrays, demo data, fake students or placeholder
statistics. No unrelated mock files were deleted.

---

## 5. TypeScript types added / updated

Written to mirror `ExaminationViewSet.analytics` / `.results` field-for-field; no `any`
in the new code, no blind casts.

- `ExamAnalyticsExam`, `ExamAnalyticsSummary`, `ExamTimeStatistics`,
  `ExamScoreDistributionBucket`, `ExamQuestionPerformance`,
  `ExamDifficultyPerformance`, `ExamAnalyticsResponse`, `ExamDifficulty`
- `ExamAttemptStatus`, `ExamResultRow`, `ExamResultsResponse`,
  `ExamResultsOrdering`, `ExamResultsQueryParams`
- `ExaminationType`, `ExaminationStatus` (see §8)

Two backend behaviours are encoded rather than papered over:
1. **Zero-attempt analytics** returns a *different, smaller* payload (three counters +
   `message`), so the aggregated metrics are optional by design.
2. `min_duration_seconds` / `max_duration_seconds` are `number | null` (Django `Min`/`Max`
   return `None` with no evaluated attempts), and `rank` is `number | null`.

---

## 6. Filters & pagination

Server-side, always:
- Status: All / Passed / Failed → `?passed=true|false`
- Attempt state: All / In progress / Submitted / Evaluated → `?status=`
- Ordering: highest/lowest score, fastest/slowest time, most recent submission →
  `?ordering=` (restricted to a whitelist of real columns, so a bad value can't 500)
- Search: debounced 350 ms → `?search=`
- Pagination: `?page=` + `?page_size=` (20 / 50 / 100), driven by the backend's
  `count` / `num_pages` / `current_page`. One page is fetched at a time;
  `keepPreviousData` avoids a table flash between pages.

Ranking is the backend's `Rank()` window, recomputed across the filtered set — noted in
the UI so the number is not misread as a global rank.

---

## 7. Loading / error / empty states

- Loading: skeleton grids, panel and table skeletons — never placeholder numbers.
  Every filter control is disabled while a request is in flight.
- Errors (`describeApiError`, mapped from `ApiError.status`):
  `401` session expired + sign-in link · `403` "You don't have permission to view
  examination analytics." · `404` "This examination does not exist or has been removed."
  + back link · anything else "Unable to load examination analytics. Please try again."
  with a **Retry** action. Raw Django payloads and stack traces are never rendered.
- Empty: "No student attempts yet." (analytics), "No evaluated attempts yet." when
  attempts exist but none are evaluated, per-difficulty empty rows,
  "No results available yet." vs. "No results match the current filters."
  No charts are drawn from empty data.
- Access control is unchanged: `apps/web/app/admin-dashboard/layout.tsx` still gates on
  `role ∈ {admin, super-admin}`, and the backend permission remains authoritative.

Responsive: tiles reflow 2 → 4 → 7 columns, charts sit in `ResponsiveContainer`, and
both tables scroll horizontally inside their own container with a min-width.

---

## 8. Backend changes

**None.** Three findings are reported rather than patched, per the brief:

1. **`ExaminationViewSet` uses DRF's `IsAdminUser` (`is_staff`), not the project's
   role-based `administration.permissions.IsAdminUser`.** `apps/api/exams/admin_views.py`
   and `administration/syllabus_views.py` use the role-based one; `administration/
   exam_views.py`, `question_views.py` and `question_set_views.py` use DRF's. A user with
   `role='admin'` but `is_staff=False` passes the frontend guard and then gets 403 from
   every `/api/admin/exams/**` call. The UI now surfaces this cleanly instead of
   failing silently, but it is worth aligning — most safely by accepting either
   condition, since a Django superuser with `role='student'` would lose access under a
   straight swap.
2. **`Examination.STATUS_CHOICES` does not contain `scheduled`, `live` or `completed`,
   yet `ExaminationViewSet.publish()` writes exactly those values.** The frontend type
   now covers the union of both sets; the model choices are the thing that is wrong.
3. **`Examination.course` is not exposed by `ExaminationSerializer`,** so the header
   cannot show "Course" (§5 of the brief). One read-only `course_name` field would fix it.

---

## 9. Checks run

- `tsc --noEmit` over the four new/rewritten pages, the three new components, the updated
  API module, and their real project dependencies (`lib/api/client.ts`, `lib/utils.ts`,
  `components/ui/*`, `components/analytics/ChartComponents.tsx`) — **clean**.
  `app/admin-dashboard/exams/page.tsx` was included in the same pass to confirm the
  widened `exam_type` / `status` unions do not break the existing exam list; it is also
  clean. Two real defects were caught and fixed this way: a query-string signature
  mismatch and a duplicate `lucide-react` import.
- Grep sweep for mock/demo/placeholder references across the integrated pages — none.
- Grep sweep for `ModelExam*` API usage in the integrated pages — none; only the
  canonical `/admin/exams/**` routes are called.
- All icons used are drawn from the set this repo already imports from `lucide-react`.

---

## 10. Build result

**Not run.** This session had no shell on the development machine and no package-registry
access in its sandbox, so `pnpm check-types`, `pnpm lint` and `pnpm build` could not be
executed against the real `node_modules`. The isolated typecheck above is a strong signal
but not a substitute. Please run, from `apps/web`:

```
pnpm check-types
pnpm lint
pnpm build
```

The backend was not modified, so `manage.py check` and the exam test suite are unaffected.

---

## 11. Remaining limitations

1. **Question performance is paginated client-side.** The endpoint returns every question
   in one array. For very large examinations this is a payload concern; server-side
   pagination on that sub-list would be the fix.
2. **No dedicated per-attempt admin detail endpoint exists.** The expandable row shows
   only what `/results/` already returns. No speculative request was invented for it —
   if a per-attempt answer-sheet view is wanted, the endpoint has to exist first.
3. **Difficulty correct/incorrect/skipped are regrouped from `question_performance`.**
   Exact, but if that array is ever paginated server-side these three numbers must move
   into `difficulty_performance` instead.
4. **Course is not shown in the header** — see §8.3.
5. **`exams/[id]/questions/` is still the placeholder stub.** It is outside this task's
   scope and no question-management endpoint was specified; `/admin/exams/{id}/preview/`
   exists and would be the natural backing route.
6. **`git status` was not checked** — no shell was available on the development machine.
   Only the nine files listed in §1 were written; nothing under `app/student/**` or any
   student component was read for modification or touched.
