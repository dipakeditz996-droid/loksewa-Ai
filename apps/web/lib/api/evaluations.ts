import { apiClient } from "./client";
import {
  EvaluationOverviewStats,
  EvaluationResultItem,
  EvaluationDetail
} from "./evaluations-types";

export interface StudentAttemptItem {
  id: number;
  examination: number;
  examination_title: string;
  started_at: string;
  submitted_at: string | null;
  status: "in-progress" | "submitted" | "evaluated";
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  time_taken_seconds: number | null;
  total_questions?: number;
  correct_answers?: number;
  wrong_answers?: number;
  unanswered?: number;
  rank?: number;
  total_participants?: number;
}

export interface StudentAttemptListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StudentAttemptItem[];
}

export interface GetResultsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  exam?: string;
  examType?: string;
  category?: string;
  position?: string;
  subject?: string;
  status?: string;
  minScore?: number;
  maxScore?: number;
  minPercentage?: number;
  maxPercentage?: number;
}

export interface GetResultsResponse {
  results: EvaluationResultItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const evaluationService = {
  getDashboardStats: async (): Promise<EvaluationOverviewStats> => {
    return apiClient<EvaluationOverviewStats>("/admin/evaluations/stats/");
  },

  getResults: async (params?: GetResultsParams): Promise<GetResultsResponse> => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          q.set(key, String(value));
        }
      });
    }
    return apiClient<GetResultsResponse>(`/admin/evaluations/?${q.toString()}`);
  },

  getMyResults: async (params?: { page?: number; page_size?: number }): Promise<StudentAttemptListResponse> => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    const qs = q.toString();
    return apiClient<StudentAttemptListResponse>(`/student/exam-attempts/${qs ? `?${qs}` : ""}`);
  },

  getResultDetail: async (id: string): Promise<EvaluationDetail> => {
    return apiClient<EvaluationDetail>(`/admin/evaluations/${id}/`);
  },

  adjustResult: async (id: string, payload: { newScore: number; reason: string }): Promise<void> => {
    await apiClient(`/admin/evaluations/${id}/adjust/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateQuestionEvaluation: async (
    resultId: string,
    questionId: string,
    payload: { marksObtained: number; examinerRemarks: string }
  ): Promise<void> => {
    await apiClient(`/admin/evaluations/${resultId}/questions/${questionId}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  publishResult: async (id: string): Promise<void> => {
    await apiClient(`/admin/evaluations/${id}/publish/`, {
      method: "POST",
    });
  },

  unpublishResult: async (id: string): Promise<void> => {
    await apiClient(`/admin/evaluations/${id}/unpublish/`, {
      method: "POST",
    });
  }
};
