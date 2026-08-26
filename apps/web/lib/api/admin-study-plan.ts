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
  }
};
