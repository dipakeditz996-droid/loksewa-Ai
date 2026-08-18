import { apiClient } from "./client";
import { Question } from "./teacher-questions";

export interface QuestionSetQuestion {
  id?: number;
  question: number; // Question ID
  question_details?: Question;
  order: number;
  marks: number;
}

export interface PracticeSet {
  id?: number;
  name: string;
  description: string;
  set_type: "custom" | "full_mock" | "subject" | "chapter" | "topic" | "position";
  status: "draft" | "pending_review" | "approved" | "changes_requested" | "rejected" | "published" | "archived";
  
  reviewer_comment?: string;
  reviewed_by?: number;
  submitted_at?: string;
  reviewed_at?: string;
  category?: number;
  exam?: number;
  subject?: number;
  chapter?: number;
  topic?: number;
  total_questions: number;
  time_limit: number;
  passing_marks: number;
  total_marks: number;
  marks_per_question: number;
  negative_marking: boolean;
  negative_marking_value: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  
  questions_list?: QuestionSetQuestion[];
  questions_data?: any[]; // Used for creating/updating
  
  created_at?: string;
  updated_at?: string;
  
  category_name?: string;
  position_name?: string;
  subject_name?: string;
  chapter_name?: string;
  topic_name?: string;
}

export const teacherPracticeSetsApi = {
  getPracticeSets: (params?: Record<string, string>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiClient<PracticeSet[]>(`/teacher/practice-sets/${query}`);
  },

  getPracticeSet: (id: string | number) => {
    return apiClient<PracticeSet>(`/teacher/practice-sets/${id}/`);
  },

  createPracticeSet: (data: Partial<PracticeSet>) => {
    return apiClient<PracticeSet>("/teacher/practice-sets/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updatePracticeSet: (id: string | number, data: Partial<PracticeSet>) => {
    return apiClient<PracticeSet>(`/teacher/practice-sets/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deletePracticeSet: (id: string | number) => {
    return apiClient<{ detail: string }>(`/teacher/practice-sets/${id}/`, {
      method: "DELETE",
    });
  },

  duplicatePracticeSet: (id: string | number) => {
    return apiClient<PracticeSet>(`/teacher/practice-sets/${id}/duplicate/`, {
      method: "POST",
    });
  },

  submitPracticeSet: (id: string | number) => {
    return apiClient<PracticeSet>(`/teacher/practice-sets/${id}/submit/`, {
      method: "POST",
    });
  },

  generateBlueprint: (id: string | number, data: { total_questions: number, difficulties?: any, topics?: any }) => {
    return apiClient<PracticeSet>(`/teacher/practice-sets/${id}/generate-blueprint/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  bulkImportQuestions: (id: string | number, data: any[]) => {
    return apiClient<any>(`/teacher/practice-sets/${id}/bulk-import/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
};
