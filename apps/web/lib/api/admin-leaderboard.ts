import { apiClient } from "./client";

/** Ranking categories the backend can actually compute from persisted data. */
export type LeaderboardCategory = "overall" | "exam" | "streak";
export type LeaderboardPeriod = "all" | "monthly" | "weekly";

export interface LeaderboardStudent {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
}

export interface LeaderboardRow {
  rank: number;
  student: LeaderboardStudent;
  xp: number;
  level: number;
  streak: number;
  exams_completed: number;
  average_score: number;
  best_score: number;
}

export interface LeaderboardSummary {
  total_students: number;
  top_xp: number;
  average_xp: number;
  average_score: number;
  active_students: number;
}

export interface LeaderboardResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  category: LeaderboardCategory;
  period: LeaderboardPeriod;
  summary: LeaderboardSummary;
  results: LeaderboardRow[];
}

export interface LeaderboardParams {
  category?: LeaderboardCategory;
  period?: LeaderboardPeriod;
  search?: string;
  course_id?: number;
  page?: number;
  page_size?: number;
}

export const adminLeaderboardApi = {
  /** Ranking is computed server-side; this only renders what Django returns. */
  list: async (params: LeaderboardParams = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    });
    const qs = query.toString();
    return apiClient<LeaderboardResponse>(
      `/admin/gamification/leaderboard/${qs ? `?${qs}` : ""}`
    );
  },
};

export interface StudentFeedbackEntry {
  id: number;
  message: string;
  youtube_url: string;
  given_by: string | null;
  created_at: string;
}

export interface StudentFeedbackListResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  results: StudentFeedbackEntry[];
}

export const adminStudentFeedbackApi = {
  list: async (studentId: number) =>
    apiClient<StudentFeedbackListResponse>(`/admin/students/${studentId}/feedback/`),

  send: async (studentId: number, data: { message?: string; youtube_url?: string }) =>
    apiClient<StudentFeedbackEntry>(`/admin/students/${studentId}/feedback/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
