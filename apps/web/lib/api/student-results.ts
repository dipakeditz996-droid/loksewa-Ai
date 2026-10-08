import { apiClient } from "./client";
import { studentExamsApi } from "./student-exams";

export interface StudentResult {
  id: string;
  examId: string;
  examName: string;
  score: number | null;
  totalMarks: number;
  percentage: number | null;
  timeTaken: number;
  rank: number | string;
  totalParticipants: number | string;
  percentile: number | string;
  date: string;
  correctAnswers: number;
  incorrectAnswers: number;
  unanswered: number;
  accuracy?: number;
  subjectBreakdown?: SubjectPerformance[];
  topicBreakdown?: TopicPerformance[];
  reviews?: QuestionReview[];
  isSubjective?: boolean;
  needsEvaluation?: boolean;
  isPublished?: boolean;
  status?: string;
  hasSubmittedAnswerPdf?: boolean;
  checkingRequest?: {
    id: number;
    status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected';
    status_display: string;
    rejection_reason?: string;
    created_at: string;
    reviewed_at?: string | null;
  } | null;
}

export interface SubjectPerformance {
  subject: string;
  questions?: number;
  correct?: number;
  incorrect?: number;
  accuracy: number;
  total_attempted?: number;
  status?: string;
}

export interface TopicPerformance {
  topic_id?: number;
  topic: string;
  subject?: string;
  accuracy?: number;
  progress?: number;
  status?: string;
  performance?: "Strong" | "Average" | "Needs Improvement" | "Good" | "Weak" | string;
  questions?: number;
  correct?: number;
}

export interface QuestionReview {
  id: string;
  questionId: number;
  questionText: string;
  questionType: string;
  options?: {
    A?: string | null;
    B?: string | null;
    C?: string | null;
    D?: string | null;
  };
  studentAnswer: string | null;
  answerText?: string | null;
  correctAnswer: string | null;
  modelAnswer?: string | null;
  status: "Correct" | "Incorrect" | "Unanswered";
  marks: number;
  maxMarks: number;
  explanation: string;
  reviewAllowed: boolean;
  evaluatedAt?: string | null;
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
    const res = await apiClient<any>('/student/exam-attempts/?status=results');
    const attempts: any[] = Array.isArray(res) ? res : (res?.results || []);
    
    return attempts.filter(a => a.status === 'submitted' || a.status === 'evaluated').map(a => ({
      id: a.id.toString(),
      examId: a.examination.toString(),
      examName: a.examination_title || 'Unknown Exam',
      date: a.submitted_at || new Date().toISOString(),
      score: a.score,
      totalMarks: a.total_marks != null ? a.total_marks : 100,
      percentage: a.percentage,
      rank: a.rank ?? 'N/A',
      totalParticipants: a.total_participants ?? 'N/A',
      percentile: 'N/A',
      timeTaken: a.time_taken_seconds || 0,
      correctAnswers: a.correct_answers || 0,
      incorrectAnswers: a.wrong_answers || 0,
      unanswered: a.unanswered || 0
    }));
  },

  async getStudentResult(id: string): Promise<StudentResult | undefined> {
    try {
      const attempt: any = await studentExamsApi.getResult(parseInt(id));
      
      const rank = attempt.rank ?? 'N/A';
      const totalParticipants = attempt.total_participants ?? 'N/A';
      
      let percentile: number | string = 'N/A';
      if (typeof rank === 'number' && typeof totalParticipants === 'number' && totalParticipants > 0) {
        percentile = Math.round(((totalParticipants - rank) / totalParticipants) * 100);
      }
      
      let correct = attempt.correct_answers;
      let incorrect = attempt.wrong_answers;
      let unanswered = attempt.unanswered;

      if (correct === undefined || incorrect === undefined || unanswered === undefined) {
        correct = 0;
        incorrect = 0;
        unanswered = 0;
        if (attempt.answers && Array.isArray(attempt.answers)) {
          attempt.answers.forEach((ans: any) => {
            if (!ans.selected_option && !ans.answer_text) {
              unanswered++;
            } else if (ans.is_correct) {
              correct++;
            } else {
              incorrect++;
            }
          });
        }
      }

      const reviewAllowed = Boolean(attempt.can_review_answers ?? attempt.show_correct_answers);
      let reviews: QuestionReview[] = [];
      if (attempt.answers && Array.isArray(attempt.answers)) {
        reviews = attempt.answers.map((ans: any) => {
          const questionType = ans.question_type || "mcq";
          const isSubjective = !["mcq", "true_false"].includes(questionType);

          let status: "Correct" | "Incorrect" | "Unanswered" = "Unanswered";
          if (isSubjective) {
            if (ans.answer_text) {
              status = (ans.marks_awarded && ans.marks_awarded > 0) ? "Correct" : (ans.evaluated_at ? "Incorrect" : "Unanswered");
            }
          } else {
            if (ans.selected_option) {
              status = ans.is_correct ? "Correct" : "Incorrect";
            }
          }

          let rawCorrectOption = ans.correct_option || null;
          if (rawCorrectOption) {
            rawCorrectOption = rawCorrectOption.trim().toUpperCase();
          }

          const rawExplanation = ans.explanation || "";
          const explanationText = reviewAllowed
            ? (rawExplanation.trim() ? rawExplanation : "Explanation unavailable.")
            : "Correct answers are not available for this examination.";

          return {
            id: ans.id.toString(),
            questionId: ans.question,
            questionText: ans.question_text || `Question ID: ${ans.question}`,
            questionType: questionType,
            options: {
              A: ans.option_a ?? null,
              B: ans.option_b ?? null,
              C: ans.option_c ?? null,
              D: ans.option_d ?? null,
            },
            studentAnswer: isSubjective ? (ans.answer_text || null) : (ans.selected_option ? ans.selected_option.trim().toUpperCase() : null),
            answerText: ans.answer_text || null,
            correctAnswer: reviewAllowed ? rawCorrectOption : null,
            modelAnswer: reviewAllowed ? (ans.model_answer || null) : null,
            status: status,
            marks: ans.marks_awarded || 0,
            maxMarks: ans.max_marks || 1,
            explanation: explanationText,
            reviewAllowed: reviewAllowed,
            evaluatedAt: ans.evaluated_at || null,
          };
        });
      }

      const result: StudentResult = {
        id: attempt.id.toString(),
        examId: attempt.examination.toString(),
        examName: attempt.examination_title || 'Unknown Exam',
        score: attempt.score,
        totalMarks: attempt.total_marks != null ? attempt.total_marks : 100,
        percentage: attempt.percentage,
        timeTaken: attempt.time_taken_seconds || 0,
        rank: rank !== 'N/A' ? parseInt(rank) : 'N/A',
        totalParticipants: totalParticipants !== 'N/A' ? parseInt(totalParticipants) : 'N/A',
        percentile: percentile,
        date: attempt.started_at ? new Date(attempt.started_at).toLocaleDateString() : new Date().toLocaleDateString(),
        correctAnswers: correct,
        incorrectAnswers: incorrect,
        unanswered: unanswered,
        accuracy: attempt.accuracy,
        subjectBreakdown: attempt.subject_breakdown || [],
        topicBreakdown: attempt.topic_breakdown || [],
        reviews: reviews,
        isSubjective: Boolean(
          attempt.is_subjective ||
          attempt.examination_exam_type === 'subjective' ||
          attempt.subjective_submission ||
          attempt.has_submitted_answer_pdf
        ),
        needsEvaluation: Boolean(attempt.needs_evaluation),
        isPublished: Boolean(
          attempt.is_published ??
          attempt.subjective_submission?.is_published ??
          (attempt.status === 'evaluated' && !attempt.needs_evaluation)
        ),
        status: attempt.status,
        hasSubmittedAnswerPdf: Boolean(attempt.has_submitted_answer_pdf || attempt.subjective_submission?.has_answer_pdf),
        checkingRequest: attempt.checking_request || attempt.subjective_submission?.checking_request || null,
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
    return apiClient<SubjectPerformance[]>('/analytics/subject-performance/');
  },

  async getTopicPerformance(): Promise<TopicPerformance[]> {
    return apiClient<TopicPerformance[]>('/analytics/topic-performance/');
  },

  async getQuestionReviews(resultId: string): Promise<QuestionReview[]> {
    const res = await this.getStudentResult(resultId);
    return res?.reviews || [];
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
