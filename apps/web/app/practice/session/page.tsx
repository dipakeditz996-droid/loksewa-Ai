"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  BookOpen, ChevronLeft, ChevronRight, Flag, Bookmark, 
  Clock, AlertCircle, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { practiceApi } from "@/lib/api/practice";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Define the shape of question we expect from our API transformation
interface ClientQuestion {
  id: number;
  questionText: string;
  options: string[];
  difficulty: string;
  topic?: string;
  subject?: string;
}

function PracticeSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Settings from URL
  const exam = searchParams.get("exam") || "all";
  const subject = searchParams.get("subject") || "all";
  const topic = searchParams.get("topic") || "all";
  const difficulty = searchParams.get("diff") || "all";
  const mode = searchParams.get("mode") || "flexible";
  const numQuestions = parseInt(searchParams.get("q") || "20");
  
  // State
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  
  const [timeRemaining, setTimeRemaining] = useState(numQuestions * 60); // 1 min per question
  const [timeTaken, setTimeTaken] = useState(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize
  useEffect(() => {
    setIsClient(true);
    
    async function initSession() {
      try {
        const response = await practiceApi.startSession({
          exam,
          subject,
          topic,
          difficulty,
          mode,
          total_questions: numQuestions
        });
        
        setSessionId(response.session.id);
        
        // Transform backend format to frontend format
        const clientQs: ClientQuestion[] = response.questions.map((q: any) => ({
          id: q.id,
          questionText: q.text,
          options: [q.option_a, q.option_b, q.option_c, q.option_d],
          difficulty: q.difficulty,
          topic: "Practice Topic",
          subject: "Practice Subject"
        }));
        setQuestions(clientQs);
        setTimeRemaining(clientQs.length * 60);
      } catch (e: any) {
        console.error("Failed to start session", e);
        // Fallback or show error
        alert(e.message || "Could not start practice session.");
        router.push("/student/practice");
      }
    }
    
    initSession();
  }, [exam, subject, topic, difficulty, mode, numQuestions, router]);

  // Timer
  useEffect(() => {
    if (!isClient || questions.length === 0 || isSubmitting) return;
    
    const interval = setInterval(() => {
      setTimeTaken((prev) => prev + 1);
      if (mode === "timed") {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isClient, mode, questions.length, isSubmitting]);

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-medium">
        Loading practice session...
      </div>
    );
  }

  // Debounced/background save logic inside these handlers
  const handleSelectAnswer = async (optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionIndex }));
    if (sessionId) {
      try {
        // Map optionIndex (0,1,2,3) to A,B,C,D
        const selected_option = String.fromCharCode(65 + optionIndex);
        await practiceApi.saveAnswer(sessionId, {
          question_id: currentQuestion.id,
          selected_option: selected_option,
          is_marked_for_review: markedForReview[currentQuestion.id] || false
        });
      } catch (e) {
        console.error("Failed to save answer");
      }
    }
  };

  const handleToggleReview = async () => {
    const isMarked = !markedForReview[currentQuestion.id];
    setMarkedForReview(prev => ({ ...prev, [currentQuestion.id]: isMarked }));
    if (sessionId) {
      try {
        const optIdx = answers[currentQuestion.id];
        const selected_option = optIdx !== undefined ? String.fromCharCode(65 + optIdx) : null;
        await practiceApi.saveAnswer(sessionId, {
          question_id: currentQuestion.id,
          selected_option: selected_option,
          is_marked_for_review: isMarked
        });
      } catch (e) {
        console.error("Failed to save review mark");
      }
    }
  };

  const handleToggleBookmark = async () => {
    setBookmarked(prev => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }));
    try {
      await practiceApi.toggleBookmark(currentQuestion.id);
    } catch (e) {
      console.error("Failed to toggle bookmark");
    }
  };

  const handleSubmit = async () => {
    if (!sessionId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await practiceApi.submitSession(sessionId, timeTaken);
      router.push(`/practice/result?session_id=${sessionId}`);
    } catch (e) {
      console.error("Failed to submit", e);
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isClient || questions.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-[#0B2545] p-1.5 rounded-[8px]">
            <BookOpen className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-[800] text-[18px] text-[#0B2545] tracking-tight hidden sm:block">
            Loksewa<span className="text-[#D4A72C]">AI</span>
          </span>
          <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
          <div className="flex flex-col">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider leading-none">Practice</span>
            <span className="text-[14px] font-bold text-[#0B2545]">{currentQuestion.subject}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-[14px] font-bold text-slate-500 hidden md:block">
            Question {currentIndex + 1} of {questions.length}
          </div>
          
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-[8px] border font-bold text-[15px]",
            mode === "timed" ? (timeRemaining < 60 ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-[#0B2545] border-slate-200") : "bg-slate-50 text-slate-500 border-slate-200"
          )}>
            <Clock className="w-4 h-4" />
            {mode === "timed" ? formatTime(timeRemaining) : formatTime(timeTaken)}
          </div>
          
          <Button 
            onClick={() => setIsSubmitModalOpen(true)}
            className="bg-[#D4A72C] text-[#0A1118] hover:bg-[#b58e23] font-bold h-9 px-6 rounded-[8px]"
          >
            Submit
          </Button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] w-full mx-auto relative">
        
        {/* LEFT/CENTER: QUESTION AREA */}
        <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
            
            <div className="flex justify-between items-start mb-6">
              <span className="inline-flex items-center justify-center bg-[#0B2545] text-white font-bold text-[14px] h-8 px-4 rounded-full">
                Question {currentIndex + 1}
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleToggleBookmark}
                  className={cn("h-8 gap-2 font-semibold transition-colors", bookmarked[currentQuestion.id] ? "bg-slate-100 text-[#0B2545] border-slate-300" : "text-slate-500")}
                >
                  <Bookmark className={cn("w-4 h-4", bookmarked[currentQuestion.id] && "fill-[#0B2545]")} />
                  <span className="hidden sm:inline">{bookmarked[currentQuestion.id] ? "Saved" : "Save Question"}</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleToggleReview}
                  className={cn("h-8 gap-2 font-semibold transition-colors", markedForReview[currentQuestion.id] ? "bg-orange-50 text-orange-600 border-orange-200" : "text-slate-500")}
                >
                  <Flag className={cn("w-4 h-4", markedForReview[currentQuestion.id] && "fill-orange-600")} />
                  <span className="hidden sm:inline">{markedForReview[currentQuestion.id] ? "Marked" : "Mark for Review"}</span>
                </Button>
              </div>
            </div>

            <h2 className="text-[20px] md:text-[24px] font-semibold text-[#0B2545] leading-snug mb-8">
              {currentQuestion.questionText}
            </h2>

            <div className="space-y-4 mb-12">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentQuestion.id] === idx;
                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(idx)}
                    className={cn(
                      "w-full flex items-center p-4 md:p-5 text-left rounded-[12px] border-2 transition-all group outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0B2545]",
                      isSelected 
                        ? "border-[#0B2545] bg-[#0B2545]/5" 
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-[8px] flex items-center justify-center font-bold text-[14px] shrink-0 mr-4 transition-colors",
                      isSelected
                        ? "bg-[#0B2545] text-white"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    )}>
                      {letter}
                    </div>
                    <span className={cn(
                      "text-[16px] font-medium leading-relaxed",
                      isSelected ? "text-[#0B2545]" : "text-slate-700"
                    )}>
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* NAVIGATION CONTROLS */}
            <div className="mt-auto pt-6 border-t border-slate-200 flex items-center justify-between">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="font-bold gap-2 text-slate-600"
              >
                <ChevronLeft className="w-5 h-5" /> Previous
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  if (currentIndex < questions.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                  } else {
                    setIsSubmitModalOpen(true);
                  }
                }}
                className={cn(
                  "font-bold gap-2 text-white",
                  currentIndex === questions.length - 1 ? "bg-[#D4A72C] hover:bg-[#b58e23] text-[#0A1118]" : "bg-[#0B2545] hover:bg-[#163E6B]"
                )}
              >
                {currentIndex === questions.length - 1 ? "Finish" : "Next"} <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            
          </div>
        </div>

        {/* RIGHT: QUESTION NAVIGATOR */}
        <div className="w-full lg:w-80 bg-white border-l border-slate-200 p-6 flex flex-col shrink-0">
          <h3 className="text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-6">Question Navigator</h3>
          
          <div className="grid grid-cols-5 gap-2 lg:gap-3 mb-8">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isMarked = markedForReview[q.id];
              const isCurrent = currentIndex === idx;
              
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "relative w-full aspect-square rounded-[8px] text-[14px] font-bold flex items-center justify-center transition-all",
                    isCurrent ? "ring-2 ring-offset-2 ring-[#0B2545]" : "",
                    isAnswered && !isMarked ? "bg-[#0B2545] text-white" : 
                    isMarked ? "bg-orange-500 text-white" : 
                    "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  {idx + 1}
                  {isMarked && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white"></div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-3 mt-auto lg:mt-0 p-4 bg-slate-50 rounded-[12px] border border-slate-100">
            <div className="flex items-center gap-3 text-[13px] font-medium text-slate-600">
              <div className="w-4 h-4 rounded-[4px] bg-[#0B2545]"></div> Answered ({answeredCount})
            </div>
            <div className="flex items-center gap-3 text-[13px] font-medium text-slate-600">
              <div className="w-4 h-4 rounded-[4px] bg-slate-200"></div> Unanswered ({unansweredCount})
            </div>
            <div className="flex items-center gap-3 text-[13px] font-medium text-slate-600">
              <div className="w-4 h-4 rounded-[4px] bg-orange-500 relative">
                <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-white"></div>
              </div> Marked for Review ({markedCount})
            </div>
          </div>
        </div>
      </div>

      {/* SUBMISSION MODAL */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-[16px]">
          <div className="bg-[#0B2545] p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-[#D4A72C] mx-auto mb-4" />
            <DialogTitle className="text-[24px] font-bold text-white mb-1">Submit your practice?</DialogTitle>
            <DialogDescription className="text-white/70">
              Please review your progress before submitting.
            </DialogDescription>
          </div>
          
          <div className="p-6 bg-white space-y-4">
            <div className="flex justify-between items-center p-3 rounded-[8px] bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-600">Answered</span>
              <span className="font-bold text-[#0B2545]">{answeredCount} / {questions.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-[8px] bg-red-50 border border-red-100">
              <span className="font-semibold text-red-600">Unanswered</span>
              <span className="font-bold text-red-600">{unansweredCount}</span>
            </div>
            {markedCount > 0 && (
              <div className="flex justify-between items-center p-3 rounded-[8px] bg-orange-50 border border-orange-100">
                <span className="font-semibold text-orange-600">Marked for Review</span>
                <span className="font-bold text-orange-600">{markedCount}</span>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-0 sm:justify-between flex-row">
            <Button variant="outline" onClick={() => setIsSubmitModalOpen(false)} className="font-bold">
              Continue Practice
            </Button>
            <Button onClick={handleSubmit} className="bg-[#D4A72C] text-[#0A1118] hover:bg-[#b58e23] font-bold">
              Submit Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PracticeSessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div></div>}>
      <PracticeSessionContent />
    </Suspense>
  );
}
