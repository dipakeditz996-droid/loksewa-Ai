"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Clock, Target, ArrowRight, Trophy, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { modelExamApi, ModelExamAttempt } from "@/lib/api/modelExam";
import { cn } from "@/lib/utils";

export default function ModelExamHistoryPage() {
  const [history, setHistory] = useState<ModelExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await modelExamApi.getHistory();
        // filter out in-progress ones, only show submitted, or show in-progress as resume?
        // history endpoint returns all, let's just show all for now
        setHistory(data);
      } catch (error) {
        console.error("Failed to load model exam history", error);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    }).format(date);
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      {/* HEADER */}
      <div className="bg-white rounded-[20px] p-8 border border-slate-200">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
            <Trophy className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-[#0B2545]">Model Exam History</h1>
            <p className="text-slate-500">Review your past performance and track improvements.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-[16px] border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-[18px] font-bold text-[#0B2545] mb-2">No History Found</h3>
          <p className="text-slate-500 mb-6">You haven't attempted any model exams yet.</p>
          <Link href="/student/model-exams">
             <Button className="bg-[#0B2545] text-white">Browse Model Exams</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map(attempt => {
            const isSubmitted = attempt.status === 'submitted';
            const passed = attempt.model_exam.passing_marks !== null ? attempt.score >= attempt.model_exam.passing_marks : null;

            return (
              <div key={attempt.id} className="bg-white rounded-[16px] border border-slate-200 p-6 flex flex-col md:flex-row md:items-center gap-6 shadow-sm hover:border-slate-300 transition-colors">
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[12px] font-bold text-slate-400">{formatDate(attempt.started_at)}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className={cn(
                      "text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                      isSubmitted ? (
                        passed === true ? "bg-green-50 text-green-600 border-green-200" :
                        passed === false ? "bg-red-50 text-red-600 border-red-200" :
                        "bg-blue-50 text-blue-600 border-blue-200"
                      ) : "bg-orange-50 text-orange-600 border-orange-200"
                    )}>
                      {isSubmitted ? (passed === true ? "Passed" : passed === false ? "Failed" : "Completed") : "In Progress"}
                    </span>
                  </div>
                  <h3 className="text-[18px] font-bold text-[#0B2545] mb-4">{attempt.model_exam.title}</h3>
                  
                  {isSubmitted && (
                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">Score</div>
                        <div className="text-[15px] font-bold text-[#0B2545]">{attempt.score} / {attempt.model_exam.total_marks}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">Accuracy</div>
                        <div className="text-[15px] font-bold text-[#0B2545]">{Math.round(attempt.accuracy)}%</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">Time</div>
                        <div className="text-[15px] font-bold text-[#0B2545]">{formatTime(attempt.time_taken_seconds)}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:border-l border-slate-100 md:pl-6 shrink-0">
                  {isSubmitted ? (
                    <Link href={`/model-exams/result?attempt_id=${attempt.id}`}>
                      <Button variant="outline" className="w-full md:w-auto h-12 px-6 border-slate-200 text-[#0B2545] font-bold hover:bg-slate-50">
                        View Result <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/model-exams/session?exam_id=${attempt.model_exam.id}`}>
                      <Button className="w-full md:w-auto h-12 px-6 bg-[#D4A72C] hover:bg-[#b58e23] text-[#0A1118] font-bold">
                        Resume Exam <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
