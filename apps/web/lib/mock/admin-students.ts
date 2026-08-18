export interface StudentActivity {
  id: string;
  type: 'exam' | 'practice' | 'purchase' | 'tutor' | 'profile' | 'support';
  description: string;
  timestamp: string;
}

export interface StudentPurchase {
  id: string;
  product: string;
  amount: number;
  status: 'Approved' | 'Pending' | 'Rejected';
  date: string;
}

export interface StudentSupportTicket {
  id: string;
  subject: string;
  status: 'Open' | 'In Progress' | 'Waiting' | 'Resolved' | 'Closed';
  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
  updatedAt: string;
}

export interface StudentSubjectPerformance {
  subject: string;
  scorePercent: number;
  questions: number;
  accuracy: number;
}

export interface AdminStudent {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  location: string;
  avatar: string | null;
  status: 'Active' | 'Inactive' | 'Suspended';
  targetExam: string;
  targetPosition: string;
  education: string;
  preferredSubjects: string[];
  joinedAt: string;
  lastActiveAt: string;
  profileCompletion: number;

  stats: {
    totalExams: number;
    averageScore: number;
    bestScore: number;
    questionsAttempted: number;
    accuracy: number;
    studyStreak: number;
  };
  
  performanceChart: { name: string; score: number }[];
  subjectPerformance: StudentSubjectPerformance[];
  recentActivity: StudentActivity[];
  purchases: StudentPurchase[];
  tickets: StudentSupportTicket[];
}

export const mockStudents: AdminStudent[] = [
  {
    id: 'STU-001',
    name: 'Ram Sharma',
    username: 'ramsharma99',
    email: 'ram.sharma@example.com',
    phone: '9841234567',
    location: 'Kathmandu, Bagmati',
    avatar: null,
    status: 'Active',
    targetExam: 'Public Service Commission',
    targetPosition: 'Section Officer',
    education: 'Bachelor of Arts',
    preferredSubjects: ['General Knowledge', 'Current Affairs'],
    joinedAt: '2025-06-15T10:30:00Z',
    lastActiveAt: '2026-08-14T09:15:00Z',
    profileCompletion: 85,
    stats: {
      totalExams: 24,
      averageScore: 72.5,
      bestScore: 92,
      questionsAttempted: 1540,
      accuracy: 78.4,
      studyStreak: 12
    },
    performanceChart: [
      { name: 'Ex 1', score: 65 },
      { name: 'Ex 2', score: 70 },
      { name: 'Ex 3', score: 68 },
      { name: 'Ex 4', score: 75 },
      { name: 'Ex 5', score: 82 },
      { name: 'Ex 6', score: 78 },
      { name: 'Ex 7', score: 88 },
      { name: 'Ex 8', score: 92 },
    ],
    subjectPerformance: [
      { subject: 'General Knowledge', scorePercent: 80, questions: 450, accuracy: 82 },
      { subject: 'Constitution', scorePercent: 65, questions: 320, accuracy: 68 },
      { subject: 'Current Affairs', scorePercent: 90, questions: 210, accuracy: 92 },
      { subject: 'English', scorePercent: 75, questions: 300, accuracy: 77 },
      { subject: 'Mathematics', scorePercent: 60, questions: 260, accuracy: 62 },
    ],
    recentActivity: [
      { id: 'act1', type: 'exam', description: 'Completed Mock Exam: Model Test 5', timestamp: '2 hours ago' },
      { id: 'act2', type: 'practice', description: 'Started Practice Session: Constitution', timestamp: 'Yesterday' },
      { id: 'act3', type: 'tutor', description: 'Asked AI Tutor about "Fundamental Rights"', timestamp: '2 days ago' },
      { id: 'act4', type: 'purchase', description: 'Purchased Study Material: GK Handbook', timestamp: '1 week ago' },
    ],
    purchases: [
      { id: 'PUR-8821', product: 'Section Officer Full Course', amount: 5000, status: 'Approved', date: '2025-06-15' },
      { id: 'PUR-8942', product: 'GK Handbook PDF', amount: 500, status: 'Approved', date: '2026-08-07' },
    ],
    tickets: [
      { id: 'TKT-104', subject: 'Cannot access my course materials', status: 'Resolved', priority: 'High', createdAt: '2025-07-01', updatedAt: '2025-07-02' },
    ]
  },
  {
    id: 'STU-002',
    name: 'Sita Thapa',
    username: 'sita_t',
    email: 'sita.thapa@example.com',
    phone: '9812345678',
    location: 'Pokhara, Gandaki',
    avatar: null,
    status: 'Inactive',
    targetExam: 'Public Service Commission',
    targetPosition: 'Nayab Subba',
    education: 'Intermediate (+2)',
    preferredSubjects: ['Computer', 'General Knowledge'],
    joinedAt: '2025-01-10T14:20:00Z',
    lastActiveAt: '2026-01-20T11:00:00Z',
    profileCompletion: 45,
    stats: {
      totalExams: 3,
      averageScore: 45.0,
      bestScore: 55,
      questionsAttempted: 150,
      accuracy: 42.1,
      studyStreak: 0
    },
    performanceChart: [
      { name: 'Ex 1', score: 40 },
      { name: 'Ex 2', score: 45 },
      { name: 'Ex 3', score: 55 },
    ],
    subjectPerformance: [
      { subject: 'General Knowledge', scorePercent: 50, questions: 50, accuracy: 52 },
      { subject: 'Computer', scorePercent: 60, questions: 100, accuracy: 65 },
    ],
    recentActivity: [
      { id: 'act5', type: 'profile', description: 'Updated Profile Information', timestamp: '7 months ago' },
      { id: 'act6', type: 'exam', description: 'Completed Mock Exam: Baseline Test', timestamp: '7 months ago' },
    ],
    purchases: [],
    tickets: []
  },
  {
    id: 'STU-003',
    name: 'Hari Bahadur',
    username: 'harib_bad',
    email: 'hari@example.com',
    phone: '9844444444',
    location: 'Lalitpur, Bagmati',
    avatar: null,
    status: 'Suspended',
    targetExam: 'Public Service Commission',
    targetPosition: 'Kharidar',
    education: 'SEE',
    preferredSubjects: ['Mathematics'],
    joinedAt: '2026-05-01T08:00:00Z',
    lastActiveAt: '2026-07-01T09:00:00Z',
    profileCompletion: 100,
    stats: {
      totalExams: 10,
      averageScore: 80.0,
      bestScore: 95,
      questionsAttempted: 800,
      accuracy: 85.0,
      studyStreak: 0
    },
    performanceChart: [
      { name: 'Ex 1', score: 70 },
      { name: 'Ex 2', score: 80 },
      { name: 'Ex 3', score: 85 },
      { name: 'Ex 4', score: 95 },
    ],
    subjectPerformance: [
      { subject: 'Mathematics', scorePercent: 95, questions: 400, accuracy: 98 },
    ],
    recentActivity: [
      { id: 'act7', type: 'support', description: 'Submitted Support Ticket', timestamp: '1 month ago' },
    ],
    purchases: [
      { id: 'PUR-9001', product: 'Kharidar Full Course', amount: 3000, status: 'Approved', date: '2026-05-02' }
    ],
    tickets: [
      { id: 'TKT-205', subject: 'Suspended without reason', status: 'Open', priority: 'High', createdAt: '2026-07-02', updatedAt: '2026-07-02' },
    ]
  },
  // Add some more mock users to make pagination realistic
  ...Array.from({ length: 47 }).map((_, i) => ({
    id: `STU-10${i+4}`,
    name: `Student ${i+4}`,
    username: `student_${i+4}`,
    email: `student${i+4}@example.com`,
    phone: '9800000000',
    location: 'Nepal',
    avatar: null,
    status: ((i % 5 === 0) ? 'Inactive' : (i % 17 === 0) ? 'Suspended' : 'Active') as 'Active' | 'Inactive' | 'Suspended',
    targetExam: 'Public Service Commission',
    targetPosition: (i % 2 === 0) ? 'Section Officer' : 'Nayab Subba',
    education: 'Bachelor',
    preferredSubjects: [],
    joinedAt: '2026-08-01T10:00:00Z',
    lastActiveAt: '2026-08-14T10:00:00Z',
    profileCompletion: 60,
    stats: {
      totalExams: 5,
      averageScore: 60,
      bestScore: 70,
      questionsAttempted: 300,
      accuracy: 65,
      studyStreak: 2
    },
    performanceChart: [],
    subjectPerformance: [],
    recentActivity: [],
    purchases: [],
    tickets: []
  }))
];
