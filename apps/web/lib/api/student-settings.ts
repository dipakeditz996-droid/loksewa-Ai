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

export interface NotificationPreferences {
  exam_reminders: boolean;
  exam_starting_soon: boolean;
  exam_deadline: boolean;
  result_published: boolean;
  study_plan_reminders: boolean;
  practice_reminders: boolean;
  daily_progress: boolean;
  ai_tutor_updates: boolean;
  study_recommendations: boolean;
  order_updates: boolean;
  marketplace_notifications: boolean;
  security_alerts: boolean;
  account_notifications: boolean;
}

export const studentSettingsApi = {
  // Profile
  getProfile: () => apiClient<StudentProfile>("/student/profile/"),

  updateProfile: (data: Partial<StudentProfile>) =>
    apiClient<StudentProfile>("/student/profile/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    return apiClient<{ avatar: string }>("/student/profile/photo/", {
      method: "POST",
      body: formData,
    });
  },

  removePhoto: () =>
    apiClient<{ avatar: null }>("/student/profile/photo/", { method: "DELETE" }),

  // Password
  changePassword: (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) =>
    apiClient<{ detail: string }>("/student/password/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Notifications
  getNotifications: () =>
    apiClient<NotificationPreferences>("/student/notifications/"),

  updateNotifications: (data: Partial<NotificationPreferences>) =>
    apiClient<NotificationPreferences>("/student/notifications/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Account management
  deactivateAccount: (password: string) =>
    apiClient<{ detail: string }>("/student/account/deactivate/", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  deleteAccount: (password: string, confirmation: string) =>
    apiClient<{ detail: string }>("/student/account/delete/", {
      method: "POST",
      body: JSON.stringify({ password, confirmation }),
    }),
};
