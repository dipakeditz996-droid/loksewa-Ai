import { apiClient } from "./client";
import { studentExamsApi } from "./student-exams";

export interface StudentResult {
  id: string;
  examId: string;
  examName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  timeTaken: number;
  rank: number | string;
  totalParticipants: number | string;
  percentile: number | string;
  date: string;
  correctAnswers: number;
  incorrectAnswers: number;
  unanswered: number;
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
      totalMarks: a.total_marks != null ? a.total_marks : 100, // Safe fallback for legacy missing data
      percentage: a.percentage,
      rank: 'N/A',
      totalParticipants: 'N/A',
      percentile: 'N/A',
      timeTaken: a.time_taken_seconds || 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      unanswered: 0
    }));
  },

  async getStudentResult(id: string): Promise<StudentResult | undefined> {
    try {
      const attempt: any = await studentExamsApi.getResult(parseInt(id));
      console.log("[getStudentResult] Backend attempt response:", attempt);
      
      const rank = attempt.rank ?? 'N/A';
      const totalParticipants = attempt.total_participants ?? 'N/A';
      console.log("[getStudentResult] Extracted rank:", rank, "total:", totalParticipants);
      
      let percentile: number | string = 'N/A';
      if (typeof rank === 'number' && typeof totalParticipants === 'number' && totalParticipants > 0) {
        percentile = Math.round(((totalParticipants - rank) / totalParticipants) * 100);
      }
      
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;
      
      if (attempt.answers && Array.isArray(attempt.answers)) {
        attempt.answers.forEach((ans: any) => {
          if (!ans.selected_option) {
            unanswered++;
          } else if (ans.is_correct) {
            correct++;
          } else {
            incorrect++;
          }
        });
      }

      const result: StudentResult = {
        id: attempt.id.toString(),
        examId: attempt.examination.toString(),
        examName: attempt.examination_title || 'Unknown Exam',
        score: attempt.score,
        totalMarks: attempt.total_marks != null ? attempt.total_marks : 100, // Safely fallback if legacy backend response
        percentage: attempt.percentage,
        timeTaken: attempt.time_taken_seconds || 0,
        rank: rank !== 'N/A' ? parseInt(rank) : 'N/A',
        totalParticipants: totalParticipants !== 'N/A' ? parseInt(totalParticipants) : 'N/A',
        percentile: percentile,
        date: new Date(attempt.started_at).toLocaleDateString(),
        correctAnswers: correct,
        incorrectAnswers: incorrect,
        unanswered: unanswered
      };
      return result;
    } catch (error) {
      console.error("Error fetching student result", error);
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

// The admin ranking wrapper that used to live here pointed at /admin/rankings/,
// a route that was never implemented, so every call 404'd. Admin rankings now
// go through adminLeaderboardApi in lib/api/admin-leaderboard.ts.
