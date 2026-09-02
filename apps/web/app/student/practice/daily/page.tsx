"use client";

import { useEffect, useState } from "react";
import { Calendar, Sparkles, Target, BookOpen, RefreshCw, Loader2 } from "lucide-react";
import { practiceApi, StudySessionResponse } from "@/lib/api/practice";
import { StudyQuestionBrowser } from "@/components/practice/StudyQuestionBrowser";
import { Button } from "@/components/ui/button";

export default function DailyPracticePage() {
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<StudySessionResponse | null>(null);
  const [savedQuestionIds, setSavedQuestionIds] = useState<Record<number, boolean>>({});

  const toggleSave = async (questionId: number) => {
    const wasSaved = !!savedQuestionIds[questionId];
    setSavedQuestionIds((prev) => ({ ...prev, [questionId]: !wasSaved }));
    try {
      await practiceApi.toggleBookmark(questionId);
    } catch {
      setSavedQuestionIds((prev) => ({ ...prev, [questionId]: wasSaved }));
    }
  };

  const startSession = async () => {
    setStarting(true);
    setError(null);
    try {
      const [data, saved] = await Promise.all([
        practiceApi.startDailySession(),
        practiceApi.listSavedQuestions().catch(() => []),
      ]);
      const map: Record<number, boolean> = {};
      saved.forEach((s) => {
        map[s.question] = true;
      });
      setSavedQuestionIds(map);
      setSession(data);
    } catch (err: any) {
      setError(
        err?.data?.detail ||
          err?.message ||
          "Couldn't build your daily session. Try again."
      );
    } finally {
      setStarting(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Active session — render the question browser ───────────────────────
  if (session) {
    return (
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6 animate-in fade-in-50 duration-500">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#D4A72C]/15 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-[#D4A72C]" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-primary dark:text-foreground">
              Daily Practice
            </h1>
            <p className="text-muted-foreground text-[14px]">
              {session.resumed
                ? "Resuming today's session — pick up where you left off."
                : `${session.questions.length} personalised questions curated for today.`}
            </p>
          </div>
        </div>
        <StudyQuestionBrowser
          sessionId={session.session.id}
          questions={session.questions}
          savedQuestionIds={savedQuestionIds}
          onToggleSave={toggleSave}
          initialIndex={session.resume_index ?? 0}
        />
      </div>
    );
  }

  // ── Loading / landing state ────────────────────────────────────────────
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-in fade-in-50 duration-500">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-[#0B2545] to-[#163E6B] p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4A72C]/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#D4A72C]" />
            </div>
            <h1 className="text-xl font-bold">Daily Practice</h1>
          </div>
          <p className="text-white/70 text-sm leading-relaxed">
            Your personalised 20-question set for today — built around your weak
            topics, unseen questions, and exam syllabus.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Feature highlights */}
          <div className="space-y-3">
            {[
              {
                icon: Target,
                color: "text-red-500",
                bg: "bg-red-500/10",
                label: "Prioritises your weak topics",
              },
              {
                icon: Sparkles,
                color: "text-[#D4A72C]",
                bg: "bg-[#D4A72C]/10",
                label: "Introduces questions you haven't seen",
              },
              {
                icon: BookOpen,
                color: "text-blue-500",
                bg: "bg-blue-500/10",
                label: "Covers your enrolled exam syllabus",
              },
              {
                icon: RefreshCw,
                color: "text-green-500",
                bg: "bg-green-500/10",
                label: "Resumes where you left off today",
              },
            ].map(({ icon: Icon, color, bg, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}
                >
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Action button */}
          <Button
            onClick={startSession}
            disabled={loading || starting}
            className="w-full bg-[#0B2545] hover:bg-[#163E6B] text-white font-semibold"
          >
            {loading || starting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Building your session…
              </>
            ) : (
              error ? "Try Again" : "Start Daily Practice"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            A fresh session is generated every day at midnight.
          </p>
        </div>
      </div>
    </div>
  );
}
