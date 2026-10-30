import { apiClient } from "./client";

export interface StudentProfile {
  id: number;
  username: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  role: string;
  date_joined: string;
  phone: string;
  permanent_district?: string;
  permanent_local_level?: string;
  bio: string;
  target_category: number | null;
  target_category_name: string | null;
  target_position: number | null;
  target_position_name: string | null;
  preferred_study_time: string;
  daily_study_goal_minutes: number;
  difficulty_preference: string;
  study_mode: string;
  show_profile: boolean;
  show_leaderboard: boolean;
  allow_comparisons: boolean;
  allow_activity_visibility: boolean;
  language: string;
}

export interface StudentTaxonomyEvent {
  key: string;
  label: string;
  description: string;
  mandatory: boolean;
  in_app: boolean;
  email: boolean;
}

export interface StudentTaxonomyCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
  events: StudentTaxonomyEvent[];
}

export interface NotificationPreferences {
  taxonomy?: StudentTaxonomyCategory[];

  // Dual channel fields
  exam_announcements_inapp?: boolean;
  exam_announcements_email?: boolean;
  study_material_updates_inapp?: boolean;
  study_material_updates_email?: boolean;
  exam_reminders_inapp?: boolean;
  exam_reminders_email?: boolean;
  result_published_inapp?: boolean;
  result_published_email?: boolean;
  learning_resources_inapp?: boolean;
  learning_resources_email?: boolean;

  subscription_expiry_inapp?: boolean;
  subscription_expiry_email?: boolean;
  payment_submission_inapp?: boolean;
  payment_submission_email?: boolean;
  payment_status_inapp?: boolean;
  payment_status_email?: boolean;
  subscription_status_inapp?: boolean;
  subscription_status_email?: boolean;
  plan_offers_inapp?: boolean;
  plan_offers_email?: boolean;

  order_confirmation_inapp?: boolean;
  order_confirmation_email?: boolean;
  order_payment_status_inapp?: boolean;
  order_payment_status_email?: boolean;
  order_delivery_updates_inapp?: boolean;
  order_delivery_updates_email?: boolean;
  order_cancellation_inapp?: boolean;
  order_cancellation_email?: boolean;

  security_alerts_inapp?: boolean;
  security_alerts_email?: boolean;
  platform_announcements_inapp?: boolean;
  platform_announcements_email?: boolean;
  feature_announcements_inapp?: boolean;
  feature_announcements_email?: boolean;
  maintenance_alerts_inapp?: boolean;
  maintenance_alerts_email?: boolean;

  // Legacy fields
  exam_reminders?: boolean;
  exam_starting_soon?: boolean;
  exam_deadline?: boolean;
  result_published?: boolean;
  study_plan_reminders?: boolean;
  practice_reminders?: boolean;
  daily_progress?: boolean;
  ai_tutor_updates?: boolean;
  study_recommendations?: boolean;
  order_updates?: boolean;
  marketplace_notifications?: boolean;
  security_alerts?: boolean;
  account_notifications?: boolean;

  [key: string]: any;
}

export const studentSettingsApi = {
  // Profile
  getProfile: () => apiClient<StudentProfile>("/support/profile/"),

  updateProfile: (data: Partial<StudentProfile>) =>
    apiClient<StudentProfile>("/support/profile/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    return apiClient<{ avatar: string }>("/support/profile/photo/", {
      method: "POST",
      body: formData,
    });
  },

  removePhoto: () =>
    apiClient<{ avatar: null }>("/support/profile/photo/", { method: "DELETE" }),

  // Password
  changePassword: (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) =>
    apiClient<{ detail: string }>("/support/password/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Notifications
  getNotifications: () =>
    apiClient<NotificationPreferences>("/support/notifications/"),

  updateNotifications: (data: Partial<NotificationPreferences>) =>
    apiClient<NotificationPreferences>("/support/notifications/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Account management
  deactivateAccount: (password: string) =>
    apiClient<{ detail: string }>("/support/account/deactivate/", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  deleteAccount: (password: string, confirmation: string) =>
    apiClient<{ detail: string }>("/support/account/delete/", {
      method: "POST",
      body: JSON.stringify({ password, confirmation }),
    }),
};
