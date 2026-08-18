import { apiClient } from "./client";
import { Question } from "../mock/practice-data";

export type { Question };

export interface StartSessionParams {
  exam: string;
  subject: string;
  topic: string;
  difficulty: string;
  mode: string;
  total_questions: number;
}

export interface PracticeSession {
  id: number;
  user: number;
  exam: number;
  subject: number | null;
  topic: number | null;
  mode: string;
  difficulty: string | null;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  score: number;
  accuracy: number;
  time_taken_seconds: number;
  completed: boolean;
  created_at: string;
}

export interface PracticeSessionResponse {
  session: PracticeSession;
  questions: Question[]; // This will be SecureQuestionSerializer output initially
}

export interface SaveAnswerParams {
  question_id: number;
  selected_option: string | null;
  is_marked_for_review: boolean;
}

export interface AttemptDetail {
  attempt_id: number;
  question: Question;
  selected_option: string | null;
  is_correct: boolean;
  is_marked_for_review: boolean;
}

export interface SubmitSessionResponse {
  session: PracticeSession;
  attempts: AttemptDetail[];
}

export const practiceApi = {
  startSession: (params: StartSessionParams) => {
    return apiClient<PracticeSessionResponse>("/practice-sessions/", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  
  saveAnswer: (sessionId: number, params: SaveAnswerParams) => {
    return apiClient<{status: string}>(`/practice-sessions/${sessionId}/answer/`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  
  submitSession: (sessionId: number, time_taken_seconds: number) => {
    return apiClient<SubmitSessionResponse>(`/practice-sessions/${sessionId}/submit/`, {
      method: "POST",
      body: JSON.stringify({ time_taken_seconds }),
    });
  },

  getSessionResult: (sessionId: number) => {
    // We can just call submit again or a specific GET endpoint. 
    // Since submit is idempotent when completed, we can just call it to get the full result.
    return apiClient<SubmitSessionResponse>(`/practice-sessions/${sessionId}/submit/`, {
      method: "POST",
      body: JSON.stringify({ time_taken_seconds: 0 }),
    });
  },

  toggleBookmark: (questionId: number) => {
    return apiClient<{status: string; id?: number}>("/bookmarks/", {
      method: "POST",
      body: JSON.stringify({ question_id: questionId }),
    });
  },
};
