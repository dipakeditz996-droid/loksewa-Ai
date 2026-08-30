"use client";

import { NotificationsInbox } from "@/components/notifications/NotificationsInbox";

const ADMIN_FILTERS = [
  { id: 'all', label: 'All Notifications' },
  { id: 'unread', label: 'Unread' },
  { id: 'new_registration', label: 'New Registrations' },
  { id: 'account', label: 'Account Updates' },
  { id: 'payment', label: 'Payments' },
  { id: 'evaluation', label: 'Evaluations' },
  { id: 'course_application', label: 'Course Applications' },
  { id: 'support', label: 'Support' },
  { id: 'question_review', label: 'Questions & Exams' },
  { id: 'material_review', label: 'Study Materials' },
  { id: 'announcement', label: 'Announcements' },
  { id: 'system', label: 'System Alerts' },
];

export default function AdminNotificationsInboxPage() {
  return (
    <NotificationsInbox
      subtitle="Real-time events across the platform that need your attention."
      filters={ADMIN_FILTERS}
    />
  );
}
