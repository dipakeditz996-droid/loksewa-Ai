export type UserRole = "student" | "teacher" | "admin" | "super-admin";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export const mockUsers: Record<UserRole, MockUser> = {
  student: {
    id: "s1",
    name: "Aarav Gurung",
    email: "aarav@example.com",
    role: "student",
  },
  teacher: {
    id: "t1",
    name: "Dr. Meena Shakya",
    email: "meena@example.com",
    role: "teacher",
  },
  admin: {
    id: "a1",
    name: "Bikash Adhikari",
    email: "bikash@example.com",
    role: "admin",
  },
  "super-admin": {
    id: "sa1",
    name: "Platform Administrator",
    email: "admin@loksewa.com",
    role: "super-admin",
  },
};

export const mockStudentDashboard = {
  stats: {
    coursesEnrolled: 3,
    questionsAttempted: 1240,
    accuracy: 82,
    studyStreak: 12,
    studyTime: "32h 45m",
    daysStudied: 42,
    progress: 78,
  },
  continueLearning: { 
    id: "1", 
    subject: "Public Administration", 
    topic: "Local Government Operation", 
    progress: 68,
  },
  todaysPlan: [
    { time: "09:00", subject: "Public Administration", task: "20 MCQs", completed: true },
    { time: "11:00", subject: "Current Affairs", task: "Read today's notes", completed: true },
    { time: "16:00", subject: "Constitution", task: "Practice Session", completed: false },
    { time: "19:00", subject: "Mock Test", task: "30 Questions", completed: false },
  ],
  syllabusProgress: [
    { id: "1", subject: "Public Administration", progress: 78 },
    { id: "2", subject: "Constitution", progress: 64 },
    { id: "3", subject: "Current Affairs", progress: 91 },
    { id: "4", subject: "General Knowledge", progress: 72 },
  ],
  upcomingExam: { 
    id: "e1", 
    target: "Section Officer", 
    title: "Full Model Examination", 
    starts: "Tomorrow, 10:00 AM", 
    duration: "90 Minutes", 
    questions: 100 
  },
  recentActivity: [
    { id: "a1", action: "Completed 20 Public Administration questions", time: "2 hours ago" },
    { id: "a2", action: "Finished Local Government notes", time: "5 hours ago" },
    { id: "a3", action: "Scored 84% in Constitution practice", time: "Yesterday" },
    { id: "a4", action: "Completed today's study plan", time: "Yesterday" },
  ],
  quickActions: [
    { label: "Practice Questions", href: "/student/practice", icon: "target" },
    { label: "Take Mock Exam", href: "/student/exams", icon: "file-text" },
    { label: "View Syllabus", href: "/student/syllabus", icon: "book-open" },
    { label: "Ask AI Tutor", href: "/student/ai-tutor", icon: "message-square" },
  ],
};

export const mockTeacherDashboard = {
  stats: {
    assignedSheets: 24,
    pendingChecking: 12,
    completedChecking: 156,
    notesPublished: 18,
    notesPending: 3,
  },
  recentActivity: [
    { id: "a1", type: "checking", description: "Checked answer sheet — Sita Sharma (Exam Set 11)", time: "1 hour ago" },
    { id: "a2", type: "note", description: "Published note — Nepal Constitution: Fundamental Rights", time: "3 hours ago" },
    { id: "a3", type: "checking", description: "Checked answer sheet — Ramesh KC (Exam Set 11)", time: "Yesterday" },
  ],
};

export const mockAdminDashboard = {
  stats: {
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 6,
    totalQuestions: 0,
    totalExams: 0,
    pendingApprovals: 5,
  },
};

export const mockMcqQuestions = [
  {
    id: "q1",
    question: "Which article of the Constitution of Nepal deals with the right to equality?",
    options: [
      "Article 14",
      "Article 16",
      "Article 18",
      "Article 20",
    ],
    correctAnswer: 2,
    explanation: "Article 18 of the Constitution of Nepal 2072 deals with the Right to Equality. It states that all citizens shall be equal before the law and no person shall be denied equal protection of the law.",
    subject: "Constitution of Nepal",
    topic: "Fundamental Rights",
    difficulty: "Medium",
  },
  {
    id: "q2",
    question: "The Interim Government of Nepal Act was promulgated in which year?",
    options: [
      "2007 BS",
      "2015 BS",
      "2019 BS",
      "2047 BS",
    ],
    correctAnswer: 0,
    explanation: "The Interim Government of Nepal Act 2007 BS (1951 AD) was promulgated after the political change of 2007 BS, which ended the Rana regime.",
    subject: "Political History",
    topic: "Constitutional Development",
    difficulty: "Easy",
  },
  {
    id: "q3",
    question: "Which is the largest lake in Nepal by surface area?",
    options: [
      "Phewa Lake",
      "Rara Lake",
      "Begnas Lake",
      "Tilicho Lake",
    ],
    correctAnswer: 1,
    explanation: "Rara Lake, located in Mugu District of Karnali Province, is the largest lake in Nepal with a surface area of approximately 10.8 square kilometers.",
    subject: "Geography",
    topic: "Physical Features of Nepal",
    difficulty: "Easy",
  },
  {
    id: "q4",
    question: "The Public Service Commission of Nepal was established under which article of the current constitution?",
    options: [
      "Article 232",
      "Article 234",
      "Article 236",
      "Article 242",
    ],
    correctAnswer: 1,
    explanation: "The Public Service Commission (Lok Sewa Aayog) is established under Article 234 of the Constitution of Nepal 2072.",
    subject: "Constitution of Nepal",
    topic: "Constitutional Bodies",
    difficulty: "Hard",
  },
  {
    id: "q5",
    question: "Which development plan of Nepal first introduced the concept of decentralization?",
    options: [
      "Third Five Year Plan",
      "Fourth Five Year Plan",
      "Fifth Five Year Plan",
      "Sixth Five Year Plan",
    ],
    correctAnswer: 2,
    explanation: "The Fifth Five Year Plan (2032-2037 BS) first introduced the concept of decentralization in Nepal's development planning.",
    subject: "Development Planning",
    topic: "Planning History",
    difficulty: "Hard",
  },
];
