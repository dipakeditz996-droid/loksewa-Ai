import { apiClient } from "./client";
import { studentExamsApi } from "./student-exams";

export interface StudentResult {
  id: string;
  examId: string;
  examName: string;
  date: string;
  score: number;
  totalMarks: number;
  percentage: number;
  rank: number | string;
  totalParticipants: number | string;
  percentile: number | string;
  timeTaken: number;
}

export interface SubjectPerformance {
  subject: string;
  questions: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export interface TopicPerformance {
  topic: string;
  performance: "Strong" | "Average" | "Needs Improvement";
}

export interface QuestionReview {
  id: string;
  questionText: string;
  studentAnswer: string | null;
  correctAnswer: string;
  status: "Correct" | "Incorrect" | "Unanswered";
  marks: number;
  maxMarks: number;
  explanation: string;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  studentId: string;
  studentName: string;
  photo: string | null;
  score: number;
  percentage: number;
  timeTaken: number;
  submissionTime: string;
  trend: "up" | "down" | "same";
  totalExams: number;
  isCurrentUser?: boolean;
}

export interface PaginatedLeaderboard {
  count: number;
  next: number | null;
  previous: number | null;
  results: LeaderboardEntry[];
}

export const studentResultService = {
  async getStudentResults(): Promise<StudentResult[]> {
    const attempts = await apiClient<any[]>('/student/exam-attempts/');
    
    return attempts.filter(a => a.status === 'submitted' || a.status === 'evaluated').map(a => ({
      id: a.id.toString(),
      examId: a.examination.toString(),
      examName: a.examination_title || 'Unknown Exam',
      date: a.submitted_at || new Date().toISOString(),
      score: a.score,
      totalMarks: 100, // Fallback if not available
      percentage: a.percentage,
      rank: 'N/A',
      totalParticipants: 'N/A',
      percentile: 'N/A',
      timeTaken: a.time_taken_seconds || 0
    }));
  },

  async getStudentResult(id: string): Promise<StudentResult | undefined> {
    try {
      const attempt = await studentExamsApi.getResult(parseInt(id));
      
      let totalParticipants: number | string = 'N/A';
      let rank: number | string = 'N/A';
      let percentile: number | string = 'N/A';
      
      try {
        const stats = await leaderboardService.getLeaderboardStats('all', 'overall', attempt.examination.toString());
        totalParticipants = stats.totalParticipants || 1;
        const myRank = await leaderboardService.getMyRank('all', 'overall', attempt.examination.toString());
        if (myRank) {
          rank = myRank.rank;
          percentile = Math.round(((Number(totalParticipants) - rank) / Number(totalParticipants)) * 100);
        }
      } catch (e) {
        // Ignored, rank APIs might fail or be unavailable
      }
      
      let totalMarks = 0;
      if (attempt.answers && attempt.answers.length > 0) {
          totalMarks = attempt.answers.length; // rough fallback, assume 1 mark each if no max_marks provided
      }
      
      return {
        id: attempt.id.toString(),
        examId: attempt.examination.toString(),
        examName: attempt.examination_title,
        date: attempt.submitted_at || new Date().toISOString(),
        score: attempt.score,
        totalMarks: totalMarks > 0 ? totalMarks : 100,
        percentage: attempt.percentage,
        rank: rank,
        totalParticipants: totalParticipants,
        percentile: percentile,
        timeTaken: attempt.time_taken_seconds
      };
    } catch (e) {
      return undefined;
    }
  },

  async getRankingStats(): Promise<any> {
    return apiClient<any>('/exams/rankings/stats/');
  },

  async getPerformanceTrend(): Promise<any> {
    return apiClient<any>('/analytics/performance-trend/');
  },

  async getSubjectPerformance(): Promise<SubjectPerformance[]> {
    // Analytics endpoints not canonicalized yet
    return apiClient<SubjectPerformance[]>('/analytics/subject-performance/');
  },

  async getTopicPerformance(): Promise<TopicPerformance[]> {
    // Analytics endpoints not canonicalized yet
    return apiClient<TopicPerformance[]>('/analytics/topic-analysis/');
  },

  async getQuestionReviews(resultId: string): Promise<QuestionReview[]> {
    try {
      const attempt = await studentExamsApi.getResult(parseInt(resultId));
      const questions = await studentExamsApi.getAttemptQuestions(parseInt(resultId));
      
      if (!attempt.answers) return [];
      
      return attempt.answers.map(ans => {
        const q = questions.find(question => question.id === ans.question);
        
        let status: "Correct" | "Incorrect" | "Unanswered" = "Unanswered";
        if (ans.selected_option) {
          status = ans.is_correct ? "Correct" : "Incorrect";
        }
        
        return {
          id: ans.id.toString(),
          questionText: q?.text || `Question ID: ${ans.question}`,
          studentAnswer: ans.selected_option || null,
          correctAnswer: "Hidden by backend",
          status: status,
          marks: ans.marks_awarded || 0,
          maxMarks: q?.marks || 1,
          explanation: "Explanation hidden or unavailable."
        };
      });
    } catch (e) {
      return [];
    }
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
  async getAdminRankings(): Promise<any> {
    return apiClient<any>('/admin/rankings/');
  }
};
