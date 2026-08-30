"use client";

import { NotificationsInbox } from "@/components/notifications/NotificationsInbox";

export default function NotificationsPage() {
  return (
    <NotificationsInbox
      subtitle="Stay updated on your students, content reviews, and teaching activity."
      settingsHref="/teacher/settings?tab=notifications"
    />
  );
}
