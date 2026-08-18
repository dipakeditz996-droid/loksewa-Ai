/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         LEADERBOARD SERVICE — LoksewaAI                         ║
 * ║                                                                  ║
 * ║  Architecture:                                                   ║
 * ║    UI → leaderboardService → Real API  (production)             ║
 * ║                            → Demo Data (fallback/dev)           ║
 * ║                                                                  ║
 * ║  To switch to real data: update the fetch functions to call     ║
 * ║  the real /student/leaderboard/ API and remove demo fallback.   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  DEMO_LEADERBOARD,
  DEMO_CURRENT_USER,
  DEMO_SCORE_TREND,
  getDemoStats,
  filterDemoByTime,
  paginateDemoData,
  type LeaderboardStudent,
  type LeaderboardStats,
  type ScoreTrendPoint,
} from "@/lib/mock/leaderboard-demo-data";

// ─── Re-export types for UI layer ────────────────────────────────────────────

export type { LeaderboardStudent, LeaderboardStats, ScoreTrendPoint };

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface LeaderboardFilters {
  page: number;
  pageSize: number;
  examFilter: string;        // "all" | exam id string
  rankingType: string;       // "overall" | "best" | "subject"
  timeFilter: "week" | "month" | "all";
  searchQuery?: string;
}

export interface LeaderboardPageResult {
  students: LeaderboardStudent[];
  totalCount: number;
  totalPages: number;
  currentUser: LeaderboardStudent | null;
  stats: LeaderboardStats;
  usedDemoData: boolean;
}

// ─── API base ─────────────────────────────────────────────────────────────────

const API_BASE =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api"
    : "http://127.0.0.1:8000/api";

async function apiFetch<T>(path: string): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ─── Ranking logic (primary sort for client-side re-ranking) ─────────────────

/**
 * Ranking rule:
 *  1. Higher percentage → higher rank
 *  2. Equal percentage → higher score (absolute) → higher rank
 *  3. Equal score → more exams attempted → higher rank
 */
export function rankStudents(students: LeaderboardStudent[]): LeaderboardStudent[] {
  return [...students]
    .sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (b.score !== a.score) return b.score - a.score;
      return b.examsAttempted - a.examsAttempted;
    })
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const leaderboardService = {
  /**
   * Primary data fetcher. Tries real API first; falls back to demo data
   * automatically when API returns empty, 401, 404, or any network error.
   *
   * IMPORTANT — Privacy: only public fields are returned. Email, phone,
   * password, payment info, and internal IDs are never included.
   */
  async fetchLeaderboard(filters: LeaderboardFilters): Promise<LeaderboardPageResult> {
    // ── Try real API first ──────────────────────────────────────────
    try {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        page_size: filters.pageSize.toString(),
        time_filter: filters.timeFilter,
        ranking_type: filters.rankingType,
        exam: filters.examFilter,
        ...(filters.searchQuery ? { search: filters.searchQuery } : {}),
      });

      type ApiResponse = {
        count: number;
        next: string | null;
        previous: string | null;
        results: Array<{
          rank: number;
          student_id: number;
          student_name: string;
          profile_image?: string | null;
          score: number;
          percentage: number;
          total_exams: number;
          previous_rank?: number;
        }>;
      };

      const data = await apiFetch<ApiResponse>(`/student/leaderboard/?${params}`);
      const results = data.results ?? [];

      if (results.length === 0) {
        // Real API returned empty — fall through to demo data
        throw new Error("empty");
      }

      // Map API shape → internal type (stripping sensitive fields)
      const students: LeaderboardStudent[] = results.map((r) => {
        const prevRank = r.previous_rank ?? r.rank;
        const rankChange = prevRank - r.rank;
        return {
          studentId: `api-${r.student_id}`,
          studentName: r.student_name,
          avatar: r.profile_image ?? null,
          rank: r.rank,
          previousRank: prevRank,
          rankChange,
          score: r.score,
          maxScore: 100,
          percentage: r.percentage,
          examsAttempted: r.total_exams,
          testsCleared: Math.floor(r.total_exams * 0.8),
          averageScore: r.percentage,
          bestScore: r.score,
          timeTaken: 45,
          trend: rankChange > 0 ? "up" : rankChange < 0 ? "down" : "same",
        };
      });

      // Fetch my-rank separately (non-blocking)
      let currentUser: LeaderboardStudent | null = null;
      try {
        const myRank = await apiFetch<ApiResponse["results"][0]>(
          `/student/leaderboard/my-rank/?${params}`
        );
        if (myRank) {
          const prevRank = myRank.previous_rank ?? myRank.rank;
          const rankChange = prevRank - myRank.rank;
          currentUser = {
            studentId: `api-${myRank.student_id}`,
            studentName: myRank.student_name,
            avatar: myRank.profile_image ?? null,
            rank: myRank.rank,
            previousRank: prevRank,
            rankChange,
            score: myRank.score,
            maxScore: 100,
            percentage: myRank.percentage,
            examsAttempted: myRank.total_exams,
            testsCleared: Math.floor(myRank.total_exams * 0.8),
            averageScore: myRank.percentage,
            bestScore: myRank.score,
            timeTaken: 45,
            trend: rankChange > 0 ? "up" : rankChange < 0 ? "down" : "same",
            isCurrentUser: true,
          };
        }
      } catch {
        // my-rank failure is non-fatal
      }

      const stats = getDemoStats(); // TODO: replace with /leaderboard/stats/ API

      return {
        students,
        totalCount: data.count,
        totalPages: Math.max(1, Math.ceil(data.count / filters.pageSize)),
        currentUser,
        stats,
        usedDemoData: false,
      };
    } catch {
      // ── Fallback: demo data ──────────────────────────────────────
      return leaderboardService._getDemoResult(filters);
    }
  },

  /** Fetch score trend for the current user */
  async fetchScoreTrend(): Promise<ScoreTrendPoint[]> {
    try {
      const data = await apiFetch<ScoreTrendPoint[]>("/student/leaderboard/trend/");
      if (data && data.length > 0) return data;
    } catch {
      // fall through
    }
    return DEMO_SCORE_TREND;
  },

  /** Internal: produce a result from demo data */
  _getDemoResult(filters: LeaderboardFilters): LeaderboardPageResult {
    let pool = [...DEMO_LEADERBOARD];

    // Apply time filter
    pool = filterDemoByTime(pool, filters.timeFilter);

    // Apply search
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      pool = pool.filter((s) =>
        s.studentName.toLowerCase().includes(q)
      );
    }

    const { data, totalCount, totalPages } = paginateDemoData(
      pool,
      filters.page,
      filters.pageSize
    );

    const currentUser: LeaderboardStudent = {
      ...DEMO_CURRENT_USER,
    };

    return {
      students: data,
      totalCount,
      totalPages,
      currentUser,
      stats: getDemoStats(),
      usedDemoData: true,
    };
  },
};
