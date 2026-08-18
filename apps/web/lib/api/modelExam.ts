import { apiClient } from "./client";
import type { Question } from "./practice";

export interface ModelExam {
  id: number;
  title: string;
  description: string;
  exam: number;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  passing_marks: number | null;
  negative_marking: number;
  status: string;
}

export interface ModelExamAttempt {
  id: number;
  student: number;
  model_exam: ModelExam;
  started_at: string;
  submitted_at: string | null;
  status: string;
  score: number;
  accuracy: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  time_taken_seconds: number;
}

export interface StartModelExamResponse {
  attempt: ModelExamAttempt;
  questions: Question[];
  answers: Record<number, {
    selected_option: string | null;
    is_marked_for_review: boolean;
  }>;
}

export interface SubmitModelExamResponse {
  attempt: ModelExamAttempt;
  answers: Array<{
    attempt_id: number;
    question: Question;
    selected_option: string | null;
    is_correct: boolean;
    is_marked_for_review: boolean;
  }>;
}

export const modelExamApi = {
  // Get all published model exams
  getExams: (): Promise<ModelExam[]> => {
    return apiClient<ModelExam[]>("/model-exams/");
  },

  // Get details of a single model exam
  getExam: (id: number): Promise<ModelExam> => {
    return apiClient<ModelExam>(`/model-exams/${id}/`);
  },

  // Start or resume an exam attempt
  startExam: (modelExamId: number): Promise<StartModelExamResponse> => {
    return apiClient<StartModelExamResponse>("/model-exam-attempts/", {
      method: "POST",
      body: JSON.stringify({ model_exam_id: modelExamId })
    });
  },

  // Save an answer during the exam
  saveAnswer: (attemptId: number, questionId: number, selectedOption: string | null, isMarkedForReview: boolean = false): Promise<{ status: string }> => {
    return apiClient<{ status: string }>(`/model-exam-attempts/${attemptId}/answer/`, {
      method: "POST",
      body: JSON.stringify({
        question_id: questionId,
        selected_option: selectedOption,
        is_marked_for_review: isMarkedForReview
      })
    });
  },

  // Submit the exam
  submitExam: (attemptId: number): Promise<SubmitModelExamResponse> => {
    return apiClient<SubmitModelExamResponse>(`/model-exam-attempts/${attemptId}/submit/`, {
      method: "POST"
    });
  },

  // Get history of attempts
  getHistory: (): Promise<ModelExamAttempt[]> => {
    return apiClient<ModelExamAttempt[]>("/model-exam-attempts/");
  },

  // Get result of a submitted attempt
  getResult: (attemptId: number): Promise<SubmitModelExamResponse> => {
    return apiClient<SubmitModelExamResponse>(`/model-exam-attempts/${attemptId}/submit/`, {
      method: "POST"
    });
  }
};
