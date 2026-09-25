"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { practiceApi } from "@/lib/api/practice";
import { practiceResultKey } from "@/lib/practice-hooks";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2, XCircle, BarChart3, HelpCircle, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { practiceError, PracticeError } from "@/lib/practice-errors";

export default function PracticeResultPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  const idValid = !Number.isNaN(id);
  const [activeFilter, setActiveFilter] = useState<'all' | 'mistakes' | 'correct'>('all');

  // Finishing a session already returned this exact payload and seeds the
  // cache (see the Finish handlers), so the result normally renders at once
  // with no second request. Opening the URL directly fetches it.
  const resultQuery = useQuery({
    queryKey: practiceResultKey(id),
    queryFn: () => practiceApi.getSessionResult(id),
    enabled: idValid,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const result = resultQuery.data ?? null;
  const loading = resultQuery.isLoading;
  const error: PracticeError | null = !idValid
    ? { kind: "unavailable", message: "This practice session is no longer available.", retryable: false }
    : resultQuery.isError
      ? practiceError(resultQuery.error, "result")
      : null;
  const loadResult = () => resultQuery.refetch();

  // Only the result area shows loading / failure; the page frame stays.
  if (loading || error || !result) {
    return (
      <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-8">
        <Link href="/student/practice" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary dark:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Practice
        </Link>
        <h1 className="text-[28px] font-bold text-primary dark:text-foreground tracking-tight">Practice Result</h1>
        {error ? (
          <div className="bg-card rounded-[16px] border border-border shadow-sm p-10 text-center space-y-4" role="alert">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" aria-hidden="true" />
            <p className="font-semibold text-primary dark:text-foreground">{error.message}</p>
            {error.retryable && <Button variant="outline" onClick={loadResult}>Retry</Button>}
          </div>
        ) : (
          <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading your result">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-24 rounded-[14px] bg-muted" />)}
            </div>
            <div className="h-64 rounded-[14px] bg-muted" />
          </div>
        )}
      </div>
    );
  }

  const { session, attempts } = result;

  const totalMistakes = attempts.filter((a) => !a.is_correct).length;
  const totalCorrect = attempts.filter((a) => a.is_correct).length;

  const handleReviewMistakes = () => {
    if (totalMistakes === 0) {
      alert("Great job! You made zero mistakes in this session.");
      return;
    }
    setActiveFilter((prev) => (prev === "mistakes" ? "all" : "mistakes"));
    setTimeout(() => {
      document.getElementById("detailed-review")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handlePracticeAgain = () => {
    const query = new URLSearchParams({
      exam: session.exam ? String(session.exam) : "all",
      subject: session.subject ? String(session.subject) : "all",
      topic: session.topic ? String(session.topic) : "all",
      diff: session.difficulty || "all",
      q: String(session.total_questions || 20),
      mode: session.mode || "flexible",
    });
    router.push(`/student/practice/session?${query.toString()}`);
  };

  const displayedAttempts = attempts
    .map((attempt, originalIndex) => ({ attempt, originalIndex }))
    .filter(({ attempt }) => {
      if (activeFilter === "mistakes") return !attempt.is_correct;
      if (activeFilter === "correct") return attempt.is_correct;
      return true;
    });

  return (
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-8 animate-in fade-in-50 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/student/practice" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary dark:text-foreground transition-colors mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Practice
          </Link>
          <h1 className="text-[28px] font-bold text-primary dark:text-foreground tracking-tight">Practice Result</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Session completed on {new Date(session.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
           <Button 
             variant={activeFilter === "mistakes" ? "default" : "outline"}
             onClick={handleReviewMistakes}
             className={activeFilter === "mistakes" ? "bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm" : "border-border hover:border-red-400 font-semibold"}
           >
             <XCircle className="w-4 h-4 mr-1.5" />
             {activeFilter === "mistakes" ? `Showing Mistakes (${totalMistakes})` : `Review Mistakes (${totalMistakes})`}
           </Button>
           <Button 
             onClick={handlePracticeAgain}
             className="bg-primary text-primary-foreground hover:bg-[#163E6B] font-semibold"
           >
             <RotateCcw className="w-4 h-4 mr-1.5" />
             Practice Again
           </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-[16px] border border-border shadow-sm text-center">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Accuracy</div>
          <div className="text-3xl font-black text-primary dark:text-foreground">{Math.round(session.accuracy || 0)}%</div>
        </div>
        <div className="bg-card p-5 rounded-[16px] border border-border shadow-sm text-center">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Score</div>
          <div className="text-3xl font-black text-green-600">{session.correct_count} <span className="text-lg text-muted-foreground font-medium">/ {session.total_questions}</span></div>
        </div>
        <div className="bg-card p-5 rounded-[16px] border border-border shadow-sm text-center">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Time Taken</div>
          <div className="text-3xl font-black text-[#D4A72C]">
            {Math.floor((session.time_taken_seconds || 0) / 60)}m {(session.time_taken_seconds || 0) % 60}s
          </div>
        </div>
        <div className="bg-card p-5 rounded-[16px] border border-border shadow-sm text-center">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">XP Earned</div>
          <div className="text-3xl font-black text-purple-600">+{session.correct_count * 10}</div>
        </div>
      </div>

      {/* Detailed Review */}
      <div id="detailed-review" className="bg-card rounded-[16px] border border-border shadow-sm overflow-hidden scroll-mt-6">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-primary dark:text-foreground text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#D4A72C]" /> Detailed Review
            </h3>
            {activeFilter === "mistakes" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing {totalMistakes} incorrect or unanswered question{totalMistakes === 1 ? "" : "s"}.
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-muted/80 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeFilter === "all"
                  ? "bg-card text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({attempts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("mistakes")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                activeFilter === "mistakes"
                  ? "bg-red-500 text-white shadow-sm font-bold"
                  : "text-muted-foreground hover:text-red-500"
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Mistakes ({totalMistakes})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("correct")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                activeFilter === "correct"
                  ? "bg-green-600 text-white shadow-sm font-bold"
                  : "text-muted-foreground hover:text-green-600"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Correct ({totalCorrect})
            </button>
          </div>
        </div>

        {displayedAttempts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
            <p className="font-semibold text-foreground">
              {activeFilter === "mistakes"
                ? "No mistakes in this session! You answered everything correctly."
                : "No questions match the current filter."}
            </p>
            <Button variant="outline" size="sm" onClick={() => setActiveFilter("all")}>
              Show All Questions
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayedAttempts.map(({ attempt, originalIndex }) => {
               const isCorrect = attempt.is_correct;
               const isUnanswered = attempt.selected_option === null;
               
               return (
                 <div key={attempt.attempt_id} className="p-6 hover:bg-muted/50 transition-colors">
                   <div className="flex gap-4">
                     <div className="shrink-0 mt-1">
                       {isCorrect ? (
                         <CheckCircle2 className="w-6 h-6 text-green-500" />
                       ) : isUnanswered ? (
                         <div className="w-6 h-6 rounded-full border-2 border-border bg-muted/80 flex items-center justify-center">
                           <div className="w-2 h-2 rounded-full bg-secondary"></div>
                         </div>
                       ) : (
                         <XCircle className="w-6 h-6 text-red-500" />
                       )}
                     </div>
                     <div className="flex-1 space-y-4">
                       <div>
                         <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Question {originalIndex + 1}</span>
                         <h4 className="text-[16px] font-medium text-primary dark:text-foreground mt-1">{attempt.question.text}</h4>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {['a', 'b', 'c', 'd'].map(opt => {
                           const optText = attempt.question[`option_${opt}` as keyof typeof attempt.question];
                           const isSelected = attempt.selected_option?.toLowerCase() === opt;
                           // correct_option comes back uppercase from the API; selected_option and opt are lowercase.
                           const isActuallyCorrect = attempt.question.correct_option?.toLowerCase() === opt;
                           
                           let bg = "bg-card border-border";
                           let text = "text-muted-foreground";
                           let indicator = null;

                           if (isSelected && isActuallyCorrect) {
                             bg = "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50";
                             text = "text-green-800 font-medium";
                             indicator = <CheckCircle2 className="w-4 h-4 text-green-600" />;
                           } else if (isSelected && !isActuallyCorrect) {
                             bg = "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50";
                             text = "text-red-800 font-medium";
                             indicator = <XCircle className="w-4 h-4 text-red-600" />;
                           } else if (isActuallyCorrect) {
                             bg = "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 border-dashed";
                             text = "text-green-800 font-medium";
                             indicator = <CheckCircle2 className="w-4 h-4 text-green-600" />;
                           }

                           return (
                             <div key={opt} className={`flex items-center justify-between p-3 rounded-[10px] border ${bg} ${text}`}>
                               <div className="flex items-center gap-3">
                                 <span className="font-bold text-xs uppercase opacity-50">{opt}</span>
                                 <span className="text-[14px]">{optText as string}</span>
                               </div>
                               {indicator}
                             </div>
                           )
                         })}
                       </div>
                       
                       {attempt.question.explanation && (
                         <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-[10px] p-4 text-sm text-blue-800">
                           <strong>Explanation:</strong> {attempt.question.explanation}
                         </div>
                       )}

                       {!isCorrect && (
                         <Link
                           href={`/student/community/ask?question_id=${attempt.question.id}&question_text=${encodeURIComponent(attempt.question.text)}&question_type=mcq${(['a', 'b', 'c', 'd'] as const).map(opt => {
                             const optText = attempt.question[`option_${opt}` as keyof typeof attempt.question];
                             return optText ? `&option_${opt}=${encodeURIComponent(optText as string)}` : "";
                           }).join("")}${result.session.topic ? `&topic_id=${result.session.topic}` : ""}`}
                           className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                         >
                           <HelpCircle className="w-3.5 h-3.5" /> Still confused? Ask the Community
                         </Link>
                       )}
                     </div>
                   </div>
                 </div>
               )
            })}
          </div>
        )}
      </div>

      {/* Revision Mode Banner */}
      {totalMistakes > 0 && (
        <div className="p-5 rounded-[16px] border border-[#D4A72C]/30 bg-[#D4A72C]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4A72C]" /> Turn these mistakes into strengths
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Practice questions picked from your weak spots and recent mistakes in focused Revision mode.
            </p>
          </div>
          <Button asChild size="sm" className="bg-[#D4A72C] hover:bg-[#c29624] text-white shrink-0 font-semibold">
            <Link href="/student/practice/revision?focus=recent_mistakes">
              Open Revision Mode →
            </Link>
          </Button>
        </div>
      )}

    </div>
  );
}
