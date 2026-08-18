import { apiClient } from "./client";
import { PracticeSet } from "./teacher-practice-sets";

export const adminPracticeSetsApi = {
  getReviewQueue: (params?: Record<string, string>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiClient<PracticeSet[]>(`/admin/practice-sets/review-queue/${query}`);
  },

  getReviewSet: (id: string | number) => {
    return apiClient<PracticeSet>(`/admin/practice-sets/review-queue/${id}/`);
  },

  approve: (id: string | number, feedback: string = "") => {
    return apiClient<{ status: string }>(`/admin/practice-sets/review-queue/${id}/approve/`, {
      method: "POST",
      body: JSON.stringify({ feedback }),
    });
  },

  requestChanges: (id: string | number, feedback: string) => {
    return apiClient<{ status: string }>(`/admin/practice-sets/review-queue/${id}/request-changes/`, {
      method: "POST",
      body: JSON.stringify({ feedback }),
    });
  },

  reject: (id: string | number, feedback: string) => {
    return apiClient<{ status: string }>(`/admin/practice-sets/review-queue/${id}/reject/`, {
      method: "POST",
      body: JSON.stringify({ feedback }),
    });
  },
};
