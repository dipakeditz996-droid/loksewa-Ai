"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, Target, Clock, TrendingDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { practiceApi, PracticeSessionResponse, RevisionFocus, RevisionSummary } from "@/lib/api/practice";
import { StudyQuestionBrowser } from "@/components/practice/StudyQuestionBrowser";

const SIGNALS: { key: keyof Omit<RevisionSummary, "total_available">; label: string; icon: typeof Clock; focus: RevisionFocus }[] = [
  { key: "overdue", label: "Due for review", icon: Clock, focus: "overdue" },
  { key: "repeatedly_incorrect", label: "Repeatedly incorrect", icon: RefreshCw, focus: "repeatedly_incorrect" },
  { key: "recent_mistakes", label: "Recent mistakes", icon: TrendingDown, focus: "recent_mistakes" },
  { key: "weak_topics", label: "Weak topics", icon: Target, focus: "weak_topics" },
];

function RevisionContent() {
  const searchParams = useSearchParams();
  const requestedFocus = searchParams.get("focus") as RevisionFocus | null;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<RevisionSummary | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PracticeSessionResponse | null>(null);
  const [savedQuestionIds, setSavedQuestionIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    practiceApi.getRevisionSummary().then(setSummary).catch(e => console.error(e)).finally(() => setLoading(false));
    practiceApi.listSavedQuestions().then(saved => {
      const map: Record<number, boolean> = {};
      saved.forEach(s => { map[s.question] = true; });
      setSavedQuestionIds(map);
    }).catch(e => console.error(e));
  }, []);

  const toggleSave = async (questionId: number) => {
    const wasSaved = !!savedQuestionIds[questionId];
    setSavedQuestionIds(prev => ({ ...prev, [questionId]: !wasSaved }));
    try {
      await practiceApi.toggleBookmark(questionId);
    } catch (e) {
      console.error(e);
      setSavedQuestionIds(prev => ({ ...prev, [questionId]: wasSaved }));
    }
  };

  const handleStart = async (focus?: RevisionFocus) => {
    setStarting(true);
    setError(null);
    try {
      const data = await practiceApi.startRevision(focus);
      setSession(data);
    } catch (e: any) {
      setError(e?.data?.detail || "Couldn't build a revision session right now.");
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-foreground" />
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
