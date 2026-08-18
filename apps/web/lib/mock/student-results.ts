export interface StudentResult {
  id: string;
  examId: string;
  examName: string;
  date: string;
  score: number;
  totalMarks: number;
  percentage: number;
  rank: number;
  totalParticipants: number;
  timeTaken: number; // in seconds
  status: "Published" | "Pending Review" | "Draft" | "Updated" | "Hidden";
  percentile?: number;
  previousRank?: number;
}

export interface QuestionReview {
  id: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  explanation: string;
  marks: number;
  maxMarks: number;
  status: "Correct" | "Incorrect" | "Unanswered";
  evaluatorFeedback?: string;
}

export interface SubjectPerformance {
  subject: string;
  questions: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  marks: number;
}

export interface TopicPerformance {
  topic: string;
  attempts: number;
  accuracy: number;
  performance: "Strong" | "Average" | "Needs Improvement";
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  studentId: string;
  studentName: string;
  photo?: string;
  score: number;
  percentage: number;
  timeTaken: number; // in seconds
  submissionTime: string;
  totalExams?: number;
  trend?: string;
  isCurrentUser?: boolean;
}

export const mockStudentResults: StudentResult[] = [
  {
    id: "res_101",
    examId: "exam_1",
    examName: "Loksewa Mock Test #12",
    date: "2026-08-14T10:00:00Z",
    score: 82,
    totalMarks: 100,
    percentage: 82,
    rank: 7,
    totalParticipants: 125,
    timeTaken: 3600, // 60 mins
    status: "Published",
    percentile: 94.4,
    previousRank: 12,
  },
  {
    id: "res_102",
    examId: "exam_2",
    examName: "Kharidar Weekly Assessment",
    date: "2026-08-07T14:30:00Z",
    score: 68,
    totalMarks: 100,
    percentage: 68,
    rank: 27,
    totalParticipants: 150,
    timeTaken: 4200,
    status: "Published",
    percentile: 82.0,
  },
  {
    id: "res_103",
    examId: "exam_3",
    examName: "Section Officer Pre-Test",
    date: "2026-08-01T09:00:00Z",
    score: 91,
    totalMarks: 100,
    percentage: 91,
    rank: 4,
    totalParticipants: 200,
    timeTaken: 3500,
    status: "Published",
    percentile: 98.0,
  },
];

export const mockRankingStats = {
  totalExams: 15,
  completedExams: 12,
  averageScore: 74,
  bestScore: 91,
  averagePercentage: 74,
  currentRank: 7, // Latest exam rank
  bestRank: 4,
  percentile: 88.5,
};

export const mockPerformanceTrend = [
  { attempt: 1, percentage: 65, rank: 45 },
  { attempt: 2, percentage: 70, rank: 38 },
  { attempt: 3, percentage: 68, rank: 40 },
  { attempt: 4, percentage: 75, rank: 25 },
  { attempt: 5, percentage: 82, rank: 12 },
  { attempt: 6, percentage: 91, rank: 4 },
  { attempt: 7, percentage: 82, rank: 7 }, // Latest
];

export const mockSubjectPerformance: SubjectPerformance[] = [
  {
    subject: "Constitution",
    questions: 20,
    correct: 17,
    incorrect: 3,
    accuracy: 85,
    marks: 17,
  },
  {
    subject: "General Knowledge",
    questions: 30,
    correct: 22,
    incorrect: 6, // 2 unanswered
    accuracy: 73.3,
    marks: 22,
  },
  {
    subject: "IQ / Logical Reasoning",
    questions: 25,
    correct: 20,
    incorrect: 5,
    accuracy: 80,
    marks: 20,
  },
];

export const mockTopicPerformance: TopicPerformance[] = [
  { topic: "Fundamental Rights", attempts: 20, accuracy: 90, performance: "Strong" },
  { topic: "History of Nepal", attempts: 30, accuracy: 75, performance: "Average" },
  { topic: "Constitutional Bodies", attempts: 15, accuracy: 53, performance: "Needs Improvement" },
  { topic: "Geography", attempts: 25, accuracy: 88, performance: "Strong" },
  { topic: "Current Affairs", attempts: 40, accuracy: 60, performance: "Needs Improvement" },
];

export const mockQuestionReviews: QuestionReview[] = [
  {
    id: "q_1",
    questionText: "What is the total number of fundamental rights guaranteed by the Constitution of Nepal?",
    studentAnswer: "31",
    correctAnswer: "31",
    explanation: "Part 3 of the Constitution of Nepal (2015) explicitly mentions 31 fundamental rights from Article 16 to Article 46.",
    marks: 1,
    maxMarks: 1,
    status: "Correct"
  },
  {
    id: "q_2",
    questionText: "Which Constitutional Body is responsible for investigating corruption in Nepal?",
    studentAnswer: "Election Commission",
    correctAnswer: "Commission for the Investigation of Abuse of Authority (CIAA)",
    explanation: "CIAA (अख्तियार दुरुपयोग अनुसन्धान आयोग) is the apex constitutional body to investigate corruption cases as per Article 238 of the Constitution.",
    marks: 0,
    maxMarks: 1,
    status: "Incorrect"
  },
  {
    id: "q_3",
    questionText: "When did Nepal formally adopt the current Constitution?",
    studentAnswer: "",
    correctAnswer: "Asoj 3, 2072 BS (September 20, 2015)",
    explanation: "The Constitution of Nepal 2015 was promulgated by the President on Asoj 3, 2072 BS.",
    marks: 0,
    maxMarks: 1,
    status: "Unanswered"
  },
];

export const mockLeaderboard: LeaderboardEntry[] = [
  { id: "u_1", rank: 1, studentId: "u_1", studentName: "Ramesh Thapa", photo: "https://i.pravatar.cc/150?u=ramesh", score: 96, percentage: 96, timeTaken: 3400, submissionTime: "2026-08-14T10:05:00Z" },
  { id: "u_2", rank: 2, studentId: "u_2", studentName: "Sita Sharma", photo: "https://i.pravatar.cc/150?u=sita", score: 94, percentage: 94, timeTaken: 3450, submissionTime: "2026-08-14T10:10:00Z" },
  { id: "u_3", rank: 3, studentId: "u_3", studentName: "Hari Poudel", photo: "https://i.pravatar.cc/150?u=hari", score: 91, percentage: 91, timeTaken: 3300, submissionTime: "2026-08-14T10:12:00Z" },
  { id: "u_4", rank: 4, studentId: "u_4", studentName: "Aashish Gurung", photo: "https://i.pravatar.cc/150?u=aashish", score: 88, percentage: 88, timeTaken: 3600, submissionTime: "2026-08-14T10:15:00Z" },
  { id: "u_5", rank: 5, studentId: "u_5", studentName: "Bibek Karki", score: 85, percentage: 85, timeTaken: 3500, submissionTime: "2026-08-14T10:18:00Z" },
  { id: "u_6", rank: 6, studentId: "u_6", studentName: "Bhanu Bhakta", photo: "https://i.pravatar.cc/150?u=bhanu", score: 83, percentage: 83, timeTaken: 3700, submissionTime: "2026-08-14T10:20:00Z" },
  { id: "u_currentUser", rank: 7, studentId: "u_currentUser", studentName: "Dipak Bhandari", score: 82, percentage: 82, timeTaken: 3600, submissionTime: "2026-08-14T10:25:00Z", isCurrentUser: true },
  { id: "u_8", rank: 8, studentId: "u_8", studentName: "Gita Magar", score: 80, percentage: 80, timeTaken: 3550, submissionTime: "2026-08-14T10:30:00Z" },
  { id: "u_9", rank: 9, studentId: "u_9", studentName: "Nabin Shrestha", photo: "https://i.pravatar.cc/150?u=nabin", score: 79, percentage: 79, timeTaken: 3650, submissionTime: "2026-08-14T10:35:00Z" },
  { id: "u_10", rank: 10, studentId: "u_10", studentName: "Anju Rai", score: 77, percentage: 77, timeTaken: 3800, submissionTime: "2026-08-14T10:40:00Z" },
  { id: "u_11", rank: 11, studentId: "u_11", studentName: "Kamal Khadka", score: 75, percentage: 75, timeTaken: 3900, submissionTime: "2026-08-14T10:45:00Z" },
  { id: "u_12", rank: 12, studentId: "u_12", studentName: "Sushma Bista", score: 74, percentage: 74, timeTaken: 4000, submissionTime: "2026-08-14T10:50:00Z" },
];

export const mockAdminRankings = mockLeaderboard.map((entry) => ({
  ...entry,
  examName: "Loksewa Mock Test #12",
  status: "Published" as const,
}));
