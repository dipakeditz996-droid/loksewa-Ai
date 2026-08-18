import { apiClient } from './client';

export interface StudyMaterial {
  id: number;
  title: string;
  slug: string;
  description: string;
  material_type: string;
  access_type: string;
  estimated_reading_time: number;
  updated_at: string;
  exam_name: string;
  subject_name: string;
  topic_name: string | null;
  is_bookmarked: boolean;
  progress: number;
  content?: string;
  file?: string;
}

export const notesApi = {
  getMaterials: async (params?: Record<string, string>): Promise<StudyMaterial[]> => {
    const searchParams = new URLSearchParams(params);
    const qs = searchParams.toString();
    return apiClient<StudyMaterial[]>(`/notes/materials/${qs ? `?${qs}` : ''}`);
  },

  getMaterial: async (id: string): Promise<StudyMaterial> => {
    return apiClient<StudyMaterial>(`/notes/materials/${id}/`);
  },

  getRecentMaterials: async (): Promise<StudyMaterial[]> => {
    return apiClient<StudyMaterial[]>('/notes/materials/recent/');
  },

  getBookmarkedMaterials: async (): Promise<StudyMaterial[]> => {
    return apiClient<StudyMaterial[]>('/notes/materials/bookmarks/');
  },

  toggleBookmark: async (id: number, action: 'bookmark' | 'unbookmark'): Promise<{status: string}> => {
    return apiClient<{status: string}>(`/notes/materials/${id}/bookmark/`, {
      method: action === 'bookmark' ? 'POST' : 'DELETE',
    });
  },

  updateProgress: async (id: number, progress: number): Promise<{status: string, progress: number}> => {
    return apiClient<{status: string, progress: number}>(`/notes/materials/${id}/progress/`, {
      method: 'POST',
      body: JSON.stringify({ progress }),
    });
  },
};
