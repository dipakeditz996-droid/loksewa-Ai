export type ExamStatus = "Draft" | "Scheduled" | "Published" | "Closed" | "Archived";
export type ExamType = "Mock Test" | "Full-Length Test" | "Practice Test" | "Subject Test" | "Chapter Test" | "Model Set" | "Previous Year Test" | "Revision Test";
export type ExamAccess = "Free" | "Premium";
export type QuestionType = "MCQ" | "True/False" | "Subjective";

export interface ExamMetadata {
  id: string;
  title: string;
  description: string;
  category: string;
  targetPosition: string;
  type: ExamType;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  tags: string[];
  
  // Settings
  durationMinutes: number | null; // null = unlimited
  totalMarks: number;
  negativeMarking: number; // e.g., 0.25 (25%) or 0
  maxAttempts: number | null; // null = unlimited
  
  access: ExamAccess;
  productId?: string; // If premium
  
  status: ExamStatus;
  scheduleStart?: string;
  scheduleEnd?: string;
  
  // Stats (derived)
  questionCount: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface ExamQuestionRef {
  id: string;
  examId: string;
  questionId: string; // Refers to Master Question Bank
  order: number;
  marks: number;
  // Included directly for UI simplicity without complex joins in mock
  questionText: string;
  subject: string;
  topic: string;
  type: QuestionType;
  difficulty: string;
}

export interface StudentAttempt {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  attemptNumber: number;
  score: number;
  percentage: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  timeTakenSeconds: number;
  status: "In Progress" | "Submitted" | "Evaluated";
  submittedAt: string;
}

export const mockExamCategories = [
  { id: "CAT-1", name: "Section Officer Prep", examCount: 12, status: "Active" },
  { id: "CAT-2", name: "Nayab Subba Tests", examCount: 8, status: "Active" },
  { id: "CAT-3", name: "Kharidar Series", examCount: 5, status: "Active" },
  { id: "CAT-4", name: "Banking Prep", examCount: 3, status: "Draft" },
];

export const mockExams: ExamMetadata[] = [
  {
    id: "EXM-1001",
    title: "Loksewa Section Officer - GK Full Mock",
    description: "Complete 100-mark mock test covering all General Knowledge topics.",
    category: "Section Officer Prep",
    targetPosition: "Section Officer",
    type: "Full-Length Test",
    difficulty: "Hard",
    tags: ["gk", "mock", "section-officer"],
    durationMinutes: 90,
    totalMarks: 100,
    negativeMarking: 20, // 20% negative marking
    maxAttempts: 3,
    access: "Premium",
    productId: "PROD-MOCK-1",
    status: "Published",
    questionCount: 100,
    totalAttempts: 1240,
    averageScore: 54.5,
    passRate: 42.5,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    scheduleStart: new Date(Date.now() - 86400000 * 25).toISOString()
  },
  {
    id: "EXM-1002",
    title: "Constitution of Nepal - Weekly Practice",
    description: "Short practice test focusing on Part 3 and Part 4.",
    category: "Section Officer Prep",
    targetPosition: "All",
    type: "Chapter Test",
    difficulty: "Medium",
    tags: ["constitution", "weekly"],
    durationMinutes: 30,
    totalMarks: 25,
    negativeMarking: 0,
    maxAttempts: null, // unlimited
    access: "Free",
    status: "Published",
    questionCount: 25,
    totalAttempts: 5200,
    averageScore: 18.2,
    passRate: 75.0,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: "EXM-1003",
    title: "Nayab Subba Subjective Paper II Model",
    description: "Written practice for Paper II.",
    category: "Nayab Subba Tests",
    targetPosition: "Nayab Subba",
    type: "Model Set",
    difficulty: "Mixed",
    tags: ["subjective", "paper2"],
    durationMinutes: 150,
    totalMarks: 100,
    negativeMarking: 0,
    maxAttempts: 1,
    access: "Free",
    status: "Draft",
    questionCount: 10,
    totalAttempts: 0,
    averageScore: 0,
    passRate: 0,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  }
];

export const mockExamAnalytics = {
  totalExams: 34,
  published: 28,
  drafts: 4,
  scheduled: 2,
  totalAttempts: 45200,
  pendingResults: 142, // subjective waiting for evaluation
  averagePlatformScore: 58.2
};

export const mockExamQuestions: ExamQuestionRef[] = [
  { id: "EQ-1", examId: "EXM-1001", questionId: "Q-501", order: 1, marks: 1, questionText: "When was the current Constitution of Nepal promulgated?", subject: "Constitution", topic: "History", type: "MCQ", difficulty: "Easy" },
  { id: "EQ-2", examId: "EXM-1001", questionId: "Q-502", order: 2, marks: 1, questionText: "Which part of the constitution contains Fundamental Rights?", subject: "Constitution", topic: "Fundamental Rights", type: "MCQ", difficulty: "Medium" },
  { id: "EQ-3", examId: "EXM-1001", questionId: "Q-503", order: 3, marks: 1, questionText: "What is the height of Mt. Everest?", subject: "Geography", topic: "Mountains", type: "MCQ", difficulty: "Easy" },
  { id: "EQ-4", examId: "EXM-1003", questionId: "Q-801", order: 1, marks: 10, questionText: "Critically analyze the role of public management in developing countries.", subject: "Public Management", topic: "Development", type: "Subjective", difficulty: "Hard" },
];

export const mockStudentAttempts: StudentAttempt[] = [
  { id: "ATT-1", examId: "EXM-1001", studentId: "STU-001", studentName: "Suman Nepal", attemptNumber: 1, score: 62.5, percentage: 62.5, correct: 65, incorrect: 10, unattempted: 25, timeTakenSeconds: 5200, status: "Submitted", submittedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "ATT-2", examId: "EXM-1001", studentId: "STU-002", studentName: "Rita Sharma", attemptNumber: 1, score: 85.0, percentage: 85.0, correct: 85, incorrect: 0, unattempted: 15, timeTakenSeconds: 4800, status: "Submitted", submittedAt: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: "ATT-3", examId: "EXM-1003", studentId: "STU-001", studentName: "Suman Nepal", attemptNumber: 1, score: 0, percentage: 0, correct: 0, incorrect: 0, unattempted: 0, timeTakenSeconds: 8400, status: "Submitted", submittedAt: new Date(Date.now() - 86400000 * 1).toISOString() } // Subjective needs evaluation
];
