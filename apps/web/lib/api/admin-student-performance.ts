import { apiClient } from "./client";

/** Shared correct / incorrect / skipped shape used for subjects and topics. */
export interface AnswerBreakdown {
  questions_attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
}

export interface SubjectPerformance extends AnswerBreakdown {
  subject_id: number;
  subject_name: string;
  average_score: number;
}

export interface TopicPerformance extends AnswerBreakdown {
  topic_id: number;
  topic_name: string;
  chapter_name: string | null;
  subject_name: string | null;
  total_marks: number;
  marks_obtained: number;
}

export interface DifficultyPerformance extends AnswerBreakdown {
  difficulty: string;
}

export interface TrendPoint {
  attempt_id: number;
  exam_title: string | null;
  percentage: number;
  score: number;
  passed: boolean;
  date: string;
}

export interface StudentPerformance {
  student: {
    id: number;
    username: string;
    full_name: string;
    email: string;
    avatar: string | null;
    xp: number;
    level: number;
    streak: number;
    highest_streak: number;
    joined_date: string;
    active_courses: { id: number; title: string }[];
  };
  exam_performance: AnswerBreakdown & {
    total_attempted: number;
    total_completed: number;
    in_progress: number;
    average_score: number;
    average_percentage: number;
    highest_score: number;
    lowest_score: number;
    pass_count: number;
    fail_count: number;
    average_time_seconds: number;
    total_time_seconds: number;
    recent_exams: {
      attempt_id: number;
      exam_title: string | null;
      percentage: number;
      passed: boolean;
      date: string;
    }[];
  };
  practice_performance: {
    total_sessions: number;
    completed_sessions: number;
    average_score: number;
    accuracy: number;
    questions_attempted: number;
    correct: number;
    incorrect: number;
    skipped: number;
    total_time_seconds: number;
  };
  subjects: SubjectPerformance[];
  topics: TopicPerformance[];
  strong_topics: TopicPerformance[];
  weak_topics: TopicPerformance[];
  mistake_analysis: {
    by_difficulty: DifficultyPerformance[];
    weakest_subject: SubjectPerformance | null;
    best_subject: SubjectPerformance | null;
    weakest_topic: TopicPerformance | null;
    total_wrong: number;
    total_skipped: number;
  };
  trend: {
    points: TrendPoint[];
    /** Null until there are enough completed attempts to compare halves. */
    improvement: number | null;
  };
  meta: {
    weak_accuracy_threshold: number;
    min_answers_for_area: number;
    per_question_timing_available: { exam: boolean; practice: boolean };
  };
}

export interface ExamHistoryRow {
  attempt_id: number;
  examination_id: number;
  exam_title: string | null;
  exam_type: string | null;
  status: string;
  score: number;
  percentage: number;
  passed: boolean;
  correct: number;
  incorrect: number;
  skipped: number;
  time_taken_seconds: number;
  started_at: string;
  submitted_at: string | null;
}

export interface ExamHistoryResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  results: ExamHistoryRow[];
}

export interface ExamHistoryParams {
  [key: string]: unknown;
  status?: string;
  result?: "passed" | "failed" | "";
  exam_type?: string;
  examination?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export type AnswerStatus = "correct" | "incorrect" | "skipped";

export interface ReviewQuestion {
  number: number;
  question_id: number;
  reference: string | null;
  text: string;
  question_type: string;
  difficulty: string;
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  options: { A: string | null; B: string | null; C: string | null; D: string | null };
  student_answer: string | null;
  answer_text: string;
  correct_answer: string | null;
  status: AnswerStatus;
  marks: number;
  marks_obtained: number;
  explanation: string;
  /** Always null for exams — StudentAnswer stores no per-question duration. */
  time_spent_seconds: number | null;
}

export interface AttemptReview {
  attempt: {
    id: number;
    status: string;
    score: number;
    percentage: number;
    passed: boolean;
    time_taken_seconds: number;
    started_at: string;
    submitted_at: string | null;
  };
  student: { id: number; username: string; full_name: string };
  examination: {
    id: number;
    title: string | null;
    exam_type: string | null;
    total_marks: number;
  };
  summary: {
    total_questions: number;
    answered: number;
    correct: number;
    incorrect: number;
    skipped: number;
    accuracy: number;
  };
  questions: ReviewQuestion[];
}

const qs = (params: Record<string, unknown>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const s = search.toString();
  return s ? `?${s}` : "";
};

export const adminStudentPerformanceApi = {
  getPerformance: async (studentId: number) =>
    apiClient<StudentPerformance>(`/admin/students/${studentId}/performance/`),

  getExamHistory: async (studentId: number, params: ExamHistoryParams = {}) =>
    apiClient<ExamHistoryResponse>(
      `/admin/students/${studentId}/exam-history/${qs(params)}`
    ),

  getAttemptReview: async (attemptId: number) =>
    apiClient<AttemptReview>(`/admin/exam-attempts/${attemptId}/review/`),
};
