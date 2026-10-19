"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, LayoutGrid, Loader2, Check, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studentExamsApi, isSubjectiveQuestionType } from "@/lib/api/student-exams";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { SubjectiveExamAttemptView } from "@/components/student/exams/SubjectiveExamAttemptView";


export default function ExamAttemptPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { beginExamFocus, endExamFocus } = useFocusMode();

  const params = useParams<{ id: string; attemptId: string }>();
  const attemptId = Number(params.attemptId);
  const examId = Number(params.id);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<number, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAnswerSeqRef = useRef<Record<number, number>>({});

  // Fetch attempt details (which gives started_at and status)
  const { data: attempt, isLoading: isLoadingAttempt } = useQuery({
    queryKey: ['student-attempt', attemptId],
    queryFn: () => studentExamsApi.getAttempt(attemptId),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch exam details for time limit
  const { data: exam, isLoading: isLoadingExam } = useQuery({
    queryKey: ['student-exam', examId],
    queryFn: () => studentExamsApi.getExamDetails(examId),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch questions
  const { data: questions, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['student-attempt-questions', attemptId],
    queryFn: () => studentExamsApi.getAttemptQuestions(attemptId),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const executeSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    // Build complete array of current in-memory answers to send in submit payload
    const payloadAnswers: Array<{ question_id: number; selected_option?: string | null; answer_text?: string }> = [];
    if (questions) {
      questions.forEach((q: any, idx: number) => {
        const sel = answers[idx] ?? null;
        const txt = textAnswers[idx] ?? '';
        if (sel !== null || (txt && txt.trim().length > 0)) {
          payloadAnswers.push({
            question_id: q.id,
            selected_option: sel,
            answer_text: txt,
          });
        }
      });
    }

    try {
      const res = await studentExamsApi.submitAttempt(attemptId, { answers: payloadAnswers });
      toast.success(res?.already_submitted ? "Exam submission confirmed!" : "Exam submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
      queryClient.invalidateQueries({ queryKey: ["student-exam", examId] });
      router.replace(`/student/exams/${examId}/result/${attemptId}`);
    } catch (err: any) {
      console.warn("Submit attempt initial request failed, verifying attempt state:", err);
      // Attempt verification: check if server committed the submission despite network drop
      try {
        const state = await studentExamsApi.getAttemptState(attemptId);
        if (state && state.status && state.status !== 'in-progress') {
          toast.success("Exam submission confirmed!");
          queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
          router.replace(`/student/exams/${examId}/result/${attemptId}`);
          return;
        }
      } catch (checkErr) {
        console.warn("Attempt status check failed:", checkErr);
      }

      setIsSubmitting(false);
      const msg = err?.data?.detail || err?.message || "Failed to submit exam. Please try again.";
      toast.error(msg);
    }
  }, [isSubmitting, questions, answers, textAnswers, attemptId, examId, queryClient, router]);

  // Initialize state from attempt data
  useEffect(() => {
    if (attempt && attempt.answers) {
      const initialAnswers: Record<number, string> = {};
      const initialTextAnswers: Record<number, string> = {};

      // If we have questions loaded, map the saved answers to their indices
      if (questions) {
        attempt.answers.forEach((ans: any) => {
          const qIdx = questions.findIndex((q: any) => q.id === ans.question);
          if (qIdx === -1) return;
          if (ans.selected_option) initialAnswers[qIdx] = ans.selected_option;
          if (ans.answer_text) initialTextAnswers[qIdx] = ans.answer_text;
        });
        setAnswers(initialAnswers);
        setTextAnswers(initialTextAnswers);
      }
    }
  }, [attempt, questions]);

  // Handle server-authoritative timer with clock skew correction
  useEffect(() => {
    if (attempt && exam && attempt.status === 'in-progress') {
      const serverSkewMs = attempt.server_time
        ? new Date(attempt.server_time).getTime() - Date.now()
        : 0;
      const startedAt = new Date(attempt.started_at).getTime();
      const timeLimitMs = exam.time_limit * 60 * 1000;
      const deadline = attempt.expires_at
        ? new Date(attempt.expires_at).getTime()
        : startedAt + timeLimitMs;
      
      const updateTimer = () => {
        const now = Date.now() + serverSkewMs;
        const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
        setTimeLeft(remaining);
        
        if (remaining === 0 && !isSubmitting) {
          toast("Time is up! Submitting exam...", { icon: '⏳' });
          executeSubmit();
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [attempt, exam, isSubmitting, executeSubmit]);

  // Activate Focus Mode / DND during exam
  useEffect(() => {
    if (attempt && attempt.status === 'in-progress') {
      beginExamFocus({ attemptId, examinationId: examId });
    }
    return () => {
      endExamFocus();
    };
  }, [attempt, attemptId, examId, beginExamFocus, endExamFocus]);

  // Protect against accidental closing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (attempt?.status === 'in-progress') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attempt]);


  if (isLoadingAttempt || isLoadingQuestions || isLoadingExam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading exam environment...</p>
        </div>
      </div>
    );
  }

  // Dedicated Subjective Examination View
  if (exam?.exam_type === 'subjective') {
    return (
      <SubjectiveExamAttemptView
        examId={examId}
        attemptId={attemptId}
        examTitle={exam.title}
        onFinish={() => {
          queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
          router.replace(`/student/exams/${examId}/result/${attemptId}`);
        }}
      />
    );
  }

  if (attempt?.status !== 'in-progress') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold">Exam Already Submitted</h2>
          <p className="text-muted-foreground">This exam attempt has already been completed or submitted.</p>
          <Button onClick={() => router.replace(`/student/exams/${examId}/result/${attemptId}`)}>
            View Results
          </Button>
        </div>
      </div>
    );
  }

  const totalQuestions = questions?.length || 0;
  if (totalQuestions === 0 || !questions) return <div>No questions found for this exam.</div>;

  const question = questions[currentIdx];
  if (!question) return <div>Question not found.</div>;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionLetter: string) => {
    const qid = question.id;
    const seq = (lastAnswerSeqRef.current[qid] || 0) + 1;
    lastAnswerSeqRef.current[qid] = seq;

    setAnswers(prev => ({ ...prev, [currentIdx]: optionLetter }));
    setSaveStatus("saving");

    // Autosave with debounce and sequence tracking
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await studentExamsApi.saveAnswer(attemptId, qid, optionLetter);
        if (lastAnswerSeqRef.current[qid] === seq) {
          setSaveStatus("saved");
        }
      } catch (err) {
        console.warn("Autosave answer transient error:", err);
        setSaveStatus("error");
      }
    }, 400);
  };

  const handleTextAnswerChange = (text: string) => {
    const qid = question.id;
    const seq = (lastAnswerSeqRef.current[qid] || 0) + 1;
    lastAnswerSeqRef.current[qid] = seq;

    setTextAnswers(prev => ({ ...prev, [currentIdx]: text }));
    setSaveStatus("saving");

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await studentExamsApi.saveAnswerText(attemptId, qid, text);
        if (lastAnswerSeqRef.current[qid] === seq) {
          setSaveStatus("saved");
        }
      } catch (err) {
        console.warn("Autosave text transient error:", err);
        setSaveStatus("error");
      }
    }, 600);
  };

  const toggleReviewMark = () => {
    setMarkedForReview({ ...markedForReview, [currentIdx]: !markedForReview[currentIdx] });
  };

  const handleSubmit = () => {
    setIsSubmitDialogOpen(false);
    executeSubmit();
  };

  const isAnsweredAt = (idx: number) =>
    answers[idx] !== undefined || (textAnswers[idx] !== undefined && textAnswers[idx].trim().length > 0);
  const answeredCount = questions.reduce((n, _q, idx) => n + (isAnsweredAt(idx) ? 1 : 0), 0);
  const reviewCount = Object.values(markedForReview).filter(Boolean).length;
  const optionsMap = ['A', 'B', 'C', 'D'];
  const isSubjective = isSubjectiveQuestionType(question.question_type);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-bold text-lg hidden sm:block">{exam?.title}</h1>
            <h1 className="font-bold text-base sm:hidden">Exam</h1>
          </div>
          {saveStatus === "saving" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" /> Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium" role="status">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium" role="status" title="Answers are stored in memory and will sync automatically on submission">
              <CloudOff className="h-3.5 w-3.5" aria-hidden="true" /> Pending Sync
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
          <div className={cn(
            "flex items-center gap-2 font-mono text-xl font-bold bg-muted/50 px-4 py-2 rounded-lg border",
            (timeLeft || 0) < 300 ? "text-destructive border-destructive/50 bg-destructive/10 animate-pulse" : "border-border"
          )}>
            <Clock className="h-5 w-5" />
            {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </div>
          <Button 
            onClick={() => setIsSubmitDialogOpen(true)} 
            variant="destructive" 
            className="hidden sm:flex"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Submitting...
              </span>
            ) : (
              "Submit Exam"
            )}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <main className="flex-1 flex flex-col overflow-y-auto">
          <div className="p-4 md:p-8 flex-1 max-w-4xl mx-auto w-full flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-border/50">
              <span className="text-lg font-bold bg-muted px-4 py-1.5 rounded-full">
                Question {currentIdx + 1} <span className="text-muted-foreground font-normal text-sm">of {totalQuestions}</span>
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleReviewMark}
                className={cn(
                  "gap-2 transition-colors", 
                  markedForReview[currentIdx] ? "border-amber-500 text-amber-500 bg-amber-500/10" : ""
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                {markedForReview[currentIdx] ? "Marked for Review" : "Mark for Review"}
              </Button>
            </div>

            <div className="flex-1">
              <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
                 <div dangerouslySetInnerHTML={{ __html: question.text }} />
              </div>

              {isSubjective ? (
                <div className="space-y-3">
                  <Textarea
                    value={textAnswers[currentIdx] || ""}
                    onChange={(e) => handleTextAnswerChange(e.target.value)}
                    placeholder="Write your answer here..."
                    className="min-h-[280px] text-base leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {(textAnswers[currentIdx] || "").trim().split(/\s+/).filter(Boolean).length} words
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[question.option_a, question.option_b, question.option_c, question.option_d].map((optionText, idx) => {
                    if (!optionText) return null;
                    const letter = optionsMap[idx] as string;
                    const isSelected = answers[currentIdx] === letter;

                    return (
                      <button
                        key={letter}
                        onClick={() => handleSelectOption(letter)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 hover:border-primary/50",
                          isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full border flex-shrink-0 flex items-center justify-center text-xs font-medium mt-0.5",
                          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"
                        )}>
                          {letter}
                        </div>
                        <span className="text-base leading-relaxed select-none">{optionText}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-card border-t border-border p-4 sticky bottom-0 z-10 flex justify-between items-center">
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => setCurrentIdx(prev => prev - 1)} 
              disabled={currentIdx === 0}
              className="w-32"
            >
              <ChevronLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
            
            <Button 
              size="lg" 
              variant="destructive"
              className="sm:hidden"
              onClick={() => setIsSubmitDialogOpen(true)}
            >
              Submit
            </Button>
            
            <Button 
              size="lg" 
              onClick={() => setCurrentIdx(prev => prev + 1)} 
              disabled={currentIdx === totalQuestions - 1}
              className="w-32"
            >
              Next <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </main>
        
        <aside className="w-full md:w-80 border-l border-border bg-muted/10 flex flex-col hidden md:flex h-[calc(100vh-65px)]">
          <div className="p-4 border-b border-border bg-card">
            <h3 className="font-semibold flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" /> Question Palette
            </h3>
            
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary"></div>
                <span className="text-muted-foreground">Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500"></div>
                <span className="text-muted-foreground">Review ({reviewCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border bg-card"></div>
                <span className="text-muted-foreground">Unvisited ({totalQuestions - answeredCount})</span>
              </div>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: totalQuestions }).map((_, idx) => {
                const isAnswered = isAnsweredAt(idx);
                const isReview = markedForReview[idx];
                const isCurrent = currentIdx === idx;
                
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIdx(idx)}
                    className={cn(
                      "w-10 h-10 rounded-md flex items-center justify-center text-sm font-medium border transition-all",
                      isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
                      isReview ? "bg-amber-500 border-amber-600 text-white" :
                      isAnswered ? "bg-primary border-primary text-primary-foreground" :
                      "bg-card border-border text-foreground hover:bg-muted"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>
      </div>

      <Dialog 
        open={isSubmitDialogOpen || isSubmitting} 
        onOpenChange={(open) => {
          if (!isSubmitting) setIsSubmitDialogOpen(open);
        }}
      >
        <DialogContent 
          className="sm:max-w-md"
          onPointerDownOutside={(e) => {
            if (isSubmitting) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (isSubmitting) e.preventDefault();
          }}
        >
          {isSubmitting ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4" role="status" aria-busy="true">
              <div className="relative flex items-center justify-center w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-destructive/20 animate-pulse" />
                <Loader2 className="w-10 h-10 animate-spin text-destructive shrink-0" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <DialogTitle className="text-lg font-bold">Submitting Your Exam...</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Recording your final answers and finalizing your attempt.
                </DialogDescription>
              </div>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
                Please do not refresh or close this tab.
              </p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Submit Exam?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to submit your exam? You cannot change your answers after submission.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4 grid grid-cols-2 gap-4 text-center">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-2xl font-bold text-foreground">{answeredCount}</p>
                  <p className="text-xs text-muted-foreground">Answered</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-2xl font-bold text-amber-500">{reviewCount}</p>
                  <p className="text-xs text-muted-foreground">Marked for Review</p>
                </div>
                <div className="bg-muted rounded-lg p-3 col-span-2">
                  <p className="text-2xl font-bold text-destructive">{totalQuestions - answeredCount}</p>
                  <p className="text-xs text-muted-foreground">Unanswered Questions</p>
                </div>
              </div>
              
              <DialogFooter className="flex gap-2 sm:justify-end">
                <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)} disabled={isSubmitting}>
                  Continue Exam
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} variant="destructive">
                  Yes, Submit Exam
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
