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
  getStats: () => apiClient<any>("/administration/syllabus/stats/"),
  getTree: () => apiClient<any>("/administration/syllabus/tree/"),
  
  // Reorder
  reorderItems: (endpoint: string, items: {id: number, order: number}[]) => 
    apiClient<any>(`/administration/syllabus/${endpoint}/reorder/`, {
      method: "PATCH",
      body: JSON.stringify(items)
    }),

  // Exam Categories
  getCategories: () => apiClient<ApiExamCategory[]>("/administration/syllabus/categories/"),
  
  // Exams
  getExams: (categoryId?: number) => 
    apiClient<ApiExam[]>(`/administration/syllabus/exams/${categoryId ? `?category=${categoryId}` : ''}`),
    
  // Papers
  getPapers: (examId?: number) => 
    apiClient<ApiPaper[]>(`/administration/syllabus/papers/${examId ? `?exam=${examId}` : ''}`),

  // Subjects
  getSubjects: (paperId?: number) => 
    apiClient<ApiSubject[]>(`/administration/syllabus/subjects/${paperId ? `?paper=${paperId}` : ''}`),

  // Chapters
  getChapters: (subjectId?: number) => 
    apiClient<ApiChapter[]>(`/administration/syllabus/chapters/${subjectId ? `?subject=${subjectId}` : ''}`),

  // Topics
  getTopics: (chapterId?: number) => 
    apiClient<ApiTopic[]>(`/administration/syllabus/topics/${chapterId ? `?chapter=${chapterId}` : ''}`),
};
