import { apiClient } from './client';
import { QuestionData, PaginatedResponse } from './teacher-questions';

export const getAdminReviewQueue = async (params: Record<string, any> = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) queryParams.append(key, value.toString());
  });
  return apiClient<PaginatedResponse<QuestionData>>(`/admin/questions/review-queue/?${queryParams.toString()}`);
};

export const getAdminQuestion = async (id: number) => {
  return apiClient<QuestionData>(`/admin/questions/review-queue/${id}/`);
};

export const approveQuestion = async (id: number, reviewerComment?: string) => {
  return apiClient<{ detail: string }>(`/admin/questions/review-queue/${id}/approve/`, {
    method: 'POST',
    body: JSON.stringify({ reviewer_comment: reviewerComment }),
  });
};

export const rejectQuestion = async (id: number, reviewerComment: string) => {
  return apiClient<{ detail: string }>(`/admin/questions/review-queue/${id}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ reviewer_comment: reviewerComment }),
  });
};

export const requestChanges = async (id: number, reviewerComment: string) => {
  return apiClient<{ detail: string }>(`/admin/questions/review-queue/${id}/request-changes/`, {
    method: 'POST',
    body: JSON.stringify({ reviewer_comment: reviewerComment }),
  });
};
