import { apiClient } from "./client";

// ===== TYPES =====

export interface RecentActivity {
  id: number;
  type: "registration" | "exam_attempt" | "order" | "ai_session" | "content";
  description: string;
  user: string;
  time: string;
  status: string;
}

export interface AdminStats {
  users: {
    totalStudents: number;
    activeStudents: number;
    evaluators: number;
  };
  academic: {
    publishedExams: number;
    questions: number;
    studyMaterials: number;
  };
  evaluations: {
    pending: number;
  };
  marketplace: {
    activeListings: number;
    orderRequests: number;
    totalOrders: number;
    revenue: number;
  };
  aiTutor: {
    totalSessions: number;
    sessionsToday: number;
  };
  games: {
    totalPlayed: number;
  };
  recentActivity: RecentActivity[];
}

export interface AnalyticsDataPoint {
  date: string;
  registrations: number;
  examAttempts: number;
  aiSessions: number;
  practiceSessions: number;
}

export interface AdminAnalyticsData {
  period: string;
  days: number;
  chartData: AnalyticsDataPoint[];
  totals: {
    registrations: number;
    examAttempts: number;
    aiSessions: number;
    practiceSessions: number;
  };
}

export interface AdminUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  dateJoined: string;
  avatar?: string | null;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminRecentExam {
  id: number;
  title: string;
  exam: string;
  status: string;
  totalQuestions: number;
  attempts: number;
  createdAt: string;
}

export interface AdminExamsOverview {
  totalExams: number;
  activeExams: number;
  totalModelExams: number;
  publishedModelExams: number;
  draftModelExams: number;
  totalAttempts: number;
  recentExams: AdminRecentExam[];
}

export interface AdminAITutorOverview {
  totalSessions: number;
  sessionsToday: number;
  activeStudents: number;
  topModes: Array<{ mode: string; count: number }>;
  trend: Array<{ date: string; sessions: number }>;
}

export interface AdminRecentOrder {
  id: number;
  product: string;
  buyer: string;
  seller: string;
  price: number;
  status: string;
  createdAt: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  users: number;
  color: string;
  type: string;
}

export interface AdminRolesResponse {
  roles: AdminRole[];
  total: number;
  totalUsers: number;
}

export interface AdminMarketplaceOverview {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  revenue: number;
  recentOrders: AdminRecentOrder[];
}

export interface AdminEvaluation {
  id: number;
  student: string;
  studentId: number;
  email: string;
  question: string;
  questionId: number;
  marks: number;
  status: string;
  submittedAt: string;
  wordCount: number;
  evaluator: string | null;
  marksObtained: number | null;
  evaluatedAt: string | null;
}

export interface AdminEvaluationsResponse {
  evaluations: AdminEvaluation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminStudyMaterial {
  id: number;
  title: string;
  description: string;
  teacher: string;
  subject: string;
  exam: string;
  materialType: string;
  difficulty: string;
  status: string;
  accessType: string;
  estimatedReadingTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStudyMaterialsResponse {
  materials: AdminStudyMaterial[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminChapter {
  id: number;
  title: string;
  description?: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  subject?: number;
}

export interface AdminSubject {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  paper?: number;
}

export interface AdminChaptersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminChapter[];
}

export interface AdminStudyPlan {
  id: number;
  student: string;
  studentId: number;
  email: string;
  exam: string;
  examId: number | null;
  template: string | null;
  targetDate: string;
  dailyMinutes: number;
  level: string;
  isPaused: boolean;
  studyDays: string[];
  preferredTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStudyPlansResponse {
  plans: AdminStudyPlan[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminAuditLog {
  timestamp: string;
  action: string;
  actionLabel: string;
  user: string;
  email: string;
  details: string;
  severity: "info" | "warning" | "error" | "success";
}

export interface AdminAuditLogsResponse {
  logs: AdminAuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ===== API FUNCTIONS =====

export const adminApi = {
  getDashboardStats: async (): Promise<AdminStats> => {
    return apiClient<AdminStats>("/admin/dashboard/stats/");
  },

  getAnalytics: async (period: "7d" | "30d" | "90d" | "1y" = "30d"): Promise<AdminAnalyticsData> => {
    return apiClient<AdminAnalyticsData>(`/admin/analytics/?period=${period}`);
  },

  getUsers: async (params?: {
    role?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminUsersResponse> => {
    const query = new URLSearchParams();
    if (params?.role) query.set("role", params.role);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<AdminUsersResponse>(`/admin/users/?${query.toString()}`);
  },

  getExamsOverview: async (): Promise<AdminExamsOverview> => {
    return apiClient<AdminExamsOverview>("/admin/exams-overview/");
  },

  getAITutorOverview: async (): Promise<AdminAITutorOverview> => {
    return apiClient<AdminAITutorOverview>("/admin/ai-tutor/");
  },

  getMarketplaceOverview: async (): Promise<AdminMarketplaceOverview> => {
    return apiClient<AdminMarketplaceOverview>("/admin/marketplace/");
  },

  getAdministrators: async (params?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminUsersResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<AdminUsersResponse>(`/admin/admins/?${query.toString()}`);
  },

  getRoles: async (): Promise<AdminRolesResponse> => {
    return apiClient<AdminRolesResponse>("/admin/roles/");
  },

  getEvaluations: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminEvaluationsResponse> => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<AdminEvaluationsResponse>(`/admin/evaluations/?${query.toString()}`);
  },

  getStudyMaterials: async (params?: {
    status?: string;
    type?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminStudyMaterialsResponse> => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.type) query.set("type", params.type);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<AdminStudyMaterialsResponse>(`/admin/study-materials/?${query.toString()}`);
  },

  getChapters: async (params?: {
    subject?: number;
    page?: number;
    pageSize?: number;
  }): Promise<AdminChaptersResponse> => {
    const query = new URLSearchParams();
    if (params?.subject) query.set("subject", String(params.subject));
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<AdminChaptersResponse>(`/admin/syllabus/chapters/?${query.toString()}`);
  },

  getSubjects: async (params?: {
    paper?: number;
    page?: number;
    pageSize?: number;
  }): Promise<any> => {
    const query = new URLSearchParams();
    if (params?.paper) query.set("paper", String(params.paper));
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<any>(`/admin/syllabus/subjects/?${query.toString()}`);
  },

  getStudyPlans: async (params?: {
    level?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminStudyPlansResponse> => {
    const query = new URLSearchParams();
    if (params?.level) query.set("level", params.level);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<AdminStudyPlansResponse>(`/admin/study-plans/?${query.toString()}`);
  },

  getAuditLogs: async (params?: {
    action?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminAuditLogsResponse> => {
    const query = new URLSearchParams();
    if (params?.action) query.set("action", params.action);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<AdminAuditLogsResponse>(`/admin/audit-logs/?${query.toString()}`);
  },
};
