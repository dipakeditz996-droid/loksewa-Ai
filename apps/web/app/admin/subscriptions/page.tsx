import { redirect } from "next/navigation";

// Package management now lives under the current admin-dashboard tree,
// with a real create/edit/publish UI (this page's "Create New Plan" button
// was never wired to anything). Kept as a redirect so old bookmarks/links
// don't 404.
export default function AdminSubscriptionsRedirect() {
  redirect("/admin-dashboard/packages");
}
