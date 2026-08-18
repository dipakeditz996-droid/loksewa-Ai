// Platform Settings Mock Data

export interface SystemHealthComponent {
  id: string;
  name: string;
  status: "Operational" | "Warning" | "Unavailable";
  lastChecked: string;
  latency?: string;
}

export interface ConfigChange {
  id: string;
  setting: string;
  previousValue: string;
  newValue: string;
  changedBy: string;
  timestamp: string;
}

export const mockSystemHealth: SystemHealthComponent[] = [
  { id: "h1", name: "Frontend Service", status: "Operational", lastChecked: "Just now", latency: "45ms" },
  { id: "h2", name: "Database", status: "Operational", lastChecked: "Just now", latency: "12ms" },
  { id: "h3", name: "Authentication API", status: "Operational", lastChecked: "1m ago", latency: "85ms" },
  { id: "h4", name: "Storage Service", status: "Warning", lastChecked: "2m ago", latency: "420ms" },
  { id: "h5", name: "AI Service API", status: "Operational", lastChecked: "Just now", latency: "1.2s" },
  { id: "h6", name: "Notifications Queue", status: "Operational", lastChecked: "Just now" },
  { id: "h7", name: "Payment Gateway", status: "Operational", lastChecked: "5m ago", latency: "115ms" },
];

export const mockConfigHistory: ConfigChange[] = [
  { id: "c1", setting: "AI Tutor Generation", previousValue: "Enabled", newValue: "Disabled", changedBy: "Admin", timestamp: "2 hours ago" },
  { id: "c2", setting: "Default Currency", previousValue: "USD", newValue: "NPR", changedBy: "Jane Doe", timestamp: "1 day ago" },
  { id: "c3", setting: "Max File Size", previousValue: "5 MB", newValue: "10 MB", changedBy: "Admin", timestamp: "3 days ago" },
  { id: "c4", setting: "Allow Retakes", previousValue: "False", newValue: "True", changedBy: "Admin", timestamp: "1 week ago" },
  { id: "c5", setting: "Theme Color", previousValue: "#1E3A8A", newValue: "#0B2545", changedBy: "Jane Doe", timestamp: "2 weeks ago" },
];

export const mockGeneralSettings = {
  platformName: "LoksewaAI",
  platformDescription: "The premier learning platform for Loksewa exams.",
  supportEmail: "support@loksewaai.com",
  supportPhone: "+977-9800000000",
  websiteUrl: "https://loksewaai.com",
  defaultLanguage: "en-US",
  timezone: "Asia/Kathmandu",
  currency: "NPR",
  officeAddress: "Kathmandu, Bagmati, Nepal",
  businessHours: "Sun - Fri, 9:00 AM - 5:00 PM"
};

export const mockAcademicSettings = {
  defaultAcademicYear: "2080/2081",
  defaultExamCategory: "Section Officer",
  defaultDifficulty: "Medium",
  explanationEnabled: true,
  subjectiveEnabled: false,
  importEnabled: true,
  exportEnabled: true
};

export const mockExamSettings = {
  allowRetake: false,
  showResultImmediately: true,
  showCorrectAnswers: true,
  showExplanations: true,
  enableNegativeMarking: true,
  defaultNegativeMark: 0.2, // 20%
  defaultDuration: 60, // minutes
  autoSubmitOnTimeout: true,
  randomizeQuestions: true,
  randomizeOptions: false,
  resultVisibility: "Immediately",
  allowStudentReview: true
};

export const mockAISettings = {
  tutorEnabled: true,
  questionExplanation: true,
  aiOptionGeneration: true,
  aiQuestionGeneration: true,
  studyRecommendations: true,
  weakTopicDetection: true,
  examAnalysis: true,
  revisionSuggestions: true,
  dailyQuestionsLimit: 50,
  dailyConversationsLimit: 20,
  maxMessageLength: 1000
};

export const mockNotificationSettings = {
  inApp: true,
  email: true,
  push: false,
  sms: true,
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "06:00",
  retentionDays: 90
};

export const mockMarketplaceSettings = {
  enabled: true,
  allowPurchases: true,
  allowDiscounts: true,
  allowCoupons: true,
  requirePaymentVerification: true,
  autoGrantAccess: false,
  allowRefunds: true,
  defaultCurrency: "NPR"
};

export const mockSecuritySettings = {
  sessionTimeout: 120, // minutes
  maxLoginAttempts: 5,
  lockoutDuration: 30, // minutes
  requireEmailVerification: true,
  requireAdmin2fa: false,
  allowMultipleSessions: false,
  forceLogoutOnChange: true,
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: true,
  passwordExpirationDays: 0, // 0 = never
  requireConfirmDestructive: true,
  enableSecurityLogging: true
};

export const mockStorageSettings = {
  provider: "AWS S3",
  maxImageSize: 5, // MB
  maxDocSize: 20, // MB
  allowedImageTypes: ["jpg", "jpeg", "png", "webp"],
  allowedDocTypes: ["pdf", "doc", "docx", "csv", "xlsx"],
  maxUploadsPerRequest: 10
};

export const mockAppearanceSettings = {
  primaryTheme: "system", // light | dark | system
  compactSidebar: false,
  showBreadcrumbs: true,
  enableAnimations: true,
  primaryColor: "#0B2545",
  secondaryColor: "#D4A72C",
  accentColor: "#3B82F6"
};

export const mockMaintenanceSettings = {
  enabled: false,
  message: "We are currently performing scheduled maintenance. Please check back soon.",
  startTime: "",
  expectedEndTime: ""
};
