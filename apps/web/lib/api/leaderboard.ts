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
  label?: string;
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
   * Primary data fetcher. Retrieves consolidated leaderboard, personal rank,
   * and aggregate statistics in a single performant database-backed request.
   */
  async fetchLeaderboard(filters: LeaderboardFilters): Promise<LeaderboardPageResult> {
    const params = new URLSearchParams({
      page: filters.page.toString(),
      page_size: filters.pageSize.toString(),
      time_filter: filters.timeFilter,
      ranking_type: filters.rankingType,
      exam: filters.examFilter,
      ...(filters.searchQuery ? { search: filters.searchQuery } : {}),
    });

    type LeaderboardApiRow = {
      rank: number;
      student_id: number;
      student_name: string;
      profile_image?: string | null;
      score: number;
      percentage: number;
      total_exams: number;
      previous_rank?: number;
    };

    type ApiResponse = {
      count: number;
      page?: number;
      page_size?: number;
      total_pages?: number;
      next: string | number | null;
      previous: string | number | null;
      current_user?: LeaderboardApiRow | null;
      summary?: {
        totalParticipants: number;
        averageScore: number;
        highestScore: number;
      };
      results: LeaderboardApiRow[];
    };

    const data = await apiClient<ApiResponse>(`/student/leaderboard/?${params}`);
    const results = data.results ?? [];

    const mapApiRowToStudent = (r: LeaderboardApiRow, isMe = false): LeaderboardStudent => {
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
        testsCleared: r.percentage >= 40 ? r.total_exams : Math.floor(r.total_exams * 0.5),
        averageScore: r.percentage,
        bestScore: r.score,
        timeTaken: 0,
        trend: rankChange > 0 ? "up" : rankChange < 0 ? "down" : "same",
        isCurrentUser: isMe,
      };
    };

    const students: LeaderboardStudent[] = results.map((r) => mapApiRowToStudent(r));

    // Resolve current student's personal ranking
    let currentUser: LeaderboardStudent | null = null;
    if (data.current_user) {
      currentUser = mapApiRowToStudent(data.current_user, true);
    } else {
      // Non-blocking fallback if backend list response didn't supply it
      try {
        const myRank = await apiClient<LeaderboardApiRow>(
          `/student/leaderboard/my-rank/?${params}`
        );
        if (myRank) {
          currentUser = mapApiRowToStudent(myRank, true);
        }
      } catch {
        // my-rank fallback failure is non-fatal
      }
    }

    const summary = data.summary ?? {
      totalParticipants: data.count,
      averageScore: currentUser?.percentage ?? 0,
      highestScore: results[0]?.percentage ?? (currentUser?.percentage ?? 0),
    };

    const stats: LeaderboardStats = {
      currentRank: currentUser?.rank ?? 0,
      totalStudents: summary.totalParticipants,
      score: currentUser?.score ?? 0,
      maxScore: 100,
      percentile: currentUser ? currentUser.percentage : 0,
      rankChange: currentUser?.rankChange ?? 0,
      bestRank: currentUser?.rank ?? 0,
      averageScore: summary.averageScore,
      highestScore: summary.highestScore,
      testsTaken: currentUser?.examsAttempted ?? 0,
      testsCleared: currentUser?.testsCleared ?? 0,
      passRate: currentUser && currentUser.examsAttempted > 0
        ? Math.round((currentUser.testsCleared / currentUser.examsAttempted) * 100)
        : 0,
    };

    return {
      students,
      totalCount: data.count,
      totalPages: data.total_pages ?? Math.max(1, Math.ceil(data.count / filters.pageSize)),
      currentUser,
      stats,
    };
  },

  /** Fetch score trend for the current user */
  async fetchScoreTrend(): Promise<ScoreTrendPoint[]> {
    try {
      const data = await apiClient<Array<{ date: string; label?: string; score: number }>>("/student/leaderboard/trend/");
      if (data && data.length > 0) {
        return data.map((item) => ({
          date: item.date,
          label: item.label || item.date,
          score: item.score,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },
};

