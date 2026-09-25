import { redirect } from "next/navigation";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : {};
  const params = new URLSearchParams();
  params.set("tab", "courses");
  for (const [key, val] of Object.entries(sp)) {
    if (key !== "tab" && typeof val === "string") {
      params.set(key, val);
    }
  }
  redirect(`/student/learning?${params.toString()}`);
}
