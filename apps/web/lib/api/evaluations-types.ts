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

