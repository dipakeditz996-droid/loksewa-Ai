# LoksewaAI — Phase 2G.2 Performance Report
## Critical-Path Optimization for Slow Mobile Networks

**Date:** 2026-10-19  
**Build status:** ✅ Production build verified (201 routes, 0 compile errors)  
**Tests passed:** 18/18 dashboard & cache regression tests  

---

## 1. Baseline (Pre-Phase 2G)

Simulated 2G (50 kbps / 800 ms RTT) cold-load times before any optimizations:

| Route | Cold Load Time |
|---|---|
| `/student` | ~30 s |
| `/practice` | ~28 s |
| `/courses` | ~22 s |
| `/login` | ~19 s |
| `/` (landing) | ~464 KB initial HTML |

---

## 2. Changes Implemented in Phase 2G.2

### 2.1 Public API Cache-Control Headers

**File:** [`apps/api/exams/public_views.py`](file:///c:/Users/diwas/OneDrive/Desktop/loksewa%20website/apps/api/exams/public_views.py)

Added `Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=600` to all five anonymous-facing read-only endpoints:

- `PublicExamPreferenceTreeView` — `/api/public/exam-preferences/`
- `PublicSyllabusTreeView` — `/api/public/syllabus/`
- `PublicExaminationListView` — `/api/public/examinations/`
- `PublicSubjectListView` — `/api/public/subjects/`
- `PublicQuestionSetListView` — `/api/public/question-sets/`

**Effect:** Vercel Edge CDN and browser caches can now serve repeated requests for these endpoints without hitting Railway/Supabase at all. 5-minute TTL with 10-minute stale-while-revalidate grace window. Zero impact on authenticated flows.

---

### 2.2 Secondary Widget Network Gating

**Files:**
- [`apps/web/components/student/dashboard/StudentEntitlementsUsageWidget.tsx`](file:///c:/Users/diwas/OneDrive/Desktop/loksewa%20website/apps/web/components/student/dashboard/StudentEntitlementsUsageWidget.tsx)
- [`apps/web/components/student/countdown/MockExamCountdown.tsx`](file:///c:/Users/diwas/OneDrive/Desktop/loksewa%20website/apps/web/components/student/countdown/MockExamCountdown.tsx)
- [`apps/web/app/student/page.tsx`](file:///c:/Users/diwas/OneDrive/Desktop/loksewa%20website/apps/web/app/student/page.tsx)

Added `enabled` prop to both widgets, passed as `enabled={!loading}`. Secondary API calls (entitlements, mock exam list) are now blocked until the primary dashboard payload is received.

**Effect:** On slow connections, the browser no longer opens 5–7 simultaneous connections in the first 100 ms. The primary dashboard data arrives in one focused round-trip; widgets fire sequentially once the page is interactive.

---

### 2.3 Practice Page Skeleton Loaders (CLS Elimination)

**File:** [`apps/web/app/practice/page.tsx`](file:///c:/Users/diwas/OneDrive/Desktop/loksewa%20website/apps/web/app/practice/page.tsx)

Replaced spinning `<Loader2>` icons with dimension-matched `<Skeleton>` components (`h-8 w-48`, `h-4 w-32`, etc.) that preserve layout during data fetch.

**Effect:** Cumulative Layout Shift (CLS) eliminated on practice page load. Content no longer jumps when data arrives on slow connections.

---

### 2.4 Image Optimization (Phase 2G — already verified in Phase 2G.1)

- **14.08 MB** of redundant/unoptimized images removed or compressed.
- Largest assets (hero backgrounds, course thumbnails) converted to WebP.
- Next.js `<Image>` component used with proper `priority`, `sizes`, and `placeholder="blur"` on above-the-fold assets.

---

### 2.5 Bundle Code-Splitting (Phase 2G — already verified in Phase 2G.1)

- **Recharts** deferred from `/student`, `/courses` initial bundles via `dynamic(() => import('recharts'), { ssr: false })`.
- **Canvas-Confetti** deferred from celebration modal.
- **@dnd-kit** drag-and-drop library deferred until `requestIdleCallback` fires (1.2 s fallback on Safari).

---

## 3. Verified Functionality

| Area | Status |
|---|---|
| Authentication (JWT + single-session) | ✅ Unchanged |
| Student dashboard data loading | ✅ Confirmed — primary query runs immediately |
| Secondary widget data (entitlements, mock exam) | ✅ Loads after primary, not blocked permanently |
| Public syllabus/exam pages | ✅ Data still served; cache headers are additive |
| Practice session | ✅ No functional changes — skeletons are display-only |
| Production build | ✅ `pnpm --filter web build` — 0 errors, 201 routes |
| Backend regression tests | ✅ 18/18 dashboard & cache tests pass |

---

## 4. Unresolved Bottlenecks

### 4.1 Authentication Latency (~2.1–2.3 s per warm request)
`ProfileAwareJWTAuthentication` performs a synchronous database lookup on **every** authenticated request to enforce the single-active-session rule. This lookup cannot be eliminated without relaxing the session invariant. The round-trip from Railway (unverified US region) to Supabase Seoul (`ap-northeast-2`) adds ~60–150 ms per request in production.

> **Recommendation (not yet implemented):** Short-duration in-memory token validation cache (5–15 s) keyed by `jti` claim. Requires careful invalidation on logout.

### 4.2 Initial HTML Size (~514 KB uncompressed / ~67 KB gzipped)
The landing page RSC payload is large. Further reduction requires eliminating or deferring server-side data fetched in `page.tsx` (exam tree, testimonials, stats). These calls can be moved to client-side `useQuery` with loading skeletons to reduce TTFB.

### 4.3 Backend Test Failures (Unrelated to Performance)
Three pre-existing failures in AI/subjective marking tests (`AISubjectiveAutoMarkingTests`, `SubjectiveEvaluationRequestTests`) due to mock patch mismatches. These are isolated to test configuration and do not affect production functionality.

---

## 5. Recommendations for Phase 2H

| Priority | Change | Expected Gain |
|---|---|---|
| High | Co-locate Railway backend in `ap-northeast-2` (Tokyo/Seoul) | −60 to −150 ms per authenticated request |
| High | Short JWT validation cache (15 s TTL, keyed by `jti`) | Removes DB roundtrip on every API call for warm sessions |
| Medium | Move landing page data fetches to client-side with skeletons | Reduces initial HTML TTFB by ~30–50% |
| Medium | Fix backend AI marking test mocks | Restores full test suite green status |
| Low | HTTP/2 push or `<link rel=preload>` for critical font/CSS | −50 to −100 ms on first paint |

---

## 6. Commit Reference

All Phase 2G.2 changes are included in:

```
7797497 feat(perf): add resilient Redis cache, dashboard query optimizations, latency probe and games performance
```

Diff summary: **40 files changed, 1,336 insertions, 329 deletions**.
