"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Crown, Clock, Trophy, CheckCircle2, XCircle, AlertCircle, 
  ChevronRight, ChevronLeft, ArrowLeft, RotateCcw, 
  HelpCircle, Zap, ShieldCheck, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { 
  gamesApi, 
  WeeklyQuizQuestionItem, 
  WeeklyQuizSubmitResponse 
} from "@/lib/api/games";

type QuizState = "overview" | "active" | "results";

export default function WeeklyQuizPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Navigation & session state
  const [quizState, setQuizState] = useState<QuizState>("overview");
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<WeeklyQuizQuestionItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [submitResult, setSubmitResult] = useState<WeeklyQuizSubmitResponse | null>(null);
  const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const submitMutationRef = useRef<(() => void) | null>(null);

  // 1. Fetch current weekly quiz
  const { 
    data: quiz, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ["games", "weekly-quiz", "current"],
    queryFn: () => gamesApi.getCurrentWeeklyQuiz(),
    staleTime: 60 * 1000,
  });

  // 2. Fetch past attempt details if student clicks "View Past Result"
  const viewAttemptMutation = useMutation({
    mutationFn: (id: number) => gamesApi.getWeeklyQuizAttempt(id),
    onSuccess: (data) => {
      setSubmitResult(data);
      setQuizState("results");
    },
  });

  // 3. Start Quiz Mutation
  const startQuizMutation = useMutation({
    mutationFn: () => gamesApi.startWeeklyQuiz(),
    onSuccess: (data) => {
      setAttemptId(data.attempt_id);
      setQuestions(data.questions);
      setCurrentIdx(0);
      setSelectedAnswers({});
      const durationSeconds = (data.duration_minutes || 20) * 60;
      setSecondsRemaining(durationSeconds);
      startTimeRef.current = Date.now();
      setQuizState("active");
    },
  });

  // 4. Submit Quiz Mutation
  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      if (!attemptId) throw new Error("No active attempt found.");
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      return gamesApi.submitWeeklyQuiz(attemptId, selectedAnswers, elapsed);
    },
    onSuccess: (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setSubmitResult(data);
      setQuizState("results");
      // Invalidate relevant queries so stats, history, and weekly quiz status stay fresh
      queryClient.invalidateQueries({ queryKey: ["games", "weekly-quiz", "current"] });
      queryClient.invalidateQueries({ queryKey: ["games", "history"] });
      queryClient.invalidateQueries({ queryKey: ["gamification", "player-stats"] });

      // Trigger celebratory confetti if score > 0
      if (data.score > 0) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore confetti error in non-browser env
        }
      }
    },
  });

  useEffect(() => {
    submitMutationRef.current = () => submitQuizMutation.mutate();
  }, [submitQuizMutation]);

  // Timer logic for active quiz
  useEffect(() => {
    if (quizState === "active" && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Auto submit on time out
            if (submitMutationRef.current) submitMutationRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizState, secondsRemaining]);

  const handleSelectOption = (option: string) => {
    const currentQ = questions[currentIdx];
    if (!currentQ) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.question_id]: option,
    }));
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // --- STATE A: Loading Skeleton ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#051024] p-4 md:p-8 text-white">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl bg-white/10" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48 bg-white/10" />
              <Skeleton className="h-4 w-72 bg-white/10" />
            </div>
          </div>
          <Skeleton className="h-80 w-full rounded-2xl bg-white/10" />
        </div>
      </div>
    );
  }

  // --- STATE B: Error State ---
  if (isError || !quiz) {
    return (
      <div className="min-h-screen bg-[#051024] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0B1A38] border border-white/10 rounded-2xl p-8 text-center space-y-5">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Unable to Load Weekly Quiz</h2>
            <p className="text-sm text-blue-200/60 mt-1">
              {(error as Error)?.message || "Could not retrieve the current week's challenge. Please check your connection."}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button 
              variant="outline"
              onClick={() => router.push("/student/games")}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Back to Arena
            </Button>
            <Button 
              onClick={() => refetch()}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- STATE C: RESULTS & REVIEW ---
  if (quizState === "results" && submitResult) {
    const isPassing = submitResult.percentage >= 50;

    return (
      <div className="min-h-screen bg-[#051024] pb-16 text-white">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push("/student/games")}
              className="text-white/70 hover:text-white hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Games Arena
            </Button>
            <span className="text-xs font-semibold px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full">
              Week {quiz.week_number} Result
            </span>
          </div>

          {/* Performance Hero Card */}
          <div className={cn(
            "relative overflow-hidden rounded-2xl border p-6 md:p-8 text-center",
            isPassing 
              ? "bg-gradient-to-br from-emerald-950/60 via-[#0B1A38] to-[#051024] border-emerald-500/30" 
              : "bg-gradient-to-br from-amber-950/40 via-[#0B1A38] to-[#051024] border-amber-500/30"
          )}>
            <div className="inline-flex p-3 rounded-2xl mb-4 bg-white/5 border border-white/10">
              {isPassing ? (
                <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
              ) : (
                <CheckCircle2 className="w-10 h-10 text-blue-400" />
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
              {isPassing ? "Outstanding Performance!" : "Quiz Completed!"}
            </h1>
            <p className="text-sm md:text-base text-blue-200/70 max-w-lg mx-auto mb-6">
              You completed <span className="text-white font-semibold">{quiz.title}</span>. Review your answers and explanations below to solidify your mastery.
            </p>

            {/* Score Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto mb-6">
              <div className="bg-black/30 border border-white/5 p-4 rounded-xl">
                <p className="text-[11px] font-bold text-white/40 uppercase">Score</p>
                <p className="text-2xl font-black text-amber-400 mt-0.5">{submitResult.score} pts</p>
              </div>
              <div className="bg-black/30 border border-white/5 p-4 rounded-xl">
                <p className="text-[11px] font-bold text-white/40 uppercase">Correct</p>
                <p className="text-2xl font-black text-emerald-400 mt-0.5">
                  {submitResult.correct_answers}/{submitResult.total_questions}
                </p>
              </div>
              <div className="bg-black/30 border border-white/5 p-4 rounded-xl">
                <p className="text-[11px] font-bold text-white/40 uppercase">Accuracy</p>
                <p className="text-2xl font-black text-blue-400 mt-0.5">{submitResult.percentage}%</p>
              </div>
              <div className="bg-black/30 border border-white/5 p-4 rounded-xl">
                <p className="text-[11px] font-bold text-white/40 uppercase">XP Awarded</p>
                <p className="text-2xl font-black text-purple-400 mt-0.5">+{submitResult.xp_awarded} XP</p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => router.push("/student/games")}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg"
              >
                Return to Game Arena
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setQuizState("overview");
                  refetch();
                }}
                className="border-white/10 text-white hover:bg-white/5 font-semibold px-6 py-2.5 rounded-xl"
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Take Quiz Again
              </Button>
            </div>
          </div>

          {/* Question-by-Question Review */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" /> Question-by-Question Review
              </h2>
              <span className="text-xs text-white/50">
                {submitResult.review.length} Questions Verified
              </span>
            </div>

            <div className="space-y-4">
              {submitResult.review.map((item, idx) => {
                const isCorrect = item.is_correct;
                const isSkipped = !item.selected_option;

                return (
                  <div 
                    key={item.question_id || idx}
                    className={cn(
                      "bg-[#0B1A38] border rounded-2xl p-5 md:p-6 transition-all",
                      isCorrect 
                        ? "border-emerald-500/20 hover:border-emerald-500/40" 
                        : "border-rose-500/20 hover:border-rose-500/40"
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="text-xs font-bold text-white/40 uppercase tracking-wider">
                        Question {idx + 1}
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full border",
                        isCorrect 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : isSkipped
                          ? "bg-white/5 text-white/60 border-white/10"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}>
                        {isCorrect ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Correct (+10 pts)</>
                        ) : isSkipped ? (
                          <>Skipped (0 pts)</>
                        ) : (
                          <><XCircle className="w-3.5 h-3.5" /> Incorrect (0 pts)</>
                        )}
                      </span>
                    </div>

                    {/* Question Text */}
                    <p className="text-white font-medium text-base mb-4 leading-relaxed">
                      {item.question_text}
                    </p>

                    {/* Option List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-4">
                      {(["A", "B", "C", "D"] as const).map((opt) => {
                        const optKey = `option_${opt.toLowerCase()}` as keyof typeof item;
                        const optText = item[optKey] as string;
                        if (!optText) return null;

                        const isUserChoice = item.selected_option === opt;
                        const isCorrectChoice = item.correct_option === opt;

                        let style = "bg-black/20 border-white/5 text-white/70";
                        if (isCorrectChoice) {
                          style = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold";
                        } else if (isUserChoice && !isCorrect) {
                          style = "bg-rose-500/10 border-rose-500/30 text-rose-300 line-through";
                        }

                        return (
                          <div 
                            key={opt}
                            className={cn(
                              "flex items-center gap-2.5 p-3 rounded-xl border text-sm transition-all",
                              style
                            )}
                          >
                            <span className={cn(
                              "w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border",
                              isCorrectChoice 
                                ? "bg-emerald-500 text-black border-emerald-400 font-black" 
                                : isUserChoice 
                                ? "bg-rose-500 text-white border-rose-400" 
                                : "bg-white/5 text-white/60 border-white/10"
                            )}>
                              {opt}
                            </span>
                            <span className="flex-1">{optText}</span>
                            {isCorrectChoice && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                            {isUserChoice && !isCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Canonical Explanation */}
                    {item.explanation && (
                      <div className="mt-3 bg-blue-500/5 border border-blue-500/15 rounded-xl p-3.5">
                        <p className="text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" /> Explanation
                        </p>
                        <p className="text-xs md:text-sm text-blue-200/80 leading-relaxed">
                          {item.explanation}
                        </p>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // --- STATE D: ACTIVE QUIZ IN PROGRESS ---
  if (quizState === "active" && questions.length > 0) {
    const currentQ = questions[currentIdx];
    const currentSelected = currentQ ? selectedAnswers[currentQ.question_id] : undefined;
    const answeredCount = Object.keys(selectedAnswers).length;
    const isLastQuestion = currentIdx === questions.length - 1;
    const isUrgent = secondsRemaining < 120; // under 2 minutes

    return (
      <div className="min-h-screen bg-[#051024] pb-16 text-white flex flex-col justify-between">
        <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between bg-[#0B1A38] border border-white/10 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-bold text-white line-clamp-1">{quiz.title}</h1>
                <p className="text-[11px] text-white/50">
                  Question {currentIdx + 1} of {questions.length} • {answeredCount} answered
                </p>
              </div>
            </div>

            {/* Timer Badge */}
            <div className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-sm font-black transition-colors",
              isUrgent 
                ? "bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse" 
                : "bg-blue-500/10 border-blue-500/20 text-blue-300"
            )}>
              <Clock className="w-4 h-4" />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
          </div>

          {/* Question Navigation Tracker */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 hide-scrollbar">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(selectedAnswers[q.question_id]);
              const isCurrent = idx === currentIdx;

              return (
                <button
                  key={q.id || idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={cn(
                    "h-8 w-8 rounded-lg text-xs font-bold transition-all shrink-0 border",
                    isCurrent
                      ? "bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      : isAnswered
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-[#0B1A38] text-white/40 border-white/5 hover:border-white/20 hover:text-white"
                  )}
                  title={`Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Active Question Card */}
          {currentQ && (
            <div className="bg-[#0B1A38] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Multiple Choice Question
                </span>
                <span className="text-xs text-white/40">
                  Worth 10 points
                </span>
              </div>

              {/* Question Text */}
              <div className="text-lg md:text-xl font-semibold text-white leading-relaxed">
                {currentQ.question_text}
              </div>

              {/* Options */}
              <div className="space-y-3 pt-2">
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const optKey = `option_${opt.toLowerCase()}` as keyof typeof currentQ;
                  const optText = currentQ[optKey] as string;
                  if (!optText) return null;

                  const isSelected = currentSelected === opt;

                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectOption(opt)}
                      className={cn(
                        "w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group",
                        isSelected
                          ? "bg-blue-600/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                          : "bg-black/20 border-white/10 text-white/80 hover:bg-white/5 hover:border-white/20 hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border transition-colors shrink-0",
                        isSelected
                          ? "bg-blue-600 text-white border-blue-400"
                          : "bg-white/5 text-white/50 border-white/10 group-hover:border-white/20 group-hover:text-white"
                      )}>
                        {opt}
                      </div>
                      <span className="text-sm md:text-base flex-1">{optText}</span>
                    </button>
                  );
                })}
              </div>

              {/* Question Controls */}
              <div className="flex items-center justify-between pt-6 border-t border-white/5 gap-3">
                <Button
                  variant="outline"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  className="border-white/10 text-white/80 hover:bg-white/5 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>

                <div className="flex items-center gap-2">
                  {currentSelected && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelectedAnswers((prev) => {
                          const next = { ...prev };
                          delete next[currentQ.question_id];
                          return next;
                        });
                      }}
                      className="text-xs text-white/40 hover:text-white/70"
                    >
                      Clear
                    </Button>
                  )}

                  {isLastQuestion ? (
                    <Button
                      onClick={() => setIsConfirmingSubmit(true)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 rounded-xl shadow-lg"
                    >
                      Submit Quiz
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 rounded-xl shadow-lg"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Submit Confirmation Modal */}
        {isConfirmingSubmit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0B1A38] border border-white/10 rounded-2xl p-6 md:p-8 max-w-md w-full text-center space-y-5 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Submit Weekly Quiz?</h3>
                <p className="text-sm text-blue-200/60 mt-1">
                  You have answered <span className="text-white font-bold">{answeredCount}</span> of{" "}
                  <span className="text-white font-bold">{questions.length}</span> questions.
                  {answeredCount < questions.length && (
                    <span className="block text-amber-300/80 mt-1">
                      ⚠️ You have {questions.length - answeredCount} unanswered question(s).
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  disabled={submitQuizMutation.isPending}
                  onClick={() => setIsConfirmingSubmit(false)}
                  className="border-white/10 text-white hover:bg-white/5 flex-1"
                >
                  Keep Reviewing
                </Button>
                <Button
                  disabled={submitQuizMutation.isPending}
                  onClick={() => {
                    setIsConfirmingSubmit(false);
                    submitQuizMutation.mutate();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex-1"
                >
                  {submitQuizMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    "Yes, Submit"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // --- STATE E: OVERVIEW / INTRO ---
  const hasAttempted = quiz.has_attempted && quiz.latest_attempt;

  return (
    <div className="min-h-screen bg-[#051024] pb-16 text-white">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/student/games")}
            className="text-white/70 hover:text-white hover:bg-white/5 -ml-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Games Arena
          </Button>
          <span className="text-xs font-semibold px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-full">
            Week {quiz.week_number}, {quiz.year}
          </span>
        </div>

        {/* Featured Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/70 via-[#0B1A38] to-[#051024] border border-indigo-500/30 p-6 md:p-10 shadow-2xl">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[90px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Official Weekly Challenge
              </span>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full">
                Active
              </span>
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                {quiz.title}
              </h1>
              <p className="text-blue-200/70 text-sm md:text-base max-w-2xl mt-2 leading-relaxed">
                {quiz.description || "Compete in this week's approved syllabus challenge. Real questions from the Master Question Bank, instant scoring, and XP progression."}
              </p>
            </div>

            {/* Spec Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-black/30 border border-white/10 p-3.5 rounded-xl">
                <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase mb-1">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-400" /> Questions
                </div>
                <p className="text-xl font-black text-white">{quiz.questions_count || 15} Questions</p>
              </div>

              <div className="bg-black/30 border border-white/10 p-3.5 rounded-xl">
                <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> Time Limit
                </div>
                <p className="text-xl font-black text-white">{quiz.duration_minutes || 20} Minutes</p>
              </div>

              <div className="bg-black/30 border border-white/10 p-3.5 rounded-xl">
                <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase mb-1">
                  <Zap className="w-3.5 h-3.5 text-purple-400" /> XP Reward
                </div>
                <p className="text-xl font-black text-purple-300">+{quiz.xp_reward || 100} XP</p>
              </div>

              <div className="bg-black/30 border border-white/10 p-3.5 rounded-xl">
                <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Source
                </div>
                <p className="text-sm font-bold text-emerald-300 mt-1">Master Question Bank</p>
              </div>
            </div>

            {/* Previous Attempt Banner if student has one */}
            {hasAttempted && (
              <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Completed This Week</p>
                    <p className="text-sm font-semibold text-white">
                      Previous Score: <span className="text-amber-400 font-bold">{quiz.latest_attempt?.score} pts</span> ({quiz.latest_attempt?.correct_answers}/{quiz.latest_attempt?.total_questions} correct)
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  disabled={viewAttemptMutation.isPending}
                  onClick={() => quiz.latest_attempt && viewAttemptMutation.mutate(quiz.latest_attempt.id)}
                  className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 font-semibold"
                >
                  {viewAttemptMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading Review...</>
                  ) : (
                    "View Question Review"
                  )}
                </Button>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                disabled={startQuizMutation.isPending}
                onClick={() => startQuizMutation.mutate()}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-6 rounded-xl shadow-[0_0_25px_rgba(59,130,246,0.3)] transition-all cursor-pointer"
              >
                {startQuizMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Starting Quiz...</>
                ) : hasAttempted ? (
                  <><RotateCcw className="w-5 h-5 mr-2" /> Retake Weekly Quiz</>
                ) : (
                  <>Start Weekly Quiz <ChevronRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Guidelines Card */}
        <div className="bg-[#0B1A38] border border-white/10 rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" /> Challenge Guidelines & Rules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm text-blue-200/70">
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
              <p><strong className="text-white">Strict Timer:</strong> 20-minute countdown starts the moment you click Start. Answers are automatically submitted upon timer expiration.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
              <p><strong className="text-white">Master Question Bank:</strong> Questions are sampled exclusively from verified and approved syllabus material.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
              <p><strong className="text-white">Gamification XP:</strong> Earn up to 100 XP based on your correct answers. XP is added directly to your official profile.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
              <p><strong className="text-white">Detailed Explanations:</strong> Full answer breakdown with official explanations becomes available immediately after submission.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
