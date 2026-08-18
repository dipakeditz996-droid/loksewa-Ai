// User Management Mock Data

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  status: "Active" | "Inactive" | "Suspended" | "Pending";
  targetPosition?: string;
  joinedDate: string;
  lastActive: string;
  phone?: string;
}

export const mockUsers: User[] = [
  { id: "USR-001", name: "Ramesh Sharma", email: "ramesh.sharma@example.com", username: "ramesh_s", role: "Student", status: "Active", targetPosition: "Section Officer", joinedDate: "2025-01-15", lastActive: "2 hours ago", phone: "+977-9800000001" },
  { id: "USR-002", name: "Sita Thapa", email: "sita.t@example.com", username: "sitat", role: "Student", status: "Active", targetPosition: "Nayab Subba", joinedDate: "2025-02-10", lastActive: "5 mins ago", phone: "+977-9800000002" },
  { id: "USR-003", name: "Hari Kumar", email: "hari.k@example.com", username: "harik", role: "Student", status: "Inactive", targetPosition: "Kharidar", joinedDate: "2024-11-20", lastActive: "2 weeks ago" },
  { id: "USR-004", name: "Gita Nepal", email: "gita.n@example.com", username: "gitanepal", role: "Student", status: "Suspended", targetPosition: "Banking", joinedDate: "2025-03-05", lastActive: "1 day ago", phone: "+977-9800000004" },
  { id: "USR-005", name: "Bikash Gurung", email: "bikash.g@example.com", username: "bikashg", role: "Student", status: "Pending", targetPosition: "Section Officer", joinedDate: "2025-08-14", lastActive: "Never" },
];

export interface Admin {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  status: "Active" | "Inactive" | "Suspended";
  createdDate: string;
  lastActive: string;
}

export const mockAdmins: Admin[] = [
  { id: "ADM-001", name: "System Admin", email: "admin@loksewaai.com", username: "sysadmin", role: "Super Admin", status: "Active", createdDate: "2024-01-01", lastActive: "Just now" },
  { id: "ADM-002", name: "Content Team", email: "content@loksewaai.com", username: "content_mgr", role: "Content Manager", status: "Active", createdDate: "2024-03-15", lastActive: "1 hour ago" },
  { id: "ADM-003", name: "Support Agent", email: "support@loksewaai.com", username: "support1", role: "Support Agent", status: "Active", createdDate: "2024-05-20", lastActive: "3 hours ago" },
  { id: "ADM-004", name: "Finance Dept", email: "finance@loksewaai.com", username: "finance_mgr", role: "Finance Manager", status: "Inactive", createdDate: "2024-02-10", lastActive: "3 days ago" },
];

export interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissionsCount: number;
  status: "Active" | "Inactive";
  updatedAt: string;
  isSystem?: boolean; // System roles cannot be deleted
}

export const mockRoles: Role[] = [
  { id: "ROL-001", name: "Super Admin", description: "Unrestricted administrative access to all modules.", userCount: 2, permissionsCount: 65, status: "Active", updatedAt: "2024-01-01", isSystem: true },
  { id: "ROL-002", name: "Content Manager", description: "Can manage academic content, question banks, and study plans.", userCount: 5, permissionsCount: 28, status: "Active", updatedAt: "2024-03-15", isSystem: true },
  { id: "ROL-003", name: "Support Agent", description: "Can view user profiles and manage support tickets.", userCount: 12, permissionsCount: 15, status: "Active", updatedAt: "2024-05-20", isSystem: true },
  { id: "ROL-004", name: "Finance Manager", description: "Can view and verify marketplace orders and payments.", userCount: 3, permissionsCount: 12, status: "Active", updatedAt: "2024-02-10", isSystem: true },
  { id: "ROL-005", name: "Student", description: "Default role for registered platform users.", userCount: 12450, permissionsCount: 5, status: "Active", updatedAt: "2024-01-01", isSystem: true },
];

export interface Permission {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  publish?: boolean;
}

// Example permissions matrix for Content Manager
export const mockContentManagerPermissions: Permission[] = [
  { module: "Dashboard", view: true, create: false, edit: false, delete: false },
  { module: "Students", view: true, create: false, edit: false, delete: false },
  { module: "Academic", view: true, create: true, edit: true, delete: false, publish: true },
  { module: "Question Bank", view: true, create: true, edit: true, delete: true, publish: true },
  { module: "Exams", view: true, create: true, edit: true, delete: false, publish: true },
  { module: "Study Plans", view: true, create: true, edit: true, delete: false, publish: true },
  { module: "AI Tutor", view: false, create: false, edit: false, delete: false },
  { module: "Marketplace", view: false, create: false, edit: false, delete: false },
  { module: "Support", view: false, create: false, edit: false, delete: false },
  { module: "Analytics", view: true, create: false, edit: false, delete: false },
  { module: "Settings", view: false, create: false, edit: false, delete: false },
];

export interface UserActivity {
  id: string;
  action: string;
  module: string;
  timestamp: string;
  device?: string;
  ip?: string;
}

export const mockUserActivity: UserActivity[] = [
  { id: "ACT-001", action: "Logged In", module: "Authentication", timestamp: "2025-08-15 10:30 AM", device: "Windows - Chrome", ip: "110.44.112.55" },
  { id: "ACT-002", action: "Completed Exam 'Section Officer Mock'", module: "Exams", timestamp: "2025-08-15 09:15 AM" },
  { id: "ACT-003", action: "Asked AI Tutor a question", module: "AI Tutor", timestamp: "2025-08-14 02:45 PM" },
  { id: "ACT-004", action: "Purchased 'PDF Notes'", module: "Marketplace", timestamp: "2025-08-12 11:20 AM" },
  { id: "ACT-005", action: "Updated Profile", module: "Account", timestamp: "2025-08-10 04:15 PM" },
];

export interface Invitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  sentDate: string;
  expiresDate: string;
  status: "Pending" | "Accepted" | "Expired" | "Cancelled";
}

export const mockInvitations: Invitation[] = [
  { id: "INV-001", email: "new.admin@loksewaai.com", role: "Content Manager", invitedBy: "System Admin", sentDate: "2025-08-14", expiresDate: "2025-08-21", status: "Pending" },
  { id: "INV-002", email: "support.new@loksewaai.com", role: "Support Agent", invitedBy: "System Admin", sentDate: "2025-08-10", expiresDate: "2025-08-17", status: "Expired" },
];
