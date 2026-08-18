export interface AIConfiguration {
  // General
  tutorName: string;
  shortDescription: string;
  welcomeMessage: string;
  status: "Operational" | "Maintenance" | "Disabled";
  
  // Model
  aiProvider: "OpenAI" | "Anthropic" | "Google" | "Custom";
  modelName: string;
  temperature: number;
  responseLength: "Short" | "Medium" | "Detailed";
  
  // Response Behavior
  teachingStyle: "Simple" | "Detailed" | "Exam-Oriented" | "Step-by-Step";
  language: "English" | "Nepali" | "Mixed";
  explainDifficultConcepts: boolean;
  giveExamples: boolean;
  providePracticeQuestions: boolean;
  giveHints: boolean;
  encourageStudents: boolean;
  
  // Limits
  dailyQuestionsLimit: number;
  dailyConversationsLimit: number;
  maxMessageLength: number;
  maxContextLength: number;
  unlimitedAccessForPremium: boolean;
  
  // Features
  enableChat: boolean;
  enableQuestionExplanation: boolean;
  enableAnswerExplanation: boolean;
  enableQuestionGeneration: boolean;
  enableStudyPlanSuggestions: boolean;
  enableWeakTopicDetection: boolean;
  enableExamAnalysis: boolean;
  enableRevisionSuggestions: boolean;
  enablePersonalizedRecommendations: boolean;
}

export interface AIPrompt {
  id: string;
  name: string;
  category: "System Prompt" | "Tutor Prompt" | "Question Explanation" | "Exam Analysis" | "Study Plan" | "Question Generation" | "Revision";
  description: string;
  content: string;
  version: number;
  status: "Active" | "Draft" | "Archived";
  updatedAt: string;
}

export interface AIKnowledgeSource {
  id: string;
  name: string;
  description: string;
  type: "Question Bank" | "Academic Content" | "PDF" | "Document" | "FAQ" | "Custom";
  subjectId?: string;
  documentCount: number;
  status: "Active" | "Indexing" | "Disabled" | "Error";
  lastIndexed: string;
}

export interface AISafetyEvent {
  id: string;
  timestamp: string;
  studentName: string;
  requestType: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Blocked" | "Flagged" | "Allowed" | "Reviewed";
  action: string;
}

// --- Mock Data Exports ---

export const mockAIConfiguration: AIConfiguration = {
  tutorName: "LoksewaAI Tutor",
  shortDescription: "Your personalized study assistant for competitive exams.",
  welcomeMessage: "Hi! I'm your AI study assistant. What would you like to learn today?",
  status: "Operational",
  
  aiProvider: "OpenAI",
  modelName: "gpt-4o-mini",
  temperature: 0.7,
  responseLength: "Medium",
  
  teachingStyle: "Exam-Oriented",
  language: "Mixed",
  explainDifficultConcepts: true,
  giveExamples: true,
  providePracticeQuestions: false,
  giveHints: true,
  encourageStudents: true,
  
  dailyQuestionsLimit: 50,
  dailyConversationsLimit: 10,
  maxMessageLength: 1000,
  maxContextLength: 8000,
  unlimitedAccessForPremium: true,
  
  enableChat: true,
  enableQuestionExplanation: true,
  enableAnswerExplanation: true,
  enableQuestionGeneration: false,
  enableStudyPlanSuggestions: true,
  enableWeakTopicDetection: true,
  enableExamAnalysis: true,
  enableRevisionSuggestions: true,
  enablePersonalizedRecommendations: true,
};

export const mockPrompts: AIPrompt[] = [
  {
    id: "prm-1",
    name: "Primary System Behavior",
    category: "System Prompt",
    description: "Core instructions defining the AI's persona as an exam-focused tutor.",
    content: "You are LoksewaAI Tutor, an expert teacher specializing in Nepal's Public Service Commission (Loksewa) exams. Always be encouraging, concise, and accurate. Format your responses using markdown. If asked about syllabus topics, reference the official guidelines.",
    version: 3,
    status: "Active",
    updatedAt: "2026-08-10T14:30:00Z"
  },
  {
    id: "prm-2",
    name: "MCQ Explanation Generator",
    category: "Question Explanation",
    description: "Used when a student asks for the reasoning behind a specific multiple-choice question.",
    content: "Explain the reasoning for the following question. First, clearly state the correct answer. Then, explain why the correct answer is right. Finally, briefly explain why the other options ({{options}}) are incorrect. Keep it under 200 words.",
    version: 1,
    status: "Active",
    updatedAt: "2026-08-05T09:15:00Z"
  },
  {
    id: "prm-3",
    name: "Study Plan Adjuster",
    category: "Study Plan",
    description: "Used to suggest schedule changes based on student performance.",
    content: "The student {{student_name}} is struggling with {{weak_topic}}. Suggest a modification to their current study plan to include an extra 30 minutes of revision for this topic over the next 3 days.",
    version: 2,
    status: "Draft",
    updatedAt: "2026-08-14T11:20:00Z"
  }
];

export const mockKnowledgeSources: AIKnowledgeSource[] = [
  {
    id: "ks-1",
    name: "Section Officer Core Syllabus",
    description: "The complete digitized syllabus for Section Officer exams.",
    type: "Academic Content",
    subjectId: "sub-gk",
    documentCount: 15,
    status: "Active",
    lastIndexed: "2026-08-12T08:00:00Z"
  },
  {
    id: "ks-2",
    name: "Constitution of Nepal (2015) - Annotated",
    description: "Full text of the constitution with expert annotations.",
    type: "PDF",
    documentCount: 1,
    status: "Active",
    lastIndexed: "2026-08-10T10:00:00Z"
  },
  {
    id: "ks-3",
    name: "General Knowledge Question Bank V2",
    description: "Vector database of all GK questions from 2010-2025.",
    type: "Question Bank",
    documentCount: 4500,
    status: "Indexing",
    lastIndexed: "2026-08-15T09:00:00Z"
  }
];

export const mockSafetyEvents: AISafetyEvent[] = [
  {
    id: "sev-1",
    timestamp: "2026-08-15T08:23:45Z",
    studentName: "Unknown User",
    requestType: "Prompt Injection Attempt",
    severity: "High",
    status: "Blocked",
    action: "System automatically terminated conversation."
  },
  {
    id: "sev-2",
    timestamp: "2026-08-14T14:15:22Z",
    studentName: "Rajesh K.",
    requestType: "Inappropriate Language",
    severity: "Low",
    status: "Flagged",
    action: "Warning message displayed to user."
  },
  {
    id: "sev-3",
    timestamp: "2026-08-12T09:45:10Z",
    studentName: "Sita T.",
    requestType: "Off-topic (Politics)",
    severity: "Medium",
    status: "Allowed",
    action: "AI gently redirected back to exam topics."
  }
];

export const mockAIUsageAnalytics = {
  totalConversations: 12450,
  totalMessages: 84320,
  uniqueStudents: 3120,
  averageMessagesPerStudent: 27,
  averageResponseTimeMs: 1250,
  successRate: 99.2,
  
  // Cost estimates (mock data)
  estimatedTokensUsed: 14500000,
  estimatedCostUSD: 145.50,
  
  dailyUsage: Array.from({ length: 14 }).map((_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    messages: Math.floor(4000 + Math.random() * 2000),
    students: Math.floor(800 + Math.random() * 400)
  })),
  
  popularTopics: [
    { topic: "Fundamental Rights", requests: 1245 },
    { topic: "Economic Planning", requests: 980 },
    { topic: "Local Government", requests: 850 },
    { topic: "Geography of Nepal", requests: 720 },
    { topic: "History of Shah Dynasty", requests: 640 }
  ]
};
