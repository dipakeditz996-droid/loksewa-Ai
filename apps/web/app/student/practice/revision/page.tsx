"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, Target, Clock, TrendingDown, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { practiceApi, PracticeSessionResponse, RevisionFocus, RevisionSummary } from "@/lib/api/practice";
import { StudyQuestionBrowser } from "@/components/practice/StudyQuestionBrowser";
import { useSavedQuestions, useRevisionSummary } from "@/lib/practice-hooks";
import { ApiError } from "@/lib/api/client";
import { practiceError } from "@/lib/practice-errors";

const SIGNALS: { key: keyof Omit<RevisionSummary, "total_available">; label: string; icon: typeof Clock; focus: RevisionFocus }[] = [
  { key: "overdue", label: "Due for review", icon: Clock, focus: "overdue" },
  { key: "repeatedly_incorrect", label: "Repeatedly incorrect", icon: RefreshCw, focus: "repeatedly_incorrect" },
  { key: "recent_mistakes", label: "Recent mistakes", icon: TrendingDown, focus: "recent_mistakes" },
  { key: "weak_topics", label: "Weak topics", icon: Target, focus: "weak_topics" },
];

function RevisionContent() {
  const searchParams = useSearchParams();
  const requestedFocus = searchParams.get("focus") as RevisionFocus | null;

  const summaryQuery = useRevisionSummary();
  const summary = summaryQuery.data ?? null;
  const loading = summaryQuery.isLoading;
  // A failed load is not "nothing to revise" - say so and offer Retry.
  const summaryError = summaryQuery.isError ? practiceError(summaryQuery.error, "load").message : null;
  const loadSummary = () => summaryQuery.refetch();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PracticeSessionResponse | null>(null);
  const { savedIds: savedQuestionIds, toggle: toggleSave } = useSavedQuestions();

  const handleStart = async (focus?: RevisionFocus) => {
    setStarting(true);
    setError(null);
    try {
      const data = await practiceApi.startRevision(focus);
      setSession(data);
    } catch (e) {
      console.error(e);
      const pe = practiceError(e, "start");
      // The backend's "keep practicing and we'll build your queue" text is
      // written for students - keep it; everything else goes through the
      // shared wording.
      setError(
        pe.kind === "no-questions" && e instanceof ApiError && typeof e.data?.detail === "string"
          ? e.data.detail
          : pe.message
      );
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-8" aria-busy="true">
        <div className="space-y-3 animate-pulse">
          <div className="h-8 w-56 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-24 rounded-[14px] bg-muted" />)}
        </div>
      </div>
    );
  }

  if (summaryError && !session) {
    return (
      <div className="p-4 md:p-8 max-w-[800px] mx-auto">
        <div className="bg-card rounded-[16px] border border-border shadow-sm p-10 text-center space-y-4" role="alert">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" aria-hidden="true" />
          <p className="font-semibold text-primary dark:text-foreground">{summaryError}</p>
          <Button variant="outline" onClick={loadSummary}>Retry</Button>
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6 animate-in fade-in-50 duration-500">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-primary dark:text-foreground">Revision</h1>
          <p className="text-muted-foreground text-[14px]">
            Questions picked from your own history — no exam pressure, just closing the gaps.
          </p>
        </div>
        <StudyQuestionBrowser
          sessionId={session.session.id}
          questions={session.questions}
          savedQuestionIds={savedQuestionIds}
          onToggleSave={toggleSave}
        />
      </div>
    );
  }

  const hasAnything = !!summary && summary.total_available > 0;

  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-8 animate-in fade-in-50 duration-500">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-primary dark:text-foreground flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-[#D4A72C]" /> Revision Mode
        </h1>
        <p className="text-muted-foreground mt-1 text-[15px]">
          The system picks what to revise based on what you've gotten wrong, repeated mistakes, weak topics, and what's due for another look.
        </p>
      </div>

      {!hasAnything ? (
        <div className="bg-card rounded-[16px] border border-border shadow-sm p-10 text-center">
          <p className="font-semibold text-primary dark:text-foreground">Nothing to revise yet</p>
          <p className="text-muted-foreground text-[14px] mt-1 max-w-md mx-auto">
            Answer some questions in Practice or Study mode — we'll build your revision queue from what you get wrong and what's due for review.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SIGNALS.map(s => (
              <button
                key={s.key}
                onClick={() => summary![s.key] > 0 && handleStart(s.focus)}
                disabled={starting || summary![s.key] === 0}
                className={`flex flex-col items-center gap-2 p-4 rounded-[12px] border transition-all text-center ${
                  summary![s.key] > 0
                    ? "border-border bg-card hover:border-[#0B2545] cursor-pointer"
                    : "border-border/50 bg-muted/30 opacity-50 cursor-not-allowed"
                }`}
              >
                <s.icon className="w-5 h-5 text-[#0B2545] dark:text-foreground" />
                <span className="text-2xl font-bold text-primary dark:text-foreground">{summary![s.key]}</span>
                <span className="text-[12px] font-medium text-muted-foreground">{s.label}</span>
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}

          <Button
            onClick={() => handleStart(requestedFocus || undefined)}
            disabled={starting}
            className="w-full h-14 rounded-[12px] bg-primary text-primary-foreground hover:bg-[#163E6B] text-white font-bold text-[16px]"
          >
            {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Start Revising (${summary!.total_available} question${summary!.total_available === 1 ? "" : "s"})`}
          </Button>
        </>
      )}
    </div>
  );
}

export default function RevisionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <RevisionContent />
    </Suspense>
  );
}
