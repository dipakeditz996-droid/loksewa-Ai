"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ArrowLeft, FileText, CheckCircle2, MessageSquare, PlayCircle, Target, Award, User, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { subjectiveApi, SubjectiveAttempt } from "@/lib/api/subjective";
import { cn } from "@/lib/utils";

export default function SubjectiveEvaluationView() {
  const params = useParams();
  const attemptId = params.id as string;
  
  const [attempt, setAttempt] = useState<SubjectiveAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState(0);

  useEffect(() => {
    if (!attemptId) return;

    async function load() {
      try {
        const id = parseInt(attemptId, 10);
        const data = await subjectiveApi.getAttempt(id);
        setAttempt(data);
      } catch (error) {
        console.error("Failed to load attempt details", error);
        alert("Failed to load evaluation.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f8fafc]">
        <div className="w-10 h-10 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="p-8 text-center bg-white rounded-lg m-8 border">
        <h2 className="text-xl font-bold">Attempt not found</h2>
        <Link href="/student/subjective/history">
          <Button className="mt-4">Go Back</Button>
        </Link>
      </div>
    );
  }

  const selectedAnswer = attempt.answers[selectedAnswerIndex];
  const evalData = selectedAnswer?.evaluation;
  
  const totalMarksEarned = attempt.answers.reduce((acc, curr) => acc + (curr.evaluation?.marks_obtained || 0), 0);
  const totalMarksPossible = attempt.answers.reduce((acc, curr) => acc + curr.question.marks, 0);

  // Helper to render text with highlighted annotations
  const renderAnnotatedText = (text: string, annotations: any[]) => {
    if (!annotations || annotations.length === 0 || !text) return <p className="whitespace-pre-wrap">{text}</p>;

    // Sort annotations by start_offset
    const sorted = [...annotations].sort((a, b) => a.start_offset - b.start_offset);
    
    let lastIndex = 0;
    const parts = [];

    sorted.forEach((ann, i) => {
      if (ann.start_offset > lastIndex) {
        parts.push(text.substring(lastIndex, ann.start_offset));
      }
      
      parts.push(
        <span 
          key={`ann-${i}`} 
          className="bg-yellow-200/60 border-b-2 border-yellow-400 cursor-help relative group"
        >
          {text.substring(ann.start_offset, ann.end_offset)}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[250px] bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
            <div className="font-bold text-yellow-300 mb-1">Annotation Note</div>
            {ann.comment}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
          </div>
        </span>
      );
      
      lastIndex = ann.end_offset;
    });

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return <p className="whitespace-pre-wrap leading-relaxed">{parts}</p>;
  };


  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 shadow-sm shrink-0 h-16 flex items-center justify-between px-4 md:px-8 z-10">
        <div className="flex items-center gap-4">
          <Link href="/student/subjective/history" className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
             <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div className="hidden md:block w-[1px] h-6 bg-slate-200"></div>
          <div>
            <div className="text-[14px] font-bold text-[#0B2545]">Evaluation Report</div>
            <div className="text-[11px] font-medium text-slate-400">
              {attempt.mode === 'practice' ? attempt.practice_set_detail?.title : 
               attempt.mode === 'model_exam' ? attempt.model_exam_detail?.title :
               'Topic Practice'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-green-50 px-4 py-1.5 rounded-full border border-green-200 text-green-700">
          <Award className="w-5 h-5" />
          <span className="text-[14px] font-bold">Total Score: {totalMarksEarned} / {totalMarksPossible}</span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT SIDEBAR - QUESTION NAV */}
        <div className="w-[280px] bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto hidden md:flex">
          <div className="p-4 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2 text-[14px] uppercase tracking-wide">
            <FileText className="w-4 h-4" /> Questions
          </div>
          <div className="p-2 space-y-1">
            {attempt.answers.map((ans, idx) => {
              const isSelected = idx === selectedAnswerIndex;
              const isEval = !!ans.evaluation;
              return (
                <button
                  key={ans.id}
                  onClick={() => setSelectedAnswerIndex(idx)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg text-[14px] font-medium flex items-center justify-between transition-colors",
                    isSelected ? "bg-[#0B2545] text-white" : "hover:bg-slate-200/50 text-slate-700"
                  )}
                >
                  <span className="truncate pr-2">Q{idx + 1}. {ans.question.text.substring(0, 30)}...</span>
                  {isEval ? (
                    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", isSelected ? "bg-white/20" : "bg-green-100 text-green-700")}>
                      {ans.evaluation!.marks_obtained}/{ans.question.marks}
                    </span>
                  ) : (
                    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", isSelected ? "bg-white/20" : "bg-slate-200 text-slate-500")}>
                      Pending
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL - CONTENT */}
        <div className="flex-1 flex flex-col bg-white overflow-y-auto">
          {selectedAnswer ? (
            <div className="p-6 md:p-10 max-w-[900px] mx-auto w-full">
              
              {/* Question Block */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">{selectedAnswer.question.subject_name}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Q{selectedAnswerIndex + 1}</span>
                </div>
                <h2 className="text-[18px] md:text-[20px] font-bold text-[#0B2545] leading-relaxed mb-4">
                  {selectedAnswer.question.text}
                </h2>
                <div className="flex items-center gap-2 text-[13px] font-bold text-slate-500">
                  <Target className="w-4 h-4" /> Max Marks: {selectedAnswer.question.marks}
                </div>
              </div>

              {/* Status Header */}
              {evalData ? (
                <div className="bg-green-50 border border-green-200 rounded-[12px] p-5 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-[16px] font-bold text-green-800">Evaluated</div>
                      <div className="text-[13px] text-green-600 flex items-center gap-1">
                        <User className="w-3 h-3" /> by {evalData.evaluator_name} on {new Date(evalData.evaluated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-bold text-green-600 uppercase tracking-wider mb-1">Marks Obtained</div>
                    <div className="text-[24px] font-bold text-[#0B2545]">{evalData.marks_obtained} <span className="text-[16px] text-slate-400">/ {selectedAnswer.question.marks}</span></div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-[12px] p-5 mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <div className="text-[16px] font-bold text-slate-700">Pending Evaluation</div>
                    <div className="text-[13px] text-slate-500">An expert is yet to review this answer.</div>
                  </div>
                </div>
              )}

              {/* The Answer & Annotations */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-[16px] overflow-hidden mb-8">
                <div className="h-12 bg-slate-50 border-b border-slate-200 flex items-center px-6 justify-between">
                  <div className="text-[13px] font-bold text-slate-600 uppercase tracking-wider">Your Answer</div>
                  <div className="text-[12px] font-medium text-slate-400">Word Count: {selectedAnswer.word_count}</div>
                </div>
                <div className="p-6 md:p-8 text-[16px] leading-relaxed text-slate-700 font-serif">
                  {renderAnnotatedText(selectedAnswer.answer_text, evalData?.annotations || [])}
                </div>
              </div>

              {/* General Feedback & Video */}
              {evalData && (
                <div className="space-y-6">
                  {evalData.feedback && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-[16px] p-6 md:p-8">
                      <div className="flex items-center gap-2 text-blue-700 font-bold mb-4">
                        <MessageSquare className="w-5 h-5" /> Evaluator's Remarks
                      </div>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{evalData.feedback}</p>
                    </div>
                  )}

                  {evalData.video_feedback && evalData.video_feedback.embed_url && (
                    <div className="bg-slate-900 rounded-[16px] p-6 md:p-8 overflow-hidden">
                      <div className="flex items-center gap-2 text-white font-bold mb-6">
                        <PlayCircle className="w-5 h-5 text-red-500" /> Video Feedback
                      </div>
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/50 border border-white/10 shadow-2xl relative group">
                        <iframe 
                          src={evalData.video_feedback.embed_url}
                          className="w-full h-full absolute inset-0"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">
              Select a question to view details
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
