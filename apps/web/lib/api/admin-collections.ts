import { apiClient } from './client';

export interface CollectionRule {
  id?: number;
  keywords: string[];
  apply_to_new: boolean;
  apply_to_csv: boolean;
}

export interface QuestionCollection {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  status: 'active' | 'inactive';
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
  question_count?: number;
  rule?: CollectionRule;
}

export interface CollectionQuestion {
  id: number;
  question_id: string;
  text: string;
  question_type: string;
  difficulty: string;
  subject_name: string;
  chapter_name: string;
  status: string;
}

export const adminCollectionsApi = {
  getCollections: () =>
    apiClient<QuestionCollection[]>('/admin/collections/'),

  getCollection: (id: number) =>
    apiClient<QuestionCollection>(`/admin/collections/${id}/`),

  createCollection: (data: Partial<QuestionCollection>) =>
    apiClient<QuestionCollection>('/admin/collections/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCollection: (id: number, data: Partial<QuestionCollection>) =>
    apiClient<QuestionCollection>(`/admin/collections/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteCollection: (id: number) =>
    apiClient(`/admin/collections/${id}/`, { method: 'DELETE' }),

  getCollectionQuestions: (id: number) =>
    apiClient<CollectionQuestion[]>(`/admin/collections/${id}/questions/`),

  addQuestions: (id: number, questionIds: number[]) =>
    apiClient<{ success: boolean; added: number; question_count: number }>(
      `/admin/collections/${id}/add_questions/`,
      { method: 'POST', body: JSON.stringify({ question_ids: questionIds }) }
    ),

  removeQuestions: (id: number, questionIds: number[]) =>
    apiClient<{ success: boolean; removed: number; question_count: number }>(
      `/admin/collections/${id}/remove_questions/`,
      { method: 'POST', body: JSON.stringify({ question_ids: questionIds }) }
    ),

  scanRules: (id: number) =>
    apiClient<{ scanned: number; matched: number; suggestions_created: number }>(
      `/admin/collections/${id}/scan_rules/`,
      { method: 'POST' }
    ),
};
