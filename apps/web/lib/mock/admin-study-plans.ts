export interface StudyPlanTask {
  id: string;
  day: number;
  title: string;
  subjectId: string;
  chapterId?: string;
  topicId?: string;
  type: "Read" | "Revision" | "Practice" | "Mock Exam" | "Video" | "AI Tutor Session" | "Custom";
  estimatedMinutes: number;
  questionCount?: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  priority: "Low" | "Medium" | "High";
  order: number;
}

export interface StudyPlan {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  type: "Exam Preparation" | "Revision" | "Subject Focus" | "Crash Course" | "Custom";
  categoryId: string;
  positionId: string;
  status: "Draft" | "Published" | "Active" | "Completed" | "Archived";
  durationDays: number;
  dailyStudyHours: number;
  startDate?: string; // Optional flexible start date
  endDate?: string;
  isTemplate?: boolean;
  
  // Rules
  allowReorder: boolean;
  allowSkip: boolean;
  allowReschedule: boolean;
  enableProgressTracking: boolean;
  enableReminders: boolean;
  enableAIRecommendations: boolean;
  
  // Revision
  enableRevisionCycle: boolean;
  revisionFrequency: "Daily" | "Every 3 days" | "Weekly" | "Custom";
  enableSpacedRevision: boolean;
  enableWeakTopicRevision: boolean;
  
  tasks: StudyPlanTask[];
  
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlanStudent {
  id: string;
  planId: string;
  studentId: string;
  studentName: string;
  startedAt: string;
  progressPercentage: number;
  completedTasks: number;
  totalTasks: number;
  currentDay: number;
  lastActivityAt: string;
  status: "Active" | "Completed" | "Paused" | "Inactive";
}

export interface StudyPlanAnalytics {
  planId: string;
  totalStudents: number;
  averageProgress: number;
  completionRate: number;
  averageStudyTimePerDayMinutes: number;
  dropOffRate: number;
  dailyActivity: { day: number; activeStudents: number }[];
  taskCompletion: { type: string; rate: number }[];
  subjectPerformance: { subject: string; averageScore: number }[];
}

// Generate some realistic tasks for the mock
const generateMockTasks = (): StudyPlanTask[] => {
  const tasks: StudyPlanTask[] = [];
  let taskId = 1;
  
  for (let day = 1; day <= 30; day++) {
    // 2-4 tasks per day
    const numTasks = Math.floor(Math.random() * 3) + 2; 
    
    for (let i = 0; i < numTasks; i++) {
      const typeOptions: StudyPlanTask["type"][] = ["Read", "Practice", "Video", "Revision"];
      const type = typeOptions[Math.floor(Math.random() * typeOptions.length)] as StudyPlanTask["type"];
      
      tasks.push({
        id: `t-${taskId++}`,
        day,
        title: `${type} Session - Day ${day} Topic ${i+1}`,
        subjectId: Math.random() > 0.5 ? "sub-gk" : "sub-iq",
        type,
        estimatedMinutes: type === "Practice" ? 45 : 60,
        difficulty: "Medium",
        priority: i === 0 ? "High" : "Medium",
        order: i,
        questionCount: type === "Practice" ? 30 : undefined
      });
    }
  }
  return tasks;
};

export const mockStudyPlans: StudyPlan[] = [
  {
    id: "sp-1",
    name: "Section Officer 30-Day Master Plan",
    description: "Intensive 30-day preparation plan for Section Officer First Paper.",
    type: "Exam Preparation",
    categoryId: "cat-loksewa",
    positionId: "pos-so",
    status: "Active",
    durationDays: 30,
    dailyStudyHours: 4,
    allowReorder: true,
    allowSkip: false,
    allowReschedule: true,
    enableProgressTracking: true,
    enableReminders: true,
    enableAIRecommendations: true,
    enableRevisionCycle: true,
    revisionFrequency: "Weekly",
    enableSpacedRevision: true,
    enableWeakTopicRevision: true,
    tasks: generateMockTasks(),
    createdAt: "2026-07-01T10:00:00Z",
    updatedAt: "2026-08-10T10:00:00Z"
  },
  {
    id: "sp-2",
    name: "Banking Assistant 15-Day Revision",
    description: "Fast-paced revision for upcoming banking exams.",
    type: "Revision",
    categoryId: "cat-banking",
    positionId: "pos-assistant",
    status: "Published",
    durationDays: 15,
    dailyStudyHours: 6,
    allowReorder: false,
    allowSkip: true,
    allowReschedule: false,
    enableProgressTracking: true,
    enableReminders: true,
    enableAIRecommendations: false,
    enableRevisionCycle: true,
    revisionFrequency: "Daily",
    enableSpacedRevision: false,
    enableWeakTopicRevision: true,
    tasks: [],
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-14T10:00:00Z"
  },
  {
    id: "sp-3",
    name: "GK & IQ Subject Focus",
    description: "Specialized plan to strengthen GK and IQ.",
    type: "Subject Focus",
    categoryId: "cat-loksewa",
    positionId: "pos-kharidar",
    status: "Draft",
    durationDays: 45,
    dailyStudyHours: 2,
    allowReorder: true,
    allowSkip: true,
    allowReschedule: true,
    enableProgressTracking: true,
    enableReminders: false,
    enableAIRecommendations: true,
    enableRevisionCycle: false,
    revisionFrequency: "Every 3 days",
    enableSpacedRevision: false,
    enableWeakTopicRevision: false,
    tasks: [],
    createdAt: "2026-08-15T10:00:00Z",
    updatedAt: "2026-08-15T10:00:00Z"
  }
];

export const mockStudyPlanStudents: StudyPlanStudent[] = [
  {
    id: "sps-1",
    planId: "sp-1",
    studentId: "stu-101",
    studentName: "Ram Bahadur",
    startedAt: "2026-08-01T10:00:00Z",
    progressPercentage: 45,
    completedTasks: 42,
    totalTasks: 90,
    currentDay: 14,
    lastActivityAt: "2026-08-15T09:30:00Z",
    status: "Active"
  },
  {
    id: "sps-2",
    planId: "sp-1",
    studentId: "stu-102",
    studentName: "Sita Sharma",
    startedAt: "2026-08-05T10:00:00Z",
    progressPercentage: 10,
    completedTasks: 9,
    totalTasks: 90,
    currentDay: 3,
    lastActivityAt: "2026-08-08T09:30:00Z",
    status: "Paused"
  },
  {
    id: "sps-3",
    planId: "sp-2",
    studentId: "stu-103",
    studentName: "Hari Thapa",
    startedAt: "2026-08-01T10:00:00Z",
    progressPercentage: 100,
    completedTasks: 45,
    totalTasks: 45,
    currentDay: 15,
    lastActivityAt: "2026-08-14T09:30:00Z",
    status: "Completed"
  }
];

export const mockStudyPlanTemplates = [
  {
    id: "tpl-1",
    name: "Standard 30-Day Loksewa Preparation",
    description: "A balanced 30-day template covering all essential subjects.",
    targetExam: "cat-loksewa",
    position: "pos-so",
    durationDays: 30,
    difficulty: "Medium",
    usageCount: 145
  },
  {
    id: "tpl-2",
    name: "7-Day Crash Preparation",
    description: "High-intensity review plan for the week before exams.",
    targetExam: "cat-banking",
    position: "pos-assistant",
    durationDays: 7,
    difficulty: "Hard",
    usageCount: 89
  }
];

export const mockStudyPlanAnalytics: StudyPlanAnalytics = {
  planId: "sp-1",
  totalStudents: 120,
  averageProgress: 56,
  completionRate: 24,
  averageStudyTimePerDayMinutes: 145,
  dropOffRate: 15,
  dailyActivity: Array.from({ length: 30 }).map((_, i) => ({
    day: i + 1,
    activeStudents: Math.floor(100 - (i * 2) + Math.random() * 10)
  })),
  taskCompletion: [
    { type: "Read", rate: 85 },
    { type: "Video", rate: 92 },
    { type: "Practice", rate: 70 },
    { type: "Mock Exam", rate: 95 }
  ],
  subjectPerformance: [
    { subject: "General Knowledge", averageScore: 65 },
    { subject: "IQ", averageScore: 72 },
    { subject: "English", averageScore: 58 }
  ]
};
