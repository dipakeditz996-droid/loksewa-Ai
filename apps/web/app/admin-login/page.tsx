import { redirect } from "next/navigation";

// Admin login is no longer a separate portal - every role (student, teacher,
// admin, super-admin) signs in through the same /login form, which already
// enforces 2FA for accounts that have it enabled. This route stays only so
// old bookmarks/links don't 404.
export default function AdminLoginRedirect() {
  redirect("/login");
}
