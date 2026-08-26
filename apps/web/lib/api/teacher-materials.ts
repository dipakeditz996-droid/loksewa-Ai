import { apiClient } from './client';

export interface StudyMaterial {
  id: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  exam: number;
  subject: number;
  topic: number | null;
  material_type: string;
  difficulty: string;
  file: string | null;
  external_url: string | null;
  access_type: string;
  status: string;
  review_note: string;
  estimated_reading_time: number;
  created_at: string;
  updated_at: string;
  exam_name: string;
  subject_name: string;
  topic_name: string | null;
  author_name: string;
}

export const getTeacherMaterials = async (params: any = {}) => {
  let queryString = "";
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const queryStr = searchParams.toString();
    if (queryStr) {
      queryString = `?${queryStr}`;
    }
  }
  const response = await apiClient<any>(`/notes/teacher/materials/${queryString}`);
  return response;
};

export const getTeacherMaterial = async (id: number) => {
  const response = await apiClient<any>(`/notes/teacher/materials/${id}/`);
  return response;
};

export const createTeacherMaterial = async (data: FormData) => {
  const response = await apiClient<any>('/notes/teacher/materials/', {
    method: 'POST',
    body: data,
  });
  return response;
};

export const updateTeacherMaterial = async (id: number, data: FormData) => {
  const response = await apiClient<any>(`/notes/teacher/materials/${id}/`, {
    method: 'PATCH',
    body: data,
  });
  return response;
};

export const deleteTeacherMaterial = async (id: number) => {
  const response = await apiClient<any>(`/notes/teacher/materials/${id}/`, {
    method: 'DELETE',
  });
  return response;
};

export const submitTeacherMaterial = async (id: number) => {
  const response = await apiClient<any>(`/notes/teacher/materials/${id}/submit/`, {
    method: 'POST',
  });
  return response;
};

export const duplicateTeacherMaterial = async (id: number) => {
  const response = await apiClient<any>(`/notes/teacher/materials/${id}/duplicate/`, {
    method: 'POST',
  });
  return response;
};
