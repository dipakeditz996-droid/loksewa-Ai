import { apiClient } from "./client";

export interface EvaluationQuestion {
  id: number;
  topic: number;
  topic_name: string;
  subject_name: string;
  text: string;
  marks: number;
  expected_time_minutes: number;
  difficulty: string;
  status: string;
}

export interface EvaluationData {
  id: number;
  answer: number;
  evaluator: number;
  evaluator_name: string;
  marks_obtained: number;
  feedback: string;
  evaluated_at: string;
}

export interface SubjectiveAnswerList {
  id: number;
  attempt: number;
  question: EvaluationQuestion;
  answer_text: string;
  file_url: string | null;
  status: "submitted" | "evaluated";
  submitted_at: string;
  word_count: number;
  student_name: string;
  has_evaluation: boolean;
}

export interface SubjectiveAnswerDetail {
  id: number;
  attempt: number;
  question: EvaluationQuestion;
  answer_text: string;
  file_url: string | null;
  status: "submitted" | "evaluated";
  last_saved_at: string;
  submitted_at: string;
  word_count: number;
  evaluation: EvaluationData | null;
}

export const teacherEvaluationService = {
  /**
   * List pending or evaluated answers
   * @param status 'submitted' or 'evaluated' (default is 'submitted')
   */
  getEvaluations: async (status: string = "submitted"): Promise<SubjectiveAnswerList[]> => {
    try {
      const data = await apiClient<SubjectiveAnswerList[]>(`/evaluations/?status=${status}`);
      return data || [];
    } catch (error) {
      console.error("Failed to fetch evaluations list:", error);
      throw error;
    }
  },

  /**
   * Get detail for a single subjective answer
   * @param id The subjective answer ID
   */
  getEvaluationDetail: async (id: number | string): Promise<SubjectiveAnswerDetail> => {
    try {
      const data = await apiClient<SubjectiveAnswerDetail>(`/evaluations/${id}/`);
      return data;
    } catch (error) {
      console.error(`Failed to fetch evaluation detail for ${id}:`, error);
      throw error;
    }
  },

  /**
   * Submit evaluation (marks & feedback)
   */
  submitEvaluation: async (
    id: number | string,
    payload: { marks_obtained: number; feedback: string }
  ): Promise<EvaluationData> => {
    try {
      const data = await apiClient<EvaluationData>(`/evaluations/${id}/evaluate/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return data;
    } catch (error) {
      console.error(`Failed to submit evaluation for ${id}:`, error);
      throw error;
    }
  },
};
