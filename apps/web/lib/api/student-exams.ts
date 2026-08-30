import { apiClient } from './client';

/** Examination.OBJECTIVE_CATEGORIES in exams/models.py — the four finalized
 * Objective Exam categories. May be null on older/uncategorized exams. */
export type ObjectiveCategory = "old_past" | "model" | "live" | "custom" | null;

export interface StudentExam {
  id: number;
  title: string;
  description: string;
  exam_type: string;
  objective_category: ObjectiveCategory;
  // Same as objective_category, except a Live Exam auto-promotes to "model"
  // 48h after its scheduled start — group listings by this, not the raw value.
  effective_category: ObjectiveCategory;
  category_name: string;
  exam_name: string;
  subject_name: string;
  instructions: string;
  thumbnail: string | null;
  total_questions: number;
  time_limit: number;
  total_marks: number;
  passing_marks: number;
  marks_per_question: number;
  negative_marking: boolean;
  negative_marking_value: number;
  max_attempts: number;
  allow_resume: boolean;
  start_time: string | null;
  end_time: string | null;
  status: string;
  has_attempted: boolean;
  attempts_used?: number;
  attempts_remaining?: number | null;
  active_attempt_id?: number | null;
  can_start?: boolean;
  start_blocked_reason?: string | null;
}


export interface StudentAnswer {
  id: number;
  question: number;
  selected_option: string | null;
  is_correct?: boolean;
  marks_awarded?: number;
}

export interface StudentExamAttempt {
  id: number;
  examination: number;
  examination_title: string;
  started_at: string;
  submitted_at: string | null;
  status: 'in-progress' | 'submitted' | 'evaluated';
  score: number;
  percentage: number;
  passed: boolean;
  time_taken_seconds: number;
  total_questions?: number;
  correct_answers?: number;
  wrong_answers?: number;
  unanswered?: number;
  answers: StudentAnswer[];
}

export interface StudentExamResult extends StudentExamAttempt {
  answers: StudentAnswer[];
}

export interface Question {
  id: number;
  text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  marks: number;
  difficulty: string;
  question_type: string;
}

export interface AcademicHierarchyNode {
  id: number;
  name?: string;
  title?: string;
  is_active: boolean;
  exams?: AcademicHierarchyNode[];
  papers?: AcademicHierarchyNode[];
  subjects?: AcademicHierarchyNode[];
  chapters?: AcademicHierarchyNode[];
  topics?: AcademicHierarchyNode[];
}

export interface CustomExamParams {
  // Exactly one of exam_id (a specific Position/Level) or category_id (every
  // Position/Level under a Central/Provincial/Institutional bank) is
  // required - category_id builds a full-syllabus exam across all of them.
  exam_id?: number;
  category_id?: number;
  paper_id?: number;
  subject_id?: number;
  chapter_id?: number;
  topic_id?: number;
  difficulty?: string;
  question_type?: string;
  question_count?: number;
  random_questions?: boolean;
}


export const studentExamsApi = {
  getExams: async () => {
    return await apiClient<StudentExam[]>('/student/exams/');
  },
  
  getPastResults: async () => {
    // StudentExaminationAttemptViewSet sets pagination_class =
    // StandardResultsSetPagination, so this returns {count, next, previous,
    // results} - not a plain array. Unwrap defensively so a future removal
    // of pagination doesn't silently break this again either way.
    const data = await apiClient<{ results: StudentExamAttempt[] } | StudentExamAttempt[]>(
      '/student/exam-attempts/?status=submitted'
    );
    return Array.isArray(data) ? data : data.results;
  },
  
  getExamDetails: async (id: number) => {
    return await apiClient<StudentExam>(`/student/exams/${id}/`);
  },
  
  generateCustomExam: async (params: CustomExamParams) => {
    return await apiClient<StudentExamAttempt>('/student/exams/generate_custom/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
  
  startExam: async (id: number) => {
    return await apiClient<StudentExamAttempt>(`/student/exams/${id}/start/`, {
      method: 'POST'
    });
  },
  
  getAttempt: async (attemptId: number) => {
    return await apiClient<StudentExamAttempt>(`/student/exam-attempts/${attemptId}/`);
  },
  
  getAttemptQuestions: async (attemptId: number) => {
    return await apiClient<Question[]>(`/student/exam-attempts/${attemptId}/questions/`);
  },
  


  getAcademicHierarchy: async () => {
    return await apiClient<AcademicHierarchyNode[]>('/student/exams/academic-hierarchy/');
  },

  getAvailableQuestionCount: async (params: Partial<CustomExamParams>) => {
    const res = await apiClient<{available: number}>('/student/exams/available-questions/', {
      method: 'POST',
      body: JSON.stringify(params)
    });
    return res.available;
  },
  
  saveAnswer: async (attemptId: number, questionId: number, selectedOption: string | null) => {
    return await apiClient(`/student/exam-attempts/${attemptId}/answer/`, {
      method: 'POST',
      body: JSON.stringify({
        question: questionId,
        selected_option: selectedOption
      })
    });
  },
  
  submitAttempt: async (attemptId: number) => {
    return await apiClient(`/student/exam-attempts/${attemptId}/submit/`, {
      method: 'POST'
    });
  },
  
  getResult: async (attemptId: number) => {
    return await apiClient<StudentExamResult>(`/student/exam-attempts/${attemptId}/result/`);
  }
};
