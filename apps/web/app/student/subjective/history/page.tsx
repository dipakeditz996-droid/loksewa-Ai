"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { History, FileText, CheckCircle2, Clock, ArrowRight, BookOpen, Target, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subjectiveApi, SubjectiveAttempt } from "@/lib/api/subjective";

export default function SubjectiveHistoryPage() {
  const [attempts, setAttempts] = useState<SubjectiveAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await subjectiveApi.getAttemptsHistory();
        setAttempts(data);
      } catch (error) {
        console.error("Failed to load subjective history", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getModeIcon = (mode: string) => {
    switch(mode) {
      case 'practice': return <BookOpen className="w-5 h-5 text-blue-500" />;
      case 'model_exam': return <Target className="w-5 h-5 text-purple-500" />;
      case 'topic': return <FileText className="w-5 h-5 text-green-500" />;
      default: return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  const getModeLabel = (mode: string) => {
    switch(mode) {
      case 'practice': return 'Practice Set';
      case 'model_exam': return 'Model Exam';
      case 'topic': return 'Topic Practice';
      default: return mode;
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 p-4 md:p-8">
      
      <Link href="/student/subjective" className="inline-flex items-center text-[14px] font-bold text-slate-500 hover:text-[#0B2545] transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Subjective Practice
      </Link>

      <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 md:p-10 border-b border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
            <History className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-[#0B2545]">My Evaluations & History</h1>
            <p className="text-slate-500">Track your subjective submissions and view teacher feedback.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : attempts.length === 0 ? (
        <div className="bg-white rounded-[16px] border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-[18px] font-bold text-[#0B2545] mb-2">No History Yet</h3>
          <p className="text-slate-500 mb-6">You haven't attempted any subjective practice yet.</p>
          <Link href="/student/subjective">
            <Button className="bg-[#0B2545] text-white font-bold">Start Practicing</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {attempts.map(attempt => {
            const date = new Date(attempt.started_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            });
            
            // Check status of answers in this attempt
            const evaluatedCount = attempt.answers.filter(a => a.status === 'evaluated' || a.status === 'returned').length;
            const totalCount = attempt.answers.length;
            const isFullyEvaluated = evaluatedCount > 0 && evaluatedCount === totalCount;
            const hasAnyEvaluation = evaluatedCount > 0;

            const title = attempt.mode === 'practice' ? attempt.practice_set_detail?.title :
                          attempt.mode === 'model_exam' ? attempt.model_exam_detail?.title :
                          `${attempt.answers.length} Topic Questions`;

            return (
              <div key={attempt.id} className="bg-white rounded-[16px] border border-slate-200 p-6 flex flex-col md:flex-row gap-6 shadow-sm hover:border-slate-300 transition-colors">
                
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                  {getModeIcon(attempt.mode)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">{getModeLabel(attempt.mode)}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="text-[12px] font-bold text-slate-500">{date}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    
                    {attempt.status === 'in-progress' ? (
                      <span className="text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">In Progress</span>
                    ) : isFullyEvaluated ? (
                      <span className="text-[11px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Evaluated</span>
                    ) : (
                      <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase flex items-center gap-1"><Clock className="w-3 h-3"/> Under Review</span>
                    )}
                  </div>

                  <h3 className="text-[18px] font-bold text-[#0B2545] mb-4">
                    {title}
                  </h3>

                  <div className="flex items-center gap-6">
                    <div className="text-[14px] text-slate-600">
                      <strong>{totalCount}</strong> Questions
                    </div>
                    {attempt.status === 'submitted' && (
                      <div className="text-[14px] text-slate-600">
                        <strong>{evaluatedCount} / {totalCount}</strong> Evaluated
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-end md:border-l border-slate-100 md:pl-6">
                  {attempt.status === 'in-progress' ? (
                    <Link href={`/subjective/answer?attempt_id=${attempt.id}`}>
                      <Button className="w-full md:w-auto h-10 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold">
                        Continue Draft <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  ) : hasAnyEvaluation ? (
                    <Link href={`/student/subjective/evaluation/${attempt.id}`}>
                      <Button className="w-full md:w-auto h-10 bg-[#0B2545] hover:bg-[#1a365d] text-white font-bold">
                        View Feedback <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled variant="outline" className="w-full md:w-auto h-10 text-slate-400 font-bold border-slate-200">
                      Pending Review
                    </Button>
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
