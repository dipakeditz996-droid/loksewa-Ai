import { apiClient } from "./client";
export interface Question {
  id: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  difficulty: string;
  correct_option?: string;
  explanation?: string;
}

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

export interface SavedQuestion {
  id: number;
  question: number;
  question_detail: Question & { topic: number };
  created_at: string;
}

export interface AnswerResult {
  status: string;
  // Present when the mode scores immediately (study/revision) — absent for
  // flexible/timed practice, which is only scored at final submit.
  is_correct?: boolean;
  correct_option?: string;
  explanation?: string;
}

export interface RevealResult {
  correct_option: string;
  explanation: string;
}

export interface StudySessionResponse extends PracticeSessionResponse {
  resume_index: number;
  resumed: boolean;
}

export interface RevisionSummary {
  overdue: number;
  repeatedly_incorrect: number;
  recent_mistakes: number;
  weak_topics: number;
  total_available: number;
}

export type RevisionFocus = "overdue" | "repeatedly_incorrect" | "recent_mistakes" | "weak_topics";

export const practiceApi = {
  startSession: (params: StartSessionParams) => {
    return apiClient<PracticeSessionResponse>("/practice-sessions/", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  
  saveAnswer: (sessionId: number, params: SaveAnswerParams) => {
    return apiClient<AnswerResult>(`/practice-sessions/${sessionId}/answer/`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  markViewed: (sessionId: number, questionId: number) => {
    return apiClient<{status: string}>(`/practice-sessions/${sessionId}/view/`, {
      method: "POST",
      body: JSON.stringify({ question_id: questionId }),
    });
  },

  reveal: (sessionId: number, questionId: number) => {
    return apiClient<RevealResult>(`/practice-sessions/${sessionId}/reveal/`, {
      method: "POST",
      body: JSON.stringify({ question_id: questionId }),
    });
  },

  startStudy: (params: { topic: string | number; subject?: string; exam?: string; restart?: boolean }) => {
    return apiClient<StudySessionResponse>("/practice-sessions/study/", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  getRevisionSummary: () => {
    return apiClient<RevisionSummary>("/practice-sessions/revision_summary/");
  },

  startRevision: (focus?: RevisionFocus) => {
    return apiClient<PracticeSessionResponse>("/practice-sessions/start_revision/", {
      method: "POST",
      body: JSON.stringify(focus ? { focus } : {}),
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

  startDailySession: () => {
    return apiClient<StudySessionResponse>("/practice-sessions/daily/", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  listSavedQuestions: () => apiClient<SavedQuestion[]>("/bookmarks/"),
};
