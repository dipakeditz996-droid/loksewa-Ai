import { redirect } from "next/navigation";

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : {};
  const params = new URLSearchParams();
  params.set("tab", "feedback");
  for (const [key, val] of Object.entries(sp)) {
    if (key !== "tab" && typeof val === "string") {
      params.set(key, val);
    }
  }
  redirect(`/student/results-feedback?${params.toString()}`);
}
