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
  support: {
    pendingTickets: number;
  };
  marketplace: {
    activeListings: number;
    orderRequests: number;
    totalOrders: number;
    revenue: number;
    mrr: number;
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

export interface AdminStudentsAnalytics {
  period: string;
  days: number;
  registrationTrend: { date: string; count: number }[];
  summary: {
    totalStudents: number;
    active7d: number;
    active30d: number;
    neverLoggedIn: number;
  };
  scoreDistribution: { range: string; count: number }[];
  topPerformers: {
    id: number;
    name: string;
    username: string;
    examsCompleted: number;
    averagePercentage: number;
  }[];
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

// Mirrors administration.views.AdminUsersView.post - username/email/password/
// role are required for every role; the rest only apply when role is
// "student" and mirror exactly what core.views.StudentSignupView collects
// (see apps/web/app/register/page.tsx for the same field set/shape).
export interface AdminCreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: "student" | "teacher" | "admin";
  name?: string;
  mobile?: string;
  permanent_district?: string;
  permanent_local_level?: string;
  exam_category_id?: number;
  exam_position_id?: number;
  course_id?: number;
  send_welcome_email?: boolean;
}

export interface AdminCreateUserResponse {
  id: number;
  username: string;
  email: string;
  role: string;
  message: string;
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
  totalQuestions: number;
  topModes: Array<{ mode: string; count: number }>;
  trend: Array<{ date: string; sessions: number }>;
}

export interface AdminAITutorProviderStatus {
  provider: string;
  model: string;
  status: "configured" | "not_configured";
}

export interface AdminAITutorConversationStudent {
  id: number;
  name: string;
  email: string;
}

export interface AdminAITutorConversation {
  id: number;
  title: string;
  mode: string;
  student: AdminAITutorConversationStudent;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAITutorConversationsResponse {
  conversations: AdminAITutorConversation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminAITutorMessage {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface AdminAITutorConversationDetail {
  id: number;
  title: string;
  mode: string;
  student: AdminAITutorConversationStudent;
  createdAt: string;
  updatedAt: string;
  messages: AdminAITutorMessage[];
}

export interface AdminAITutorUsageTrendPoint {
  date: string;
  requests: number;
  tokens: number;
}

export interface AdminAITutorTopStudent {
  studentId: number;
  name: string;
  requests: number;
  tokens: number;
}

export interface AdminAITutorUsage {
  totalRequests: number;
  totalTokens: number;
  trend: AdminAITutorUsageTrendPoint[];
  topStudents: AdminAITutorTopStudent[];
}

export type AITutorMode = "EXPLAIN" | "PRACTICE" | "REVISION" | "EXAM_STRATEGY" | "STUDY_PLAN";

export interface AdminAITutorPrompts {
  basePrompt: string;
  modes: Record<AITutorMode, { promptText: string; updatedAt: string }>;
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
  exam: string | null;
  subject: string | null;
  paper: string | null;
}

export interface AdminEvaluationAnnotation {
  id: number;
  selected_text: string;
  comment: string;
  start_offset: number;
  end_offset: number;
  created_by: number | null;
  created_at: string;
}

export interface AdminEvaluationRecord {
  id: number;
  answer: number;
  evaluator: number | null;
  evaluator_name: string;
  marks_obtained: number;
  feedback: string;
  evaluated_at: string;
  annotations: AdminEvaluationAnnotation[];
  video_feedback: { id: number; youtube_url: string; embed_url: string; created_at: string } | null;
}

export interface AdminEvaluationQuestion {
  id: number;
  topic: number;
  topic_name: string;
  text: string;
  marks: number;
  expected_time_minutes: number;
  difficulty: string;
  model_answer: string;
}

export interface AdminEvaluationDetail {
  id: number;
  student: { id: number; name: string; username: string; email: string };
  exam: string | null;
  subject: string | null;
  paper: string | null;
  attemptDate: string | null;
  question: AdminEvaluationQuestion | null;
  answerText: string;
  fileUrl: string | null;
  status: string;
  submittedAt: string | null;
  wordCount: number;
  evaluation: AdminEvaluationRecord | null;
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
  availableToAiTutor: boolean;
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
  id: string;
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
  categoryTotals: {
    user: number;
    content: number;
    evaluation: number;
    admin: number;
  };
}

export interface AdminAuditLogDetail {
  id: string;
  source: string;
  actionLabel: string;
  timestamp: string;
  actorName: string | null;
  actorEmail: string | null;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  severity: "info" | "warning" | "error" | "success";
}

export interface AdminExportJob {
  id: number;
  exportType: string;
  status: "pending" | "processing" | "completed" | "failed";
  rowCount: number;
  errorMessage: string;
  downloadUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AdminNotification {
  id: number;
  title: string;
  content: string;
  type: "alert" | "announcement" | "system";
  targetRole: NotificationAudience;
  status: "draft" | "scheduled" | "sent" | "failed";
  recipientCount: number;
  readCount: number;
  unreadCount: number;
  scheduledFor: string | null;
  sentAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTestimonial {
  id: number;
  name: string;
  role_title: string;
  quote: string;
  avatar_url: string;
  rating: number;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  /** True when a student wrote this from the homepage, rather than an admin authoring it directly. */
  submitted_by_student: boolean;
  submitted_by_name: string | null;
}

export interface AdminTestimonialInput {
  name: string;
  role_title?: string;
  quote: string;
  avatar_url?: string;
  rating?: number;
  is_published?: boolean;
  display_order?: number;
}

export interface AdminNotificationsResponse {
  notifications: AdminNotification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Status counts across every campaign, not just the current page. */
  summary: {
    total: number;
    sent: number;
    draft: number;
    scheduled: number;
    failed: number;
  };
}

/** Audiences the backend can resolve into real recipients. */
export type NotificationAudience =
  | "all" | "students" | "teachers" | "admins" | "course" | "individual";

export interface CreateNotificationResult {
  id: number;
  title: string;
  content: string;
  type: string;
  targetRole: NotificationAudience;
  status: "draft" | "scheduled" | "sent" | "failed";
  scheduledFor: string | null;
  recipientCount: number;
  /** The record was stored. Separate from whether anyone received it. */
  created: boolean;
  /** How many delivery rows were actually written. 0 for draft/scheduled. */
  delivered: number;
  /** How many recipients the chosen audience currently resolves to. */
  audiencePreview: number;
}

export interface NotificationDetail {
  id: number;
  title: string;
  content: string;
  type: string;
  targetRole: NotificationAudience;
  status: string;
  scheduledFor: string | null;
  sentAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  recipient_count: number;
  read_count: number;
  unread_count: number;
  read_rate: number;
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
  summary: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    high_priority: number;
  };
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
  aiTutor: {
    dailyMessageLimit: number;
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

export interface AdminPosition {
  id: number;
  name: string;
  code?: string;
  description?: string;
  category?: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminPositionsResponse {
  results: AdminPosition[];
  count: number;
  page: number;
  page_size: number;
}

export interface AdminTag {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminTagsResponse {
  results: AdminTag[];
  count: number;
  page: number;
  page_size: number;
}

// ===== API FUNCTIONS =====

export const adminApi = {
  getDashboardStats: async (): Promise<AdminStats> => {
    return apiClient<AdminStats>("/admin/dashboard/stats/");
  },

  getAnalytics: async (period: "7d" | "30d" | "90d" | "1y" = "30d"): Promise<AdminAnalyticsData> => {
    return apiClient<AdminAnalyticsData>(`/admin/analytics/?period=${period}`);
  },

  getStudentsAnalytics: async (
    period: "7d" | "30d" | "90d" | "1y" = "30d"
  ): Promise<AdminStudentsAnalytics> => {
    return apiClient<AdminStudentsAnalytics>(`/admin/analytics/students/?period=${period}`);
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

  createUser: async (payload: AdminCreateUserPayload): Promise<AdminCreateUserResponse> => {
    return apiClient<AdminCreateUserResponse>("/admin/users/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getExamsOverview: async (): Promise<AdminExamsOverview> => {
    return apiClient<AdminExamsOverview>("/admin/exams-overview/");
  },

  getAITutorOverview: async (): Promise<AdminAITutorOverview> => {
    return apiClient<AdminAITutorOverview>("/admin/ai-tutor/");
  },

  getAITutorProviderStatus: async (): Promise<AdminAITutorProviderStatus> => {
    return apiClient<AdminAITutorProviderStatus>("/admin/ai-tutor/provider-status/");
  },

  getAITutorConversations: async (params?: {
    search?: string;
    mode?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminAITutorConversationsResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.mode) query.set("mode", params.mode);
    if (params?.dateFrom) query.set("date_from", params.dateFrom);
    if (params?.dateTo) query.set("date_to", params.dateTo);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<AdminAITutorConversationsResponse>(`/admin/ai-tutor/conversations/?${query.toString()}`);
  },

  getAITutorConversationDetail: async (id: number): Promise<AdminAITutorConversationDetail> => {
    return apiClient<AdminAITutorConversationDetail>(`/admin/ai-tutor/conversations/${id}/`);
  },

  getAITutorUsage: async (days?: number): Promise<AdminAITutorUsage> => {
    const query = days ? `?days=${days}` : "";
    return apiClient<AdminAITutorUsage>(`/admin/ai-tutor/usage/${query}`);
  },

  getAITutorPrompts: async (): Promise<AdminAITutorPrompts> => {
    return apiClient<AdminAITutorPrompts>("/admin/ai-tutor/prompts/");
  },

  updateAITutorPrompts: async (data: {
    basePrompt?: string;
    modes?: Partial<Record<AITutorMode, string>>;
  }): Promise<{ message: string }> => {
    return apiClient<{ message: string }>("/admin/ai-tutor/prompts/", {
      method: "PUT",
      body: JSON.stringify(data),
    });
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

  getEvaluation: async (id: number | string): Promise<AdminEvaluationDetail> => {
    return apiClient<AdminEvaluationDetail>(`/admin/evaluations/${id}/`);
  },

  saveEvaluation: async (
    id: number | string,
    data: { marks_obtained: number; feedback: string; finalize: boolean }
  ): Promise<AdminEvaluationDetail> => {
    return apiClient<AdminEvaluationDetail>(`/admin/evaluations/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
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

  setStudyMaterialAiTutorAvailability: async (id: number, available: boolean): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>(`/admin/study-materials/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ available_to_ai_tutor: available }),
    });
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

  getAuditLogDetail: async (eventId: string): Promise<AdminAuditLogDetail> => {
    return apiClient<AdminAuditLogDetail>(`/admin/audit-logs/${encodeURIComponent(eventId)}/`);
  },

  getAuditLogRetention: async (): Promise<{ retentionDays: number }> => {
    return apiClient(`/admin/audit-logs/retention/`);
  },

  saveAuditLogRetention: async (
    retentionDays: number
  ): Promise<{ retentionDays: number; purgedCount: number }> => {
    return apiClient(`/admin/audit-logs/retention/`, {
      method: "POST",
      body: JSON.stringify({ retentionDays }),
    });
  },

  // Background export: same CSV as /admin/audit-logs/export/, generated by
  // a Celery job instead of in-request, since audit logs grow unbounded.
  createAuditLogExportJob: async (params?: {
    action?: string;
    search?: string;
  }): Promise<{ id: number; status: string; exportType: string; createdAt: string }> => {
    return apiClient(`/admin/audit-logs/export-jobs/`, {
      method: "POST",
      body: JSON.stringify({ action: params?.action || "", search: params?.search || "" }),
    });
  },

  getAuditLogExportJobs: async (): Promise<AdminExportJob[]> => {
    return apiClient<AdminExportJob[]>(`/admin/audit-logs/export-jobs/`);
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
    /** Audience key resolved server-side; recipients are never picked in React. */
    targetRole?: NotificationAudience;
    /** 'now' delivers immediately; 'schedule' and 'draft' only persist. */
    delivery?: "now" | "schedule" | "draft";
    scheduledFor?: string;
    courseId?: number;
    userIds?: number[];
  }): Promise<CreateNotificationResult> => {
    return apiClient<CreateNotificationResult>("/admin/notifications/create/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getNotificationDetail: async (id: number): Promise<NotificationDetail> => {
    return apiClient<NotificationDetail>(`/admin/notifications/${id}/`);
  },

  sendNotification: async (id: number, data?: { courseId?: number; userIds?: number[] }) => {
    return apiClient<{ id: number; status: string; delivered: number; recipientCount: number; sentAt: string | null }>(
      `/admin/notifications/${id}/send/`,
      { method: "POST", body: JSON.stringify(data ?? {}) }
    );
  },

  cancelScheduledNotification: async (id: number) => {
    return apiClient<{ id: number; status: string }>(
      `/admin/notifications/${id}/cancel/`,
      { method: "POST" }
    );
  },

  deleteNotification: async (id: number): Promise<void> => {
    return apiClient<void>(`/admin/notifications/${id}/delete/`, {
      method: "DELETE",
    });
  },

  getTestimonials: async (search?: string): Promise<AdminTestimonial[]> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await apiClient<any>(`/admin/testimonials/${query}`);
    return Array.isArray(res) ? res : res.results ?? [];
  },

  createTestimonial: async (data: AdminTestimonialInput): Promise<AdminTestimonial> => {
    return apiClient<AdminTestimonial>("/admin/testimonials/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateTestimonial: async (id: number, data: Partial<AdminTestimonialInput>): Promise<AdminTestimonial> => {
    return apiClient<AdminTestimonial>(`/admin/testimonials/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteTestimonial: async (id: number): Promise<void> => {
    return apiClient<void>(`/admin/testimonials/${id}/`, {
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

  updateSupportTicketStatus: async (id: number, data: { status?: string; priority?: string }): Promise<any> => {
    return apiClient<any>(`/admin/support/tickets/${id}/status/`, {
      method: "PATCH",
      body: JSON.stringify(data),
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
    aiTutor?: Partial<AdminSettingsData["aiTutor"]>;
  }): Promise<any> => {
    return apiClient<any>("/admin/settings/", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  getPositions: async (params?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminPositionsResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<AdminPositionsResponse>(`/admin/syllabus/positions/?${query.toString()}`);
  },

  getTags: async (params?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminTagsResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<AdminTagsResponse>(`/admin/syllabus/tags/?${query.toString()}`);
  },

  createPosition: async (data: {
    name: string;
    code?: string;
    category?: string;
    order?: number;
  }): Promise<AdminPosition> => {
    return apiClient<AdminPosition>("/admin/syllabus/positions/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  createTag: async (data: {
    name: string;
    color?: string;
  }): Promise<AdminTag> => {
    return apiClient<AdminTag>("/admin/syllabus/tags/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
