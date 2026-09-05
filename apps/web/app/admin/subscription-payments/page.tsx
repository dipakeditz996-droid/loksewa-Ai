import { redirect } from "next/navigation";

// Payment review now happens at /admin-dashboard/applications (this page's
// "Review" button was never wired to anything). Kept as a redirect so old
// bookmarks/links don't 404.
export default function AdminSubscriptionPaymentsRedirect() {
  redirect("/admin-dashboard/applications");
}
