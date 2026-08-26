"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Save, CheckCircle2, AlertTriangle, ArrowLeft, Clock,
  Type, AlignLeft, FileText, ChevronLeft, ChevronRight, Bookmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { subjectiveApi, SubjectiveAttempt, SubjectiveAnswer } from "@/lib/api/subjective";
import { cn } from "@/lib/utils";

function SubjectiveAnswerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attempt_id");

  const [attempt, setAttempt] = useState<SubjectiveAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load Attempt
  useEffect(() => {
    if (!attemptId) {
      router.push("/student/subjective");
      return;
    }

    async function load() {
      try {
        const id = parseInt(attemptId as string, 10);
        const data = await subjectiveApi.getAttempt(id);
        
        if (data.status === 'submitted') {
          router.push(`/student/subjective/history`);
          return;
        }

        setAttempt(data);
        
        const ansObj: Record<number, string> = {};
        data.answers.forEach(a => {
          ansObj[a.question.id] = a.answer_text || '';
        });
        setAnswers(ansObj);

        // Timer for Model Exam
        if (data.mode === 'model_exam' && data.model_exam_detail) {
          const startedAt = new Date(data.started_at).getTime();
          const durationMs = data.model_exam_detail.duration_minutes * 60 * 1000;
          const endsAt = startedAt + durationMs;
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));
          setTimeLeft(remaining);
        }

      } catch (e) {
        console.error("Failed to load subjective attempt", e);
        alert("Failed to load practice environment.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [attemptId, router]);

  // Handle Timer for Model Exams
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || !attempt || attempt.mode !== 'model_exam') return;

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
  }, [timeLeft, attempt]);

  const handleAutoSubmit = async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      await subjectiveApi.submitAttempt(attempt.id);
      alert("Time expired! Your exam has been automatically submitted.");
      router.push(`/student/subjective/history`);
    } catch (e) {
      console.error("Failed auto submit", e);
      router.push(`/student/subjective/history`);
    }
  };

  const saveDraft = async (questionId: number, text: string) => {
    if (!attempt) return;
    setSaving(true);
    try {
      const res = await subjectiveApi.saveDraft(attempt.id, questionId, text);
      const time = new Date(res.last_saved_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      setLastSaved(`Saved at ${time}`);
    } catch (e: any) {
      console.error("Failed to save draft", e);
      if (e.response && e.response.status === 403) {
        alert("Time expired! Exam will be submitted.");
        handleAutoSubmit();
      }
    } finally {
      setSaving(false);
    }
  };

  // Debounced auto-save
  useEffect(() => {
    if (!attempt || !attempt.answers[currentIndex]) return;
    const currentQId = attempt.answers[currentIndex].question.id;
    const text = answers[currentQId];

    const handler = setTimeout(() => {
      // Don't auto-save if text hasn't changed from original, but since we don't track original tightly,
      // we'll just save periodically if they stop typing.
      if (text !== undefined) {
        saveDraft(currentQId, text);
      }
    }, 3000);

    return () => clearTimeout(handler);
  }, [answers, currentIndex, attempt]);


  const handleManualSubmit = async () => {
    if (!attempt) return;
    
    // Check if it's a single topic or full set
    if (attempt.mode === 'topic') {
      const currentQ = attempt.answers[currentIndex];
      if (!currentQ || !currentQ.question) return;
      const text = answers[currentQ.question.id] || '';
      
      if (!confirm("Are you sure you want to submit this answer? You won't be able to edit it later.")) return;
      
      setSubmitting(true);
      try {
        await subjectiveApi.submitAnswer(attempt.id, currentQ.question.id, text);
        alert("Answer submitted successfully!");
        router.push("/student/subjective/history");
      } catch (e) {
        alert("Failed to submit. Please try again.");
        setSubmitting(false);
      }
    } else {
      if (!confirm("Are you sure you want to submit the entire practice set? All answers will be locked.")) return;
      
      setSubmitting(true);
      try {
        await subjectiveApi.submitAttempt(attempt.id);
        alert("Submitted successfully!");
        router.push("/student/subjective/history");
      } catch (e) {
        alert("Failed to submit. Please try again.");
        setSubmitting(false);
      }
    }
  };

  if (loading || !attempt) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Preparing writing environment...</p>
      </div>
    );
  }

  const currentAnswerObj = attempt.answers[currentIndex];
  if (!currentAnswerObj || !currentAnswerObj.question) return null;
  const currentQ = currentAnswerObj.question;
  const currentText = answers[currentQ.id] || '';
  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;
  
  const isModelExam = attempt.mode === 'model_exam';
  const isTimeCritical = isModelExam && timeLeft !== null && timeLeft < 300;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 shadow-sm shrink-0 h-16 flex items-center justify-between px-4 md:px-8 z-10">
        <div className="flex items-center gap-4">
          <Link href="/student/subjective" className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
             <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div className="hidden md:block w-[1px] h-6 bg-slate-200"></div>
          <div>
            <div className="text-[14px] font-bold text-[#0B2545]">
              {attempt.mode === 'practice' ? attempt.practice_set_detail?.title : 
               attempt.mode === 'model_exam' ? attempt.model_exam_detail?.title :
               'Topic Practice'}
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              {currentQ.subject_name} {currentQ.topic_name ? `• ${currentQ.topic_name}` : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {saving ? (
            <span className="text-[12px] font-medium text-slate-400 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </span>
          ) : lastSaved ? (
            <span className="text-[12px] font-medium text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {lastSaved}
            </span>
          ) : null}

          {isModelExam && timeLeft !== null && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-[8px] font-mono text-[14px] font-bold border transition-colors",
              isTimeCritical 
                ? "bg-red-50 text-red-600 border-red-200 animate-pulse" 
                : "bg-slate-50 text-slate-600 border-slate-200"
            )}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          )}

          <Button 
            onClick={handleManualSubmit}
            disabled={submitting}
            className="bg-[#D4A72C] hover:bg-[#b58e23] text-[#0A1118] font-bold h-9 px-6"
          >
            {submitting ? "Submitting..." : attempt.mode === 'topic' ? "Submit Answer" : "Finish & Submit"}
          </Button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL - QUESTION */}
        <div className="w-full md:w-[400px] lg:w-[450px] bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Question {currentIndex + 1} of {attempt.answers.length}
              </span>
              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border",
                currentQ.difficulty === 'hard' ? 'bg-red-50 text-red-600 border-red-200' :
                currentQ.difficulty === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                'bg-green-50 text-green-600 border-green-200'
              )}>
                {currentQ.difficulty}
              </span>
            </div>

            <h2 className="text-[18px] font-bold text-[#0B2545] leading-relaxed mb-6">
              {currentQ.text}
            </h2>

            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-[12px] p-4 flex items-center justify-between">
                <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Marks</div>
                <div className="text-[16px] font-bold text-[#0B2545]">{currentQ.marks}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-[12px] p-4 flex items-center justify-between">
                <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Suggested Time</div>
                <div className="text-[16px] font-bold text-[#0B2545]">{currentQ.suggested_time_minutes} Mins</div>
              </div>
            </div>
          </div>

          {/* Navigation for Multi-question sets */}
          {attempt.answers.length > 1 && (
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="h-10 text-slate-600 font-bold border-slate-200 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <div className="text-[13px] font-bold text-slate-400">
                {currentIndex + 1} / {attempt.answers.length}
              </div>
              <Button
                variant="outline"
                onClick={() => setCurrentIndex(prev => Math.min(attempt.answers.length - 1, prev + 1))}
                disabled={currentIndex === attempt.answers.length - 1}
                className="h-10 text-slate-600 font-bold border-slate-200 hover:bg-slate-50"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - WRITING INTERFACE */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="h-12 border-b border-slate-100 flex items-center px-6 justify-between bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-600">
              <AlignLeft className="w-4 h-4" />
              <span className="text-[13px] font-bold uppercase tracking-wider">Answer Editor</span>
            </div>
            <div className="text-[12px] font-medium text-slate-400">
              Words: <span className={cn("font-bold", wordCount > 0 ? "text-[#0B2545]" : "")}>{wordCount}</span>
            </div>
          </div>
          
          <div className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="max-w-[800px] mx-auto h-full flex flex-col">
              <textarea
                value={currentText}
                onChange={(e) => {
                  setAnswers(prev => ({...prev, [currentQ.id]: e.target.value}));
                }}
                placeholder="Write your answer here..."
                className="flex-1 w-full resize-none outline-none text-[16px] leading-relaxed text-slate-700 bg-transparent placeholder:text-slate-700 font-sans"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function SubjectiveAnswerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div></div>}>
      <SubjectiveAnswerContent />
    </Suspense>
  )
}
