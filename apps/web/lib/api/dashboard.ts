import { apiClient } from "./client";
import { analyticsApi, OverviewMetrics as AnalyticsOverview } from "./analytics";

export interface DashboardProfile {
  name: string;
  avatar: string | null;
  targetPosition: string | null;
  completionPercentage: number;
  phone: string;
}

export interface DashboardStats {
  totalExams: number;
  completedExams: number;
  averageScore: number;
  bestScore: number;
  accuracy: number;
  questionsAttempted: number;
  studyStreak: number;
  studyTime: string;
  progress: number;
}

export interface DashboardContinueLearning {
  id: string | number;
  type: "model_exam" | "practice";
  title: string;
  progress: number;
  url: string;
}

export interface DashboardStudyTask {
  id: string | number;
  title: string;
  type: string;
  completed: boolean;
  duration: number;
}

export interface DashboardRecentExam {
  id: string | number;
  title: string;
  date: string;
  score: number;
  percentage: number;
}

export interface DashboardPurchase {
  id: string | number;
  title: string;
  status: "APPROVED" | "PENDING";
  url: string;
}

export interface DashboardSupportTicket {
  id: string | number;
  title: string;
  status: string;
  url: string;
}

export interface DashboardSubjectPerformance {
  subject: string;
  progress: number;
}

export interface DashboardData {
  profile: DashboardProfile;
  stats: DashboardStats;
  continueLearning: DashboardContinueLearning | null;
  todaysPlan: DashboardStudyTask[];
  recentExams: DashboardRecentExam[];
  purchases: DashboardPurchase[];
  supportTickets: DashboardSupportTicket[];
  subjectPerformance: DashboardSubjectPerformance[];
}

export const QUICK_ACTIONS = [
  { label: "Practice Questions", href: "/student/practice", icon: "target" },
  { label: "Take Mock Exam", href: "/student/exams", icon: "file-text" },
  { label: "Ask AI Tutor", href: "/student/ai-tutor", icon: "message-square" },
  { label: "View Study Plan", href: "/student/study-plan", icon: "calendar" },
  { label: "Marketplace", href: "/student/marketplace", icon: "shopping-bag" },
  { label: "Invite Friends", href: "/student/referrals", icon: "gift" },
];

export type { AnalyticsOverview };

export interface DailyMotivation {
  message: string;
  language: string;
  category: string;
}

export const dashboardApi = {
  getStudentDashboard: async (): Promise<DashboardData> => {
    return apiClient<DashboardData>("/dashboard/");
  },
  getAnalyticsOverview: async (): Promise<AnalyticsOverview> => {
    return analyticsApi.getOverview();
  },
  getDailyMotivation: async (): Promise<DailyMotivation> => {
    return apiClient<DailyMotivation>("/gamification/motivation/daily/");
  }
};
