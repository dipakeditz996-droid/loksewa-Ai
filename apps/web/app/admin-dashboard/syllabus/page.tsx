import { redirect } from "next/navigation";

export default function AdminSyllabusRedirectPage() {
  redirect("/admin-dashboard/academic/syllabus");
}
