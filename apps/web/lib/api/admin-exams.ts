import { apiClient } from './client';

export interface EligibilityRule {
  id: number;
  target_category?: number;
  target_position?: number;
  is_global: boolean;
}

export interface Examination {
  id: number;
  title: string;
  description: string;
  exam_type: 'mock' | 'practice' | 'full' | 'position' | 'subject' | 'custom';
  category: number;
  category_name?: string;
  exam: number;
  exam_name?: string;
  subject: number;
  subject_name?: string;
  question_set?: number;
  question_set_name?: string;
  instructions: string;
  thumbnail?: string;
  total_questions: number;
  time_limit: number;
  total_marks: number;
  passing_marks: number;
  marks_per_question: number;
  negative_marking: boolean;
  negative_marking_value: number;
  max_attempts: number;
  allow_resume: boolean;
  auto_submit: boolean;
  result_visibility: 'immediate' | 'after_end' | 'manual';
  show_correct_answers: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
  start_time?: string;
  end_time?: string;
  status: 'draft' | 'scheduled' | 'live' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  eligibility_rules: EligibilityRule[];
  attempts_count: number;
}

export interface ExamQueryParams {
  search?: string;
  exam_type?: string;
  status?: string;
  category?: number;
  exam?: number;
  subject?: number;
}

export const adminExamApi = {
  getExams: async (params?: ExamQueryParams) => {
    let queryString = "";
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
      const queryStr = searchParams.toString();
      if (queryStr) {
        queryString = `?${queryStr}`;
      }
    }
    return apiClient<{ count: number; next: string | null; previous: string | null; results: Examination[] }>(`/admin/exams/${queryString}`);
  },

  getExam: async (id: number) => {
    return apiClient<Examination>(`/admin/exams/${id}/`);
  },

  createExam: async (data: Partial<Examination>) => {
    return apiClient<Examination>('/admin/exams/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateExam: async (id: number, data: Partial<Examination>) => {
    return apiClient<Examination>(`/admin/exams/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteExam: async (id: number) => {
    return apiClient(`/admin/exams/${id}/`, {
      method: 'DELETE',
    });
  },

  duplicateExam: async (id: number) => {
    return apiClient<Examination>(`/admin/exams/${id}/duplicate/`, {
      method: 'POST',
    });
  },

  publishExam: async (id: number) => {
    return apiClient<Examination>(`/admin/exams/${id}/publish/`, {
      method: 'POST',
    });
  },

  archiveExam: async (id: number) => {
    return apiClient<Examination>(`/admin/exams/${id}/archive/`, {
      method: 'POST',
    });
  },

  getPreview: async (id: number) => {
    return apiClient<any>(`/admin/exams/${id}/preview/`);
  },

  getAnalytics: async (id: number) => {
    return apiClient<any>(`/admin/exams/${id}/analytics/`);
  },
};
