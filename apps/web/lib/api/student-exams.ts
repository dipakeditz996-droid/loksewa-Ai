import { apiClient } from './client';

export interface StudentExam {
  id: number;
  title: string;
  description: string;
  exam_type: string;
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
  answers: StudentAnswer[];
}

export interface StudentExamResult extends StudentExamAttempt {
  answers: StudentAnswer[];
}

export interface Question {
  id: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
}

export const studentExamsApi = {
  getExams: async () => {
    return await apiClient<StudentExam[]>('/student/exams/');
  },
  
  getExamDetails: async (id: number) => {
    return await apiClient<StudentExam>(`/student/exams/${id}/`);
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
