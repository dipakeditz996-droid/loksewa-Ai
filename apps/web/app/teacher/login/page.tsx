import { redirect } from "next/navigation";

// Teacher login is no longer a separate portal - every role signs in
// through the same /login form, which already redirects to /teacher after
// a successful login for teacher accounts. This route stays only so old
// bookmarks/links don't 404.
export default function TeacherLoginRedirect() {
  redirect("/login");
}
