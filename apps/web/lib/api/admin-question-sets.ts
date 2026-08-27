import { apiClient } from './client';
import { AdminQuestion } from './admin-questions';

export interface QuestionSetQuestion {
  id: number;
  question: number;
  question_details: AdminQuestion;
  order: number;
  marks: number;
}

export interface QuestionSet {
  id: number;
  name: string;
  description: string;
  set_type: 'full_mock' | 'subject' | 'chapter' | 'topic' | 'position' | 'custom';
  category: number;
  exam: number;
  subject?: number;
  unit?: number;
  topic?: number;
  subject_distribution?: Record<string, number>;
  
  category_name?: string;
  position_name?: string;
  subject_name?: string;
  unit_name?: string;
  topic_name?: string;
  
  total_questions: number;
  time_limit: number;
  passing_marks: number;
  total_marks: number;
  marks_per_question: number;
  negative_marking: boolean;
  negative_marking_value: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  
  difficulty_distribution: {
    easy?: number;
    medium?: number;
    hard?: number;
  };
  status: 'draft' | 'published' | 'archived';
  questions_list?: QuestionSetQuestion[];
  created_at: string;
  updated_at: string;
}

export const adminQuestionSetApi = {
  getQuestionSets: async (params?: Record<string, any>) => {
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
    // The endpoint returns a bare array when pagination is off and a paginated
    // envelope when it is on. Normalise so callers can always read `.results`.
    const res = await apiClient<any>(`/admin/question-sets/${queryString}`);
    if (Array.isArray(res)) {
      return { count: res.length, next: null, previous: null, results: res as QuestionSet[] };
    }
    return {
      count: res?.count ?? (res?.results?.length ?? 0),
      next: res?.next ?? null,
      previous: res?.previous ?? null,
      results: (res?.results ?? []) as QuestionSet[],
    };
  },

  getQuestionSet: async (id: number) => {
    return apiClient<QuestionSet>(`/admin/question-sets/${id}/`);
  },

  createQuestionSet: async (data: Partial<QuestionSet>) => {
    return apiClient<QuestionSet>('/admin/question-sets/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateQuestionSet: async (id: number, data: Partial<QuestionSet>) => {
    return apiClient<QuestionSet>(`/admin/question-sets/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteQuestionSet: async (id: number) => {
    return apiClient(`/admin/question-sets/${id}/`, {
      method: 'DELETE',
    });
  },
  
  duplicateQuestionSet: async (id: number) => {
    return apiClient<QuestionSet>(`/admin/question-sets/${id}/duplicate/`, {
      method: 'POST',
    });
  },
  
  publishQuestionSet: async (id: number) => {
    return apiClient<QuestionSet>(`/admin/question-sets/${id}/publish/`, {
      method: 'POST',
    });
  },
  
  unpublishQuestionSet: async (id: number) => {
    return apiClient<QuestionSet>(`/admin/question-sets/${id}/unpublish/`, {
      method: 'POST',
    });
  },
  
  addQuestions: async (id: number, question_ids: number[]) => {
    return apiClient<{ success: boolean; added_count: number }>(`/admin/question-sets/${id}/add_questions/`, {
      method: 'POST',
      body: JSON.stringify({ question_ids }),
    });
  },
  
  removeQuestions: async (id: number, question_ids: number[]) => {
    return apiClient<{ success: boolean; removed_count: number }>(`/admin/question-sets/${id}/remove_questions/`, {
      method: 'POST',
      body: JSON.stringify({ question_ids }),
    });
  },
  
  reorderQuestions: async (id: number, order_data: { question_id: number; order: number }[]) => {
    return apiClient<{ success: boolean }>(`/admin/question-sets/${id}/reorder_questions/`, {
      method: 'POST',
      body: JSON.stringify({ order_data }),
    });
  },

  generateQuestions: async (id: number) => {
    return apiClient<{ success: boolean; generated_count: number; preview_questions: AdminQuestion[]; error?: string }>(`/admin/question-sets/${id}/generate/`, {
      method: 'POST',
    });
  }
};
