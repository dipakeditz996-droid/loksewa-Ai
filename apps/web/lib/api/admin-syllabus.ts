import { apiClient } from "./client";

export interface SyllabusStats {
  categories: number;
  positions: number;
  subjects: number;
  chapters: number;
  topics: number;
}

export interface AdminExamCategory {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  position_count: number;
}

export interface AdminPosition {
  id: number;
  category: number | null;
  category_name: string;
  name: string;
  description: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  subject_count: number;
}

export interface AdminSubject {
  id: number;
  exam: number;
  position_name: string;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  chapter_count: number;
}

export interface AdminChapter {
  id: number;
  subject: number;
  subject_name: string;
  title: string;
  description: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  topic_count: number;
}

export interface AdminTopic {
  id: number;
  unit: number;
  chapter_name: string;
  name: string;
  description: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface ReorderItem {
  id: number;
  order: number;
}

const SYLLABUS_BASE = "/admin/syllabus";

export const adminSyllabusApi = {
  // Stats
  getStats: () => apiClient<SyllabusStats>(`${SYLLABUS_BASE}/stats/`),
  
  // Tree
  getTree: () => apiClient<any[]>(`${SYLLABUS_BASE}/tree/`),

  // Categories
  getCategories: () => apiClient<AdminExamCategory[]>(`${SYLLABUS_BASE}/categories/`),
  getCategory: (id: number) => apiClient<AdminExamCategory>(`${SYLLABUS_BASE}/categories/${id}/`),
  createCategory: (data: Partial<AdminExamCategory>) => apiClient<AdminExamCategory>(`${SYLLABUS_BASE}/categories/`, { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (id: number, data: Partial<AdminExamCategory>) => apiClient<AdminExamCategory>(`${SYLLABUS_BASE}/categories/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCategory: (id: number) => apiClient(`${SYLLABUS_BASE}/categories/${id}/`, { method: "DELETE" }),
  reorderCategories: (data: ReorderItem[]) => apiClient(`${SYLLABUS_BASE}/categories/reorder/`, { method: "PATCH", body: JSON.stringify(data) }),

  // Positions
  getPositions: (categoryId?: number) => apiClient<AdminPosition[]>(`${SYLLABUS_BASE}/positions/${categoryId ? `?category=${categoryId}` : ''}`),
  getPosition: (id: number) => apiClient<AdminPosition>(`${SYLLABUS_BASE}/positions/${id}/`),
  createPosition: (data: Partial<AdminPosition>) => apiClient<AdminPosition>(`${SYLLABUS_BASE}/positions/`, { method: "POST", body: JSON.stringify(data) }),
  updatePosition: (id: number, data: Partial<AdminPosition>) => apiClient<AdminPosition>(`${SYLLABUS_BASE}/positions/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePosition: (id: number) => apiClient(`${SYLLABUS_BASE}/positions/${id}/`, { method: "DELETE" }),
  reorderPositions: (data: ReorderItem[]) => apiClient(`${SYLLABUS_BASE}/positions/reorder/`, { method: "PATCH", body: JSON.stringify(data) }),

  // Subjects
  getSubjects: (positionId?: number) => apiClient<AdminSubject[]>(`${SYLLABUS_BASE}/subjects/${positionId ? `?position=${positionId}` : ''}`),
  getSubject: (id: number) => apiClient<AdminSubject>(`${SYLLABUS_BASE}/subjects/${id}/`),
  createSubject: (data: Partial<AdminSubject>) => apiClient<AdminSubject>(`${SYLLABUS_BASE}/subjects/`, { method: "POST", body: JSON.stringify(data) }),
  updateSubject: (id: number, data: Partial<AdminSubject>) => apiClient<AdminSubject>(`${SYLLABUS_BASE}/subjects/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSubject: (id: number) => apiClient(`${SYLLABUS_BASE}/subjects/${id}/`, { method: "DELETE" }),
  reorderSubjects: (data: ReorderItem[]) => apiClient(`${SYLLABUS_BASE}/subjects/reorder/`, { method: "PATCH", body: JSON.stringify(data) }),

  // Chapters
  getChapters: (subjectId?: number) => apiClient<AdminChapter[]>(`${SYLLABUS_BASE}/chapters/${subjectId ? `?subject=${subjectId}` : ''}`),
  getChapter: (id: number) => apiClient<AdminChapter>(`${SYLLABUS_BASE}/chapters/${id}/`),
  createChapter: (data: Partial<AdminChapter>) => apiClient<AdminChapter>(`${SYLLABUS_BASE}/chapters/`, { method: "POST", body: JSON.stringify(data) }),
  updateChapter: (id: number, data: Partial<AdminChapter>) => apiClient<AdminChapter>(`${SYLLABUS_BASE}/chapters/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteChapter: (id: number) => apiClient(`${SYLLABUS_BASE}/chapters/${id}/`, { method: "DELETE" }),
  reorderChapters: (data: ReorderItem[]) => apiClient(`${SYLLABUS_BASE}/chapters/reorder/`, { method: "PATCH", body: JSON.stringify(data) }),

  // Topics
  getTopics: (chapterId?: number) => apiClient<AdminTopic[]>(`${SYLLABUS_BASE}/topics/${chapterId ? `?chapter=${chapterId}` : ''}`),
  getTopic: (id: number) => apiClient<AdminTopic>(`${SYLLABUS_BASE}/topics/${id}/`),
  createTopic: (data: Partial<AdminTopic>) => apiClient<AdminTopic>(`${SYLLABUS_BASE}/topics/`, { method: "POST", body: JSON.stringify(data) }),
  updateTopic: (id: number, data: Partial<AdminTopic>) => apiClient<AdminTopic>(`${SYLLABUS_BASE}/topics/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTopic: (id: number) => apiClient(`${SYLLABUS_BASE}/topics/${id}/`, { method: "DELETE" }),
  reorderTopics: (data: ReorderItem[]) => apiClient(`${SYLLABUS_BASE}/topics/reorder/`, { method: "PATCH", body: JSON.stringify(data) }),
};
