import { apiClient } from "./client";

export type ContentCategory =
  | "syllabus"
  | "subjective_topicwise"
  | "objective_topicwise"
  | "revision_notes";

export type NoteType =
  | "standard"
  | "ai"
  | "subjective"
  | "objective";

export type MaterialType =
  | "notes" | "pdf" | "video" | "document"
  | "presentation" | "external_link" | "study_guide" | "reference";

export type MaterialDifficulty = "beginner" | "intermediate" | "advanced";
export type MaterialAccess = "free" | "premium";
export type MaterialStatus =
  | "draft" | "pending_review" | "changes_requested"
  | "published" | "rejected" | "archived";

export interface PreparationCounts {
  syllabus: number;
  subjective_topicwise: number;
  objective_topicwise: number;
  revision_notes: number;
  total: number;
}

export interface PreparationItem {
  id: number;
  name: string;
  order: number;
  courseId: number | null;
  courseTitle: string | null;
  courseStatus: string | null;
  isComingSoon: boolean;
  counts: PreparationCounts;
}

export interface LevelItem {
  id: number;
  name: string;
  order: number;
  preparations: PreparationItem[];
}

export interface CategoryHierarchyItem {
  id: number;
  name: string;
  order: number;
  levels: LevelItem[];
}

export interface AcademicTopic {
  id: number;
  name: string;
  order: number;
}

export interface AcademicChapter {
  id: number;
  title: string;
  order: number;
  topics: AcademicTopic[];
}

export interface AcademicSubject {
  id: number;
  name: string;
  code: string;
  order: number;
  chapters: AcademicChapter[];
}

export interface StudyMaterialListItem {
  id: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  teacher: string;
  examId: number;
  examName: string;
  levelId: number | null;
  levelName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  courseId: number | null;
  courseTitle: string | null;
  subjectId: number | null;
  subjectName: string | null;
  chapterId: number | null;
  chapterName: string | null;
  topicId: number | null;
  topicName: string | null;
  contentCategory: ContentCategory;
  noteType: NoteType;
  materialType: MaterialType;
  difficulty: MaterialDifficulty;
  status: MaterialStatus;
  accessType: MaterialAccess;
  fileUrl: string | null;
  fileName: string | null;
  externalUrl: string | null;
  estimatedReadingTime: number;
  availableToAiTutor: boolean;
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

export interface StudyMaterialDetail extends StudyMaterialListItem {
  reviewNote: string;
}

export interface CreateStudyMaterialPayload {
  title: string;
  exam: number;
  content_category?: ContentCategory;
  note_type?: NoteType;
  subject?: number | null;
  chapter?: number | null;
  topic?: number | null;
  course?: number | null;
  description?: string;
  content?: string;
  material_type?: MaterialType;
  difficulty?: MaterialDifficulty;
  access_type?: MaterialAccess;
  status?: MaterialStatus;
  external_url?: string;
  estimated_reading_time?: number;
  file?: File | null;
}

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
  return { body: form as any, headers: undefined };
}

export const adminStudyMaterialApi = {
  getHierarchy: async (): Promise<CategoryHierarchyItem[]> => {
    return apiClient<CategoryHierarchyItem[]>("/admin/study-materials/hierarchy/");
  },

  getAcademicTree: async (examId: number): Promise<AcademicSubject[]> => {
    return apiClient<AcademicSubject[]>(`/admin/study-materials/academic-tree/?exam_id=${examId}`);
  },

  setCourseStatus: async (courseId: number, status: "draft" | "published" | "coming_soon" | "archived"): Promise<{ id: number; status: string }> => {
    return apiClient<{ id: number; status: string }>(`/admin/courses/${courseId}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  list: async (params?: {
    status?: string;
    type?: string;
    content_category?: string;
    note_type?: string;
    exam?: number;
    level_id?: number;
    category_id?: number;
    subject?: number;
    chapter?: number;
    topic?: number;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<StudyMaterialsResponse> => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.type) query.set("type", params.type);
    if (params?.content_category) query.set("content_category", params.content_category);
    if (params?.note_type) query.set("note_type", params.note_type);
    if (params?.exam) query.set("exam", String(params.exam));
    if (params?.level_id) query.set("level_id", String(params.level_id));
    if (params?.category_id) query.set("category_id", String(params.category_id));
    if (params?.subject) query.set("subject", String(params.subject));
    if (params?.chapter) query.set("chapter", String(params.chapter));
    if (params?.topic) query.set("topic", String(params.topic));
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<StudyMaterialsResponse>(`/admin/study-materials/?${query.toString()}`);
  },

  get: async (id: number | string): Promise<StudyMaterialDetail> =>
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
    return apiClient<{ success: boolean; id: number; status: MaterialStatus; fileUrl?: string }>(
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
