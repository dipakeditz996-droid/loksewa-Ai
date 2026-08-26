import { apiClient } from './client';

export interface EligibilityRule {
  id: number;
  target_category?: number;
  target_position?: number;
  is_global: boolean;
}

/** Examination.EXAM_TYPES in exams/models.py. */
export type ExaminationType =
  | 'mock'
  | 'practice'
  | 'full'
  | 'position'
  | 'subject'
  | 'custom'
  | 'subjective';

/**
 * Examination.STATUS_CHOICES in exams/models.py, plus the three lifecycle
 * values that ExaminationViewSet.publish() writes ('scheduled' | 'live' |
 * 'completed') which are not declared in the model's choices.
 */
export type ExaminationStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'changes_requested'
  | 'rejected'
  | 'archived'
  | 'scheduled'
  | 'live'
  | 'completed';

export interface Examination {
  id: number;
  title: string;
  description: string;
  exam_type: ExaminationType;
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
  status: ExaminationStatus;
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

/* ------------------------------------------------------------------ *
 * Examination Analytics
 * GET /api/admin/exams/{id}/analytics/
 * Shape mirrors administration/exam_views.py :: ExaminationViewSet.analytics
 * ------------------------------------------------------------------ */

export type ExamDifficulty = 'easy' | 'medium' | 'hard';

/** Compact examination descriptor embedded in the analytics payload. */
export interface ExamAnalyticsExam {
  id: number;
  title: string;
  exam_type: string;
  status: string;
}

/**
 * When the examination has zero attempts the backend short-circuits and only
 * returns the three counters below (plus `message`), so every aggregated
 * metric is optional by design — it is not a "maybe missing" field.
 */
export interface ExamAnalyticsSummary {
  total_attempts: number;
  completed_attempts: number;
  in_progress_attempts: number;
  average_score?: number;
  average_percentage?: number;
  highest_score?: number;
  lowest_score?: number;
  pass_count?: number;
  fail_count?: number;
}

export interface ExamTimeStatistics {
  average_duration_seconds: number;
  /** Django Min() returns null when there are no evaluated attempts. */
  min_duration_seconds: number | null;
  max_duration_seconds: number | null;
}

export interface ExamScoreDistributionBucket {
  /** Pre-formatted decile label produced by the backend, e.g. "40-50%". */
  range: string;
  count: number;
}

export interface ExamQuestionPerformance {
  question_id: number;
  question_number: number;
  /** Truncated to 100 chars by the backend. */
  question_text: string;
  total_responses: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
  difficulty: ExamDifficulty;
}

export interface ExamDifficultyPerformance {
  /** Capitalised by the backend: "Easy" | "Medium" | "Hard". */
  level: string;
  /** Number of recorded responses at this difficulty (not distinct students). */
  attempts: number;
  accuracy: number;
}

export interface ExamAnalyticsResponse {
  exam: ExamAnalyticsExam;
  summary: ExamAnalyticsSummary;
  /** Only present on the "no attempts yet" response. */
  message?: string;
  time_statistics?: ExamTimeStatistics;
  score_distribution?: ExamScoreDistributionBucket[];
  question_performance?: ExamQuestionPerformance[];
  difficulty_performance?: ExamDifficultyPerformance[];
}

/* ------------------------------------------------------------------ *
 * Examination Results
 * GET /api/admin/exams/{id}/results/
 * Shape mirrors administration/exam_views.py :: ExaminationViewSet.results
 * ------------------------------------------------------------------ */

export type ExamAttemptStatus = 'in-progress' | 'submitted' | 'evaluated';

export interface ExamResultRow {
  id: number;
  student_id: number;
  student_name: string;
  email: string;
  started_at: string;
  submitted_at: string | null;
  status: ExamAttemptStatus;
  score: number;
  percentage: number;
  passed: boolean;
  time_taken_seconds: number;
  correct_answers: number;
  incorrect_answers: number;
  skipped_answers: number;
  /** Null while the attempt has not been evaluated. */
  rank: number | null;
}

export interface ExamResultsResponse {
  count: number;
  /** Absent on the backend's out-of-range fallback response. */
  num_pages?: number;
  current_page?: number;
  results: ExamResultRow[];
}

/** Only orderings backed by real columns on ExaminationAttempt. */
export type ExamResultsOrdering =
  | '-score'
  | 'score'
  | '-percentage'
  | 'percentage'
  | 'time_taken_seconds'
  | '-time_taken_seconds'
  | '-submitted_at'
  | 'submitted_at';

export interface ExamResultsQueryParams {
  page?: number;
  page_size?: number;
  passed?: boolean;
  status?: ExamAttemptStatus;
  search?: string;
  ordering?: ExamResultsOrdering;
}

function buildQueryString(params?: object): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, String(value));
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const adminExamApi = {
  getOverview: async () => {
    return apiClient<any>(`/admin/exams-overview/`);
  },

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
    return apiClient<ExamAnalyticsResponse>(`/admin/exams/${id}/analytics/`);
  },

  getResults: async (id: number, params?: ExamResultsQueryParams) => {
    return apiClient<ExamResultsResponse>(
      `/admin/exams/${id}/results/${buildQueryString(params)}`
    );
  },
};
