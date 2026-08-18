import {
  StudentResult,
  QuestionReview,
  SubjectPerformance,
  TopicPerformance,
  LeaderboardEntry,
  mockStudentResults,
  mockRankingStats,
  mockPerformanceTrend,
  mockSubjectPerformance,
  mockTopicPerformance,
  mockQuestionReviews,
  mockLeaderboard,
  mockAdminRankings
} from "../mock/student-results";
import { apiClient } from "./client";

export interface PaginatedLeaderboard {
  count: number;
  next: number | null;
  previous: number | null;
  results: LeaderboardEntry[];
}

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const studentResultService = {
  async getStudentResults(): Promise<StudentResult[]> {
    await delay(500);
    return mockStudentResults;
  },

  async getStudentResult(id: string): Promise<StudentResult | undefined> {
    await delay(500);
    return mockStudentResults.find((r) => r.id === id);
  },

  async getRankingStats(): Promise<typeof mockRankingStats> {
    await delay(500);
    return mockRankingStats;
  },

  async getPerformanceTrend(): Promise<typeof mockPerformanceTrend> {
    await delay(500);
    return mockPerformanceTrend;
  },

  async getSubjectPerformance(): Promise<SubjectPerformance[]> {
    await delay(500);
    return mockSubjectPerformance;
  },

  async getTopicPerformance(): Promise<TopicPerformance[]> {
    await delay(500);
    return mockTopicPerformance;
  },

  async getQuestionReviews(resultId: string): Promise<QuestionReview[]> {
    await delay(500);
    return mockQuestionReviews;
  },
};

export const leaderboardService = {
  async getGlobalLeaderboard(
    page: number = 1,
    timeFilter: string = "all",
    rankingType: string = "overall",
    examId: string = "all",
    search: string = ""
  ): Promise<PaginatedLeaderboard> {
    const params = new URLSearchParams({
      page: page.toString(),
      time_filter: timeFilter,
      ranking_type: rankingType,
      exam: examId,
      ...(search ? { search } : {})
    });
    
    const response = await apiClient<any>(`/student/leaderboard/?${params.toString()}`);
    
    const results = response.results.map((item: any) => ({
      id: item.student_id.toString(),
      rank: item.rank,
      studentId: item.student_id.toString(),
      studentName: item.student_name,
      photo: item.profile_image,
      score: item.score,
      percentage: item.percentage,
      timeTaken: item.time_taken_seconds || 0,
      submissionTime: new Date().toISOString(),
      trend: item.trend || "same",
      totalExams: item.total_exams
    }));

    return {
      count: response.count,
      next: response.next,
      previous: response.previous,
      results
    };
  },

  async getMyRank(
    timeFilter: string = "all",
    rankingType: string = "overall",
    examId: string = "all"
  ): Promise<LeaderboardEntry> {
    const params = new URLSearchParams({
      time_filter: timeFilter,
      ranking_type: rankingType,
      exam: examId
    });
    const item = await apiClient<any>(`/student/leaderboard/my-rank/?${params.toString()}`);
    
    return {
      id: item.student_id.toString(),
      rank: item.rank,
      studentId: item.student_id.toString(),
      studentName: item.student_name,
      photo: item.profile_image,
      score: item.score,
      percentage: item.percentage,
      timeTaken: item.time_taken_seconds || 0,
      submissionTime: new Date().toISOString(),
      trend: item.trend || "same",
      totalExams: item.total_exams,
      isCurrentUser: true
    };
  },

  async getLeaderboardStats(
    timeFilter: string = "all",
    rankingType: string = "overall",
    examId: string = "all"
  ): Promise<{ totalParticipants: number; averageScore: number; highestScore: number }> {
    const params = new URLSearchParams({
      time_filter: timeFilter,
      ranking_type: rankingType,
      exam: examId
    });
    return apiClient<{ totalParticipants: number; averageScore: number; highestScore: number }>(
      `/student/leaderboard/stats/?${params.toString()}`
    );
  },
};

export const rankingService = {
  async getAdminRankings(): Promise<typeof mockAdminRankings> {
    await delay(700);
    return mockAdminRankings;
  }
};
