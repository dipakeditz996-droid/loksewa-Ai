import { apiClient } from "./client";

export interface ApiExamCategory {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  order: number;
  position_count: number;
}

export interface ApiExam {
  id: number;
  category: number;
  category_name: string;
  name: string;
  description: string;
  is_active: boolean;
  order: number;
  paper_count: number;
}

export interface ApiPaper {
  id: number;
  exam: number;
  exam_name: string;
  name: string;
  paper_number: string;
  description: string;
  is_active: boolean;
  order: number;
  subject_count: number;
}

export interface ApiSubject {
  id: number;
  paper: number;
  paper_name: string;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  order: number;
  chapter_count: number;
}

export interface ApiChapter {
  id: number;
  subject: number;
  subject_name: string;
  title: string;
  description: string;
  is_active: boolean;
  order: number;
  topic_count: number;
}

export interface ApiTopic {
  id: number;
  chapter: number;
  chapter_name: string;
  name: string;
  description: string;
  is_active: boolean;
  order: number;
}

export const adminAcademicApi = {
  // Stats & Tree
  getStats: () => apiClient<any>("/admin/syllabus/stats/"),
  getTree: () => apiClient<any>("/admin/syllabus/tree/"),
  
  // Reorder
  reorderItems: (endpoint: string, items: {id: number, order: number}[]) => 
    apiClient<any>(`/admin/syllabus/${endpoint}/reorder/`, {
      method: "PATCH",
      body: JSON.stringify(items)
    }),

  // Exam Categories
  getCategories: () => apiClient<ApiExamCategory[]>("/admin/syllabus/categories/"),
  
  // Exams
  getExams: (categoryId?: number) =>
    apiClient<ApiExam[]>(`/admin/syllabus/exams/${categoryId ? `?category=${categoryId}` : ''}`),
  getExam: (id: number) => apiClient<ApiExam>(`/admin/syllabus/exams/${id}/`),
  createExam: (data: Partial<ApiExam>) => apiClient<ApiExam>(`/admin/syllabus/exams/`, { method: "POST", body: JSON.stringify(data) }),
  updateExam: (id: number, data: Partial<ApiExam>) => apiClient<ApiExam>(`/admin/syllabus/exams/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteExam: (id: number) => apiClient(`/admin/syllabus/exams/${id}/`, { method: "DELETE" }),

  // Papers
  getPapers: (examId?: number) =>
    apiClient<ApiPaper[]>(`/admin/syllabus/papers/${examId ? `?exam=${examId}` : ''}`),
  getPaper: (id: number) => apiClient<ApiPaper>(`/admin/syllabus/papers/${id}/`),
  createPaper: (data: Partial<ApiPaper>) => apiClient<ApiPaper>(`/admin/syllabus/papers/`, { method: "POST", body: JSON.stringify(data) }),
  updatePaper: (id: number, data: Partial<ApiPaper>) => apiClient<ApiPaper>(`/admin/syllabus/papers/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePaper: (id: number) => apiClient(`/admin/syllabus/papers/${id}/`, { method: "DELETE" }),

  // Subjects
  getSubjects: (paperId?: number) =>
    apiClient<ApiSubject[]>(`/admin/syllabus/subjects/${paperId ? `?paper=${paperId}` : ''}`),
  getSubject: (id: number) => apiClient<ApiSubject>(`/admin/syllabus/subjects/${id}/`),
  createSubject: (data: Partial<ApiSubject>) => apiClient<ApiSubject>(`/admin/syllabus/subjects/`, { method: "POST", body: JSON.stringify(data) }),
  updateSubject: (id: number, data: Partial<ApiSubject>) => apiClient<ApiSubject>(`/admin/syllabus/subjects/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSubject: (id: number) => apiClient(`/admin/syllabus/subjects/${id}/`, { method: "DELETE" }),

  // Chapters
  getChapters: (subjectId?: number) =>
    apiClient<ApiChapter[]>(`/admin/syllabus/chapters/${subjectId ? `?subject=${subjectId}` : ''}`),
  getChapter: (id: number) => apiClient<ApiChapter>(`/admin/syllabus/chapters/${id}/`),
  createChapter: (data: Partial<ApiChapter>) => apiClient<ApiChapter>(`/admin/syllabus/chapters/`, { method: "POST", body: JSON.stringify(data) }),
  updateChapter: (id: number, data: Partial<ApiChapter>) => apiClient<ApiChapter>(`/admin/syllabus/chapters/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteChapter: (id: number) => apiClient(`/admin/syllabus/chapters/${id}/`, { method: "DELETE" }),

  // Topics
  getTopics: (chapterId?: number) =>
    apiClient<ApiTopic[]>(`/admin/syllabus/topics/${chapterId ? `?chapter=${chapterId}` : ''}`),
  getTopic: (id: number) => apiClient<ApiTopic>(`/admin/syllabus/topics/${id}/`),
  createTopic: (data: Partial<ApiTopic>) => apiClient<ApiTopic>(`/admin/syllabus/topics/`, { method: "POST", body: JSON.stringify(data) }),
  updateTopic: (id: number, data: Partial<ApiTopic>) => apiClient<ApiTopic>(`/admin/syllabus/topics/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTopic: (id: number) => apiClient(`/admin/syllabus/topics/${id}/`, { method: "DELETE" }),
};
