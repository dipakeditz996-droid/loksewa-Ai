import { apiClient } from './client';

export interface OverviewMetrics {
  overall_accuracy: number;
  questions_solved: number;
  model_exams_taken: number;
  subjective_evaluated: number;
  study_streak: number;
  best_streak: number;
  active_course: { name: string; id: number; slug?: string | null } | null;
  journey_progress: number;
}

export interface PerformanceTrend {
  date: string;
  accuracy: number;
}

export interface SubjectPerformance {
  subject: string;
  accuracy: number;
  total_attempted: number;
  status: 'Strong' | 'Good' | 'Needs Improvement' | 'Weak';
}

export interface TopicPerformance {
  topic_id: number;
  topic: string;
  subject: string;
  accuracy: number;
  progress: number;
  status: 'Strong' | 'Good' | 'Needs Improvement' | 'Weak';
}

export interface AIInsight {
  recommendation: string;
  daily_plan: string[];
}

export const analyticsApi = {
  getOverview: () => {
    return apiClient<OverviewMetrics>('/analytics/overview/');
  },
  getPerformanceTrend: (days: number = 30) => {
    return apiClient<PerformanceTrend[]>(`/analytics/performance-trend/?days=${days}`);
  },
  getSubjectPerformance: () => {
    return apiClient<SubjectPerformance[]>('/analytics/subject-performance/');
  },
  getTopicPerformance: () => {
    return apiClient<TopicPerformance[]>('/analytics/topic-analysis/');
  },
  getAIInsight: (forceRefresh: boolean = false) => {
    return apiClient<AIInsight>('/analytics/ai-insight/', {
      method: "POST",
      body: JSON.stringify({ force_refresh: forceRefresh })
    });
  }
};
