import { apiClient } from './client';
import { QuestionData as Question } from './teacher-questions';

export interface MockExamQuestion {
  id: number;
  question: number;
  question_detail?: Question;
  order: number;
  marks: number;
}

export interface MockExam {
  id: number;
  title: string;
  description: string;
  exam_type: string;
  category: number;
  category_name?: string;
  exam: number;
  exam_name?: string;
  subject?: number;
  subject_name?: string;
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
  result_visibility: string;
  show_correct_answers: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
  start_time?: string;
  end_time?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'changes_requested' | 'rejected' | 'archived';
  reviewer_comment?: string;
  reviewed_by?: number;
  submitted_at?: string;
  reviewed_at?: string;
  questions_list?: MockExamQuestion[];
  created_at: string;
  updated_at: string;
}

export interface MockExamAnalyticsSummary {
  total_attempts: number;
  completed_attempts?: number;
  in_progress_attempts?: number;
  average_score?: number;
  average_percentage?: number;
  highest_score?: number;
  lowest_score?: number;
  pass_count?: number;
  fail_count?: number;
}

export interface MockExamAnalytics {
  exam: { id: number; title: string; exam_type: string; status: string };
  summary: MockExamAnalyticsSummary;
  message?: string;
  time_statistics?: {
    average_duration_seconds: number;
    min_duration_seconds: number | null;
    max_duration_seconds: number | null;
  };
  score_distribution?: { range: string; count: number }[];
  question_performance?: {
    question_id: number;
    question_number: number;
    question_text: string;
    total_responses: number;
    correct: number;
    incorrect: number;
    skipped: number;
    accuracy: number;
    difficulty: string;
  }[];
  difficulty_performance?: { level: string; attempts: number; accuracy: number }[];
}

export const teacherMockExamsApi = {
  getAll: async () => {
    return apiClient<MockExam[]>('/teacher/mock-exams/');
  },

  getById: async (id: number) => {
    return apiClient<MockExam>(`/teacher/mock-exams/${id}/`);
  },

  getAnalytics: async (id: number) => {
    return apiClient<MockExamAnalytics>(`/teacher/mock-exams/${id}/analytics/`);
  },

  create: async (data: Partial<MockExam>) => {
    return apiClient<MockExam>('/teacher/mock-exams/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<MockExam>) => {
    return apiClient<MockExam>(`/teacher/mock-exams/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiClient<void>(`/teacher/mock-exams/${id}/`, {
      method: 'DELETE',
    });
  },

  submitReview: async (id: number) => {
    return apiClient<MockExam>(`/teacher/mock-exams/${id}/submit_review/`, {
      method: 'POST',
    });
  },

  duplicate: async (id: number) => {
    return apiClient<MockExam>(`/teacher/mock-exams/${id}/duplicate/`, {
      method: 'POST',
    });
  },

  addQuestions: async (id: number, questionIds: number[], marks?: number) => {
    return apiClient<{ message: string }>(`/teacher/mock-exams/${id}/questions/`, {
      method: 'POST',
      body: JSON.stringify({
        question_ids: questionIds,
        marks: marks,
      }),
    });
  },

  removeQuestion: async (id: number, questionId: number) => {
    return apiClient<{ message: string }>(`/teacher/mock-exams/${id}/questions/${questionId}/`, {
      method: 'DELETE',
    });
  },

  reorderQuestions: async (id: number, orderData: { question_id: number; order: number }[]) => {
    return apiClient<{ message: string }>(`/teacher/mock-exams/${id}/questions/reorder/`, {
      method: 'POST',
      body: JSON.stringify({
        order_data: orderData,
      }),
    });
  },

  getTaxonomy: async () => {
    return apiClient<any[]>('/teacher/mock-exams/taxonomy/');
  },

  autoGenerate: async (id: number, config: {
    subject_id?: number;
    topic_id?: number;
    counts: { easy: number; medium: number; hard: number; };
  }) => {
    return apiClient<{ status: string; added: number; missing: any }>(`/teacher/mock-exams/${id}/auto_generate/`, {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  },
};
