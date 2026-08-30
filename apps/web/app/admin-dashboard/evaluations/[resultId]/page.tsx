"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { evaluationService } from "@/lib/api/evaluations";
import { EvaluationDetail, ResultStatus } from "@/lib/api/evaluations-types";
import { Skeleton } from "@/components/ui/skeleton";
import { RetryImage } from "@/components/ui/retry-image";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Printer,
  FileText,
  Save,
  MessageSquare,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: ResultStatus }) {
  const config: Record<ResultStatus, { label: string; cls: string }> = {
    Published: { label: "Published", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    Evaluated: { label: "Evaluated", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    Processing: { label: "Processing", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    Draft: { label: "Draft", cls: "bg-slate-100 text-slate-500 border-slate-200" },
    Pending: { label: "Pending", cls: "bg-purple-50 text-purple-700 border-purple-200" },
    Unpublished: { label: "Unpublished", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  };
  const c = config[status] || config.Draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[12px] font-semibold rounded-full border ${c.cls}`}>
      {c.label}
    </span>
  );
}

export default function ResultDetailPage() {
  const { resultId } = useParams() as { resultId: string };
  const router = useRouter();
  const [detail, setDetail] = useState<EvaluationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustScore, setAdjustScore] = useState<string>("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await evaluationService.getResultDetail(resultId);
      setDetail(data);
      setAdjustScore(data.score.toString());
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    if (resultId) fetchDetail();
  }, [fetchDetail, resultId]);

  const handleAdjustScore = async () => {
    if (!adjustReason || !adjustScore) return;
    setIsAdjusting(true);
    try {
      await evaluationService.adjustResult(resultId, { newScore: parseFloat(adjustScore), reason: adjustReason });
      await fetchDetail(); // Refresh data
      setAdjustReason("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdjusting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-[1200px] mx-auto min-h-screen">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="bg-white rounded-xl h-[200px] border border-slate-200 p-6 shadow-sm"><Skeleton className="h-full w-full" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl h-[300px] border border-slate-200 p-6 col-span-2 shadow-sm"><Skeleton className="h-full w-full" /></div>
          <div className="bg-white rounded-xl h-[300px] border border-slate-200 p-6 shadow-sm"><Skeleton className="h-full w-full" /></div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto text-center mt-20">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Unable to load evaluation details</h2>
        <button onClick={fetchDetail} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg">Try Again</button>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1400px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Evaluations
        </button>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">
            <Printer className="h-4 w-4" /> Print Report
          </button>
          {detail.status === "Published" ? (
            <button 
              onClick={async () => { await evaluationService.unpublishResult(resultId); fetchDetail(); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 shadow-sm transition-colors"
            >
              Unpublish Result
            </button>
          ) : (
            <button 
              onClick={async () => { await evaluationService.publishResult(resultId); fetchDetail(); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
            >
              Publish Result
            </button>
          )}
        </div>
      </div>

      {/* Header Profile Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <StatusBadge status={detail.status} />
        </div>
        
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
          {/* Avatar */}
          <div className="h-24 w-24 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-3xl font-bold shrink-0 shadow-lg border-4 border-white">
            {detail.studentAvatar ? (
              <RetryImage src={detail.studentAvatar} alt={detail.studentName} className="h-full w-full object-cover rounded-full" />
            ) : detail.studentName.charAt(0)}
          </div>
          
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-[#0B2545]">{detail.studentName}</h1>
            <p className="text-[15px] font-medium text-slate-500 mt-1">{detail.examName}</p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-[13px] text-slate-500">
              <span className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-slate-400" /> {detail.position}</span>
              <span className="flex items-center gap-1.5"><Award className="h-4 w-4 text-slate-400" /> Attempt #{detail.attemptNumber}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" /> {Math.round(detail.timeTakenSeconds / 60)} mins</span>
            </div>
          </div>
          
          {/* Score Indicator */}
          <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-6 min-w-[200px] border border-slate-100">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Final Score</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-[42px] font-black leading-none ${detail.percentage >= 40 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {detail.score}
              </span>
              <span className="text-lg font-bold text-slate-400">/{detail.totalScore}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-bold text-slate-600">{detail.percentage}%</span>
              <span className={`px-2 py-0.5 text-[11px] font-bold rounded ${detail.passFail === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {detail.passFail.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Questions List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-[#0B2545]">Question Evaluation</h2>
              <div className="flex items-center gap-3 text-[12px] font-medium text-slate-500">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {detail.correctAnswers} Correct</span>
                <span className="flex items-center gap-1"><XCircle className="h-4 w-4 text-rose-500" /> {detail.incorrectAnswers} Incorrect</span>
              </div>
            </div>
            
            <div className="divide-y divide-slate-100">
              {detail.questions.map((q) => (
                <div key={q.id} className="p-6">
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 flex items-center justify-center h-7 w-7 rounded bg-slate-100 text-[13px] font-bold text-slate-600">
                        Q{q.questionNumber}
                      </span>
                      <p className="text-[15px] font-medium text-slate-800 leading-snug pt-0.5">
                        {q.questionText}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded ${
                        q.status === 'Correct' ? 'bg-emerald-50 text-emerald-700' :
                        q.status === 'Incorrect' ? 'bg-rose-50 text-rose-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {q.status}
                      </span>
                      <p className="text-[12px] font-bold text-slate-500 mt-1">
                        {q.marksObtained > 0 ? '+' : ''}{q.marksObtained} / {q.maxMarks}
                      </p>
                    </div>
                  </div>
                  
                  {/* Answer Options */}
                  <div className="pl-10 mb-4">
                    {q.type === 'mcq' && q.options && (
                      <div className="space-y-2">
                        {q.options.map((opt) => {
                          const isStudentSelected = q.studentAnswer === opt.key;
                          const isCorrectOpt = opt.key === q.correctAnswer;
                          
                          let bgClass = "bg-slate-50 border-slate-200 text-slate-600";
                          let icon = null;

                          if (isStudentSelected && isCorrectOpt) {
                            bgClass = "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold";
                            icon = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
                          } else if (isStudentSelected && !isCorrectOpt) {
                            bgClass = "bg-rose-50 border-rose-300 text-rose-800";
                            icon = <XCircle className="h-4 w-4 text-rose-500 shrink-0" />;
                          } else if (!isStudentSelected && isCorrectOpt) {
                            bgClass = "bg-blue-50 border-blue-300 text-blue-800 font-semibold";
                            icon = <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />;
                          }

                          return (
                            <div key={opt.key} className={cn("flex items-center gap-3 p-3 rounded-lg border", bgClass)}>
                              <span className="flex items-center justify-center h-6 w-6 rounded bg-white border border-slate-200 text-[12px] font-bold shrink-0">
                                {opt.key}
                              </span>
                              <span className="text-[14px] flex-1">{opt.text}</span>
                              {icon}
                              {isStudentSelected && <span className="text-[11px] font-bold uppercase ml-2 opacity-70">Student Selected</span>}
                              {!isStudentSelected && isCorrectOpt && <span className="text-[11px] font-bold uppercase ml-2 opacity-70">Correct Answer</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'subjective' && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">Student Answer</p>
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-[14px] text-slate-700 whitespace-pre-wrap">
                            {q.studentAnswer || <span className="italic text-slate-400">No answer provided.</span>}
                          </div>
                        </div>
                        <div>
                          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expected Answer</p>
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-[14px] text-blue-800 whitespace-pre-wrap">
                            {q.correctAnswer}
                          </div>
                        </div>
                        
                        {/* Manual Grading Interface */}
                        <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl mt-4">
                          <h4 className="text-[13px] font-bold text-amber-800 mb-3 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" /> Admin Evaluation
                          </h4>
                          <div className="flex gap-4 items-start">
                            <div className="w-24 shrink-0">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">Marks</label>
                              <div className="flex items-center gap-2 mt-1">
                                <input 
                                  type="number" 
                                  defaultValue={q.marksObtained}
                                  max={q.maxMarks}
                                  min={0}
                                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                                <span className="text-[13px] font-bold text-slate-400">/ {q.maxMarks}</span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">Remarks</label>
                              <textarea 
                                defaultValue={q.examinerRemarks}
                                placeholder="Add comments for the student..."
                                className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[60px]"
                              />
                            </div>
                            <div className="shrink-0 mt-5">
                              <button className="px-3 py-2 bg-amber-500 text-white rounded text-sm font-medium hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-1.5">
                                <Save className="h-4 w-4" /> Save
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Explanation */}
                  {q.explanation && q.type !== 'subjective' && (
                    <div className="pl-10">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[13px] text-slate-600">
                        <span className="font-bold text-slate-700 mr-2">Explanation:</span>
                        {q.explanation}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Analytics & Controls */}
        <div className="space-y-6">
          
          {/* Result Adjustment */}
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="bg-amber-50 px-5 py-4 border-b border-amber-100 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <h2 className="text-sm font-bold text-amber-800">Manual Adjustment</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[12px] font-bold text-slate-500 uppercase">Adjust Score</label>
                <div className="flex items-center gap-3 mt-1">
                  <input 
                    type="number"
                    value={adjustScore}
                    onChange={e => setAdjustScore(e.target.value)}
                    className="w-24 px-3 py-2 text-sm border border-slate-300 rounded font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <span className="text-sm text-slate-400 font-medium">Original: {detail.score}</span>
                </div>
              </div>
              <div>
                <label className="text-[12px] font-bold text-slate-500 uppercase">Reason (Required)</label>
                <textarea 
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="e.g., Question 2 answer key was incorrect."
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[80px]"
                />
              </div>
              <button 
                onClick={handleAdjustScore}
                disabled={!adjustReason || !adjustScore || isAdjusting}
                className="w-full px-4 py-2 bg-amber-100 text-amber-800 font-bold rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors text-sm"
              >
                {isAdjusting ? 'Saving...' : 'Save Adjustment'}
              </button>
            </div>
          </div>

          {/* Audit Trail */}
          {detail.auditTrail.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-bold text-[#0B2545]">Audit Trail</h2>
              </div>
              <div className="p-5 space-y-4">
                {detail.auditTrail.map((audit) => (
                  <div key={audit.id} className="text-[13px] border-l-2 border-slate-200 pl-3">
                    <p className="font-semibold text-slate-700">{audit.action} <span className="font-normal text-slate-400 text-[11px] ml-2">{new Date(audit.timestamp).toLocaleDateString()}</span></p>
                    <p className="text-slate-500 mt-1 leading-snug">Changed from <span className="font-bold text-slate-600">{audit.previousValue}</span> to <span className="font-bold text-slate-600">{audit.newValue}</span> by {audit.adminName}</p>
                    <p className="text-slate-500 italic mt-1 text-[12px]">"{audit.reason}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subject Performance */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-bold text-[#0B2545]">Subject Performance</h2>
            </div>
            <div className="p-5 space-y-4">
              {detail.subjectPerformance.map((sub, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1 text-[13px]">
                    <span className="font-medium text-slate-700">{sub.subject}</span>
                    <span className="font-bold text-slate-600">{sub.percentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${sub.percentage >= 60 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${sub.percentage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{sub.correct}/{sub.attempted} Correct</p>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
