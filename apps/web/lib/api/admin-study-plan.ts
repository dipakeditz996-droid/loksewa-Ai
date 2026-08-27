import { apiClient } from "./client";

export interface AdminSubjectDetails {
  id: number;
  name: string;
}

export interface AdminTopicDetails {
  id: number;
  name: string;
}

export interface AdminCourseDetails {
  id: number;
  title: string;
}

export interface AdminExamDetails {
  id: number;
  name: string;
}

export interface AdminStudyPlanTemplateTask {
  id?: number;
  template?: number;
  day_number: number;
  title: string;
  task_type: string;
  subject: number | null;
  topic: number | null;
  subject_details?: AdminSubjectDetails | null;
  topic_details?: AdminTopicDetails | null;
  duration_minutes: number;
}

export interface AdminStudyPlanTemplate {
  id: number;
  name: string;
  description: string;
  duration_days: number;
  course: number | null;
  exam: number | null;
  is_active: boolean;
  created_at: string;
  tasks: AdminStudyPlanTemplateTask[];
  assigned_count: number;
  course_details: AdminCourseDetails | null;
  exam_details: AdminExamDetails | null;
}

export type StudyPlanLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type StudyPlanTime = "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";

export interface CreateStudyPlanPayload {
  /** One or more students. Each gets their own plan. */
  students: number[];
  exam: number;
  target_date: string; // YYYY-MM-DD
  template?: number | null;
  daily_minutes?: number;
  study_days?: string[];
  preferred_time?: StudyPlanTime | null;
  level?: StudyPlanLevel;
}

export interface CreateStudyPlanResult {
  created: { id: number; student: string; task_count: number }[];
  /** Students passed over, e.g. because they already hold a plan. */
  skipped: { student: string; reason: string }[];
  created_count: number;
  skipped_count: number;
  task_count: number;
  exam: string;
  targetDate: string;
  /** Set when a plan saved but its tasks could not be generated. */
  warning?: string;
}

export interface StudyPlanTask {
  id: number;
  date: string;
  title: string;
  taskType: string;
  durationMinutes: number;
  status: string;
}

export interface AdminStudyPlanDetail {
  id: number;
  student: string;
  studentId: number;
  email: string;
  exam: string | null;
  examId: number | null;
  template: string | null;
  templateId: number | null;
  targetDate: string;
  dailyMinutes: number;
  studyDays: string[];
  preferredTime: StudyPlanTime | null;
  level: StudyPlanLevel;
  isPaused: boolean;
  taskCount: number;
  completedTasks: number;
  tasks: StudyPlanTask[];
}

export const adminStudyPlanApi = {
  // Template CRUD
  getTemplates: async () => {
    return apiClient<AdminStudyPlanTemplate[]>("/study-plan/admin/templates/");
  },
  
  getTemplate: async (id: number | string) => {
    return apiClient<AdminStudyPlanTemplate>(`/study-plan/admin/templates/${id}/`);
  },
  
  createTemplate: async (data: Partial<AdminStudyPlanTemplate>) => {
    return apiClient<AdminStudyPlanTemplate>("/study-plan/admin/templates/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  updateTemplate: async (id: number | string, data: Partial<AdminStudyPlanTemplate>) => {
    return apiClient<AdminStudyPlanTemplate>(`/study-plan/admin/templates/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  
  deleteTemplate: async (id: number | string) => {
    return apiClient(`/study-plan/admin/templates/${id}/`, { method: "DELETE" });
  },

  // Actions
  duplicateTemplate: async (id: number | string) => {
    return apiClient<{status: string, id: number}>(`/study-plan/admin/templates/${id}/duplicate/`, { method: "POST" });
  },
  
  activateTemplate: async (id: number | string) => {
    return apiClient<{status: string}>(`/study-plan/admin/templates/${id}/activate/`, { method: "POST" });
  },
  
  deactivateTemplate: async (id: number | string) => {
    return apiClient<{status: string}>(`/study-plan/admin/templates/${id}/deactivate/`, { method: "POST" });
  },
  
  assignTemplate: async (id: number | string, courseId: number) => {
    return apiClient<{status: string, count: number}>(`/study-plan/admin/templates/${id}/assign/`, {
      method: "POST",
      body: JSON.stringify({ course_id: courseId })
    });
  },

  // Plan CRUD. These live under /admin/ (the administration app), not under
  // /study-plan/admin/ where the template endpoints sit.
  createPlan: async (data: CreateStudyPlanPayload) => {
    return apiClient<CreateStudyPlanResult>("/admin/study-plans/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getPlan: async (id: number | string) => {
    return apiClient<AdminStudyPlanDetail>(`/admin/study-plans/${id}/`);
  },

  updatePlan: async (id: number | string, data: Partial<Omit<CreateStudyPlanPayload, "students">> & { is_paused?: boolean }) => {
    return apiClient<{ success: boolean; id: number }>(`/admin/study-plans/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deletePlan: async (id: number | string) => {
    return apiClient(`/admin/study-plans/${id}/`, { method: "DELETE" });
  },
};
