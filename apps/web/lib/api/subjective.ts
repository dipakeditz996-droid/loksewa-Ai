import { apiClient } from './client';

export interface SubjectiveQuestion {
  id: number;
  topic: number;
  topic_name: string;
  subject_name: string;
  text: string;
  marks: number;
  suggested_time_minutes: number;
  difficulty: string;
  model_answer?: string; // only returned for teachers
  is_active: boolean;
}

export interface SubjectivePracticeSet {
  id: number;
  title: string;
  description: string;
  exam: number;
  subject: number;
  subject_name: string;
  topic: number | null;
  topic_name: string;
  question_count: number;
  estimated_time_minutes: number;
  difficulty: string;
  status: string;
}

export interface SubjectiveModelExam {
  id: number;
  title: string;
  description: string;
  exam: number;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number | null;
  status: string;
  question_count: number;
}

export interface Annotation {
  id: number;
  selected_text: string;
  comment: string;
  start_offset: number;
  end_offset: number;
  created_by: number;
  created_at: string;
}

export interface VideoFeedback {
  id: number;
  youtube_url: string;
  embed_url: string;
  created_at: string;
}

export interface Evaluation {
  id: number;
  answer: number;
  evaluator: number;
  evaluator_name: string;
  marks_obtained: number;
  feedback: string;
  evaluated_at: string;
  annotations: Annotation[];
  video_feedback: VideoFeedback | null;
}

export interface SubjectiveAnswer {
  id: number;
  attempt: number;
  question: SubjectiveQuestion;
  answer_text: string;
  file_url: string | null;
  status: 'draft' | 'submitted' | 'under-review' | 'evaluated' | 'returned';
  last_saved_at: string;
  submitted_at: string | null;
  word_count: number;
  evaluation: Evaluation | null;
  student_name?: string; // for teacher list view
  has_evaluation?: boolean;
}

export interface SubjectiveAttempt {
  id: number;
  student: number;
  practice_set: number | null;
  practice_set_detail: SubjectivePracticeSet | null;
  model_exam: number | null;
  model_exam_detail: SubjectiveModelExam | null;
  mode: 'practice' | 'topic' | 'model_exam';
  started_at: string;
  submitted_at: string | null;
  status: 'in-progress' | 'submitted';
  answers: SubjectiveAnswer[];
}

export const subjectiveApi = {
  // ---------------------------------------------------------
  // STUDENT ENDPOINTS
  // ---------------------------------------------------------

  getPracticeSets: () => {
    return apiClient<SubjectivePracticeSet[]>('/subjective-practice-sets/');
  },

  getPracticeSet: (id: number) => {
    return apiClient<SubjectivePracticeSet>(`/subjective-practice-sets/${id}/`);
  },

  getModelExams: () => {
    return apiClient<SubjectiveModelExam[]>('/subjective-model-exams/');
  },

  getQuestions: (topicId?: number) => {
    const url = topicId ? `/subjective-questions/?topic=${topicId}` : '/subjective-questions/';
    return apiClient<SubjectiveQuestion[]>(url);
  },

  startAttempt: (config: { mode: string, practice_set_id?: number, model_exam_id?: number, question_ids?: number[] }) => {
    return apiClient<SubjectiveAttempt>('/subjective-attempts/', {
      method: "POST",
      body: JSON.stringify(config)
    });
  },

  getAttempt: (id: number) => {
    return apiClient<SubjectiveAttempt>(`/subjective-attempts/${id}/`);
  },

  getAttemptsHistory: () => {
    return apiClient<SubjectiveAttempt[]>('/subjective-attempts/');
  },

  saveDraft: (attemptId: number, questionId: number, answerText: string) => {
    return apiClient<{status: string, word_count: number, last_saved_at: string}>(`/subjective-attempts/${attemptId}/save_draft/`, {
      method: "POST",
      body: JSON.stringify({ question_id: questionId, answer_text: answerText })
    });
  },

  submitAnswer: (attemptId: number, questionId: number, answerText: string) => {
    return apiClient<{status: string}>(`/subjective-attempts/${attemptId}/submit_answer/`, {
      method: "POST",
      body: JSON.stringify({ question_id: questionId, answer_text: answerText })
    });
  },

  submitAttempt: (attemptId: number) => {
    return apiClient<SubjectiveAttempt>(`/subjective-attempts/${attemptId}/submit/`, {
      method: "POST"
    });
  },

  // ---------------------------------------------------------
  // TEACHER / ADMIN ENDPOINTS
  // ---------------------------------------------------------

  getPendingEvaluations: (status: string = 'submitted') => {
    return apiClient<SubjectiveAnswer[]>(`/evaluations/?status=${status}`);
  },

  getAnswerForEvaluation: (answerId: number) => {
    return apiClient<SubjectiveAnswer>(`/evaluations/${answerId}/`);
  },

  evaluateAnswer: (answerId: number, marks: number, feedback: string) => {
    return apiClient<Evaluation>(`/evaluations/${answerId}/evaluate/`, {
      method: "POST",
      body: JSON.stringify({ marks_obtained: marks, feedback: feedback })
    });
  },

  addAnnotation: (answerId: number, selectedText: string, comment: string, startOffset: number, endOffset: number) => {
    return apiClient<Annotation>(`/evaluations/${answerId}/annotate/`, {
      method: "POST",
      body: JSON.stringify({ selected_text: selectedText, comment: comment, start_offset: startOffset, end_offset: endOffset })
    });
  },

  addVideoFeedback: (answerId: number, youtubeUrl: string) => {
    return apiClient<VideoFeedback>(`/evaluations/${answerId}/video_feedback/`, {
      method: "POST",
      body: JSON.stringify({ youtube_url: youtubeUrl })
    });
  }
};
