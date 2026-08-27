import { apiClient, downloadFile } from './client';
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

/** Where an imported CSV lands. Chosen in the UI, applied to every row. */
export interface ImportTarget {
  topic: number;
  question_type: 'mcq' | 'true_false' | 'subjective';
  difficulty: 'easy' | 'medium' | 'hard';
}

export type ImportRowStatus = 'valid' | 'incomplete' | 'duplicate' | 'error';

export interface ImportRow {
  row_index: number;
  status: ImportRowStatus;
  /** Blocking problems: the row can never be imported as-is. */
  errors: string[];
  /** Gaps the AI can fill, e.g. 'options', 'correct_answer', 'explanation'. */
  missing: string[];
  /** Set once the AI has filled this row, listing what it supplied. */
  ai_filled?: string[];
  data: Record<string, string>;
}

export interface ImportReport {
  import_id: number;
  topic_id: number | null;
  question_type: string;
  difficulty: string;
  total_rows: number;
  valid_rows: number;
  incomplete_rows: number;
  duplicate_rows: number;
  error_rows: number;
  report_data: ImportRow[];
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
  uploadCSV: async (file: File, target: ImportTarget) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('topic', String(target.topic));
    formData.append('question_type', target.question_type);
    formData.append('difficulty', target.difficulty);
    // No Content-Type header: the browser must set it so the multipart
    // boundary is included.
    return apiClient<ImportReport>('/admin/questions/import/upload/', {
      method: 'POST',
      body: formData as any,
    });
  },
  aiFillImport: async (importId: number | string) =>
    apiClient<ImportReport>(`/admin/questions/import/${importId}/ai-fill/`, { method: 'POST' }),
  commitCSV: async (importId: number | string) => apiClient<{ success: boolean; imported_count: number }>(`/admin/questions/import/${importId}/commit/`, { method: 'POST' }),
  downloadTemplate: async () => downloadFile('/admin/questions/import/template/', 'question_import_template.csv'),
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
