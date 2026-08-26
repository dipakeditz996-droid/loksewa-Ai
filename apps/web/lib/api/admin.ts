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

export interface AdminNotification {
  id: number;
  title: string;
  content: string;
  type: "alert" | "announcement" | "system";
  status: "draft" | "scheduled" | "sent" | "failed";
  recipientCount: number;
  sentAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotificationsResponse {
  notifications: AdminNotification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminSupportTicket {
  id: number;
  ticketNumber: string;
  subject: string;
  studentName: string;
  studentEmail: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_progress" | "waiting_student" | "resolved" | "closed";
  messageCount: number;
  lastUpdated: string;
  createdAt: string;
}

export interface AdminSupportTicketDetail {
  ticket: {
    id: number;
    ticketNumber: string;
    subject: string;
    studentName: string;
    studentEmail: string;
    category: string;
    priority: "low" | "normal" | "high" | "urgent";
    status: "open" | "in_progress" | "waiting_student" | "resolved" | "closed";
    relatedExam: string;
    relatedQuestion: string;
    relatedPage: string;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
  };
  messages: Array<{
    id: number;
    sender: string;
    senderEmail: string;
    isStaffReply: boolean;
    message: string;
    createdAt: string;
  }>;
}

export interface AdminSupportTicketsResponse {
  tickets: AdminSupportTicket[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminSettingsData {
  platform: {
    name: string;
    logoUrl: string | null;
    description: string;
    timezone: string;
    language: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number | null;
    smtpUser: string;
    fromAddress: string;
    fromName: string;
  };
  notifications: {
    enabled: boolean;
    enableEmail: boolean;
    enableInApp: boolean;
    enablePush: boolean;
  };
  security: {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSpecialChars: boolean;
    sessionTimeoutMinutes: number;
    enableTwoFactorAuth: boolean;
    maxLoginAttempts: number;
  };
  features: {
    enableAiTutor: boolean;
    enableMarketplace: boolean;
    enableGamification: boolean;
    enableStudyPlans: boolean;
  };
}

export interface AdminSettingsResponse {
  settings: AdminSettingsData;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface RolePermissions {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
  permissionCount: number;
  permissions: Permission[];
}

export interface PermissionsResponse {
  roles: RolePermissions[];
  totalRoles: number;
  totalPermissions: number;
  categories: string[];
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

  getPermissions: async (): Promise<PermissionsResponse> => {
    return apiClient<PermissionsResponse>("/admin/permissions/");
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

  getNotifications: async (params?: {
    status?: string;
    type?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminNotificationsResponse> => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.type) query.set("type", params.type);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<AdminNotificationsResponse>(`/admin/notifications/?${query.toString()}`);
  },

  createNotification: async (data: {
    title: string;
    content: string;
    type: "alert" | "announcement" | "system";
    targetRole?: string;
    scheduledFor?: string;
  }): Promise<AdminNotification> => {
    return apiClient<AdminNotification>("/admin/notifications/create/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  deleteNotification: async (id: number): Promise<void> => {
    return apiClient<void>(`/admin/notifications/${id}/delete/`, {
      method: "DELETE",
    });
  },

  getSupportTickets: async (params?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminSupportTicketsResponse> => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.priority) query.set("priority", params.priority);
    if (params?.category) query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<AdminSupportTicketsResponse>(`/admin/support/tickets/?${query.toString()}`);
  },

  getSupportTicketDetail: async (id: number): Promise<AdminSupportTicketDetail> => {
    return apiClient<AdminSupportTicketDetail>(`/admin/support/tickets/${id}/`);
  },

  replyToSupportTicket: async (id: number, message: string): Promise<any> => {
    return apiClient<any>(`/admin/support/tickets/${id}/reply/`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  updateSupportTicketStatus: async (id: number, status: string): Promise<any> => {
    return apiClient<any>(`/admin/support/tickets/${id}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  getSettings: async (): Promise<AdminSettingsResponse> => {
    return apiClient<AdminSettingsResponse>("/admin/settings/");
  },

  updateSettings: async (data: {
    platform?: Partial<AdminSettingsData["platform"]>;
    email?: Partial<AdminSettingsData["email"]>;
    notifications?: Partial<AdminSettingsData["notifications"]>;
    security?: Partial<AdminSettingsData["security"]>;
    features?: Partial<AdminSettingsData["features"]>;
  }): Promise<any> => {
    return apiClient<any>("/admin/settings/", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};
