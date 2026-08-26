import { apiClient } from "./client";

export interface OverviewData {
  total_students: number;
  average_score: number;
  average_accuracy: number;
  total_attempts: number;
  active_students: number;
}

export interface TrendData {
  date: string;
  accuracy: number;
  attempts: number;
}

export interface TopicData {
  id: number;
  topic: string;
  accuracy: number;
}

export interface TopicResponse {
  strong_topics: TopicData[];
  needs_improvement: TopicData[];
}

export interface StudentData {
  id: number;
  name: string;
  courses: string;
  average_score: number;
  accuracy: number;
  attempts: number;
  rank: number;
}

export interface NeedsAttentionData {
  id: number;
  name: string;
  issue: string;
  current_performance: string;
  last_active: string;
  recommended_action: string;
}

export interface CourseData {
  id: number;
  name: string;
  students: number;
  active_students: number;
  average_score: number;
  accuracy: number;
  attempts: number;
  completion: number;
}

export interface SubjectData {
  id: number;
  subject: string;
  accuracy: number;
  questions_attempted: number;
  attempts: number;
  students: number;
}

export const teacherAnalyticsApi = {
  getOverview: async (courseFilter: string, daysFilter: string): Promise<OverviewData> => {
    return apiClient<OverviewData>(`/analytics/teacher/overview/?course=${courseFilter}&days=${daysFilter}`);
  },

  getTrends: async (courseFilter: string, daysFilter: string): Promise<TrendData[]> => {
    return apiClient<TrendData[]>(`/analytics/teacher/trends/?course=${courseFilter}&days=${daysFilter}`);
  },

  getTopics: async (courseFilter: string): Promise<TopicResponse> => {
    return apiClient<TopicResponse>(`/analytics/teacher/topics/?course=${courseFilter}`);
  },

  getStudents: async (courseFilter: string): Promise<StudentData[]> => {
    return apiClient<StudentData[]>(`/analytics/teacher/students/?course=${courseFilter}`);
  },

  getNeedsAttention: async (courseFilter: string): Promise<NeedsAttentionData[]> => {
    return apiClient<NeedsAttentionData[]>(`/analytics/teacher/needs-attention/?course=${courseFilter}`);
  },

  getCoursePerformance: async (): Promise<CourseData[]> => {
    return apiClient<CourseData[]>('/analytics/teacher/courses/');
  },

  getSubjectPerformance: async (courseFilter: string): Promise<SubjectData[]> => {
    return apiClient<SubjectData[]>(`/analytics/teacher/subjects/?course=${courseFilter}`);
  }
};
