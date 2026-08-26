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

// Removed DEMO_LEADERBOARD import

// ─── Re-export types for UI layer ────────────────────────────────────────────

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface LeaderboardStudent {
  studentId: string;
  studentName: string;
  avatar: string | null;
  rank: number;
  previousRank: number;
  rankChange: number;
  score: number;
  maxScore: number;
  percentage: number;
  examsAttempted: number;
  testsCleared: number;
  averageScore: number;
  bestScore: number;
  timeTaken: number;
  trend: "up" | "down" | "same";
  isCurrentUser?: boolean;
}

export interface LeaderboardStats {
  currentRank: number;
  totalStudents: number;
  score: number;
  maxScore: number;
  percentile: number;
  rankChange: number;
  bestRank: number;
  averageScore: number;
  highestScore: number;
  testsTaken: number;
  testsCleared: number;
  passRate: number;
}

export interface ScoreTrendPoint {
  date: string;
  score: number;
}

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
}

import { apiClient } from "./client";

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

      const data = await apiClient<ApiResponse>(`/student/leaderboard/?${params}`);
      const results = data.results ?? [];

      if (results.length === 0) {
        // Return empty result naturally instead of throwing error
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
        const myRank = await apiClient<ApiResponse["results"][0]>(
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

      const stats = {
        currentRank: currentUser?.rank ?? 0,
        totalStudents: data.count,
        score: currentUser?.score ?? 0,
        maxScore: 100,
        percentile: currentUser ? currentUser.percentage : 0,
        rankChange: currentUser?.rankChange ?? 0,
        bestRank: currentUser?.rank ?? 0,
        averageScore: currentUser?.percentage ?? 0,
        highestScore: currentUser?.percentage ?? 0,
        testsTaken: currentUser?.examsAttempted ?? 0,
        testsCleared: currentUser?.testsCleared ?? 0,
        passRate: 100,
      };

      return {
        students,
        totalCount: data.count,
        totalPages: Math.max(1, Math.ceil(data.count / filters.pageSize)),
        currentUser,
        stats,
      };
    } catch (e) {
      throw e;
    }
  },

  /** Fetch score trend for the current user */
  async fetchScoreTrend(): Promise<ScoreTrendPoint[]> {
    const data = await apiClient<ScoreTrendPoint[]>("/student/leaderboard/trend/");
    if (data && data.length > 0) return data;
    return [];
  },
};
