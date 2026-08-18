export interface EvaluationOverviewStats {
  totalAttempts: number;
  completedExams: number;
  passed: number;
  failed: number;
  averageScore: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
}

export type ResultStatus = "Published" | "Evaluated" | "Processing" | "Draft" | "Unpublished" | "Pending";

export interface EvaluationResultItem {
  id: string;
  rank: number | null;
  studentName: string;
  studentAvatar?: string;
  examName: string;
  examType: string;
  category: string;
  position: string;
  subject: string;
  score: number;
  percentage: number;
  timeTakenSeconds: number;
  status: ResultStatus;
  submittedAt: string;
}

export type QuestionType = "mcq" | "true_false" | "subjective";

export interface AttemptedQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  type: QuestionType;
  studentAnswer: string | null;
  correctAnswer: string;
  options?: { key: string; text: string; isCorrect: boolean }[]; // for MCQ
  marksObtained: number;
  maxMarks: number;
  negativeMarks?: number;
  explanation: string;
  status: "Correct" | "Incorrect" | "Unanswered" | "Pending Review";
  examinerRemarks?: string;
}

export interface SubjectPerformanceDetail {
  subject: string;
  attempted: number;
  correct: number;
  incorrect: number;
  score: number;
  percentage: number;
}

export interface ChapterPerformanceDetail {
  chapter: string;
  subject: string;
  percentage: number;
  status: "Strong" | "Average" | "Needs Improvement";
}

export interface AdjustmentAudit {
  id: string;
  action: string;
  adminName: string;
  previousValue: string;
  newValue: string;
  reason: string;
  timestamp: string;
}

export interface EvaluationDetail extends EvaluationResultItem {
  attemptNumber: number;
  totalScore: number;
  passFail: "Pass" | "Fail" | "Pending";
  
  questions: AttemptedQuestion[];
  subjectPerformance: SubjectPerformanceDetail[];
  chapterPerformance: ChapterPerformanceDetail[];
  auditTrail: AdjustmentAudit[];
  
  // Overview
  correctAnswers: number;
  incorrectAnswers: number;
  unanswered: number;
  accuracy: number; // percentage
}

// ==========================================
// MOCK DATA
// ==========================================

export const mockEvaluationStats: EvaluationOverviewStats = {
  totalAttempts: 1248,
  completedExams: 342,
  passed: 856,
  failed: 392,
  averageScore: 71.5,
  averagePercentage: 71.5,
  highestScore: 98,
  lowestScore: 12,
};

export const mockEvaluationResults: EvaluationResultItem[] = [
  {
    id: "eval_1",
    rank: 1,
    studentName: "Aarav Gurung",
    studentAvatar: "https://i.pravatar.cc/150?u=aarav",
    examName: "Section Officer Mock Test #5",
    examType: "Mock Test",
    category: "Civil Service",
    position: "Section Officer",
    subject: "All Subjects",
    score: 88,
    percentage: 88,
    timeTakenSeconds: 5400, // 90 mins
    status: "Published",
    submittedAt: "2026-08-14T10:30:00Z",
  },
  {
    id: "eval_2",
    rank: null,
    studentName: "Sita Sharma",
    examName: "Kharidar Weekly Assessment",
    examType: "Practice Test",
    category: "Civil Service",
    position: "Kharidar",
    subject: "General Knowledge",
    score: 65,
    percentage: 65,
    timeTakenSeconds: 3200,
    status: "Evaluated", // Ready to publish
    submittedAt: "2026-08-13T14:15:00Z",
  },
  {
    id: "eval_3",
    rank: 3,
    studentName: "Bishal Thapa",
    studentAvatar: "https://i.pravatar.cc/150?u=bishal",
    examName: "Nayab Subba First Paper",
    examType: "Mock Test",
    category: "Civil Service",
    position: "Nayab Subba",
    subject: "General Aptitude",
    score: 45,
    percentage: 45,
    timeTakenSeconds: 2700,
    status: "Published",
    submittedAt: "2026-08-12T09:00:00Z",
  },
  {
    id: "eval_4",
    rank: null,
    studentName: "Pooja Karki",
    examName: "Section Officer Written Test",
    examType: "Full-Length Exam",
    category: "Civil Service",
    position: "Section Officer",
    subject: "Governance Systems",
    score: 0,
    percentage: 0,
    timeTakenSeconds: 7200,
    status: "Pending", // Contains subjective, needs manual grading
    submittedAt: "2026-08-15T11:20:00Z",
  }
];

export const mockDetail1: EvaluationDetail = {
  ...mockEvaluationResults[0],
  id: "eval_1", // explicitly set to satisfy TS
  rank: 1,
  studentName: "Aarav Gurung",
  examName: "Section Officer Mock Test #5",
  examType: "Mock Test",
  category: "Civil Service",
  position: "Section Officer",
  subject: "All Subjects",
  score: 88,
  percentage: 88,
  timeTakenSeconds: 5400, // 90 mins
  status: "Published",
  submittedAt: "2026-08-14T10:30:00Z",
  attemptNumber: 1,
  totalScore: 100,
  passFail: "Pass",
  correctAnswers: 88,
  incorrectAnswers: 12,
  unanswered: 0,
  accuracy: 88,
  
  subjectPerformance: [
    { subject: "General Knowledge", attempted: 50, correct: 42, incorrect: 8, score: 42, percentage: 84 },
    { subject: "IQ", attempted: 30, correct: 28, incorrect: 2, score: 28, percentage: 93.3 },
    { subject: "English", attempted: 20, correct: 18, incorrect: 2, score: 18, percentage: 90 },
  ],
  chapterPerformance: [
    { chapter: "History of Nepal", subject: "General Knowledge", percentage: 90, status: "Strong" },
    { chapter: "Geography", subject: "General Knowledge", percentage: 70, status: "Average" },
    { chapter: "Logical Reasoning", subject: "IQ", percentage: 95, status: "Strong" },
    { chapter: "Vocabulary", subject: "English", percentage: 50, status: "Needs Improvement" },
  ],
  auditTrail: [
    {
      id: "adt_1",
      action: "Result published",
      adminName: "Super Admin",
      previousValue: "Evaluated",
      newValue: "Published",
      reason: "All subjective reviews completed.",
      timestamp: "2026-08-14T15:00:00Z",
    }
  ],
  questions: [
    {
      id: "q_1",
      questionNumber: 1,
      questionText: "What is the capital of Nepal?",
      type: "mcq",
      studentAnswer: "A",
      correctAnswer: "A",
      options: [
        { key: "A", text: "Kathmandu", isCorrect: true },
        { key: "B", text: "Pokhara", isCorrect: false },
        { key: "C", text: "Lalitpur", isCorrect: false },
        { key: "D", text: "Biratnagar", isCorrect: false },
      ],
      marksObtained: 1,
      maxMarks: 1,
      negativeMarks: 0,
      explanation: "Kathmandu is the capital and largest city of Nepal.",
      status: "Correct",
    },
    {
      id: "q_2",
      questionNumber: 2,
      questionText: "Which is the longest river in Nepal?",
      type: "mcq",
      studentAnswer: "B",
      correctAnswer: "C",
      options: [
        { key: "A", text: "Koshi", isCorrect: false },
        { key: "B", text: "Gandaki", isCorrect: false },
        { key: "C", text: "Karnali", isCorrect: true },
        { key: "D", text: "Mahakali", isCorrect: false },
      ],
      marksObtained: -0.2, // 20% negative marking
      maxMarks: 1,
      negativeMarks: 0.2,
      explanation: "Karnali is the longest river in Nepal with a length of 507 km within the country.",
      status: "Incorrect",
    },
    {
      id: "q_3",
      questionNumber: 3,
      questionText: "Nepal became a federal democratic republic in 2008.",
      type: "true_false",
      studentAnswer: "True",
      correctAnswer: "True",
      marksObtained: 1,
      maxMarks: 1,
      explanation: "The first meeting of the Constituent Assembly on May 28, 2008, officially declared Nepal a federal democratic republic.",
      status: "Correct",
    },
    {
      id: "q_4",
      questionNumber: 4,
      questionText: "Explain the main features of the Constitution of Nepal 2015.",
      type: "subjective",
      studentAnswer: "The Constitution of Nepal 2015 established Nepal as a federal democratic republican state. It introduced a three-tier government structure: federal, provincial, and local. It ensures 31 fundamental rights, including the right to clean environment and education. It also guarantees inclusion and proportional representation for marginalized groups.",
      correctAnswer: "Key features include: Federal structure (3 tiers), Secularism, Republicanism, 31 Fundamental Rights, Proportional Inclusion, Bicameral Federal Parliament.",
      marksObtained: 4,
      maxMarks: 5,
      explanation: "A good comprehensive answer covering most points.",
      status: "Correct",
      examinerRemarks: "Excellent coverage of federalism and fundamental rights. Could mention secularism.",
    }
  ]
};
