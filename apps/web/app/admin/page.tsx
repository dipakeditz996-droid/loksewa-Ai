import { redirect } from "next/navigation";

// This route used to render an entirely hardcoded "System Overview" (fake
// user counts, fake revenue, fake student names/emails, fabricated "System
// Alerts") with zero API calls - real production traffic reaching /admin
// would have seen invented numbers presented as live platform data.
// admin-dashboard/page.tsx already is the real, adminApi-wired dashboard
// (same data this page was pretending to show, actually live), so this
// route now sends admins there instead of duplicating that work.
export default function AdminDashboardRedirect() {
  redirect("/admin-dashboard");
}
