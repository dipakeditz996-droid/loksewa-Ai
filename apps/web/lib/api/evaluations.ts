import { apiClient } from "./client";
import {
  EvaluationOverviewStats,
  EvaluationResultItem,
  EvaluationDetail,
  mockEvaluationStats,
  mockEvaluationResults,
  mockDetail1,
} from "../mock/evaluations-demo-data";

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
    try {
      const stats = await apiClient<EvaluationOverviewStats>("/admin/evaluations/stats/");
      if (stats && Object.keys(stats).length > 0) return stats;
    } catch (error) {
      console.warn("Failed to fetch evaluation stats from API, using demo data");
    }
    return Promise.resolve(mockEvaluationStats);
  },

  getResults: async (params?: GetResultsParams): Promise<GetResultsResponse> => {
    try {
      const q = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== "") {
            q.set(key, String(value));
          }
        });
      }
      
      const data = await apiClient<GetResultsResponse>(`/admin/evaluations/?${q.toString()}`);
      if (data && data.results && data.results.length > 0) {
        return data;
      }
    } catch (error) {
      console.warn("Failed to fetch evaluation results from API, using demo data");
    }

    // Fallback Mock Logic
    let filtered = [...mockEvaluationResults];
    if (params) {
      if (params.search) {
        const lowerSearch = params.search.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.studentName.toLowerCase().includes(lowerSearch) ||
            r.examName.toLowerCase().includes(lowerSearch)
        );
      }
      if (params.status) {
        filtered = filtered.filter((r) => r.status.toLowerCase() === params.status?.toLowerCase());
      }
      if (params.examType) {
        filtered = filtered.filter((r) => r.examType.toLowerCase() === params.examType?.toLowerCase());
      }
    }

    const pageSize = params?.pageSize || 10;
    const page = params?.page || 1;
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          results: paginated,
          total,
          page,
          pageSize,
          totalPages,
        });
      }, 600); // Simulate network delay
    });
  },

  getResultDetail: async (id: string): Promise<EvaluationDetail> => {
    try {
      const detail = await apiClient<EvaluationDetail>(`/admin/evaluations/${id}/`);
      if (detail && detail.id) {
        return detail;
      }
    } catch (error) {
      console.warn(`Failed to fetch evaluation detail for ${id}, using demo data`);
    }

    // Fallback Mock logic
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const mock = mockEvaluationResults.find(r => r.id === id);
        if (mock) {
          resolve({
            ...mockDetail1,
            id: mock.id,
            studentName: mock.studentName,
            studentAvatar: mock.studentAvatar,
            examName: mock.examName,
            status: mock.status,
            score: mock.score,
            percentage: mock.percentage,
          });
        } else {
          // Default fallback just in case
          resolve(mockDetail1);
        }
      }, 400);
    });
  },

  adjustResult: async (id: string, payload: { newScore: number; reason: string }): Promise<void> => {
    try {
      await apiClient(`/admin/evaluations/${id}/adjust/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return;
    } catch (error) {
      console.warn("Failed to adjust result via API, simulating success");
      return new Promise((resolve) => setTimeout(resolve, 500));
    }
  },

  updateQuestionEvaluation: async (
    resultId: string,
    questionId: string,
    payload: { marksObtained: number; examinerRemarks: string }
  ): Promise<void> => {
    try {
      await apiClient(`/admin/evaluations/${resultId}/questions/${questionId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      return;
    } catch (error) {
      console.warn("Failed to update question evaluation via API, simulating success");
      return new Promise((resolve) => setTimeout(resolve, 500));
    }
  },

  publishResult: async (id: string): Promise<void> => {
    try {
      await apiClient(`/admin/evaluations/${id}/publish/`, {
        method: "POST",
      });
      return;
    } catch (error) {
      console.warn("Failed to publish result via API, simulating success");
      return new Promise((resolve) => setTimeout(resolve, 500));
    }
  },

  unpublishResult: async (id: string): Promise<void> => {
    try {
      await apiClient(`/admin/evaluations/${id}/unpublish/`, {
        method: "POST",
      });
      return;
    } catch (error) {
      console.warn("Failed to unpublish result via API, simulating success");
      return new Promise((resolve) => setTimeout(resolve, 500));
    }
  },
};
