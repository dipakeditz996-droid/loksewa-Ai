import { apiClient } from "./client";

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug?: string | null;
  description: string;
  has_expiry?: boolean;
  duration: number | null;
  duration_unit: "DAYS" | "WEEKS" | "MONTHS" | "YEAR" | null;
  price: string;
  original_price: string | null;
  discount: string;
  badge: "NONE" | "POPULAR" | "BEST_VALUE" | "RECOMMENDED" | "LIMITED_OFFER";
  display_badge?: string;
  features: string[];
  course: number | null;
  course_details?: {
    id: number;
    title: string;
    exam: string | null;
    level?: string | null;
    category?: string | null;
    service?: string | null;
    hierarchy_path?: string | null;
    status?: string;
    is_coming_soon?: boolean;
  } | null;
  package_type: "SINGLE" | "MULTI" | "BUNDLE" | "ALL_ACCESS";
  course_access_type?: "NONE" | "SELECTED" | "BUNDLE" | "ALL_ACCESS";
  eligible_courses: number[];
  eligible_courses_details?: {
    id: number;
    title: string;
    exam: string | null;
    level?: string | null;
    category?: string | null;
    service?: string | null;
    hierarchy_path?: string | null;
    status?: string;
    is_coming_soon?: boolean;
  }[];
  is_flexible: boolean;
  allowed_preparation_count: number;
  exam_quotas?: Record<string, { enabled?: boolean; attempts?: number }>;
  free_mock_exams?: number[];
  free_mock_attempts?: number;
  notes_access_type?: "NONE" | "COURSE_NOTES" | "ALL";
  can_download_notes?: boolean;
  practice_enabled?: boolean;
  practice_question_limit?: number;
  ai_tutor_enabled?: boolean;
  ai_credits?: number;
  ai_daily_limit?: number;
  ai_monthly_limit?: number;
  reset_frequency?: "NEVER" | "DAILY" | "WEEKLY" | "MONTHLY";
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  is_published?: boolean;
  is_featured?: boolean;
  terms?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type SubscriptionPlanInput = Omit<SubscriptionPlan, "id" | "created_at" | "updated_at" | "eligible_courses_details" | "course_details">;

export interface Subscription {
  id: number;
  student: number;
  plan: number;
  plan_details: SubscriptionPlan;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  has_expiry?: boolean;
  start_date: string;
  expiry_date: string | null;
  remaining_days: number | null;
  computed_status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "CANCELLED";
  created_at: string;
}

export interface PaymentMethodDetails {
  id: number;
  display_name: string;
  method_type: string;
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  branch?: string;
  qr_image?: string | null;
  instructions?: string;
}

export interface SubscriptionPayment {
  id: number;
  student: number;
  student_name: string;
  plan: number;
  plan_details: SubscriptionPlan;
  subscription: number | null;
  payment_method: number;
  payment_method_details: PaymentMethodDetails;
  amount: string;
  transaction_id: string;
  screenshot: string;
  note: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejection_reason: string;
  verification_status?: "PENDING" | "VERIFICATION_IN_PROGRESS" | "VERIFIED_CONFIDENT" | "VERIFIED_UNCERTAIN" | "VERIFICATION_FAILED";
  verification_status_display?: string;
  verification_result?: {
    outcome?: "AUTO_VERIFIED" | "NEEDS_ADMIN_REVIEW" | "REJECTED";
    detected_amount?: string | null;
    detected_transaction_id?: string | null;
    detected_date?: string | null;
    detected_time?: string | null;
    detected_recipient?: string | null;
    detected_status?: string | null;
    detected_provider?: string | null;
    detected_bank_name?: string | null;
    is_resubmission?: boolean;
    admin_decision?: {
      action?: string;
      admin_name?: string;
      decided_at?: string;
    };
  };
  submitted_at: string;
  verified_at?: string | null;
  verified_by?: number | null;
}

export interface AvailablePlansResponse {
  preparation: {
    has_preference: boolean;
    category_name: string | null;
    category_id: number | null;
    level_name: string | null;
    service_name: string | null;
    exam_id: number | null;
    exam_name: string | null;
    course_id: number | null;
    course_title: string | null;
    owned_course_ids: number[];
    has_matched_specific: boolean;
  };
  plans: SubscriptionPlan[];
}

export interface EffectiveEntitlements {
  has_active_package: boolean;
  is_admin_granted: boolean;
  subscription: {
    id: number;
    plan_id: number;
    plan_name: string;
    status: string;
    source: string;
    has_expiry: boolean;
    expiry_date: string | null;
    remaining_days: number | null;
    reset_frequency?: string;
  } | null;
  plan: {
    id: number;
    name: string;
    slug?: string | null;
    price: string;
    badge: string;
    package_type: string;
    course_access_type?: string;
    has_expiry?: boolean;
    duration: number | null;
    duration_unit: string | null;
    features: string[];
  } | null;
  courses: {
    id: number;
    title: string;
    slug?: string;
    exam_id?: number | null;
  }[];
  notes: {
    access_type: string;
    can_download: boolean;
  };
  exams: Record<string, {
    enabled: boolean;
    total_allowed: number;
    consumed: number;
    reserved: number;
    remaining: number;
    is_unlimited: boolean;
  }>;
  ai_tutor: {
    enabled: boolean;
    total_credits: number;
    consumed_credits: number;
    remaining_credits: number;
    is_unlimited: boolean;
    daily_limit: number;
    daily_consumed: number;
    daily_remaining: number;
  };
  practice: {
    enabled: boolean;
    total_allowed: number;
    consumed: number;
    remaining: number;
    is_unlimited: boolean;
  };
  usage_history: {
    id: number;
    feature: string;
    event_type: string;
    amount: number;
    reference_id: string;
    reason: string;
    created_at: string;
  }[];
}

export interface PackageSubscriber {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  status: string;
  source: string;
  has_expiry: boolean;
  start_date: string | null;
  expiry_date: string | null;
  created_at: string;
  granted_by: string | null;
  admin_grant_reason: string;
}

export interface PackageUsageStats {
  active_subscribers: number;
  total_approved_purchases: number;
  pending_purchases: number;
  total_exam_attempts_consumed: number;
  total_ai_credits_consumed: number;
}

export const subscriptionsApi = {
  // Public/student
  listPlans: (): Promise<SubscriptionPlan[]> => apiClient<SubscriptionPlan[]>("/subscriptions/plans/"),
  listAvailablePlans: (params?: { course_id?: number | string; exam_id?: number | string }): Promise<AvailablePlansResponse> => {
    const query = new URLSearchParams();
    if (params?.course_id) query.set("course_id", String(params.course_id));
    if (params?.exam_id) query.set("exam_id", String(params.exam_id));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiClient<AvailablePlansResponse>(`/subscriptions/plans/available/${qs}`);
  },
  getPlan: (id: number | string): Promise<SubscriptionPlan> => apiClient<SubscriptionPlan>(`/subscriptions/plans/${id}/`),
  getPayment: (id: number | string): Promise<SubscriptionPayment> => apiClient<SubscriptionPayment>(`/subscriptions/payments/${id}/`),
  getPaymentStatus: (id: number | string): Promise<SubscriptionPayment> => apiClient<SubscriptionPayment>(`/subscriptions/payments/${id}/status/`),
  mySubscriptions: (): Promise<Subscription[]> => apiClient<Subscription[]>("/subscriptions/my-subscriptions/"),
  getMyEntitlements: (): Promise<EffectiveEntitlements> => apiClient<EffectiveEntitlements>("/subscriptions/my-subscriptions/my-entitlements/"),
  myPayments: (): Promise<SubscriptionPayment[]> => apiClient<SubscriptionPayment[]>("/subscriptions/payments/"),
  submitPayment: (formData: FormData): Promise<SubscriptionPayment> =>
    apiClient<SubscriptionPayment>("/subscriptions/payments/", { method: "POST", body: formData }),
  resubmitPayment: (id: number | string, formData: FormData): Promise<SubscriptionPayment> =>
    apiClient<SubscriptionPayment>(`/subscriptions/payments/${id}/resubmit/`, { method: "POST", body: formData }),

  // Admin - plan CRUD & actions
  adminListPlans: (): Promise<SubscriptionPlan[]> => apiClient<SubscriptionPlan[]>("/subscriptions/plans/"),
  adminCreatePlan: (data: SubscriptionPlanInput): Promise<SubscriptionPlan> =>
    apiClient<SubscriptionPlan>("/subscriptions/plans/", { method: "POST", body: JSON.stringify(data) }),
  adminUpdatePlan: (id: number, data: Partial<SubscriptionPlanInput>): Promise<SubscriptionPlan> =>
    apiClient<SubscriptionPlan>(`/subscriptions/plans/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  adminDeletePlan: (id: number): Promise<{ deleted: boolean; archived: boolean; message: string }> =>
    apiClient<{ deleted: boolean; archived: boolean; message: string }>(`/subscriptions/plans/${id}/`, { method: "DELETE" }),
  duplicatePlan: (id: number): Promise<SubscriptionPlan> =>
    apiClient<SubscriptionPlan>(`/subscriptions/plans/${id}/duplicate/`, { method: "POST" }),
  toggleStatus: (id: number, status?: string): Promise<{ status: string; is_published: boolean }> =>
    apiClient<{ status: string; is_published: boolean }>(`/subscriptions/plans/${id}/toggle-status/`, {
      method: "POST",
      body: JSON.stringify({ status })
    }),
  getSubscribers: (id: number): Promise<PackageSubscriber[]> =>
    apiClient<PackageSubscriber[]>(`/subscriptions/plans/${id}/subscribers/`),
  getUsageStats: (id: number): Promise<PackageUsageStats> =>
    apiClient<PackageUsageStats>(`/subscriptions/plans/${id}/usage-stats/`),
  getAdminStudentUsage: (studentId: number): Promise<EffectiveEntitlements> =>
    apiClient<EffectiveEntitlements>(`/subscriptions/my-subscriptions/admin-student-usage/?student_id=${studentId}`),
  adminAdjustQuota: (studentId: number, feature: string, delta: number, reason: string): Promise<any> =>
    apiClient<any>("/subscriptions/my-subscriptions/admin-adjust-quota/", {
      method: "POST",
      body: JSON.stringify({ student_id: studentId, feature, delta, reason })
    }),

  // Admin - payment review
  adminListPayments: (): Promise<SubscriptionPayment[]> => apiClient<SubscriptionPayment[]>("/subscriptions/payments/"),
  adminApprovePayment: (id: number): Promise<{ status: string }> =>
    apiClient<{ status: string }>(`/subscriptions/payments/${id}/approve/`, { method: "POST" }),
  adminRejectPayment: (id: number, reason: string): Promise<{ status: string }> =>
    apiClient<{ status: string }>(`/subscriptions/payments/${id}/reject/`, { method: "POST", body: JSON.stringify({ reason }) }),
};
