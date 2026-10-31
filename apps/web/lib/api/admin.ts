

export interface StudentEmailTemplate {
  id: number;
  event_key: string;
  category: "account" | "payment" | "marketplace" | "learning";
  name: string;
  description: string;
  is_enabled: boolean;
  is_mandatory: boolean;
  subject: string;
  body_html: string;
  body_text: string;
  available_placeholders: string[];
  sample_context: Record<string, string>;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentEmailTemplateCategory {
  id: string;
  label: string;
  description: string;
}

export interface StudentEmailTemplatesResponse {
  categories: StudentEmailTemplateCategory[];
  templates: StudentEmailTemplate[];
}

export interface StudentEmailPreviewResponse {
  event_key: string;
  name: string;
  subject: string;
  rendered_html: string;
  rendered_text: string;
  context_used: Record<string, string>;
}

export interface AdminEmailRecipient {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  event_categories: string[];
  subscribed_events: string[];
  created_at: string;
  updated_at: string;
}

export interface AdminNotificationCategoryItem {
  id: string;
  label: string;
  description: string;
  category_enabled: boolean;
  events: Array<{
    key: string;
    label: string;
    enabled: boolean;
    is_explicitly_disabled: boolean;
  }>;
}

export interface AdminNotificationEventsResponse {
  notifications_enabled: boolean;
  enable_email_notifications: boolean;
  enable_in_app_notifications: boolean;
  events_state: Record<string, boolean>;
  categories: AdminNotificationCategoryItem[];
}

export interface EmailDeliveryLog {
  id: number;
  event_category: string;
  recipient_email: string;
  recipient_role: string;
  subject: string;
  template_name: string;
  status: 'queued' | 'sent' | 'failed' | 'retrying';
  idempotency_key: string | null;
  attempts: number;
  max_attempts: number;
  error_message: string;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface EmailDeliveryHealth {
  health: {
    total_dispatched: number;
    sent: number;
    failed: number;
    retrying: number;
    queued: number;
    success_rate_percent: number;
  };
  provider: {
    type: string;
    host: string;
    port: number | null;
    user: string;
    from_email: string;
    configured: boolean;
  };
  configuration: {
    email_notifications_enabled: boolean;
    active_admin_recipients: number;
  };
}

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
export interface AdminPackageAssignmentPayload {
  package_id: number;
  course_ids?: number[];
  grant_reason?: string;
}

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
  package_id?: number;
  course_ids?: number[];
  packages?: AdminPackageAssignmentPayload[];
  grant_reason?: string;
  access_source?: string;
  send_welcome_email?: boolean;
}

export interface AdminCreateUserResponse {
  id: number;
  username: string;
  email: string;
  role: string;
  packageGranted?: boolean;
  packageName?: string | null;
  packagesCount?: number;
  packagesGranted?: Array<{
    id: number;
    name: string;
    packageType: string;
    subscriptionId: number;
    courses: string[];
    expiryDate: string | null;
  }>;
  enrolledCourses?: string[];
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

export interface AdminAITutorGuardrail {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "active" | "degraded" | "inactive";
  enforcementLevel: string;
  details: string;
}

export interface AdminAITutorSafetyLog {
  id: number;
  conversationId: number;
  timestamp: string;
  student: {
    id: number;
    name: string;
    email: string;
  };
  queryExcerpt: string;
  fullQuery: string;
  guardrail: string;
  status: "passed" | "refused" | "blocked" | "warning";
  severity: "low" | "medium" | "critical";
  reason: string;
  responseExcerpt: string;
  mode: string;
}

export interface AdminAITutorSafetyResponse {
  status: "operational" | "attention";
  provider: string;
  model: string;
  metrics: {
    cleanPassRate: number;
    totalScanned: number;
    flaggedCount: number;
    activePoliciesCount: number;
    indexedKnowledgeSources: number;
    dailyLimit: number;
  };
  guardrails: AdminAITutorGuardrail[];
  logs: AdminAITutorSafetyLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

/** Mirrors core.website_page_serializers.AdminWebsitePageSerializer. slug is
 * never editable through this type - see AdminWebsitePageViewSet for why. */
export interface AdminWebsitePage {
  id: number;
  slug: string;
  title: string;
  content: string;
  status: "draft" | "published";
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminWebsitePageInput {
  title?: string;
  content?: string;
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
    enforceSubscriptionAccess: boolean;
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
  /** Real count of questions carrying this tag - never a placeholder. */
  question_count?: number;
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

  getAITutorSafety: async (params?: {
    search?: string;
    status?: string;
    severity?: string;
    guardrail?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminAITutorSafetyResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    if (params?.severity) query.set("severity", params.severity);
    if (params?.guardrail) query.set("guardrail", params.guardrail);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    return apiClient<AdminAITutorSafetyResponse>(`/admin/ai-tutor/safety/?${query.toString()}`);
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

  deleteChapter: async (id: number): Promise<void> => {
    await apiClient(`/admin/syllabus/chapters/${id}/`, { method: "DELETE" });
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

  getWebsitePages: async (): Promise<AdminWebsitePage[]> => {
    const res = await apiClient<any>("/admin/website-pages/");
    return Array.isArray(res) ? res : res.results ?? [];
  },

  getWebsitePage: async (slug: string): Promise<AdminWebsitePage> => {
    return apiClient<AdminWebsitePage>(`/admin/website-pages/${slug}/`);
  },

  updateWebsitePage: async (slug: string, data: AdminWebsitePageInput): Promise<AdminWebsitePage> => {
    return apiClient<AdminWebsitePage>(`/admin/website-pages/${slug}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  publishWebsitePage: async (slug: string): Promise<AdminWebsitePage> => {
    return apiClient<AdminWebsitePage>(`/admin/website-pages/${slug}/publish/`, {
      method: "POST",
    });
  },

  unpublishWebsitePage: async (slug: string): Promise<AdminWebsitePage> => {
    return apiClient<AdminWebsitePage>(`/admin/website-pages/${slug}/unpublish/`, {
      method: "POST",
    });
  },

  uploadWebsitePageImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("image", file);
    return apiClient<{ url: string }>("/admin/website-pages/upload_image/", {
      method: "POST",
      body: formData,
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

  // Self-service password change for the currently logged-in admin/super-admin
  // (administration.self_service_views.AdminChangePasswordView) - distinct
  // from the `security` block above, which configures platform-wide policy
  // (min length, 2FA requirement, etc.) rather than changing anyone's actual
  // password.
  changePassword: async (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ detail: string }> => {
    return apiClient<{ detail: string }>("/admin/change-password/", {
      method: "POST",
      body: JSON.stringify(data),
    });
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
    is_active?: boolean;
  }): Promise<AdminPosition> => {
    return apiClient<AdminPosition>("/admin/syllabus/positions/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updatePosition: async (
    id: number,
    data: {
      name?: string;
      code?: string;
      category?: string;
      description?: string;
      order?: number;
      is_active?: boolean;
    }
  ): Promise<AdminPosition> => {
    return apiClient<AdminPosition>(`/admin/syllabus/positions/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deletePosition: async (id: number): Promise<{ success: boolean; message?: string }> => {
    return apiClient<{ success: boolean; message?: string }>(`/admin/syllabus/positions/${id}/`, {
      method: "DELETE",
    });
  },

  createTag: async (data: {
    name: string;
    color?: string;
    description?: string;
  }): Promise<AdminTag> => {
    return apiClient<AdminTag>("/admin/syllabus/tags/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateTag: async (
    id: number,
    data: { name?: string; color?: string; description?: string; is_active?: boolean }
  ): Promise<AdminTag> => {
    return apiClient<AdminTag>(`/admin/syllabus/tags/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteTag: async (id: number): Promise<void> => {
    return apiClient<void>(`/admin/syllabus/tags/${id}/`, { method: "DELETE" });
  },

  getEmailRecipients: async (): Promise<{ recipients: AdminEmailRecipient[] }> => {
    return apiClient<{ recipients: AdminEmailRecipient[] }>("/admin/email-recipients/");
  },

  createEmailRecipient: async (data: {
    email: string;
    name?: string;
    event_categories?: string[];
    subscribed_events?: string[];
  }): Promise<AdminEmailRecipient> => {
    return apiClient<AdminEmailRecipient>("/admin/email-recipients/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateEmailRecipient: async (
    id: number,
    data: Partial<{ email: string; name: string; is_active: boolean; event_categories: string[]; subscribed_events: string[] }>
  ): Promise<AdminEmailRecipient> => {
    return apiClient<AdminEmailRecipient>(`/admin/email-recipients/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  getNotificationEvents: async (): Promise<AdminNotificationEventsResponse> => {
    return apiClient<AdminNotificationEventsResponse>("/admin/notification-events/");
  },

  updateNotificationEvents: async (
    events: Record<string, boolean>
  ): Promise<{ message: string; events_state: Record<string, boolean> }> => {
    return apiClient<{ message: string; events_state: Record<string, boolean> }>(
      "/admin/notification-events/",
      {
        method: "PATCH",
        body: JSON.stringify({ events }),
      }
    );
  },

  deleteEmailRecipient: async (id: number): Promise<{ detail: string }> => {
    return apiClient<{ detail: string }>(`/admin/email-recipients/${id}/`, {
      method: "DELETE",
    });
  },

  sendTestEmail: async (
    data: { recipient_email?: string; recipient_id?: number }
  ): Promise<{ success: boolean; message: string; log_id?: number }> => {
    return apiClient<{ success: boolean; message: string; log_id?: number }>(
      "/admin/email-recipients/test-email/",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  getEmailDeliveryLogs: async (params?: {
    category?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ count: number; limit: number; offset: number; results: EmailDeliveryLog[] }> => {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString();
    return apiClient<{ count: number; limit: number; offset: number; results: EmailDeliveryLog[] }>(
      `/admin/email-delivery-logs/${qs ? `?${qs}` : ""}`,
      { timeoutMs: 45000 }
    );
  },

  getEmailDeliveryHealth: async (): Promise<EmailDeliveryHealth> => {
    return apiClient<EmailDeliveryHealth>("/admin/email-delivery-logs/health/", { timeoutMs: 45000 });
  },

  getStudentEmailTemplates: async (category?: string): Promise<StudentEmailTemplatesResponse> => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    return apiClient<StudentEmailTemplatesResponse>(`/admin/student-email-notifications/${qs}`);
  },

  updateStudentEmailTemplate: async (
    eventKey: string,
    data: Partial<{ is_enabled: boolean; subject: string; body_html: string; body_text: string }>
  ): Promise<StudentEmailTemplate> => {
    return apiClient<StudentEmailTemplate>(`/admin/student-email-notifications/${eventKey}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  previewStudentEmailTemplate: async (
    eventKey: string,
    data?: { subject?: string; body_html?: string; context?: Record<string, any> }
  ): Promise<StudentEmailPreviewResponse> => {
    return apiClient<StudentEmailPreviewResponse>(`/admin/student-email-notifications/${eventKey}/preview/`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  },

  resetStudentEmailTemplate: async (
    eventKey: string
  ): Promise<{ message: string; template: StudentEmailTemplate }> => {
    return apiClient<{ message: string; template: StudentEmailTemplate }>(
      `/admin/student-email-notifications/${eventKey}/reset/`,
      { method: "POST" }
    );
  },
};
