"use client";

import { practiceError } from "@/lib/practice-errors";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Trophy, Target, Clock, AlertTriangle, CheckCircle2, 
  XCircle, RotateCcw, ArrowRight, Home, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { practiceApi, SubmitSessionResponse, AttemptDetail } from "@/lib/api/practice";
import { cn } from "@/lib/utils";

function PracticeResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdStr = searchParams.get("session_id");
  
  const [result, setResult] = useState<SubmitSessionResponse | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionIdStr) {
      router.push("/student/practice");
      return;
    }
    const sessionId = parseInt(sessionIdStr, 10);
    
    async function fetchResult() {
      try {
        const data = await practiceApi.getSessionResult(sessionId);
        setResult(data);
      } catch (e) {
        console.error("Failed to fetch result", e);
        setError(practiceError(e, "result").message);
      }
    }
    
    fetchResult();
  }, [sessionIdStr, router]);

  if (error) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-red-500 font-bold text-center px-6" role="alert">{error}</div>;
  if (!result) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div></div>;

  const { session, attempts } = result;
  
  // Calculations
  const total = session.total_questions;
  const correct = session.correct_count;
  const incorrect = session.incorrect_count;
  const unanswered = session.unanswered_count;
  const accuracy = Math.round(session.accuracy);
  const score = session.score;
  
  const topicStats: Record<string, { total: number, correct: number }> = {};

  attempts.forEach(attempt => {
    // Note: topic might be an object or ID depending on serializer, assuming object with title here
    const topicName = (attempt.question as any).topic?.title || (attempt.question as any).topic?.name || "Topic";
    
    if (!topicStats[topicName]) {
      topicStats[topicName] = { total: 0, correct: 0 };
    }
    topicStats[topicName]!.total += 1;

    if (attempt.is_correct) {
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
    <div className="min-h-screen bg-background font-sans pb-20">
      
      {/* HEADER */}
      <header className="bg-[#0B2545] dark:bg-[#0D1B2A] text-white py-12 px-4 md:px-8 border-b border-border">
        <div className="max-w-[1000px] mx-auto text-center space-y-4">
          <Trophy className="w-16 h-16 text-[#D4A72C] mx-auto mb-2" />
          <h1 className="text-[32px] md:text-[40px] font-bold tracking-tight">Practice Complete</h1>
          <p className="text-white/70 text-[16px] md:text-[18px]">Review your performance and identify areas to improve.</p>
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-4 md:px-8 -mt-8 relative z-10 space-y-8">
        
        {/* METRICS GRID */}
        <div className="bg-card rounded-[16px] shadow-sm border border-border p-4 md:p-8 grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8">
          <div className="col-span-2 md:col-span-1 text-center md:text-left md:border-r border-border pr-4">
            <div className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Score</div>
            <div className="text-[36px] font-bold text-foreground leading-none">{score} <span className="text-[18px] text-muted-foreground">/ {total}</span></div>
          </div>
          <div className="text-center">
            <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Accuracy</div>
            <div className="text-[24px] font-bold text-foreground">{accuracy}%</div>
          </div>
          <div className="text-center">
            <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Correct</div>
            <div className="text-[24px] font-bold text-green-600 dark:text-green-400">{correct}</div>
          </div>
          <div className="text-center">
            <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Incorrect</div>
            <div className="text-[24px] font-bold text-red-600 dark:text-red-400">{incorrect}</div>
          </div>
          <div className="text-center">
            <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Time</div>
            <div className="text-[24px] font-bold text-foreground">{formatTime(session.time_taken_seconds)}</div>
          </div>
        </div>

        {/* PERFORMANCE SUMMARY */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-[16px] shadow-sm border border-border p-6 md:p-8">
            <h2 className="text-[18px] font-bold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" /> What you did well
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
              <p className="text-[15px] text-slate-500 italic">No particularly strong topics identified in this session.</p>
            )}
          </div>
          
          <div className="bg-card rounded-[16px] shadow-sm border border-border p-6 md:p-8">
            <h2 className="text-[18px] font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Areas to improve
            </h2>
            {weakTopics.length > 0 ? (
              <ul className="space-y-3">
                {weakTopics.map(t => (
                  <li key={t.name} className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-orange-500 shrink-0"></div>
                    <span className="text-[15px] text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">{t.name}</strong> needs more practice ({t.percentage}% accuracy).
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] text-muted-foreground italic">Great job! No major weak areas identified in this session.</p>
            )}
          </div>
        </div>

        {/* TOPIC PERFORMANCE */}
        <div className="bg-card rounded-[16px] shadow-sm border border-border p-6 md:p-8">
          <h2 className="text-[18px] font-bold text-foreground mb-6">Topic Performance</h2>
          <div className="space-y-6">
            {topics.map(t => (
              <div key={t.name}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[15px] font-bold text-foreground">{t.name}</span>
                  <div className="flex gap-4">
                    <span className="text-[14px] font-medium text-muted-foreground">{t.correct} / {t.total}</span>
                    <span className={cn("text-[14px] font-bold w-12 text-right", 
                      t.percentage >= 75 ? "text-green-600 dark:text-green-400" : 
                      t.percentage >= 60 ? "text-orange-500 dark:text-orange-400" : "text-red-500 dark:text-red-400"
                    )}>
                      {t.percentage}%
                    </span>
                  </div>
                </div>
                <Progress 
                  value={t.percentage} 
                  className="h-2 bg-muted" 
                  indicatorClassName={cn(
                    t.percentage >= 75 ? "bg-green-500" : 
                    t.percentage >= 60 ? "bg-orange-400" : "bg-red-500"
                  )} 
                />
              </div>
            ))}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
          <Button className="w-full sm:w-auto bg-[#D4A72C] text-[#0A1118] hover:bg-[#b58e23] h-12 px-8 font-bold text-[15px]">
            <Target className="w-4 h-4 mr-2" /> Practice Weak Topics
          </Button>
          <Button variant="outline" className="w-full sm:w-auto h-12 px-6 font-bold text-foreground border-border">
            <RotateCcw className="w-4 h-4 mr-2" /> Retry Incorrect
          </Button>
          <div className="hidden sm:block flex-1"></div>
          <Link href="/student/practice" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto h-12 px-6 font-bold text-foreground">
              <Home className="w-4 h-4 mr-2" /> Back to Practice
            </Button>
          </Link>
        </div>

        {/* QUESTION REVIEW */}
        <div className="space-y-4">
          <h2 className="text-[20px] font-bold text-foreground mb-6 pt-4">Question Review</h2>
          
          {attempts.map((attempt, idx) => {
            const q: any = attempt.question;
            const isCorrect = attempt.is_correct;
            const isUnanswered = attempt.selected_option == null;
            const isExpanded = expandedQuestion === q.id;
            
            const optionsMap: any = {
              'A': q.option_a,
              'B': q.option_b,
              'C': q.option_c,
              'D': q.option_d
            };

            return (
              <div key={q.id} className="bg-card rounded-[12px] shadow-sm border border-border overflow-hidden">
                <div 
                  className="p-5 flex items-start gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                >
                  <div className="mt-1 shrink-0">
                    {isCorrect ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : isUnanswered ? (
                      <AlertTriangle className="w-6 h-6 text-muted-foreground" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[12px] font-bold text-muted-foreground">Q{idx + 1}</span>
                      <span className="w-1 h-1 rounded-full bg-border"></span>
                      <span className="text-[12px] font-bold text-muted-foreground">{q.topic?.title || "Topic"}</span>
                      <span className="w-1 h-1 rounded-full bg-border"></span>
                      <span className={cn("text-[12px] font-bold", 
                        q.difficulty === "hard" ? "text-red-500 dark:text-red-400" :
                        q.difficulty === "medium" ? "text-orange-500 dark:text-orange-400" : "text-green-500 dark:text-green-400"
                      )}>{q.difficulty}</span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-foreground leading-snug">
                      {q.text}
                    </h3>
                  </div>
                  <div className="shrink-0 text-muted-foreground mt-2">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-5 pt-0 border-t border-border bg-muted/20 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4 mt-4">
                      <div className={cn("p-4 rounded-[8px] border", isCorrect ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30")}>
                        <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: isCorrect ? '#16a34a' : '#dc2626' }}>
                          Your Answer
                        </div>
                        <div className="text-[14px] font-medium text-foreground">
                          {isUnanswered ? "Not Answered" : `${attempt.selected_option} - ${optionsMap[attempt.selected_option!]}`}
                        </div>
                      </div>
                      <div className="p-4 rounded-[8px] border bg-green-500/10 border-green-500/30">
                        <div className="text-[12px] font-bold uppercase tracking-wider mb-1 text-green-600 dark:text-green-400">
                          Correct Answer
                        </div>
                        <div className="text-[14px] font-medium text-foreground">
                           {q.correct_option} - {optionsMap[q.correct_option]}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-5 rounded-[8px] bg-card border border-border">
                      <div className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Explanation</div>
                      <p className="text-[14px] text-foreground leading-relaxed">
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

export default function PracticeResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
      <PracticeResultContent />
    </Suspense>
  )
}
