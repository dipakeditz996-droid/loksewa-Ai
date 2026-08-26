"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { practiceApi, PracticeSessionResponse, Question } from "@/lib/api/practice";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, CheckCircle2, ChevronLeft, ChevronRight, Bookmark } from "lucide-react";

function PracticeSessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const exam = searchParams.get("exam");
  const subject = searchParams.get("subject");
  const topic = searchParams.get("topic");
  const difficulty = searchParams.get("diff");
  const totalQuestions = parseInt(searchParams.get("q") || "20");
  const mode = searchParams.get("mode") || "flexible";

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<PracticeSessionResponse | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function initSession() {
      try {
        const data = await practiceApi.startSession({
          exam: exam === "all" ? "-1" : exam || "-1",
          subject: subject === "all" ? "-1" : subject || "-1",
          topic: topic === "all" ? "-1" : topic || "-1",
          difficulty: difficulty || "all",
          mode,
          total_questions: totalQuestions,
        });
        setSessionData(data);
        if (mode === "timed") {
          setTimeRemaining(totalQuestions * 60); // 1 min per question
        }
      } catch (e) {
        console.error(e);
        alert("Failed to start session.");
        router.push("/student/practice");
      } finally {
        setLoading(false);
      }
    }
    initSession();
  }, []);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handleAnswer = async (option: string) => {
    if (!sessionData) return;
    const q = sessionData.questions[currentIdx];
    if (!q) return;
    setAnswers(prev => ({ ...prev, [q.id]: option }));
    try {
      await practiceApi.saveAnswer(sessionData.session.id, {
        question_id: q.id,
        selected_option: option,
        is_marked_for_review: !!markedForReview[q.id]
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleReview = async () => {
    if (!sessionData) return;
    const q = sessionData.questions[currentIdx];
    if (!q) return;
    const newState = !markedForReview[q.id];
    setMarkedForReview(prev => ({ ...prev, [q.id]: newState }));
    try {
      await practiceApi.saveAnswer(sessionData.session.id, {
        question_id: q.id,
        selected_option: answers[q.id] || null,
        is_marked_for_review: newState
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    if (!sessionData) return;
    setSubmitting(true);
    try {
      const timeTaken = mode === "timed" && timeRemaining !== null
        ? (totalQuestions * 60) - timeRemaining
        : 0; // Or track time up if flexible
      await practiceApi.submitSession(sessionData.session.id, timeTaken);
      router.push(`/student/practice/results/${sessionData.session.id}`);
    } catch (e) {
      console.error(e);
      alert("Failed to submit.");
      setSubmitting(false);
    }
  };

  if (loading || !sessionData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
      </div>
    );
  }

  const currentQ = sessionData.questions[currentIdx];
  if (!currentQ) {
     return <div className="p-8 text-center">No questions found for the selected criteria.</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-8 min-h-[calc(100vh-72px)] bg-slate-50/50 flex flex-col md:flex-row gap-6">
      
      {/* Main Question Area */}
      <div className="flex-1 space-y-6">
        <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-bold text-slate-400 tracking-widest uppercase">
              Question {currentIdx + 1} of {sessionData.questions.length}
            </span>
            <Button variant="ghost" size="sm" onClick={toggleReview} className={markedForReview[currentQ.id] ? "text-orange-500" : "text-slate-400"}>
              <Bookmark className="w-4 h-4 mr-2" /> 
              {markedForReview[currentQ.id] ? "Marked" : "Mark for Review"}
            </Button>
          </div>
          
          <h2 className="text-xl font-medium text-[#0B2545] leading-relaxed mb-8">
            {currentQ.text}
          </h2>

          <div className="space-y-4">
            {['a', 'b', 'c', 'd'].map(opt => {
              const optionText = currentQ[`option_${opt}` as keyof Question];
              const isSelected = answers[currentQ.id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  className={`w-full flex items-center p-4 rounded-[12px] border-2 transition-all text-left ${
                    isSelected 
                    ? "border-[#0B2545] bg-slate-50" 
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 font-bold text-sm shrink-0 ${
                    isSelected ? "bg-[#0B2545] text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {opt.toUpperCase()}
                  </div>
                  <span className={`text-[15px] font-medium ${isSelected ? "text-[#0B2545]" : "text-slate-600"}`}>
                    {optionText as string}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-between items-center bg-white p-4 rounded-[16px] border border-slate-200 shadow-sm">
          <Button 
            variant="outline" 
            onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
            disabled={currentIdx === 0}
            className="h-12 px-6 rounded-[10px]"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Previous
          </Button>
          <Button 
            onClick={() => setCurrentIdx(p => Math.min(sessionData.questions.length - 1, p + 1))}
            disabled={currentIdx === sessionData.questions.length - 1}
            className="h-12 px-6 rounded-[10px] bg-[#0B2545] hover:bg-[#163E6B]"
          >
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Sidebar Area */}
      <div className="w-full md:w-[320px] space-y-6">
        
        {/* Timer */}
        {mode === "timed" && timeRemaining !== null && (
          <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-6 text-center">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className={`text-3xl font-bold font-mono tracking-wider ${timeRemaining < 60 ? 'text-red-500' : 'text-[#0B2545]'}`}>
              {Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:
              {(timeRemaining % 60).toString().padStart(2, '0')}
            </div>
            <p className="text-sm text-slate-500 mt-1 font-medium">Time Remaining</p>
          </div>
        )}

        {/* Question Palette */}
        <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-[#0B2545] mb-4">Question Palette</h3>
          <div className="grid grid-cols-5 gap-2">
            {sessionData.questions.map((q, i) => {
              const isAnswered = !!answers[q.id];
              const isMarked = markedForReview[q.id];
              const isCurrent = currentIdx === i;
              
              let bg = "bg-slate-100 text-slate-500";
              if (isCurrent) bg = "bg-[#0B2545] text-white";
              else if (isAnswered) bg = "bg-green-100 text-green-700 border border-green-200";
              else if (isMarked) bg = "bg-orange-100 text-orange-700 border border-orange-200";

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={`w-10 h-10 rounded-md font-bold text-sm flex items-center justify-center transition-all ${bg}`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-sm font-medium text-slate-600">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div> Answered
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-slate-100"></div> Unanswered
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-orange-100 border border-orange-200"></div> Marked for Review
            </div>
          </div>
        </div>

        <Button 
          className="w-full h-14 rounded-[12px] bg-green-600 hover:bg-green-700 text-white font-bold text-[16px] shadow-[0_8px_20px_rgba(22,163,74,0.2)]"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Practice"}
          <CheckCircle2 className="w-5 h-5 ml-2" />
        </Button>
      </div>

    </div>
  );
}

export default function PracticeSessionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <PracticeSessionContent />
    </Suspense>
  )
}
