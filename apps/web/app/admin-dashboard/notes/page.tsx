import { redirect } from "next/navigation";

export default function AdminNotesRedirectPage() {
  redirect("/admin-dashboard/study-materials");
}
