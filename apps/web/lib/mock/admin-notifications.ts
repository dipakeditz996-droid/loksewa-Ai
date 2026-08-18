export type NotificationType = 
  | "Announcement" 
  | "Exam Reminder" 
  | "Study Reminder" 
  | "Payment" 
  | "Marketplace" 
  | "AI Tutor" 
  | "Support" 
  | "System";

export type NotificationStatus = 
  | "Draft" 
  | "Scheduled" 
  | "Sending" 
  | "Sent" 
  | "Cancelled" 
  | "Archived";

export type NotificationChannel = "In-App" | "Email" | "Push" | "SMS";

export type AudienceType = 
  | "All Students" 
  | "Selected Students" 
  | "Exam Category" 
  | "Target Position" 
  | "Active Plans" 
  | "Pending Payments" 
  | "Unread Notifications" 
  | "Custom Segment";

export interface MockNotification {
  id: string;
  title: string;
  shortMessage: string;
  type: NotificationType;
  audience: AudienceType;
  channels: NotificationChannel[];
  status: NotificationStatus;
  sentAt?: string;
  scheduledFor?: string;
  createdAt: string;
  metrics: {
    totalRecipients: number;
    delivered: number;
    failed: number;
    read: number;
  };
}

export interface MockNotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  title: string;
  message: string;
  defaultChannels: NotificationChannel[];
  variables: string[];
  updatedAt: string;
}

export const mockNotifications: MockNotification[] = [
  {
    id: "notif-1",
    title: "Upcoming Mock Test: Section Officer",
    shortMessage: "Don't forget! The grand mock test for Section Officer starts in 24 hours.",
    type: "Exam Reminder",
    audience: "Exam Category",
    channels: ["In-App", "Push"],
    status: "Sent",
    sentAt: "2026-08-14T10:00:00Z",
    createdAt: "2026-08-13T10:00:00Z",
    metrics: {
      totalRecipients: 4500,
      delivered: 4480,
      failed: 20,
      read: 3200
    }
  },
  {
    id: "notif-2",
    title: "Platform Maintenance",
    shortMessage: "LoksewaAI will be undergoing scheduled maintenance tonight from 2 AM to 4 AM.",
    type: "System",
    audience: "All Students",
    channels: ["In-App", "Email"],
    status: "Scheduled",
    scheduledFor: "2026-08-16T08:00:00Z",
    createdAt: "2026-08-15T09:00:00Z",
    metrics: {
      totalRecipients: 12500,
      delivered: 0,
      failed: 0,
      read: 0
    }
  },
  {
    id: "notif-3",
    title: "Payment Received",
    shortMessage: "Your payment for the 30-Day Crash Course has been approved.",
    type: "Payment",
    audience: "Selected Students",
    channels: ["In-App", "Email", "SMS"],
    status: "Sent",
    sentAt: "2026-08-15T08:30:00Z",
    createdAt: "2026-08-15T08:30:00Z",
    metrics: {
      totalRecipients: 1,
      delivered: 1,
      failed: 0,
      read: 1
    }
  },
  {
    id: "notif-4",
    title: "New AI Feature Available!",
    shortMessage: "You can now ask the AI Tutor to generate personalized mock questions.",
    type: "Announcement",
    audience: "Active Plans",
    channels: ["In-App", "Push"],
    status: "Draft",
    createdAt: "2026-08-15T10:15:00Z",
    metrics: {
      totalRecipients: 0,
      delivered: 0,
      failed: 0,
      read: 0
    }
  }
];

export const mockNotificationTemplates: MockNotificationTemplate[] = [
  {
    id: "tpl-1",
    name: "Standard Exam Reminder",
    type: "Exam Reminder",
    title: "Reminder: {{exam_name}} is starting soon",
    message: "Hi {{student_name}}, this is a quick reminder that your {{exam_name}} exam is scheduled for {{exam_date}}. Good luck!",
    defaultChannels: ["In-App", "Push"],
    variables: ["{{student_name}}", "{{exam_name}}", "{{exam_date}}"],
    updatedAt: "2026-08-01T10:00:00Z"
  },
  {
    id: "tpl-2",
    name: "Payment Approved",
    type: "Payment",
    title: "Payment Successful",
    message: "Your payment for {{product_name}} has been approved. You can now access your content.",
    defaultChannels: ["In-App", "Email"],
    variables: ["{{product_name}}"],
    updatedAt: "2026-07-15T14:30:00Z"
  },
  {
    id: "tpl-3",
    name: "Support Ticket Reply",
    type: "Support",
    title: "Update on Ticket #{{ticket_id}}",
    message: "Hi {{student_name}}, an admin has replied to your support ticket #{{ticket_id}}. Please check your dashboard.",
    defaultChannels: ["In-App", "Email"],
    variables: ["{{student_name}}", "{{ticket_id}}"],
    updatedAt: "2026-08-10T09:15:00Z"
  }
];

export const mockNotificationAnalytics = {
  totalSent: 145800,
  averageReadRate: 68.5,
  bestPerformingType: "Exam Reminder",
  mostActiveChannel: "In-App",
  readRateOverTime: [
    { date: "Aug 1", rate: 65 },
    { date: "Aug 5", rate: 67 },
    { date: "Aug 10", rate: 71 },
    { date: "Aug 15", rate: 68 }
  ],
  channelPerformance: [
    { channel: "In-App", delivered: 145000, read: 110000 },
    { channel: "Push", delivered: 85000, read: 45000 },
    { channel: "Email", delivered: 140000, read: 35000 },
    { channel: "SMS", delivered: 15000, read: 14000 }
  ]
};

export const mockNotificationPreferences = {
  defaultChannels: ["In-App"],
  quietHoursEnabled: true,
  quietHoursStart: "22:00", // 10 PM
  quietHoursEnd: "07:00", // 7 AM
  timezone: "Asia/Kathmandu",
  maxDailyNotifications: 5,
  retryPolicy: "3 retries, 5 mins apart"
};
