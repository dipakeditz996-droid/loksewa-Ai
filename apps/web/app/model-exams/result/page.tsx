"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Trophy, Target, Clock, AlertTriangle, CheckCircle2, 
  XCircle, ArrowRight, Home, ChevronDown, ChevronUp, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { modelExamApi, SubmitModelExamResponse, ModelExamAttempt } from "@/lib/api/modelExam";
import { cn } from "@/lib/utils";

function ModelExamResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptIdStr = searchParams.get("attempt_id");
  
  const [result, setResult] = useState<SubmitModelExamResponse | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!attemptIdStr) {
      router.push("/student/model-exams");
      return;
    }
    const attemptId = parseInt(attemptIdStr, 10);
    
    async function fetchResult() {
      try {
        const data = await modelExamApi.getResult(attemptId);
        setResult(data);
      } catch (e) {
        console.error("Failed to fetch result", e);
        setError(true);
      }
    }
    
    fetchResult();
  }, [attemptIdStr, router]);

  if (error) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-red-500 font-bold">Failed to load result.</div>;
  if (!result) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div></div>;

  const { attempt, answers } = result;
  const exam = attempt.model_exam;
  
  // Calculations
  const total = exam.total_questions;
  const correct = attempt.correct_count;
  const incorrect = attempt.incorrect_count;
  const unanswered = attempt.unanswered_count;
  const accuracy = Math.round(attempt.accuracy);
  const score = attempt.score;
  const maxScore = exam.total_marks;
  const passed = exam.passing_marks !== null ? score >= exam.passing_marks : null;
  
  const topicStats: Record<string, { total: number, correct: number }> = {};

  answers.forEach(ans => {
    const topicName = (ans.question as any).topic?.title || (ans.question as any).topic?.name || "General";
    
    if (!topicStats[topicName]) {
      topicStats[topicName] = { total: 0, correct: 0 };
    }
    topicStats[topicName]!.total += 1;

    if (ans.is_correct) {
      topicStats[topicName]!.correct += 1;
    }
  });

  // Weak/Strong Topic Detection
  const topics = Object.entries(topicStats).map(([name, stats]) => ({
    name,
    total: stats.total,
    correct: stats.correct,
    percentage: Math.round((stats.correct / stats.total) * 100)
  }));

  const strongTopics = topics.filter(t => t.percentage >= 75);
  const weakTopics = topics.filter(t => t.percentage < 60);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* HEADER */}
      <header className={cn(
        "text-white py-12 px-4 md:px-8",
        passed === true ? "bg-green-700" : passed === false ? "bg-red-700" : "bg-[#0B2545]"
      )}>
        <div className="max-w-[1000px] mx-auto text-center space-y-4">
          {passed === true ? (
            <Trophy className="w-16 h-16 text-yellow-300 mx-auto mb-2" />
          ) : passed === false ? (
            <AlertTriangle className="w-16 h-16 text-red-200 mx-auto mb-2" />
          ) : (
            <FileText className="w-16 h-16 text-blue-200 mx-auto mb-2" />
          )}
          
          <h1 className="text-[32px] md:text-[40px] font-bold tracking-tight">
            {passed === true ? "Congratulations! You Passed" : passed === false ? "Needs Improvement" : "Examination Complete"}
          </h1>
          <p className="text-white/80 text-[16px] md:text-[18px]">
            {exam.title}
          </p>
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-4 md:px-8 -mt-8 relative z-10 space-y-8">
        
        {/* METRICS GRID */}
        <div className="bg-white rounded-[16px] shadow-sm border border-slate-200 p-4 md:p-8 grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8">
          <div className="col-span-2 md:col-span-1 text-center md:text-left md:border-r border-slate-100 pr-4">
            <div className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-1">Score</div>
            <div className="text-[36px] font-bold text-[#0B2545] leading-none">{score} <span className="text-[18px] text-slate-400">/ {maxScore}</span></div>
          </div>
          <div className="text-center">
            <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">Accuracy</div>
            <div className="text-[24px] font-bold text-[#0B2545]">{accuracy}%</div>
          </div>
          <div className="text-center">
            <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">Correct</div>
            <div className="text-[24px] font-bold text-green-600">{correct}</div>
          </div>
          <div className="text-center">
            <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">Incorrect</div>
            <div className="text-[24px] font-bold text-red-600">{incorrect}</div>
          </div>
          <div className="text-center">
            <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">Time Taken</div>
            <div className="text-[24px] font-bold text-[#0B2545]">{formatTime(attempt.time_taken_seconds)}</div>
          </div>
        </div>

        {/* PERFORMANCE SUMMARY */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-[16px] shadow-sm border border-slate-200 p-6 md:p-8">
            <h2 className="text-[18px] font-bold text-[#0B2545] mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" /> Strong Areas
            </h2>
            {strongTopics.length > 0 ? (
              <ul className="space-y-3">
                {strongTopics.map(t => (
                  <li key={t.name} className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
                    <span className="text-[15px] text-slate-600 leading-relaxed">
                      Strong performance in <strong>{t.name}</strong> ({t.percentage}% accuracy).
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] text-slate-500 italic">Review the topics below to see where you performed best.</p>
            )}
          </div>
          
          <div className="bg-white rounded-[16px] shadow-sm border border-slate-200 p-6 md:p-8">
            <h2 className="text-[18px] font-bold text-[#0B2545] mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Areas to improve
            </h2>
            {weakTopics.length > 0 ? (
              <ul className="space-y-3">
                {weakTopics.map(t => (
                  <li key={t.name} className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-orange-500 shrink-0"></div>
                    <span className="text-[15px] text-slate-600 leading-relaxed">
                      <strong>{t.name}</strong> needs more focus ({t.percentage}% accuracy).
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] text-slate-500 italic">No major weak areas identified.</p>
            )}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
          <Link href="/student/model-exams/history" className="w-full sm:w-auto">
             <Button className="w-full sm:w-auto bg-[#D4A72C] text-[#0A1118] hover:bg-[#b58e23] h-12 px-8 font-bold text-[15px]">
               View Exam History
             </Button>
          </Link>
          <div className="hidden sm:block flex-1"></div>
          <Link href="/student/model-exams" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto h-12 px-6 font-bold text-[#0B2545]">
              <Home className="w-4 h-4 mr-2" /> Back to Model Exams
            </Button>
          </Link>
        </div>

        {/* QUESTION REVIEW */}
        <div className="space-y-4">
          <h2 className="text-[20px] font-bold text-[#0B2545] mb-6 pt-4">Official Question Review</h2>
          
          {answers.map((ans, idx) => {
            const q: any = ans.question;
            const isCorrect = ans.is_correct;
            const isUnanswered = ans.selected_option == null;
            const isExpanded = expandedQuestion === q.id;
            
            const optionsMap: any = {
              'A': q.option_a,
              'B': q.option_b,
              'C': q.option_c,
              'D': q.option_d
            };

            return (
              <div key={q.id} className="bg-white rounded-[12px] shadow-sm border border-slate-200 overflow-hidden">
                <div 
                  className="p-5 flex items-start gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                >
                  <div className="mt-1 shrink-0">
                    {isCorrect ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : isUnanswered ? (
                      <AlertTriangle className="w-6 h-6 text-slate-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[12px] font-bold text-slate-500">Q{idx + 1}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="text-[12px] font-bold text-slate-500">{q.topic?.title || "Topic"}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className={cn("text-[12px] font-bold", 
                        q.difficulty === "hard" ? "text-red-500" :
                        q.difficulty === "medium" ? "text-orange-500" : "text-green-500"
                      )}>{q.difficulty}</span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-[#0B2545] leading-snug">
                      {q.text}
                    </h3>
                  </div>
                  <div className="shrink-0 text-slate-400 mt-2">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-5 pt-0 border-t border-slate-100 bg-slate-50/50 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4 mt-4">
                      <div className={cn("p-4 rounded-[8px] border", isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
                        <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: isCorrect ? '#16a34a' : '#dc2626' }}>
                          Your Answer
                        </div>
                        <div className="text-[14px] font-medium text-[#0B2545]">
                          {isUnanswered ? "Not Answered" : `${ans.selected_option} - ${optionsMap[ans.selected_option!]}`}
                        </div>
                      </div>
                      <div className="p-4 rounded-[8px] border bg-green-50 border-green-200">
                        <div className="text-[12px] font-bold uppercase tracking-wider mb-1 text-green-600">
                          Correct Answer
                        </div>
                        <div className="text-[14px] font-medium text-[#0B2545]">
                           {q.correct_option} - {optionsMap[q.correct_option]}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-5 rounded-[8px] bg-white border border-slate-200">
                      <div className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2">Explanation</div>
                      <p className="text-[14px] text-slate-700 leading-relaxed">
                        {q.explanation || "No explanation provided for this question."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
      </div>
    </div>
  );
}

export default function ModelExamResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div></div>}>
      <ModelExamResultContent />
    </Suspense>
  )
}
