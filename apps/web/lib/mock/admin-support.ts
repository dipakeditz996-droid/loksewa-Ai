export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type TicketStatus = "Open" | "In Progress" | "Waiting for Student" | "Resolved" | "Closed";

export interface MockStudentInfo {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar?: string;
  targetExam: string;
  targetPosition: string;
  accountStatus: "Active" | "Suspended" | "Pending";
  joinedDate: string;
}

export interface MockTicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: "Student" | "Admin";
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isInternalNote: boolean;
  attachments?: { name: string; url: string; size: string }[];
}

export interface MockSupportTicket {
  id: string;
  ticketId: string;
  student: MockStudentInfo;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string; // Admin User ID/Name
  createdAt: string;
  updatedAt: string;
  messages: MockTicketMessage[];
  tags: string[];
}

export interface MockSupportCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultPriority: TicketPriority;
  status: "Active" | "Inactive";
  openTickets: number;
  totalTickets: number;
  updatedAt: string;
}

export const mockSupportCategories: MockSupportCategory[] = [
  {
    id: "cat-1",
    name: "Account & Login",
    description: "Issues related to login, password resets, and account suspension.",
    icon: "UserCircle",
    defaultPriority: "High",
    status: "Active",
    openTickets: 12,
    totalTickets: 340,
    updatedAt: "2026-08-10T10:00:00Z"
  },
  {
    id: "cat-2",
    name: "Payment",
    description: "Issues with marketplace purchases, subscription billing.",
    icon: "CreditCard",
    defaultPriority: "Urgent",
    status: "Active",
    openTickets: 5,
    totalTickets: 120,
    updatedAt: "2026-08-14T09:30:00Z"
  },
  {
    id: "cat-3",
    name: "Exam & Results",
    description: "Errors during exams, missing results, appeal requests.",
    icon: "FileText",
    defaultPriority: "Medium",
    status: "Active",
    openTickets: 28,
    totalTickets: 890,
    updatedAt: "2026-08-15T08:00:00Z"
  },
  {
    id: "cat-4",
    name: "AI Tutor",
    description: "Incorrect AI responses, AI limits, feature requests.",
    icon: "Brain",
    defaultPriority: "Low",
    status: "Active",
    openTickets: 3,
    totalTickets: 45,
    updatedAt: "2026-08-01T11:00:00Z"
  }
];

export const mockSupportAgents = [
  { id: "admin-1", name: "Diwas (Super Admin)", role: "Super Admin" },
  { id: "admin-2", name: "Sarah Connor", role: "Support Agent" },
  { id: "admin-3", name: "John Doe", role: "Support Agent" },
  { id: "admin-4", name: "Finance Team", role: "Billing Specialist" }
];

export const mockTickets: MockSupportTicket[] = [
  {
    id: "tkt-1001",
    ticketId: "#TKT-1001",
    student: {
      id: "std-849",
      name: "Ramesh Sharma",
      email: "ramesh.sharma@example.com",
      username: "ramesh99",
      targetExam: "Loksewa",
      targetPosition: "Section Officer",
      accountStatus: "Active",
      joinedDate: "2025-01-15T08:00:00Z"
    },
    subject: "Payment deducted but Study Plan not activated",
    category: "Payment",
    priority: "Urgent",
    status: "Open",
    assignedTo: "Finance Team",
    createdAt: "2026-08-15T09:15:00Z",
    updatedAt: "2026-08-15T09:45:00Z",
    tags: ["payment", "urgent", "study-plan"],
    messages: [
      {
        id: "msg-1",
        senderId: "std-849",
        senderName: "Ramesh Sharma",
        senderType: "Student",
        content: "Hi team, I just paid Rs. 1500 for the 30-Day Section Officer Crash Course using eSewa. The money was deducted from my account but the study plan is still locked. Please help!",
        timestamp: "2026-08-15T09:15:00Z",
        isInternalNote: false,
        attachments: [
          { name: "esewa_receipt.pdf", url: "#", size: "124 KB" }
        ]
      },
      {
        id: "msg-2",
        senderId: "admin-4",
        senderName: "Finance Team",
        senderType: "Admin",
        content: "Checking the gateway logs now. eSewa callback seems to have failed. I will manually activate the plan.",
        timestamp: "2026-08-15T09:45:00Z",
        isInternalNote: true
      }
    ]
  },
  {
    id: "tkt-1002",
    ticketId: "#TKT-1002",
    student: {
      id: "std-421",
      name: "Sita Thapa",
      email: "sita.thapa@example.com",
      username: "sita_t",
      targetExam: "Banking",
      targetPosition: "Assistant",
      accountStatus: "Active",
      joinedDate: "2026-02-10T10:30:00Z"
    },
    subject: "Error loading Mock Exam #4",
    category: "Exam & Results",
    priority: "High",
    status: "In Progress",
    assignedTo: "Sarah Connor",
    createdAt: "2026-08-14T14:20:00Z",
    updatedAt: "2026-08-14T15:10:00Z",
    tags: ["exam", "technical"],
    messages: [
      {
        id: "msg-3",
        senderId: "std-421",
        senderName: "Sita Thapa",
        senderType: "Student",
        content: "When I click 'Start Exam' on Mock Exam #4, it just shows a loading spinner forever.",
        timestamp: "2026-08-14T14:20:00Z",
        isInternalNote: false
      },
      {
        id: "msg-4",
        senderId: "admin-2",
        senderName: "Sarah Connor",
        senderType: "Admin",
        content: "Hi Sita, we are looking into this. Could you let me know which browser you are using?",
        timestamp: "2026-08-14T15:10:00Z",
        isInternalNote: false
      }
    ]
  },
  {
    id: "tkt-1003",
    ticketId: "#TKT-1003",
    student: {
      id: "std-992",
      name: "Hari Kumar",
      email: "hari.kumar@example.com",
      username: "hari_k",
      targetExam: "Teacher Service",
      targetPosition: "Primary Level",
      accountStatus: "Active",
      joinedDate: "2026-05-01T12:00:00Z"
    },
    subject: "How do I reset the AI Tutor context?",
    category: "AI Tutor",
    priority: "Low",
    status: "Resolved",
    assignedTo: "John Doe",
    createdAt: "2026-08-13T11:00:00Z",
    updatedAt: "2026-08-13T12:30:00Z",
    tags: ["ai"],
    messages: [
      {
        id: "msg-5",
        senderId: "std-992",
        senderName: "Hari Kumar",
        senderType: "Student",
        content: "The AI keeps talking about my previous exam. How do I clear the chat?",
        timestamp: "2026-08-13T11:00:00Z",
        isInternalNote: false
      },
      {
        id: "msg-6",
        senderId: "admin-3",
        senderName: "John Doe",
        senderType: "Admin",
        content: "Hi Hari, you can click the 'New Chat' button at the top right of the AI Tutor screen to reset the context.",
        timestamp: "2026-08-13T12:30:00Z",
        isInternalNote: false
      }
    ]
  }
];

export const mockSupportAnalytics = {
  totalTickets: 1245,
  openTickets: 45,
  inProgress: 12,
  waitingForStudent: 8,
  resolved: 1180,
  resolutionRate: 94.7,
  avgResponseTime: "1h 45m",
  avgResolutionTime: "8h 30m",
  csatRating: 4.8,
  ticketsOverTime: [
    { date: "Aug 10", count: 24 },
    { date: "Aug 11", count: 35 },
    { date: "Aug 12", count: 18 },
    { date: "Aug 13", count: 42 },
    { date: "Aug 14", count: 29 },
    { date: "Aug 15", count: 33 },
  ],
  ticketsByCategory: [
    { category: "Account & Login", percentage: 25 },
    { category: "Payment", percentage: 15 },
    { category: "Exam & Results", percentage: 40 },
    { category: "AI Tutor", percentage: 10 },
    { category: "Other", percentage: 10 },
  ],
  agentPerformance: [
    { name: "Sarah Connor", assigned: 145, resolved: 140, avgResponse: "1h 10m", csat: 4.9 },
    { name: "John Doe", assigned: 120, resolved: 115, avgResponse: "2h 00m", csat: 4.7 },
    { name: "Finance Team", assigned: 80, resolved: 78, avgResponse: "0h 45m", csat: 4.6 }
  ]
};
