import { apiClient } from './client';
import { ApiQuestion } from '@/types/api';

export interface QuestionData extends ApiQuestion {
  id: number;
  question_id: string;
  topic: number;
  question_type: string;
  status: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  marks: number;
  negative_marks: number;
  expected_time_minutes: number;
  explanation: string;
  difficulty: string;
  model_answer: string;
  tags: string;
  reference: string;
  reviewer_comment: string;
  submitted_at: string;
  reviewed_at: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getQuestions = async (params: Record<string, any> = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) queryParams.append(key, value.toString());
  });
  return apiClient<PaginatedResponse<QuestionData>>(`/teacher/questions/?${queryParams.toString()}`);
};

export const getQuestion = async (id: number) => {
  return apiClient<QuestionData>(`/teacher/questions/${id}/`);
};

export const createQuestion = async (data: Partial<QuestionData>) => {
  return apiClient<QuestionData>('/teacher/questions/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateQuestion = async (id: number, data: Partial<QuestionData>) => {
  return apiClient<QuestionData>(`/teacher/questions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const submitQuestion = async (id: number) => {
  return apiClient<{ detail: string }>(`/teacher/questions/${id}/submit/`, {
    method: 'POST',
  });
};

export const deleteQuestion = async (id: number) => {
  return apiClient<void>(`/teacher/questions/${id}/`, {
    method: 'DELETE',
  });
};

export const bulkImportQuestions = async (questions: Partial<QuestionData>[]) => {
  return apiClient<{ detail: string }>(`/teacher/questions/bulk-import/`, {
    method: 'POST',
    body: JSON.stringify({ questions }),
  });
};
