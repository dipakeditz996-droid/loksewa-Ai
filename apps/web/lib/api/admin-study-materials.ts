import { apiClient } from "./client";

export type MaterialType =
  | "notes" | "pdf" | "video" | "document"
  | "presentation" | "external_link" | "study_guide" | "reference";

export type MaterialDifficulty = "beginner" | "intermediate" | "advanced";
export type MaterialAccess = "free" | "premium";
export type MaterialStatus =
  | "draft" | "pending_review" | "changes_requested"
  | "published" | "rejected" | "archived";

export interface StudyMaterialListItem {
  id: number;
  title: string;
  description: string;
  teacher: string;
  subject: string;
  exam: string;
  materialType: MaterialType;
  difficulty: MaterialDifficulty;
  status: MaterialStatus;
  accessType: MaterialAccess;
  estimatedReadingTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudyMaterialsResponse {
  materials: StudyMaterialListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StudyMaterialDetail extends Omit<StudyMaterialListItem, "description"> {
  slug: string;
  description: string;
  content: string;
  examId: number | null;
  subjectId: number | null;
  topic: string | null;
  topicId: number | null;
  reviewNote: string;
  externalUrl: string | null;
  fileUrl: string | null;
}

export interface CreateStudyMaterialPayload {
  title: string;
  exam: number;
  subject: number;
  topic?: number | null;
  description?: string;
  content?: string;
  material_type?: MaterialType;
  difficulty?: MaterialDifficulty;
  access_type?: MaterialAccess;
  status?: MaterialStatus;
  external_url?: string;
  estimated_reading_time?: number;
  /** When present the request is sent as multipart instead of JSON. */
  file?: File | null;
}

/** Sends multipart when a file is attached, JSON otherwise. */
function buildRequest(payload: CreateStudyMaterialPayload | Partial<CreateStudyMaterialPayload>) {
  const { file, ...rest } = payload;
  if (!file) {
    return { body: JSON.stringify(rest) as any, headers: undefined };
  }
  const form = new FormData();
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      form.append(key, String(value));
    }
  });
  form.append("file", file);
  // No Content-Type header: the browser sets it so the boundary is included.
  return { body: form as any, headers: undefined };
}

export const adminStudyMaterialApi = {
  list: async (params?: {
    status?: string;
    type?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.type) query.set("type", params.type);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<StudyMaterialsResponse>(`/admin/study-materials/?${query.toString()}`);
  },

  get: async (id: number | string) =>
    apiClient<StudyMaterialDetail>(`/admin/study-materials/${id}/`),

  create: async (payload: CreateStudyMaterialPayload) => {
    const { body } = buildRequest(payload);
    return apiClient<{ id: number; title: string; slug: string; status: MaterialStatus }>(
      "/admin/study-materials/",
      { method: "POST", body }
    );
  },

  update: async (id: number | string, payload: Partial<CreateStudyMaterialPayload>) => {
    const { body } = buildRequest(payload);
    return apiClient<{ success: boolean; id: number; status: MaterialStatus }>(
      `/admin/study-materials/${id}/`,
      { method: "PATCH", body }
    );
  },

  remove: async (id: number | string) =>
    apiClient(`/admin/study-materials/${id}/`, { method: "DELETE" }),
};

// ===== Categories & Collections =====

export interface MaterialCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  is_active: boolean;
  order: number;
  material_count: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialCollection {
  id: number;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
  material_count: number;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionMaterial {
  id: number;
  title: string;
  material_type: MaterialType;
  difficulty: MaterialDifficulty;
  status: MaterialStatus;
  subject_name: string;
}

/** Both endpoints return bare arrays (pagination is off). */
const asArray = <T,>(res: any): T[] => (Array.isArray(res) ? res : (res?.results ?? []));

export const adminMaterialCategoryApi = {
  list: async (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return asArray<MaterialCategory>(await apiClient<any>(`/admin/material-categories/${q}`));
  },
  create: async (data: Partial<MaterialCategory>) =>
    apiClient<MaterialCategory>("/admin/material-categories/", {
      method: "POST", body: JSON.stringify(data),
    }),
  update: async (id: number, data: Partial<MaterialCategory>) =>
    apiClient<MaterialCategory>(`/admin/material-categories/${id}/`, {
      method: "PATCH", body: JSON.stringify(data),
    }),
  remove: async (id: number) =>
    apiClient(`/admin/material-categories/${id}/`, { method: "DELETE" }),
};

export const adminMaterialCollectionApi = {
  list: async (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return asArray<MaterialCollection>(await apiClient<any>(`/admin/material-collections/${q}`));
  },
  create: async (data: Partial<MaterialCollection>) =>
    apiClient<MaterialCollection>("/admin/material-collections/", {
      method: "POST", body: JSON.stringify(data),
    }),
  update: async (id: number, data: Partial<MaterialCollection>) =>
    apiClient<MaterialCollection>(`/admin/material-collections/${id}/`, {
      method: "PATCH", body: JSON.stringify(data),
    }),
  remove: async (id: number) =>
    apiClient(`/admin/material-collections/${id}/`, { method: "DELETE" }),
  materials: async (id: number) =>
    apiClient<CollectionMaterial[]>(`/admin/material-collections/${id}/materials/`),
  addMaterials: async (id: number, material_ids: number[]) =>
    apiClient<{ added_count: number; missing_count: number; material_count: number }>(
      `/admin/material-collections/${id}/add-materials/`,
      { method: "POST", body: JSON.stringify({ material_ids }) }
    ),
  removeMaterials: async (id: number, material_ids: number[]) =>
    apiClient<{ removed_count: number; material_count: number }>(
      `/admin/material-collections/${id}/remove-materials/`,
      { method: "POST", body: JSON.stringify({ material_ids }) }
    ),
};
