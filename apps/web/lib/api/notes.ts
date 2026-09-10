import { apiClient } from './client';

export interface StudyMaterial {
  id: number;
  title: string;
  slug: string;
  description: string;
  content_category?: 'syllabus' | 'subjective_topicwise' | 'objective_topicwise' | 'revision_notes';
  note_type?: 'standard' | 'ai' | 'subjective' | 'objective';
  material_type: string;
  access_type: string;
  estimated_reading_time: number;
  updated_at: string;
  exam_name?: string;
  parent_exam_name?: string;
  category_name?: string;
  subject_name?: string;
  chapter_name?: string;
  topic_name?: string | null;
  course_title?: string;
  is_bookmarked: boolean;
  progress: number;
  content?: string;
  file?: string;
  file_url?: string;
}

export interface StudentPortalPrep {
  id: number;
  name: string;
  levelId: number | null;
  levelName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  courseId: number | null;
  courseTitle: string | null;
}

export interface StudentPortalResponse {
  authorizedPreparations: StudentPortalPrep[];
  selectedPreparation: StudentPortalPrep | null;
  counts: {
    syllabus: number;
    subjective_topicwise: number;
    objective_topicwise: number;
    revision_notes: number;
    total: number;
  };
  sections: {
    syllabus: StudyMaterial[];
    subjective_topicwise: {
      standard: StudyMaterial[];
      ai: StudyMaterial[];
    };
    objective_topicwise: {
      standard: StudyMaterial[];
      ai: StudyMaterial[];
    };
    revision_notes: {
      subjective: StudyMaterial[];
      objective: StudyMaterial[];
    };
  };
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

  getStudentPortalView: async (examId?: number): Promise<StudentPortalResponse> => {
    return apiClient<StudentPortalResponse>(`/notes/student/portal/${examId ? `?exam_id=${examId}` : ''}`);
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
