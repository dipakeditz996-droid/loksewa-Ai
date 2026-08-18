"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Clock, AlertTriangle, ChevronLeft, ChevronRight, 
  Flag, CheckCircle2, AlertCircle, Bookmark, ShieldAlert, SkipForward
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { modelExamApi, StartModelExamResponse } from "@/lib/api/modelExam";
import { cn } from "@/lib/utils";

function ModelExamSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get("exam_id");

  const [sessionData, setSessionData] = useState<StartModelExamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { selected_option: string | null; is_marked_for_review: boolean }>>({});
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Initialize Session
  useEffect(() => {
    if (!examId) {
      router.push("/student/model-exams");
      return;
    }

    async function initSession() {
      try {
        const id = parseInt(examId as string, 10);
        const data = await modelExamApi.startExam(id);
        
        if (data.attempt.status === 'submitted') {
          router.push(`/model-exams/result?attempt_id=${data.attempt.id}`);
          return;
        }

        setSessionData(data);
        setAnswers(data.answers || {});

        // Calculate timer
        const startedAt = new Date(data.attempt.started_at).getTime();
        const durationMs = data.attempt.model_exam.duration_minutes * 60 * 1000;
        const endsAt = startedAt + durationMs;
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));
        
        setTimeLeft(remaining);

      } catch (err: any) {
        console.error("Failed to start model exam", err);
        setError("Failed to initialize exam. Please ensure you have permission to access it.");
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [examId, router]);

  // Handle Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || !sessionData) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, sessionData]);

  const handleAutoSubmit = async () => {
    if (!sessionData || submitting) return;
    setSubmitting(true);
    try {
      await modelExamApi.submitExam(sessionData.attempt.id);
      router.push(`/model-exams/result?attempt_id=${sessionData.attempt.id}`);
    } catch (e) {
      console.error("Failed auto submit", e);
      // Fallback redirect if backend already submitted it
      router.push(`/model-exams/result?attempt_id=${sessionData.attempt.id}`);
    }
  };

  const handleManualSubmit = async () => {
    if (!sessionData) return;
    const answeredCount = Object.values(answers).filter(a => a.selected_option !== null).length;
    const total = sessionData.questions.length;

    if (!confirm(`You have answered ${answeredCount} out of ${total} questions. Are you sure you want to submit your examination?`)) {
      return;
    }

    setSubmitting(true);
    try {
      await modelExamApi.submitExam(sessionData.attempt.id);
      router.push(`/model-exams/result?attempt_id=${sessionData.attempt.id}`);
    } catch (e) {
      console.error("Failed manual submit", e);
      alert("Failed to submit exam. Please try again or wait for auto-submit.");
      setSubmitting(false);
    }
  };

  const saveAnswerToBackend = async (questionId: number, selectedOption: string | null, isMarked: boolean) => {
    if (!sessionData) return;
    try {
      await modelExamApi.saveAnswer(sessionData.attempt.id, questionId, selectedOption, isMarked);
    } catch (e: any) {
      console.error("Failed to save answer", e);
      if (e.response && e.response.status === 403) {
        alert("Time expired! Your exam will be submitted.");
        handleAutoSubmit();
      }
    }
  };

  const handleOptionSelect = (optionKey: string) => {
    if (!sessionData) return;
    const q = sessionData.questions[currentIndex];
    if (!q) return;
    const qId = Number(q.id);
    
    // Toggle off if already selected
    const currentAns = answers[qId]?.selected_option;
    const newSelected = currentAns === optionKey ? null : optionKey;
    
    const isMarked = answers[qId]?.is_marked_for_review || false;

    setAnswers(prev => ({
      ...prev,
      [qId]: {
        selected_option: newSelected,
        is_marked_for_review: isMarked
      }
    }));

    saveAnswerToBackend(qId, newSelected, isMarked);
  };

  const toggleMarkForReview = () => {
    if (!sessionData) return;
    const q = sessionData.questions[currentIndex];
    if (!q) return;
    const qId = Number(q.id);
    const currentSelected = answers[qId]?.selected_option || null;
    const newMarked = !(answers[qId]?.is_marked_for_review || false);

    setAnswers(prev => ({
      ...prev,
      [qId]: {
        selected_option: currentSelected,
        is_marked_for_review: newMarked
      }
    }));

    saveAnswerToBackend(qId, currentSelected, newMarked);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[16px] shadow-sm max-w-md w-full text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-[20px] font-bold text-[#0B2545] mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button onClick={() => router.push("/student/model-exams")} className="w-full bg-[#0B2545]">
            Return to Model Exams
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !sessionData || timeLeft === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Preparing your examination environment...</p>
      </div>
    );
  }

  const currentQ = sessionData.questions[currentIndex];
  if (!currentQ) return null;
  const currentQId = Number(currentQ.id);
  const qState = answers[currentQId] || { selected_option: null, is_marked_for_review: false };
  const isTimeCritical = timeLeft < 300; // Less than 5 mins

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <header className="bg-[#0B2545] text-white shrink-0 border-b border-[#1a365d] shadow-sm z-10">
        <div className="flex items-center justify-between px-4 md:px-8 h-16">
          <div className="flex items-center gap-4">
            <div className="text-[18px] font-bold tracking-tight">LoksewaAI</div>
            <div className="hidden md:block w-[1px] h-6 bg-white/20"></div>
            <div className="hidden md:block text-[14px] text-white/80 font-medium truncate max-w-[300px]">
              {sessionData.attempt.model_exam.title}
            </div>
          </div>
          
          <div className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-[16px] font-bold border transition-colors",
            isTimeCritical 
              ? "bg-red-500/20 text-red-100 border-red-500/50 animate-pulse" 
              : "bg-white/10 text-white border-white/20"
          )}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
          
          <Button 
            onClick={handleManualSubmit}
            disabled={submitting}
            className="bg-[#D4A72C] hover:bg-[#b58e23] text-[#0A1118] font-bold text-[13px] h-9 px-6 rounded-full"
          >
            {submitting ? "Submitting..." : "Submit Exam"}
          </Button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: QUESTION AREA */}
        <div className="flex-1 flex flex-col relative bg-white">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-24">
            <div className="max-w-[800px] mx-auto">
              
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[16px]">
                    {currentIndex + 1}
                  </div>
                  <div className="text-[14px] font-bold text-slate-400 uppercase tracking-wider">
                    Question {currentIndex + 1} of {sessionData.questions.length}
                  </div>
                </div>
                
                <Button 
                  variant="outline"
                  onClick={toggleMarkForReview}
                  className={cn("h-9 border-slate-200 gap-2 transition-colors", 
                    qState.is_marked_for_review 
                      ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Bookmark className={cn("w-4 h-4", qState.is_marked_for_review && "fill-current")} />
                  <span className="hidden sm:inline">Mark for Review</span>
                </Button>
              </div>

              <h2 className="text-[18px] md:text-[20px] font-semibold text-[#0B2545] leading-relaxed mb-8">
                {currentQ.questionText || (currentQ as any).question_text}
              </h2>

              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map((key) => {
                  const optText = (currentQ as any)[`option_${key.toLowerCase()}`];
                  const isSelected = qState.selected_option === key;
                  
                  return (
                    <button
                      key={key}
                      onClick={() => handleOptionSelect(key)}
                      className={cn(
                        "w-full text-left p-4 md:p-5 rounded-[12px] border-2 transition-all flex items-start gap-4 group",
                        isSelected 
                          ? "border-[#0B2545] bg-blue-50/50" 
                          : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 text-[13px] font-bold transition-colors mt-0.5",
                        isSelected
                          ? "border-[#0B2545] bg-[#0B2545] text-white"
                          : "border-slate-300 text-slate-500 group-hover:border-slate-400"
                      )}>
                        {key}
                      </div>
                      <span className={cn(
                        "text-[15px] md:text-[16px] leading-relaxed pt-1",
                        isSelected ? "font-medium text-[#0B2545]" : "text-slate-700"
                      )}>
                        {optText}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>
          </div>

          {/* BOTTOM NAV */}
          <div className="h-20 bg-white border-t border-slate-200 px-6 flex items-center justify-between absolute bottom-0 left-0 right-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="h-12 px-6 border-slate-200 text-slate-600 font-bold"
            >
              <ChevronLeft className="w-5 h-5 mr-1" /> Previous
            </Button>
            
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-200"></span>
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            </div>
            
            <Button
              onClick={() => {
                if (currentIndex < sessionData.questions.length - 1) {
                  setCurrentIndex(prev => prev + 1);
                } else {
                  handleManualSubmit();
                }
              }}
              className="h-12 px-6 bg-[#0B2545] hover:bg-[#1a365d] text-white font-bold"
            >
              {currentIndex === sessionData.questions.length - 1 ? (
                <>Submit <CheckCircle2 className="w-5 h-5 ml-2" /></>
              ) : (
                <>Next <ChevronRight className="w-5 h-5 ml-1" /></>
              )}
            </Button>
          </div>
        </div>

        {/* RIGHT: PALETTE */}
        <div className="w-[320px] bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 hidden lg:flex">
          <div className="p-5 border-b border-slate-200 bg-white">
            <h3 className="text-[14px] font-bold text-[#0B2545] uppercase tracking-wider mb-4">Question Palette</h3>
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[12px] font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 bg-white"></div> Not Visited
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-red-400 bg-red-50"></div> Not Answered
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#0B2545]"></div> Answered
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500"></div> Marked
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <div className="w-4 h-4 rounded-full bg-[#0B2545] relative overflow-hidden flex items-center justify-center">
                   <div className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-bl-full"></div>
                </div> 
                Answered & Marked
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-5 gap-2">
              {sessionData.questions.map((q, idx) => {
                const qId = q ? Number(q.id) : 0;
                const state = answers[qId];
                const isCurrent = currentIndex === idx;
                
                let btnClass = "border-slate-200 bg-white text-slate-500 hover:border-slate-300"; // not visited visually
                
                if (state) {
                  const hasAnswer = state.selected_option !== null;
                  const isMarked = state.is_marked_for_review;
                  
                  if (hasAnswer && isMarked) {
                    btnClass = "bg-[#0B2545] text-white border-transparent overflow-hidden relative";
                  } else if (hasAnswer) {
                    btnClass = "bg-[#0B2545] text-white border-transparent";
                  } else if (isMarked) {
                    btnClass = "bg-purple-500 text-white border-transparent";
                  } else if (idx <= currentIndex) {
                    // visited but not answered (assuming anything <= current has been seen)
                    btnClass = "bg-red-50 border-red-400 text-red-600";
                  }
                } else if (idx <= currentIndex) {
                   btnClass = "bg-red-50 border-red-400 text-red-600";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold border-2 transition-all relative",
                      btnClass,
                      isCurrent && "ring-2 ring-blue-400 ring-offset-2 scale-110 z-10"
                    )}
                  >
                    {idx + 1}
                    {state?.selected_option !== null && state?.is_marked_for_review && (
                      <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-purple-500 rounded-bl-full rounded-tr-full z-10"></div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ModelExamSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin mb-4"></div>
      </div>
    }>
      <ModelExamSessionContent />
    </Suspense>
  )
}
