"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Target, Clock, Flame, Trophy, CheckCircle2, XCircle, AlertCircle, 
  ArrowLeft, ChevronRight, ChevronLeft, BookOpen, Zap, Loader2, 
  HelpCircle, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { 
  gamesApi, 
  DailyDrillSession, 
  DailyDrillCompleteResponse,
  DailyDrillTodayResponse
} from "@/lib/api/games";

type DrillViewMode = "overview" | "active" | "results";

export default function DailyDrillPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Navigation & session state
  const [viewMode, setViewMode] = useState<DrillViewMode>("overview");
  const [session, setSession] = useState<DailyDrillSession | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [completeResult, setCompleteResult] = useState<DailyDrillCompleteResponse | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "mistakes">("all");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoCompletedRef = useRef(false);

  // 1. Fetch today's Daily Drill status
  const { 
    data: todayData, 
    isLoading: loadingToday, 
    isError: errorToday,
    error: todayError,
    refetch: refetchToday
  } = useQuery<DailyDrillTodayResponse>({
    queryKey: ["games", "daily-drill", "today"],
    queryFn: () => gamesApi.getDailyDrillToday(),
    staleTime: 30 * 1000,
  });

  // Sync state if session exists
  useEffect(() => {
    if (todayData?.exists && todayData.session) {
      setSession(todayData.session);
      if (todayData.session.status === "COMPLETED") {
        // If completed, prepare complete result review
        const reviewItems = todayData.session.questions.map((q) => ({
          id: q.id,
          order: q.order,
          question_id: q.question_id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          selected_option: q.selected_option,
          correct_option: q.correct_option || "A",
          is_correct: Boolean(q.is_correct),
          explanation: q.explanation || "",
          hint: q.hint || "",
          answered_at: q.answered_at,
        }));

        setCompleteResult({
          session_id: todayData.session.id,
          status: "COMPLETED",
          score: todayData.session.score,
          correct_answers: todayData.session.correct_answers,
          total_questions: todayData.session.total_questions,
          accuracy: todayData.session.accuracy,
          time_taken_seconds: todayData.session.time_taken_seconds,
          xp_awarded: todayData.session.xp_awarded,
          current_streak: 1,
          completed_at: todayData.session.completed_at || new Date().toISOString(),
          review: reviewItems,
        });
      }
    }
  }, [todayData]);

  // 2. Start / Resume Drill Mutation
  const startDrillMutation = useMutation({
    mutationFn: () => gamesApi.startDailyDrill(),
    onSuccess: (data) => {
      setSession(data);
      setCurrentIdx(0);
      setSecondsRemaining(Math.max(0, data.remaining_seconds || 300));
      autoCompletedRef.current = false;
      if (data.status === "COMPLETED") {
        setViewMode("results");
      } else {
        setViewMode("active");
      }
    },
  });

  // 3. Answer Mutation
  const answerMutation = useMutation({
    mutationFn: async ({ questionId, option }: { questionId: number; option: string }) => {
      if (!session) throw new Error("No active drill session.");
      return gamesApi.submitDailyDrillAnswer(session.id, questionId, option);
    },
    onSuccess: (feedback, variables) => {
      if (!session) return;
      // Update local question item with immediate feedback
      setSession((prev) => {
        if (!prev) return prev;
        const updatedQuestions = prev.questions.map((q) => {
          if (q.question_id === variables.questionId) {
            return {
              ...q,
              selected_option: variables.option,
              is_answered: true,
              is_correct: feedback.is_correct,
              correct_option: feedback.correct_option,
              explanation: feedback.explanation,
              hint: feedback.hint,
            };
          }
          return q;
        });

        return {
          ...prev,
          score: feedback.current_score,
          correct_answers: feedback.correct_answers,
          answered_count: feedback.answered_count,
          questions: updatedQuestions,
        };
      });
    },
  });

  // 4. Complete Mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No active session.");
      return gamesApi.completeDailyDrill(session.id);
    },
    onSuccess: (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setCompleteResult(data);
      setViewMode("results");

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["games", "daily-drill", "today"] });
      queryClient.invalidateQueries({ queryKey: ["gamification", "player-stats"] });
      queryClient.invalidateQueries({ queryKey: ["games", "history"] });

      if (data.score > 0) {
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore confetti errors in unsupported environments
        }
      }
    },
  });

  // Timer countdown management
  useEffect(() => {
    if (viewMode === "active" && session && session.status === "IN_PROGRESS") {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            if (!autoCompletedRef.current) {
              autoCompletedRef.current = true;
              completeMutation.mutate();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewMode, session]);

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentQuestion = session?.questions[currentIdx];

  // Handler for picking an answer
  const handleSelectOption = (option: string) => {
    if (!currentQuestion || currentQuestion.is_answered || answerMutation.isPending) return;
    answerMutation.mutate({ questionId: currentQuestion.question_id, option });
  };

  // Filtered review questions
  const filteredReview = completeResult?.review.filter((item) => {
    if (reviewFilter === "mistakes") return !item.is_correct;
    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-[#051024] text-white">
      {/* 
        ========================================================================
        Top Navigation Bar
        ========================================================================
      */}
      <div className="bg-[#0B1A38] border-b border-white/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (viewMode === "active") {
                  setShowExitConfirm(true);
                } else {
                  router.push("/student/games");
                }
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                  Daily Drill
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    5 Min
                  </span>
                </h1>
              </div>
            </div>
          </div>

          {/* Active Timer in Header */}
          {viewMode === "active" && (
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border transition-colors",
                secondsRemaining < 60
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              )}>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(secondsRemaining)}</span>
              </div>

              <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>{session?.score || 0} pts</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 
        ========================================================================
        VIEW 1: OVERVIEW / LANDING
        ========================================================================
      */}
      {viewMode === "overview" && (
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
          {loadingToday ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full bg-[#0B1A38] rounded-2xl" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full bg-[#0B1A38] rounded-xl" />
                <Skeleton className="h-24 w-full bg-[#0B1A38] rounded-xl" />
              </div>
            </div>
          ) : errorToday ? (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <h2 className="text-base font-bold text-white mb-1">Unable to Load Today&apos;s Drill</h2>
              <p className="text-xs text-rose-200/70 mb-4">
                {(todayError as any)?.message || "Please check your network connection and try again."}
              </p>
              <Button onClick={() => refetchToday()} size="sm" className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl">
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Hero Card */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1A38] p-6 md:p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <Flame className="w-3 h-3 text-emerald-400" />
                      Daily Learning Routine
                    </span>
                    {session?.status === "COMPLETED" && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Completed Today
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
                    Today&apos;s Daily Drill
                  </h2>
                  <p className="text-xs md:text-sm text-blue-100/70 leading-relaxed mb-6 max-w-xl">
                    A rapid 5-minute question set calibrated to your preparation course. 
                    Answers reveal immediate feedback with explanations to strengthen your weak topics and maintain your learning streak.
                  </p>

                  {/* Course Context Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-xs font-semibold text-white/80 mb-6">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    <span>Course: <strong className="text-white">{session?.course_title || todayData?.course_title || "Loksewa Syllabus"}</strong></span>
                    <span className="text-white/30">•</span>
                    <span className="text-emerald-400">{session?.focus_label || "Syllabus Mixed"}</span>
                  </div>

                  {/* Key Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                      <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-bold uppercase mb-1">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>Duration</span>
                      </div>
                      <div className="text-base font-bold text-white">5 Minutes</div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                      <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-bold uppercase mb-1">
                        <Target className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Questions</span>
                      </div>
                      <div className="text-base font-bold text-white">5–10 MCQs</div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                      <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-bold uppercase mb-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Rewards</span>
                      </div>
                      <div className="text-base font-bold text-white">+45 XP</div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                      <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-bold uppercase mb-1">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        <span>Streak</span>
                      </div>
                      <div className="text-base font-bold text-white">+1 Day</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div>
                    {session?.status === "COMPLETED" ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>You&apos;ve completed today&apos;s drill! Score: {session.score} pts ({session.correct_answers}/{session.total_questions} correct).</span>
                        </div>
                        <Button
                          onClick={() => setViewMode("results")}
                          size="lg"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-6 cursor-pointer shadow-lg"
                        >
                          View Result & Review Answers <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    ) : session?.status === "IN_PROGRESS" ? (
                      <Button
                        onClick={() => {
                          setSecondsRemaining(Math.max(0, session.remaining_seconds));
                          setViewMode("active");
                        }}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-6 cursor-pointer shadow-lg"
                      >
                        Resume Daily Drill ({session.answered_count}/{session.total_questions} Answered) <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => startDrillMutation.mutate()}
                        disabled={startDrillMutation.isPending}
                        size="lg"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl px-8 cursor-pointer shadow-lg"
                      >
                        {startDrillMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing Drill...
                          </>
                        ) : (
                          <>
                            Start Daily Drill <ChevronRight className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 
        ========================================================================
        VIEW 2: ACTIVE DRILL
        ========================================================================
      */}
      {viewMode === "active" && currentQuestion && (
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Progress Tracker */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-white/60">
              <span>Question {currentIdx + 1} of {session?.total_questions || 10}</span>
              <span>{Math.round(((session?.answered_count || 0) / (session?.total_questions || 1)) * 100)}% Answered</span>
            </div>
            <div className="h-2 w-full bg-[#0B1A38] rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(((session?.answered_count || 0) / (session?.total_questions || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="p-6 md:p-8 rounded-2xl bg-[#0B1A38] border border-white/10 relative shadow-xl">
            {/* Focus indicator if available */}
            {session?.focus_type === "weak_areas" && currentIdx < 4 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
                <Target className="w-3 h-3" /> Focus Question
              </span>
            )}

            <h3 className="text-base md:text-lg font-bold text-white leading-relaxed mb-6">
              {currentQuestion.question_text}
            </h3>

            {/* Hint Box (Optional, only if available) */}
            {currentQuestion.hint && !currentQuestion.is_answered && (
              <div className="mb-6">
                {!showHint ? (
                  <button
                    onClick={() => setShowHint(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Need a hint?
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200/80 leading-relaxed">
                    <strong className="text-blue-300">Hint: </strong> {currentQuestion.hint}
                  </div>
                )}
              </div>
            )}

            {/* Options List */}
            <div className="space-y-3">
              {[
                { key: "A", text: currentQuestion.option_a },
                { key: "B", text: currentQuestion.option_b },
                { key: "C", text: currentQuestion.option_c },
                { key: "D", text: currentQuestion.option_d },
              ].map((opt) => {
                const isSelected = currentQuestion.selected_option === opt.key;
                const isAnswered = currentQuestion.is_answered;
                const isCorrect = currentQuestion.correct_option === opt.key;

                let optClass = "border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/20 text-white/90";
                
                if (isAnswered) {
                  if (isSelected && isCorrect) {
                    optClass = "border-emerald-500 bg-emerald-500/20 text-emerald-200";
                  } else if (isSelected && !isCorrect) {
                    optClass = "border-rose-500 bg-rose-500/20 text-rose-200";
                  } else if (isCorrect) {
                    optClass = "border-emerald-500/60 bg-emerald-500/10 text-emerald-300";
                  } else {
                    optClass = "border-white/5 bg-black/10 opacity-50 text-white/40";
                  }
                }

                return (
                  <button
                    key={opt.key}
                    disabled={isAnswered || answerMutation.isPending}
                    onClick={() => handleSelectOption(opt.key)}
                    className={cn(
                      "w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer disabled:cursor-default",
                      optClass
                    )}
                  >
                    <span className={cn(
                      "h-6 w-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border",
                      isSelected && isCorrect ? "bg-emerald-500 text-white border-emerald-400" :
                      isSelected && !isCorrect ? "bg-rose-500 text-white border-rose-400" :
                      isCorrect && isAnswered ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                      "bg-white/5 text-white/70 border-white/10"
                    )}>
                      {opt.key}
                    </span>

                    <span className="text-xs md:text-sm font-medium leading-relaxed flex-1">
                      {opt.text}
                    </span>

                    {/* Feedback Icon */}
                    {isAnswered && (
                      <div className="shrink-0 ml-2">
                        {isSelected && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400" />}
                        {!isSelected && isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Immediate Explanation Box (Only if answered and explanation exists) */}
            {currentQuestion.is_answered && currentQuestion.explanation && (
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Explanation</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIdx === 0}
              onClick={() => {
                setCurrentIdx((i) => Math.max(0, i - 1));
                setShowHint(false);
              }}
              className="border-white/10 bg-[#0B1A38] text-white hover:bg-white/5 rounded-xl text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
            </Button>

            {currentIdx < (session?.questions.length || 1) - 1 ? (
              <Button
                size="sm"
                onClick={() => {
                  setCurrentIdx((i) => i + 1);
                  setShowHint(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs px-4 cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs px-5 cursor-pointer shadow-lg"
              >
                {completeMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Completing...
                  </>
                ) : (
                  <>
                    Finish Drill <Check className="w-3.5 h-3.5 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        VIEW 3: RESULTS & REVIEW
        ========================================================================
      */}
      {viewMode === "results" && completeResult && (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* Summary Card */}
          <div className="p-6 md:p-8 rounded-2xl bg-[#0B1A38] border border-white/10 relative overflow-hidden text-center shadow-xl">
            <div className="absolute top-0 right-1/2 translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
                <Trophy className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight mb-1">
                Daily Drill Complete!
              </h2>
              <p className="text-xs text-blue-200/70 mb-6">
                You have successfully completed today&apos;s challenge and reinforced your study streak.
              </p>

              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto mb-6">
                <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[10px] font-bold text-white/40 uppercase block mb-1">Score</span>
                  <span className="text-lg font-bold text-white">{completeResult.score} pts</span>
                </div>

                <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[10px] font-bold text-white/40 uppercase block mb-1">Accuracy</span>
                  <span className="text-lg font-bold text-emerald-400">{completeResult.accuracy}%</span>
                </div>

                <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[10px] font-bold text-white/40 uppercase block mb-1">XP Earned</span>
                  <span className="text-lg font-bold text-purple-300">+{completeResult.xp_awarded} XP</span>
                </div>

                <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[10px] font-bold text-white/40 uppercase block mb-1">Streak</span>
                  <span className="text-lg font-bold text-orange-400">🔥 Active</span>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => router.push("/student/games")}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs px-5 cursor-pointer"
                >
                  Back to Games
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/student/syllabus")}
                  className="border-white/10 bg-[#0B1A38] text-white hover:bg-white/5 rounded-xl text-xs"
                >
                  Go to Syllabus
                </Button>
              </div>
            </div>
          </div>

          {/* Question Review Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Question Review</h3>
                <p className="text-xs text-white/40">Review questions, answers, and explanations</p>
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0B1A38] border border-white/10">
                <button
                  onClick={() => setReviewFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
                    reviewFilter === "all" ? "bg-emerald-600 text-white" : "text-white/60 hover:text-white"
                  )}
                >
                  All ({completeResult.review.length})
                </button>
                <button
                  onClick={() => setReviewFilter("mistakes")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
                    reviewFilter === "mistakes" ? "bg-rose-600 text-white" : "text-white/60 hover:text-white"
                  )}
                >
                  Mistakes ({completeResult.review.filter((r) => !r.is_correct).length})
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              {filteredReview.map((item, idx) => (
                <div 
                  key={item.question_id}
                  className="p-5 rounded-2xl bg-[#0B1A38] border border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-white/50">Q{idx + 1}</span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      item.is_correct
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {item.is_correct ? "Correct (+10 pts)" : "Incorrect"}
                    </span>
                  </div>

                  <p className="text-xs md:text-sm font-semibold text-white leading-relaxed">
                    {item.question_text}
                  </p>

                  {/* Options Mini Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { key: "A", text: item.option_a },
                      { key: "B", text: item.option_b },
                      { key: "C", text: item.option_c },
                      { key: "D", text: item.option_d },
                    ].map((opt) => {
                      const isChosen = item.selected_option === opt.key;
                      const isCorrect = item.correct_option === opt.key;

                      let c = "border-white/5 bg-black/20 text-white/60";
                      if (isCorrect) c = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-semibold";
                      if (isChosen && !isCorrect) c = "border-rose-500/40 bg-rose-500/10 text-rose-300 font-semibold";

                      return (
                        <div key={opt.key} className={cn("p-2 rounded-lg border flex items-center gap-2", c)}>
                          <span className="font-bold">{opt.key}.</span>
                          <span className="truncate">{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation if available */}
                  {item.explanation && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-white/70 space-y-1">
                      <div className="flex items-center gap-1 font-bold text-emerald-400">
                        <BookOpen className="w-3 h-3" />
                        <span>Explanation</span>
                      </div>
                      <p>{item.explanation}</p>
                    </div>
                  )}
                </div>
              ))}

              {filteredReview.length === 0 && (
                <div className="p-8 text-center rounded-2xl bg-[#0B1A38] border border-white/10 text-white/60 text-xs">
                  {reviewFilter === "mistakes" ? "Great job! You made zero mistakes in this drill." : "No questions found."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0B1A38] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Exit Daily Drill?</h3>
                <p className="text-xs text-white/60">Your progress is automatically saved.</p>
              </div>
            </div>

            <p className="text-xs text-blue-100/70 leading-relaxed">
              You can resume this drill anytime today. Note that the 5-minute timer continues running in the background.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExitConfirm(false)}
                className="border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl text-xs"
              >
                Continue Drill
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowExitConfirm(false);
                  setViewMode("overview");
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
              >
                Exit Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
