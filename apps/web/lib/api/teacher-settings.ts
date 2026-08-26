import { apiClient } from "./client";

export interface TeacherProfile {
  id: number | string;
  username: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  avatar: string | null;
  date_joined: string;
  bio: string;
  specialization: string;
  designation: string;
  experience_years: number;
  phone_number: string;
  preferred_difficulty: "easy" | "medium" | "hard";
  preferred_question_type: "mcq" | "true_false" | "short_answer" | "subjective";
  profile_updated_at: string;
}

export const getTeacherProfile = async (): Promise<TeacherProfile> => {
  return apiClient<TeacherProfile>("/auth/teacher/profile/");
};

export const updateTeacherProfile = async (
  data: Partial<TeacherProfile>
): Promise<TeacherProfile> => {
  return apiClient<TeacherProfile>("/auth/teacher/profile/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const uploadTeacherAvatar = async (
  file: File
): Promise<{ avatar_url: string }> => {
  const formData = new FormData();
  formData.append("image", file);

  return apiClient<{ avatar_url: string }>("/auth/teacher/avatar/", {
    method: "POST",
    body: formData,
    // Do not set Content-Type header when sending FormData
    // The browser will automatically set it with the correct boundary
  });
};

export const changeTeacherPassword = async (
  data: Record<string, string>
): Promise<{ detail: string; access: string; refresh: string }> => {
  return apiClient<{ detail: string; access: string; refresh: string }>(
    "/auth/teacher/change-password/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
};

export const getTeacherPreferences = async (): Promise<any> => {
  return apiClient<any>("/auth/teacher/preferences/");
};

export const updateTeacherPreferences = async (
  data: Record<string, any>
): Promise<any> => {
  return apiClient<any>("/auth/teacher/preferences/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};
