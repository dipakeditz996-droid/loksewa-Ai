import { apiClient } from "./client";

// Evaluation queue for subjective ExaminationAttempt answers - the canonical
// Examination architecture's grading flow (distinct from the legacy
// SubjectiveAnswer/Evaluation system that /teacher/evaluate still serves).

export interface EvaluationQueueEntry {
  id: number;
  examination: number;
  examination_title: string;
  student: number;
  student_name: string;
  submitted_at: string;
  status: "submitted" | "evaluated";
  score: number;
  percentage: number;
  pending_count: number;
}

export interface EvaluationQuestion {
  id: number;
  text: string;
  question_type: string;
  marks: number;
  model_answer: string;
}

export interface EvaluationAnswer {
  id: number;
  question: number;
  question_detail: EvaluationQuestion;
  answer_text: string;
  marks_awarded: number;
  evaluated_at: string | null;
}

export interface EvaluationAttemptDetail {
  id: number;
  examination: number;
  examination_title: string;
  student: number;
  student_name: string;
  submitted_at: string;
  status: "submitted" | "evaluated";
  score: number;
  percentage: number;
  answers: EvaluationAnswer[];
}

export const teacherExamEvaluationsApi = {
  getQueue: async (statusFilter: "pending" | "all" = "pending") => {
    const data = await apiClient<{ results: EvaluationQueueEntry[] } | EvaluationQueueEntry[]>(
      `/teacher/examination-attempts/?status=${statusFilter}`
    );
    return Array.isArray(data) ? data : data.results;
  },

  getAttempt: async (attemptId: number) => {
    return apiClient<EvaluationAttemptDetail>(`/teacher/examination-attempts/${attemptId}/`);
  },

  evaluate: async (attemptId: number, answers: { answer_id: number; marks_awarded: number }[]) => {
    return apiClient<EvaluationAttemptDetail>(`/teacher/examination-attempts/${attemptId}/evaluate/`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },
};
