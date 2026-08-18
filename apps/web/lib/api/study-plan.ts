import { apiClient } from "./client";
import { Exam } from "./syllabus";

export interface SubjectDetails {
  id: number;
  name: string;
}

export interface TopicDetails {
  id: number;
  title: string;
}

export interface StudyTask {
  id: number;
  date: string;
  title: string;
  task_type: string;
  subject: number | null;
  topic: number | null;
  subject_details: SubjectDetails | null;
  topic_details: TopicDetails | null;
  duration_minutes: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  completed_at: string | null;
  created_at: string;
}

export interface StudyPlan {
  id: number;
  exam: number;
  exam_details: Exam;
  target_date: string;
  daily_minutes: number;
  study_days: string[];
  preferred_time: string;
  level: string;
  is_paused: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyPlanProgress {
  total_tasks: number;
  completed_tasks: number;
  weekly_tasks: number;
  weekly_completed: number;
}

export const studyPlanApi = {
  // Plan Operations
  getPlan: async () => {
    const plans = await apiClient<StudyPlan[]>("/study-plan/plans/");
    return plans.length > 0 ? plans[0] : null;
  },
  
  createPlan: async (data: Partial<StudyPlan>) => {
    return apiClient<StudyPlan>("/study-plan/plans/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  updatePlan: async (id: number, data: Partial<StudyPlan>) => {
    return apiClient<StudyPlan>(`/study-plan/plans/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  
  generateTasks: async (id: number) => {
    return apiClient(`/study-plan/plans/${id}/generate/`, { method: "POST" });
  },
  
  pausePlan: async (id: number) => {
    return apiClient(`/study-plan/plans/${id}/pause/`, { method: "POST" });
  },
  
  resumePlan: async (id: number) => {
    return apiClient(`/study-plan/plans/${id}/resume/`, { method: "POST" });
  },
  
  getProgress: async (id: number) => {
    return apiClient<StudyPlanProgress>(`/study-plan/plans/${id}/progress/`);
  },

  // Task Operations
  getTasks: async () => {
    return apiClient<StudyTask[]>("/study-plan/tasks/");
  },
  
  getTodayTasks: async () => {
    return apiClient<StudyTask[]>("/study-plan/tasks/today/");
  },
  
  getUpcomingTasks: async () => {
    return apiClient<StudyTask[]>("/study-plan/tasks/upcoming/");
  },
  
  completeTask: async (id: number) => {
    return apiClient(`/study-plan/tasks/${id}/complete/`, { method: "POST" });
  },
  
  skipTask: async (id: number) => {
    return apiClient(`/study-plan/tasks/${id}/skip/`, { method: "POST" });
  }
};
