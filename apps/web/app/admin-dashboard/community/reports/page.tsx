"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This exact path was the action_url on every "New Community Report"
// notification before it was fixed to /admin-dashboard/community?tab=reports.
// Without this page, /community/reports fell through to the dynamic
// [id] route (id="reports"), which tried to load a post with that id and
// 404'd. Kept as a redirect so already-sent, still-unread notifications
// (and any old bookmarks) keep working.
export default function AdminCommunityReportsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin-dashboard/community?tab=reports");
  }, [router]);

  return null;
}
