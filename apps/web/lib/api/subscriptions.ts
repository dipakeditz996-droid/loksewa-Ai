import { apiClient } from "./client";

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  duration: number;
  duration_unit: "DAYS" | "WEEKS" | "MONTHS" | "YEAR";
  price: string;
  original_price: string | null;
  discount: string;
  badge: "NONE" | "POPULAR" | "BEST_VALUE" | "RECOMMENDED" | "LIMITED_OFFER";
  features: string[];
  course: number | null;
  status: "ACTIVE" | "INACTIVE";
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type SubscriptionPlanInput = Omit<SubscriptionPlan, "id" | "created_at" | "updated_at">;

export interface Subscription {
  id: number;
  student: number;
  plan: number;
  plan_details: SubscriptionPlan;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  start_date: string;
  expiry_date: string;
  remaining_days: number;
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
  submitted_at: string;
  verified_at: string | null;
  verified_by: number | null;
}

export const subscriptionsApi = {
  // Public/student
  listPlans: (): Promise<SubscriptionPlan[]> => apiClient<SubscriptionPlan[]>("/subscriptions/plans/"),
  getPlan: (id: number | string): Promise<SubscriptionPlan> => apiClient<SubscriptionPlan>(`/subscriptions/plans/${id}/`),
  mySubscriptions: (): Promise<Subscription[]> => apiClient<Subscription[]>("/subscriptions/my-subscriptions/"),
  myPayments: (): Promise<SubscriptionPayment[]> => apiClient<SubscriptionPayment[]>("/subscriptions/payments/"),
  submitPayment: (formData: FormData): Promise<SubscriptionPayment> =>
    apiClient<SubscriptionPayment>("/subscriptions/payments/", { method: "POST", body: formData }),

  // Admin - plan CRUD (SubscriptionPlanViewSet already supports all of this
  // for admin/super-admin; only the UI calling it was missing)
  adminListPlans: (): Promise<SubscriptionPlan[]> => apiClient<SubscriptionPlan[]>("/subscriptions/plans/"),
  adminCreatePlan: (data: SubscriptionPlanInput): Promise<SubscriptionPlan> =>
    apiClient<SubscriptionPlan>("/subscriptions/plans/", { method: "POST", body: JSON.stringify(data) }),
  adminUpdatePlan: (id: number, data: Partial<SubscriptionPlanInput>): Promise<SubscriptionPlan> =>
    apiClient<SubscriptionPlan>(`/subscriptions/plans/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  adminDeletePlan: (id: number): Promise<void> =>
    apiClient<void>(`/subscriptions/plans/${id}/`, { method: "DELETE" }),

  // Admin - payment review (also directly usable outside /admin-dashboard/applications)
  adminListPayments: (): Promise<SubscriptionPayment[]> => apiClient<SubscriptionPayment[]>("/subscriptions/payments/"),
  adminApprovePayment: (id: number): Promise<{ status: string }> =>
    apiClient<{ status: string }>(`/subscriptions/payments/${id}/approve/`, { method: "POST" }),
  adminRejectPayment: (id: number, reason: string): Promise<{ status: string }> =>
    apiClient<{ status: string }>(`/subscriptions/payments/${id}/reject/`, { method: "POST", body: JSON.stringify({ reason }) }),
};
