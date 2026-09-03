import { apiClient } from "./client";

// Mirrors exams.public_views.PublicExamPreferenceTreeView - fully
// data-driven (admin-managed via the Exam/ExamCategory CRUD), arbitrary
// depth via `children`, so a new category or PSC level/service shows up
// here with no frontend change.
export interface ExamPreferenceNode {
  id: number;
  name: string;
  children: ExamPreferenceNode[];
}

export interface ExamPreferenceCategory {
  id: number;
  name: string;
  exams: ExamPreferenceNode[];
}

export const examPreferencesApi = {
  getTree: () => apiClient<ExamPreferenceCategory[]>("/public/exam-preferences/"),
};
