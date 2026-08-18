export type AuditSeverity = "Info" | "Low" | "Medium" | "High" | "Critical";
export type AuditStatus = "Success" | "Failed" | "Blocked";
export type ActorType = "Admin" | "Super Admin" | "System" | "User";

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    email: string;
    type: ActorType;
    role?: string;
  };
  action: string;
  module: string;
  target: {
    type: string;
    id: string;
    name: string;
  };
  severity: AuditSeverity;
  status: AuditStatus;
  ipAddress: string;
  sessionInfo: string;
  description: string;
  reviewStatus: "Unreviewed" | "Reviewed" | "Escalated";
  reviewedBy?: string;
  reviewedAt?: string;
  changeDiff?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  relatedEvents?: string[]; // IDs of related events
}

export const mockAuditEvents: AuditEvent[] = [
  {
    id: "EVT-20230815-001",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    actor: {
      id: "ADM-101",
      name: "Suman Nepal",
      email: "suman.admin@loksewaai.com",
      type: "Super Admin",
      role: "Platform Administrator",
    },
    action: "SETTINGS_UPDATED",
    module: "Platform Settings",
    target: {
      type: "General Settings",
      id: "SET-GEN-01",
      name: "Global Maintenance Mode",
    },
    severity: "High",
    status: "Success",
    ipAddress: "192.168.1.104",
    sessionInfo: "Chrome / Windows 11",
    description: "Enabled global maintenance mode for scheduled database upgrade.",
    reviewStatus: "Reviewed",
    reviewedBy: "System",
    reviewedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    changeDiff: {
      before: { maintenanceMode: false, maintenanceMessage: "" },
      after: { maintenanceMode: true, maintenanceMessage: "Scheduled maintenance in progress." }
    }
  },
  {
    id: "EVT-20230815-002",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    actor: {
      id: "ADM-104",
      name: "Ramesh Thapa",
      email: "ramesh.content@loksewaai.com",
      type: "Admin",
      role: "Content Manager",
    },
    action: "QUESTION_UPDATED",
    module: "Question Bank",
    target: {
      type: "Question",
      id: "Q-10425",
      name: "History of Nepal Q25",
    },
    severity: "Low",
    status: "Success",
    ipAddress: "103.10.23.44",
    sessionInfo: "Safari / macOS",
    description: "Corrected typo in option B.",
    reviewStatus: "Unreviewed",
    changeDiff: {
      before: { optionB: "Prithivi Naryan Shah" },
      after: { optionB: "Prithvi Narayan Shah" }
    }
  },
  {
    id: "EVT-20230815-003",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    actor: {
      id: "SYS-001",
      name: "System Worker",
      email: "system@loksewaai.com",
      type: "System",
    },
    action: "PAYMENT_APPROVED",
    module: "Marketplace",
    target: {
      type: "Order",
      id: "ORD-99321",
      name: "Premium Section Officer Bundle",
    },
    severity: "Medium",
    status: "Success",
    ipAddress: "127.0.0.1",
    sessionInfo: "Internal API",
    description: "Automated eSewa payment verification successful. Access granted.",
    reviewStatus: "Unreviewed",
    relatedEvents: ["EVT-20230815-004"]
  },
  {
    id: "EVT-20230815-004",
    timestamp: new Date(Date.now() - 1000 * 60 * 125).toISOString(),
    actor: {
      id: "STU-5521",
      name: "Dipendra Joshi",
      email: "dipendra@example.com",
      type: "User",
    },
    action: "PAYMENT_SUBMITTED",
    module: "Marketplace",
    target: {
      type: "Order",
      id: "ORD-99321",
      name: "Premium Section Officer Bundle",
    },
    severity: "Info",
    status: "Success",
    ipAddress: "202.79.112.5",
    sessionInfo: "LoksewaAI App / Android",
    description: "User submitted eSewa payment for verification.",
    reviewStatus: "Unreviewed",
    relatedEvents: ["EVT-20230815-003"]
  },
  {
    id: "EVT-20230815-005",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    actor: {
      id: "UNKNOWN",
      name: "Unknown Entity",
      email: "N/A",
      type: "User",
    },
    action: "LOGIN_FAILED",
    module: "Authentication",
    target: {
      type: "Admin Account",
      id: "ADM-101",
      name: "Suman Nepal",
    },
    severity: "High",
    status: "Failed",
    ipAddress: "45.12.33.200", // Suspicious IP
    sessionInfo: "Firefox / Linux",
    description: "Invalid password attempt for Super Admin account.",
    reviewStatus: "Escalated",
  },
  {
    id: "EVT-20230814-006",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), // 25 hours ago
    actor: {
      id: "ADM-101",
      name: "Suman Nepal",
      email: "suman.admin@loksewaai.com",
      type: "Super Admin",
      role: "Platform Administrator",
    },
    action: "ADMIN_ROLE_CHANGED",
    module: "User & Access",
    target: {
      type: "Admin Account",
      id: "ADM-105",
      name: "Sita Sharma",
    },
    severity: "Critical",
    status: "Success",
    ipAddress: "192.168.1.104",
    sessionInfo: "Chrome / Windows 11",
    description: "Promoted Content Manager to System Administrator.",
    reviewStatus: "Reviewed",
    reviewedBy: "Suman Nepal",
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24.5).toISOString(),
    changeDiff: {
      before: { role: "Content Manager", permissions: ["read_content", "write_content"] },
      after: { role: "System Administrator", permissions: ["read_all", "write_all", "manage_users"] }
    }
  },
  {
    id: "EVT-20230814-007",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(), 
    actor: {
      id: "ADM-105",
      name: "Sita Sharma",
      email: "sita.sharma@loksewaai.com",
      type: "Admin",
      role: "Content Manager",
    },
    action: "EXAM_PUBLISHED",
    module: "Exam Management",
    target: {
      type: "Mock Exam",
      id: "EXM-4022",
      name: "Nayab Subba Full Mock Test - 4",
    },
    severity: "Medium",
    status: "Success",
    ipAddress: "110.44.112.50",
    sessionInfo: "Edge / Windows 10",
    description: "Published new mock exam for public access.",
    reviewStatus: "Unreviewed",
  }
];

export const mockAdminActivityStats = [
  {
    id: "ADM-101",
    name: "Suman Nepal",
    role: "Super Admin",
    lastActive: "Just now",
    totalActions: 1245,
    successfulActions: 1240,
    failedActions: 5,
    highRiskActions: 45,
    status: "Active"
  },
  {
    id: "ADM-104",
    name: "Ramesh Thapa",
    role: "Content Manager",
    lastActive: "45 mins ago",
    totalActions: 8530,
    successfulActions: 8522,
    failedActions: 8,
    highRiskActions: 2,
    status: "Active"
  },
  {
    id: "ADM-105",
    name: "Sita Sharma",
    role: "System Administrator",
    lastActive: "2 hours ago",
    totalActions: 342,
    successfulActions: 340,
    failedActions: 2,
    highRiskActions: 12,
    status: "Active"
  },
  {
    id: "ADM-108",
    name: "Hari Bahadur",
    role: "Support Agent",
    lastActive: "3 days ago",
    totalActions: 210,
    successfulActions: 205,
    failedActions: 5,
    highRiskActions: 0,
    status: "Offline"
  }
];

export const mockAuditAnalytics = {
  eventsToday: 245,
  eventsThisWeek: 1890,
  failedActionRate: 1.2, // percentage
  mostActiveModule: "Question Bank",
  criticalAlerts: 2,
  securityEventsToday: 14,
  eventsOverTime: [
    { date: "Mon", events: 210, security: 5 },
    { date: "Tue", events: 350, security: 12 },
    { date: "Wed", events: 290, security: 3 },
    { date: "Thu", events: 420, security: 18 },
    { date: "Fri", events: 380, security: 8 },
    { date: "Sat", events: 150, security: 2 },
    { date: "Sun", events: 245, security: 14 },
  ],
  actionsByModule: [
    { module: "Question Bank", value: 45 },
    { module: "User & Access", value: 20 },
    { module: "Authentication", value: 15 },
    { module: "Marketplace", value: 10 },
    { module: "Platform Settings", value: 5 },
    { module: "Other", value: 5 },
  ]
};
