import { apiClient, downloadFile } from './client';

export interface QuestionData {
  id: number;
  question_id: string;
  topic: number;
  chapter?: number;
  subject?: number;
  question_type: string;
  status: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  marks: number;
  negative_marks: number;
  expected_time_minutes: number;
  explanation: string;
  hint?: string;
  difficulty: string;
  model_answer: string;
  tags: string;
  reference: string;
  reviewer_comment: string;
  submitted_at: string;
  reviewed_at: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TeacherHierarchyTopic {
  id: number;
  name: string;
  is_active: boolean;
}

export interface TeacherHierarchyChapter {
  id: number;
  name: string;
  is_active: boolean;
  topics: TeacherHierarchyTopic[];
}

export interface TeacherHierarchySubject {
  id: number;
  name: string;
  code?: string;
  is_active: boolean;
  chapters: TeacherHierarchyChapter[];
}

export interface TeacherHierarchyPaper {
  id: number;
  name: string;
  is_active: boolean;
  subjects: TeacherHierarchySubject[];
}

export interface TeacherHierarchyExam {
  id: number;
  name: string;
  status: string;
  is_active: boolean;
  category_id: number;
  children: TeacherHierarchyExam[];
  papers: TeacherHierarchyPaper[];
}

export interface TeacherHierarchyCategory {
  id: number;
  name: string;
  is_active: boolean;
  positions: TeacherHierarchyExam[];
}

export interface TeacherImportRowData {
  sn: string;
  question: string;
  marks: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  model_answer: string;
  explanation: string;
  hint: string;
}

export interface TeacherImportRow {
  row_index: number;
  sn: string;
  status: 'valid' | 'incomplete' | 'error' | 'duplicate';
  errors: string[];
  missing: string[];
  missing_detail: string[];
  duplicate_of: string | null;
  data: TeacherImportRowData;
}

export interface TeacherImportReport {
  import_id: number;
  file_name: string;
  status: string;
  subject: { id: number; name: string; code?: string } | null;
  chapter: { id: number; name: string } | null;
  topic: { id: number; name: string } | null;
  question_type: string;
  difficulty: string;
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  error_rows: number;
  report_data: TeacherImportRow[];
  created_at: string;
}

export interface TeacherImportCommitResult {
  success: boolean;
  imported_count: number;
  status: string;
  question_ids: number[];
  skipped_duplicates: unknown[];
  message: string;
}

export interface TeacherImportHistoryItem {
  id: number;
  file_name: string;
  status: string;
  subject_name: string;
  chapter_title: string;
  topic_name: string;
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  error_rows: number;
  created_at: string;
}

export const getQuestions = async (params: Record<string, unknown> = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      queryParams.append(key, String(value));
    }
  });
  return apiClient<PaginatedResponse<QuestionData>>(`/teacher/questions/?${queryParams.toString()}`);
};

export const getQuestion = async (id: number) => {
  return apiClient<QuestionData>(`/teacher/questions/${id}/`);
};

export const createQuestion = async (data: Partial<QuestionData>) => {
  return apiClient<QuestionData>('/teacher/questions/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateQuestion = async (id: number, data: Partial<QuestionData>) => {
  return apiClient<QuestionData>(`/teacher/questions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const submitQuestion = async (id: number) => {
  return apiClient<{ detail: string }>(`/teacher/questions/${id}/submit/`, {
    method: 'POST',
  });
};

export const deleteQuestion = async (id: number) => {
  return apiClient<void>(`/teacher/questions/${id}/`, {
    method: 'DELETE',
  });
};

export const bulkImportQuestions = async (questions: Partial<QuestionData>[]) => {
  return apiClient<{ detail: string }>(`/teacher/questions/bulk-import/`, {
    method: 'POST',
    body: JSON.stringify({ questions }),
  });
};

// ==========================================
// Advanced Excel Upload & Review Workflow APIs
// ==========================================

export const getTeacherImportHierarchy = async (): Promise<TeacherHierarchyCategory[]> => {
  return apiClient<TeacherHierarchyCategory[]>('/teacher/questions/import/hierarchy/');
};

export const downloadTeacherTemplate = async (type: string = 'mcq'): Promise<void> => {
  return downloadFile(`/teacher/questions/import/template/?type=${encodeURIComponent(type)}`, 'Questions_Template.xlsx');
};

export const uploadTeacherQuestionFile = async (formData: FormData): Promise<TeacherImportReport> => {
  return apiClient<TeacherImportReport>('/teacher/questions/import/upload/', {
    method: 'POST',
    body: formData,
  });
};

export const commitTeacherQuestions = async (importId: number): Promise<TeacherImportCommitResult> => {
  return apiClient<TeacherImportCommitResult>(`/teacher/questions/import/${importId}/commit/`, {
    method: 'POST',
  });
};

export const downloadTeacherErrorReport = async (importId: number): Promise<void> => {
  return downloadFile(`/teacher/questions/import/${importId}/error-report/`, `import_${importId}_errors.xlsx`);
};

export const getTeacherImportHistory = async (): Promise<TeacherImportHistoryItem[]> => {
  return apiClient<TeacherImportHistoryItem[]>('/teacher/questions/import/');
};
