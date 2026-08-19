import { apiClient } from './client';
import { QuestionData, PaginatedResponse } from './teacher-questions';

export interface AdminQuestion {
  id: number;
  question_id: string;
  topic_name: string;
  subject_name: string;
  position_name: string;
  question_type: string;
  status: string;
  text: string;
  options: any[];
  marks: number;
  expected_time_minutes: number;
  usage_count: number;
  collections?: { id: number, name: string }[];
  ai_status?: string;
  [key: string]: any;
}

export interface QuestionStats {
  total: number;
  mcq: number;
  subjective: number;
  active: number;
  ai_pending: number;
}

export const adminQuestionApi = {
  getStats: async () => apiClient<QuestionStats>('/admin/questions/stats/'),
  getQuestions: async (params: Record<string, any> = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value.toString());
    });
    return apiClient<{ results: AdminQuestion[], next?: string, count: number }>(`/admin/questions/?${queryParams.toString()}`);
  },
  getQuestion: async (id: number) => apiClient<AdminQuestion>(`/admin/questions/${id}/`),
  createQuestion: async (data: any) => apiClient<AdminQuestion>('/admin/questions/', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: async (id: number, data: any) => apiClient<AdminQuestion>(`/admin/questions/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuestion: async (id: number) => apiClient<{ detail: string }>(`/admin/questions/${id}/`, { method: 'DELETE' }),
  duplicateQuestion: async (id: number) => apiClient<{ detail: string }>(`/admin/questions/${id}/duplicate/`, { method: 'POST' }),
  bulkAction: async (action: string, ids: number[], collectionIds?: number[]) => apiClient<{ error?: string, count: number }>(`/admin/questions/bulk-action/`, {
    method: 'POST',
    body: JSON.stringify({ action, ids, collection_ids: collectionIds }),
  }),
  uploadCSV: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient<any>('/admin/questions/import/', { 
      method: 'POST', 
      body: formData as any, 
      headers: { 'Content-Type': 'multipart/form-data' } 
    });
  },
  commitCSV: async (importId: string) => apiClient<any>(`/admin/questions/import/${importId}/commit/`, { method: 'POST' }),
  generateOptions: async (id: number) => apiClient<any>(`/admin/questions/${id}/generate-options/`, { method: 'POST' }),
  approveOptions: async (id: number, aiOptions: any) => apiClient<any>(`/admin/questions/${id}/approve-options/`, { method: 'POST', body: JSON.stringify(aiOptions) }),
  generateBulkAIContent: async (data: any) => apiClient<any>('/admin/questions/bulk-ai-generate/', { method: 'POST', body: JSON.stringify(data) }),
  bulkCreateQuestions: async (data: any) => apiClient<any>('/admin/questions/bulk-create/', { method: 'POST', body: JSON.stringify(data) }),
};

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
