"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  ArrowLeft, FileText, CheckCircle2, MessageSquare, PlayCircle, Target, Award, User, Search, Save, MessageCircle, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { subjectiveApi, SubjectiveAnswer } from "@/lib/api/subjective";
import { cn } from "@/lib/utils";

// Helper component for Annotation marking
function AnnotatableText({ 
  text, 
  annotations, 
  onAnnotate 
}: { 
  text: string, 
  annotations: any[],
  onAnnotate: (text: string, start: number, end: number, comment: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Get robust offset calculation
    let startOffset = 0;
    
    // Very simplified offset calculation for demonstration.
    // In a real robust system, we would map selection range against the entire text node.
    // Here we'll do a simple indexOf, which is brittle if there are duplicate phrases.
    const fullText = containerRef.current?.innerText || "";
    startOffset = fullText.indexOf(selectedText);
    if (startOffset === -1) return; // fallback
    
    const endOffset = startOffset + selectedText.length;

    const comment = prompt("Enter your comment for this highlighted section:");
    if (comment && comment.trim()) {
      onAnnotate(selectedText, startOffset, endOffset, comment.trim());
      selection.removeAllRanges();
    }
  };

  // Sort annotations by start_offset
  const sorted = [...annotations].sort((a, b) => a.start_offset - b.start_offset);
  
  let lastIndex = 0;
  const parts = [];

  sorted.forEach((ann, i) => {
    // Only safe if indices are valid and don't overlap
    if (ann.start_offset > lastIndex) {
      parts.push(text.substring(lastIndex, ann.start_offset));
    }
    
    parts.push(
      <span 
        key={`ann-${i}`} 
        className="bg-yellow-200 border-b-2 border-yellow-400 cursor-help relative group"
      >
        {text.substring(ann.start_offset, ann.end_offset)}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[250px] bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
          <div className="font-bold text-yellow-300 mb-1">Annotation</div>
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

  return (
    <div 
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className="whitespace-pre-wrap leading-relaxed font-serif text-[16px] text-slate-800"
    >
      {parts}
    </div>
  );
}

export default function TeacherEvaluationDashboard() {
  const [pendingAnswers, setPendingAnswers] = useState<SubjectiveAnswer[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  
  const [selectedAnswer, setSelectedAnswer] = useState<SubjectiveAnswer | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Evaluation State
  const [marks, setMarks] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load List
  useEffect(() => {
    async function loadList() {
      try {
        const data = await subjectiveApi.getPendingEvaluations('submitted');
        setPendingAnswers(data);
      } catch (e) {
        console.error("Failed to load list", e);
      } finally {
        setLoadingList(false);
      }
    }
    loadList();
  }, []);

  const handleSelectAnswer = async (id: number) => {
    setLoadingDetail(true);
    setSelectedAnswer(null); // Clear previous
    // Reset forms
    setMarks("");
    setFeedback("");
    setYoutubeUrl("");

    try {
      const data = await subjectiveApi.getAnswerForEvaluation(id);
      setSelectedAnswer(data);
      if (data.evaluation) {
        setMarks(data.evaluation.marks_obtained.toString());
        setFeedback(data.evaluation.feedback || "");
        if (data.evaluation.video_feedback) {
          setYoutubeUrl(data.evaluation.video_feedback.youtube_url || "");
        }
      }
    } catch (e) {
      console.error("Failed to load detail", e);
      alert("Failed to load answer details.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAnnotate = async (text: string, start: number, end: number, comment: string) => {
    if (!selectedAnswer) return;
    
    // Check if evaluation object exists; if not, we must create it first by saving marks/feedback.
    // For simplicity, we require the teacher to save basic evaluation first, or we auto-save a zero-mark draft.
    // In this MVP, we'll try to add it. The API needs the Answer ID.
    try {
      const newAnn = await subjectiveApi.addAnnotation(selectedAnswer.id, text, comment, start, end);
      // Update local state
      setSelectedAnswer(prev => {
        if (!prev) return prev;
        const newEval = prev.evaluation || { marks_obtained: 0, feedback: '', annotations: [], video_feedback: null } as any;
        return {
          ...prev,
          evaluation: {
            ...newEval,
            annotations: [...(newEval.annotations || []), newAnn]
          }
        };
      });
    } catch (e) {
      console.error("Annotation failed", e);
      alert("Please Save Evaluation marks/feedback first before adding annotations.");
    }
  };

  const handleSaveEvaluation = async () => {
    if (!selectedAnswer) return;
    setSubmitting(true);
    try {
      // 1. Save Marks and Text Feedback
      const m = parseFloat(marks) || 0;
      if (m > selectedAnswer.question.marks) {
        alert(`Marks cannot exceed ${selectedAnswer.question.marks}`);
        setSubmitting(false);
        return;
      }
      
      const evalData = await subjectiveApi.evaluateAnswer(selectedAnswer.id, m, feedback);
      
      // 2. Save Video URL if provided
      let finalEval = evalData;
      if (youtubeUrl.trim()) {
        const vf = await subjectiveApi.addVideoFeedback(selectedAnswer.id, youtubeUrl);
        finalEval = { ...finalEval, video_feedback: vf };
      }

      // Update local
      setSelectedAnswer(prev => prev ? { ...prev, evaluation: finalEval, status: 'evaluated' } : null);
      
      // Update list
      setPendingAnswers(prev => prev.filter(a => a.id !== selectedAnswer.id));

      alert("Evaluation saved successfully!");
      
    } catch (e) {
      console.error("Failed to save evaluation", e);
      alert("Failed to save evaluation. Check if video URL is valid.");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] h-screen overflow-hidden">
      {/* HEADER */}
      <header className="h-16 bg-[#0B2545] text-white flex items-center px-6 shrink-0 shadow-md z-10">
        <Target className="w-5 h-5 mr-3 text-blue-300" />
        <h1 className="text-[16px] font-bold tracking-wide">TEACHER EVALUATION DESK</h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL - LIST */}
        <div className="w-[350px] bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-[#0B2545] flex items-center gap-2">
              <FileText className="w-4 h-4" /> Pending ({pendingAnswers.length})
            </h2>
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full">
              <Search className="w-4 h-4 text-slate-500" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingList ? (
              <div className="p-8 text-center text-slate-400">Loading...</div>
            ) : pendingAnswers.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No pending submissions.</div>
            ) : (
              pendingAnswers.map(ans => (
                <button
                  key={ans.id}
                  onClick={() => handleSelectAnswer(ans.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl transition-all border",
                    selectedAnswer?.id === ans.id 
                      ? "bg-blue-50 border-blue-200 shadow-sm" 
                      : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-bold text-[#0B2545]">{ans.student_name}</span>
                    <span className="text-[11px] font-medium text-slate-400">{new Date(ans.submitted_at || '').toLocaleDateString()}</span>
                  </div>
                  <div className="text-[12px] text-slate-600 truncate mb-2">
                    {ans.question.text}
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-400">{ans.word_count} words</span>
                    <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{ans.question.marks} Marks</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>


        {/* RIGHT PANEL - DETAIL */}
        <div className="flex-1 bg-[#f8fafc] flex overflow-hidden">
          {loadingDetail ? (
             <div className="flex-1 flex justify-center items-center">
               <div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : !selectedAnswer ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-medium">Select a submission from the queue to evaluate</p>
            </div>
          ) : (
            <div className="flex-1 flex h-full">
              
              {/* Answer Column */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col">
                <div className="max-w-[800px] w-full mx-auto flex-1">
                  
                  {/* Question Reference */}
                  <div className="bg-white border border-slate-200 rounded-[16px] p-6 mb-6 shadow-sm">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Question</div>
                    <h3 className="text-[16px] font-bold text-[#0B2545] leading-relaxed mb-4">
                      {selectedAnswer.question.text}
                    </h3>
                    <div className="flex gap-4">
                      <span className="text-[12px] font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-100">
                        Max Marks: {selectedAnswer.question.marks}
                      </span>
                      {selectedAnswer.question.model_answer && (
                        <span className="text-[12px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-lg border border-slate-200 flex items-center gap-1 cursor-pointer hover:bg-slate-200 transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" /> View Model Answer
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Student Answer */}
                  <div className="bg-white border border-slate-200 rounded-[16px] overflow-hidden shadow-sm">
                    <div className="h-12 bg-slate-50 border-b border-slate-200 flex items-center px-6 justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-[13px] font-bold text-[#0B2545]">{selectedAnswer.student_name}'s Answer</span>
                      </div>
                      <div className="text-[12px] font-medium text-slate-500">
                        {selectedAnswer.word_count} words
                      </div>
                    </div>
                    
                    <div className="p-6 md:p-8 min-h-[300px]">
                      <div className="mb-4 text-[12px] font-medium text-slate-400 flex items-center gap-1 bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-200 inline-flex">
                        <MessageCircle className="w-3.5 h-3.5" />
                        Highlight any text to add an annotation. (Save marks first if brand new)
                      </div>
                      
                      <AnnotatableText 
                        text={selectedAnswer.answer_text} 
                        annotations={selectedAnswer.evaluation?.annotations || []}
                        onAnnotate={handleAnnotate}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Evaluation Sidebar */}
              <div className="w-[380px] bg-white border-l border-slate-200 shrink-0 flex flex-col">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-[16px] font-bold text-[#0B2545] flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4" /> Assessment
                  </h3>
                  <p className="text-[12px] text-slate-500">Provide marks, feedback, and video.</p>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                  
                  {/* Marks */}
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Marks Obtained <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        min="0" max={selectedAnswer.question.marks} step="0.5"
                        value={marks}
                        onChange={(e) => setMarks(e.target.value)}
                        className="w-24 h-12 rounded-[12px] border-2 border-slate-200 text-center font-bold text-[18px] text-[#0B2545] outline-none focus:border-blue-500 transition-colors"
                      />
                      <span className="text-[16px] font-bold text-slate-400">/ {selectedAnswer.question.marks}</span>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Written Feedback <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide constructive feedback here..."
                      className="w-full h-40 rounded-[12px] border-2 border-slate-200 p-4 text-[14px] text-slate-700 outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed"
                    />
                  </div>

                  {/* Video Feedback */}
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-red-500" /> Video Feedback (Optional)
                    </label>
                    <div className="text-[11px] text-slate-500 mb-2">
                      Record a short review, upload to YouTube (Unlisted), and paste the link.
                    </div>
                    <input 
                      type="url" 
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtu.be/..."
                      className="w-full h-12 rounded-[12px] border-2 border-slate-200 px-4 text-[14px] text-slate-700 outline-none focus:border-blue-500 transition-colors"
                    />
                    
                    {selectedAnswer.evaluation?.video_feedback?.embed_url && (
                      <div className="mt-3 aspect-video rounded-[12px] overflow-hidden bg-slate-900 border border-slate-200 relative">
                        <iframe 
                          src={selectedAnswer.evaluation.video_feedback.embed_url}
                          className="w-full h-full absolute inset-0"
                          frameBorder="0"
                          allowFullScreen
                        ></iframe>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 mt-auto">
                  <Button 
                    onClick={handleSaveEvaluation}
                    disabled={submitting || !marks || !feedback}
                    className="w-full h-12 bg-[#0B2545] hover:bg-[#1a365d] text-white font-bold"
                  >
                    {submitting ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Complete Evaluation</>}
                  </Button>
                </div>

              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
