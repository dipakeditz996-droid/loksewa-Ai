import { apiClient } from "./client";

export interface TeacherDashboardStats {
  total_students: number;
  assigned_courses: number;
  pending_evaluations: number;
  completed_evaluations: number;
  published_content: number;
}

export interface TeacherDashboardCourse {
  id: number;
  title: string;
  thumbnail: string | null;
  status: string;
  student_count: number;
  completion_percentage: number;
  average_score: number;
}

export interface TeacherDashboardEvaluation {
  id: number;
  student_name: string;
  question_id: string;
  context: string;
  submitted_at: string;
  status: string;
}

export interface TeacherDashboardPracticeSet {
  id: number;
  name: string;
  status: string;
  questions_count: number;
  created_at: string;
}

export interface TeacherDashboardActivity {
  id: string;
  type: string;
  description: string;
  date: string;
}

export interface TeacherDashboardData {
  stats: TeacherDashboardStats;
  courses: TeacherDashboardCourse[];
  pending_evaluations: TeacherDashboardEvaluation[];
  recent_practice_sets: TeacherDashboardPracticeSet[];
  recent_activity: TeacherDashboardActivity[];
}

export const teacherDashboardApi = {
  getDashboardData: async (): Promise<TeacherDashboardData> => {
    return apiClient<TeacherDashboardData>("/teacher/dashboard/");
  }
};
