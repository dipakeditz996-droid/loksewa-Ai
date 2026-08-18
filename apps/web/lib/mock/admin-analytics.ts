// Platform Overview
export const mockPlatformHealth = {
  totalStudents: 12450,
  activeStudents: 8320,
  totalExams: 450,
  questionsSolved: 145200,
  studyPlansActive: 3100,
  aiConversations: 42050,
  marketplaceOrders: 5120,
  revenue: 4520000,
};

export const mockPlatformActivityChart = [
  { date: "Mon", students: 1200, questions: 4500, exams: 320, ai: 850 },
  { date: "Tue", students: 1350, questions: 5200, exams: 410, ai: 920 },
  { date: "Wed", students: 1100, questions: 4100, exams: 290, ai: 780 },
  { date: "Thu", students: 1420, questions: 5800, exams: 450, ai: 1100 },
  { date: "Fri", students: 1550, questions: 6100, exams: 480, ai: 1250 },
  { date: "Sat", students: 1800, questions: 8200, exams: 720, ai: 1600 },
  { date: "Sun", students: 1750, questions: 7900, exams: 690, ai: 1550 },
];

// Students Analytics
export const mockStudentMetrics = {
  newStudents: 450,
  returningStudents: 7870,
  inactiveStudents: 4130,
  avgSessionDuration: "24m",
  questionsPerStudent: 18,
};

export const mockStudentGrowthChart = [
  { name: "Week 1", new: 120, active: 4500 },
  { name: "Week 2", new: 145, active: 4800 },
  { name: "Week 3", new: 160, active: 5100 },
  { name: "Week 4", new: 185, active: 5400 },
];

export const mockTopStudents = [
  { id: 1, name: "Ramesh Sharma", questions: 1240, exams: 45, score: "82%", aiUsage: "High" },
  { id: 2, name: "Sita Thapa", questions: 1150, exams: 42, score: "85%", aiUsage: "Medium" },
  { id: 3, name: "Hari Kumar", questions: 980, exams: 38, score: "79%", aiUsage: "High" },
  { id: 4, name: "Gita Nepal", questions: 920, exams: 35, score: "88%", aiUsage: "Low" },
  { id: 5, name: "Bikash Gurung", questions: 890, exams: 31, score: "76%", aiUsage: "Medium" },
];

// Exams Analytics
export const mockExamMetrics = {
  totalAttempts: 24500,
  completedAttempts: 21200,
  averageScore: "68%",
  passRate: "42%",
};

export const mockExamPerformance = [
  { name: "Section Officer Mock 1", attempts: 1240, avgScore: 65, passRate: 38, completionRate: 92 },
  { name: "Banking Prep Test A", attempts: 980, avgScore: 72, passRate: 55, completionRate: 88 },
  { name: "Nayab Subba Set 4", attempts: 850, avgScore: 61, passRate: 31, completionRate: 85 },
  { name: "Kharidar Weekly Test", attempts: 720, avgScore: 69, passRate: 48, completionRate: 95 },
];

export const mockPassFailChart = [
  { name: "Pass", value: 42, fill: "#10b981" },
  { name: "Fail", value: 58, fill: "#ef4444" },
];

// Questions Analytics
export const mockQuestionMetrics = {
  totalQuestions: 15400,
  questionsAttempted: 12500,
  correctAnswers: 82500,
  incorrectAnswers: 62700,
  averageAccuracy: "56.8%",
};

export const mockDifficultyAccuracy = [
  { name: "Easy", accuracy: 78 },
  { name: "Medium", accuracy: 52 },
  { name: "Hard", accuracy: 31 },
];

export const mockDifficultQuestions = [
  { id: "Q-1045", text: "Which article of the constitution deals with...", subject: "Constitution", attempts: 1240, accuracy: 12 },
  { id: "Q-2912", text: "Calculate the compound interest for...", subject: "Mathematics", attempts: 980, accuracy: 15 },
  { id: "Q-0842", text: "Who was the prime minister during...", subject: "History", attempts: 1150, accuracy: 18 },
  { id: "Q-3391", text: "What is the primary function of...", subject: "Science", attempts: 850, accuracy: 21 },
];

// Study Plans Analytics
export const mockStudyPlanMetrics = {
  totalPlans: 45,
  activeEnrollments: 3100,
  completedPlans: 850,
  averageProgress: "42%",
  completionRate: "27%",
};

export const mockStudyPlanPerformance = [
  { name: "30-Day Section Officer", students: 1240, avgProgress: 45, completionRate: 28, dropOff: 15 },
  { name: "Banking 60-Day Master", students: 850, avgProgress: 32, completionRate: 22, dropOff: 25 },
  { name: "GK & IQ Fast Track", students: 620, avgProgress: 68, completionRate: 45, dropOff: 10 },
];

// AI Tutor Analytics
export const mockAITutorMetrics = {
  totalConversations: 42050,
  activeStudents: 5200,
  questionsAsked: 125400,
  avgResponseTime: "1.2s",
};

export const mockPopularAITopics = [
  { topic: "Fundamental Rights", subject: "Constitution", questions: 1245, students: 320, trend: "+12%" },
  { topic: "Rana Regime", subject: "History", questions: 980, students: 250, trend: "+5%" },
  { topic: "Time & Work", subject: "Mathematics", questions: 850, students: 210, trend: "+8%" },
  { topic: "Local Governance Act", subject: "Law", questions: 720, students: 180, trend: "+15%" },
];

// Marketplace Analytics
export const mockMarketplaceMetrics = {
  totalOrders: 5120,
  approvedOrders: 4850,
  pendingPayments: 45,
  revenue: 4520000,
};

export const mockProductPerformance = [
  { name: "Section Officer Crash Course", orders: 1240, revenue: 1860000, conversion: "4.2%", refunds: 5 },
  { name: "Banking Mock Tests", orders: 980, revenue: 490000, conversion: "5.5%", refunds: 2 },
  { name: "Complete PDF Notes", orders: 1850, revenue: 555000, conversion: "8.1%", refunds: 0 },
];

// Support Analytics
export const mockSupportAnalytics = {
  totalTickets: 1245,
  openTickets: 42,
  resolvedTickets: 1180,
  avgResponseTime: "4h 12m",
  avgResolutionTime: "1d 2h",
};

export const mockTicketsByCategory = [
  { name: "Payment", value: 45 },
  { name: "Technical", value: 25 },
  { name: "Content", value: 20 },
  { name: "Account", value: 10 },
];

// Notifications Analytics
export const mockNotificationAnalytics = {
  sent: 125400,
  delivered: 124800,
  read: 85200,
  readRate: "68%",
};

// Saved Reports
export const mockSavedReports = [
  { id: 1, name: "Monthly Performance Overview", creator: "Admin User", dateRange: "Last 30 Days", format: "PDF", date: "2026-08-01" },
  { id: 2, name: "Q3 Sales & Revenue", creator: "Finance Dept", dateRange: "Last 90 Days", format: "Excel", date: "2026-07-15" },
  { id: 3, name: "Difficult Questions Analysis", creator: "Content Team", dateRange: "This Year", format: "CSV", date: "2026-08-10" },
];
