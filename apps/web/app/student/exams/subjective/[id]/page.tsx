"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { subjectiveApi } from "@/lib/api/subjective";

/**
 * This page used to be a fully static mockup: hardcoded question text, an
 * uncontrolled textarea, a hardcoded "Words: 0 / 1000" counter, and a
 * "Submit Assignment" button with no onClick handler at all - nothing here
 * ever saved or submitted anything. The real, working answer-taking flow
 * lives at /subjective/answer?attempt_id=..., driven by a real
 * SubjectiveAttempt. Nothing links to this route anymore (the listing page
 * now starts an attempt and navigates straight there), but this stays as a
 * safety net for old links/bookmarks: start the attempt for this practice
 * set and hand off immediately.
 */
export default function SubjectiveSubmitRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const practiceSetId = Number(params.id);
    if (!practiceSetId) {
      router.replace("/student/exams/subjective");
      return;
    }

    subjectiveApi
      .startAttempt({ mode: "practice", practice_set_id: practiceSetId })
      .then((attempt) => {
        router.replace(`/subjective/answer?attempt_id=${attempt.id}`);
      })
      .catch((err) => {
        console.error("Failed to start subjective assignment", err);
        setError("Could not start this assignment. It may no longer be available.");
      });
  }, [params.id, router]);

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted-foreground">{error}</p>
        <button
          onClick={() => router.push("/student/exams/subjective")}
          className="text-sm font-semibold text-primary underline"
        >
          Back to Subjective Exams
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>Preparing your assignment...</span>
    </div>
  );
}
