import { apiClient } from "./client";

// ===== TYPES =====

export interface EvaluatorListItem {
  id: number;
  name: string;
  username: string;
  email: string;
  isActive: boolean;
  dateJoined: string;
  avatar?: string | null;
  totalEvaluations: number;
  completedEvaluations: number;
  avgScore: number | null;
  assignedSubjects: string[];
}

export interface EvaluatorDetail extends EvaluatorListItem {
  firstName: string;
  lastName: string;
  pendingEvaluations: number;
  recentEvaluations: Array<{
    id: number;
    student: string;
    question: string;
    marks: number;
    evaluatedAt: string;
  }>;
}

export interface EvaluatorsResponse {
  evaluators: EvaluatorListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SubjectOption {
  id: number;
  name: string;
  exam: string;
}

export interface EvaluationAssignment {
  id: number;
  student: string;
  studentEmail: string;
  subject: string;
  question: string;
  submittedAt: string | null;
  status: string;
  evaluator: string | null;
  wordCount: number;
}

export interface AssignmentsResponse {
  assignments: EvaluationAssignment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateEvaluatorPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UpdateEvaluatorPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  isActive?: boolean;
}

// ===== API FUNCTIONS =====

export const evaluatorApi = {
  list: (params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<EvaluatorsResponse> => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("page_size", String(params.pageSize));
    return apiClient<EvaluatorsResponse>(`/admin/evaluators/?${q.toString()}`);
  },

  detail: (id: number): Promise<EvaluatorDetail> =>
    apiClient<EvaluatorDetail>(`/admin/evaluators/${id}/`),

  create: (payload: CreateEvaluatorPayload): Promise<EvaluatorListItem> =>
    apiClient<EvaluatorListItem>("/admin/evaluators/create/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: number, payload: UpdateEvaluatorPayload): Promise<EvaluatorListItem> =>
    apiClient<EvaluatorListItem>(`/admin/evaluators/${id}/update/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getSubjects: (): Promise<SubjectOption[]> =>
    apiClient<SubjectOption[]>("/admin/evaluators/subjects/"),

  getAssignments: (params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AssignmentsResponse> => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("page_size", String(params.pageSize));
    return apiClient<AssignmentsResponse>(`/admin/evaluator-assignments/?${q.toString()}`);
  },
};
