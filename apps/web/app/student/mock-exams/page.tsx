import { redirect } from "next/navigation";

export default function MockExamsRedirect() {
  redirect("/student/exams");
}
