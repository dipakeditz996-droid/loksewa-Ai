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

export interface DashboardPackageStatus {
  enforcementEnabled: boolean;
  hasActivePackage: boolean;
  isAdminGranted: boolean;
  planName: string | null;
  status: string | null;
  expiryDate: string | null;
  remainingDays: number | null;
  latestPayment: {
    status: "PENDING" | "REJECTED" | "APPROVED";
    rejectionReason: string | null;
    planName: string;
    amount: string;
    submittedAt: string | null;
  } | null;
}

export interface DashboardData {
  profile: DashboardProfile;
  stats: DashboardStats;
  continueLearning: DashboardContinueLearning | null;
  activeCourse: { name: string; id: number; slug: string | null } | null;
  todaysPlan: DashboardStudyTask[];
  recentExams: DashboardRecentExam[];
  purchases: DashboardPurchase[];
  supportTickets: DashboardSupportTicket[];
  subjectPerformance: DashboardSubjectPerformance[];
  package: DashboardPackageStatus;
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
  getStudentDashboard: async (courseId?: number): Promise<DashboardData> => {
    const url = courseId ? `/dashboard/?course_id=${courseId}` : "/dashboard/";
    return apiClient<DashboardData>(url);
  },
  // Lightweight package-lock check (4 queries vs. the full dashboard's ~16) -
  // use this instead of getStudentDashboard() anywhere that only needs to
  // know whether the student is package-locked, e.g. a route guard that
  // runs on every navigation. See student/layout.tsx.
  getPackageStatus: async (): Promise<{ package: DashboardPackageStatus }> => {
    return apiClient<{ package: DashboardPackageStatus }>("/dashboard/package-status/");
  },
  getAnalyticsOverview: async (): Promise<AnalyticsOverview> => {
    return analyticsApi.getOverview();
  },
  getDailyMotivation: async (): Promise<DailyMotivation> => {
    return apiClient<DailyMotivation>("/gamification/motivation/daily/");
  }
};
