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

export interface AdminMarketplaceOverview {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  revenue: number;
  recentOrders: AdminRecentOrder[];
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
    return apiClient<AdminExamsOverview>("/admin/exams/");
  },

  getAITutorOverview: async (): Promise<AdminAITutorOverview> => {
    return apiClient<AdminAITutorOverview>("/admin/ai-tutor/");
  },

  getMarketplaceOverview: async (): Promise<AdminMarketplaceOverview> => {
    return apiClient<AdminMarketplaceOverview>("/admin/marketplace/");
  },
};
