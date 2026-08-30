"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { practiceApi, SubmitSessionResponse } from "@/lib/api/practice";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Target, Clock, CheckCircle2, XCircle, ChevronRight, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function PracticeResultPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<SubmitSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResult() {
      try {
        const id = parseInt(params.id as string);
        const data = await practiceApi.getSessionResult(id);
        setResult(data);
      } catch (e) {
        console.error(e);
        alert("Failed to load result.");
        router.push("/student/practice");
      } finally {
        setLoading(false);
      }
    }
    loadResult();
  }, [params.id]);

  if (loading || !result) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-foreground" />
      </div>
    );
  }

  const { session, attempts } = result;

  return (
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-8 animate-in fade-in-50 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/student/practice" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary dark:text-foreground transition-colors mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Practice
          </Link>
          <h1 className="text-[28px] font-bold text-primary dark:text-foreground tracking-tight">Practice Result</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Session completed on {new Date(session.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="border-border">
             Review Mistakes
           </Button>
           <Button className="bg-primary text-primary-foreground hover:bg-[#163E6B]">
             Practice Again
           </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-[16px] border border-border shadow-sm text-center">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Accuracy</div>
          <div className="text-3xl font-black text-primary dark:text-foreground">{Math.round(session.accuracy || 0)}%</div>
        </div>
        <div className="bg-card p-5 rounded-[16px] border border-border shadow-sm text-center">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Score</div>
          <div className="text-3xl font-black text-green-600">{session.correct_count} <span className="text-lg text-muted-foreground font-medium">/ {session.total_questions}</span></div>
        </div>
        <div className="bg-card p-5 rounded-[16px] border border-border shadow-sm text-center">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Time Taken</div>
          <div className="text-3xl font-black text-[#D4A72C]">
            {Math.floor((session.time_taken_seconds || 0) / 60)}m {(session.time_taken_seconds || 0) % 60}s
          </div>
        </div>
        <div className="bg-card p-5 rounded-[16px] border border-border shadow-sm text-center">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">XP Earned</div>
          <div className="text-3xl font-black text-purple-600">+{session.correct_count * 10}</div>
        </div>
      </div>

      {/* Detailed Review */}
      <div className="bg-card rounded-[16px] border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-bold text-primary dark:text-foreground text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#D4A72C]" /> Detailed Review
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {attempts.map((attempt, index) => {
             const isCorrect = attempt.is_correct;
             const isUnanswered = attempt.selected_option === null;
             
             return (
               <div key={attempt.attempt_id} className="p-6 hover:bg-muted transition-colors">
                 <div className="flex gap-4">
                   <div className="shrink-0 mt-1">
                     {isCorrect ? (
                       <CheckCircle2 className="w-6 h-6 text-green-500" />
                     ) : isUnanswered ? (
                       <div className="w-6 h-6 rounded-full border-2 border-border bg-muted/80 flex items-center justify-center">
                         <div className="w-2 h-2 rounded-full bg-secondary"></div>
                       </div>
                     ) : (
                       <XCircle className="w-6 h-6 text-red-500" />
                     )}
                   </div>
                   <div className="flex-1 space-y-4">
                     <div>
                       <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Question {index + 1}</span>
                       <h4 className="text-[16px] font-medium text-primary dark:text-foreground mt-1">{attempt.question.text}</h4>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {['a', 'b', 'c', 'd'].map(opt => {
                         const optText = attempt.question[`option_${opt}` as keyof typeof attempt.question];
                         const isSelected = attempt.selected_option?.toLowerCase() === opt;
                         // correct_option comes back uppercase from the API; selected_option and opt are lowercase.
                         const isActuallyCorrect = attempt.question.correct_option?.toLowerCase() === opt;
                         
                         let bg = "bg-card border-border";
                         let text = "text-muted-foreground";
                         let indicator = null;

                         if (isSelected && isActuallyCorrect) {
                           bg = "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50";
                           text = "text-green-800 font-medium";
                           indicator = <CheckCircle2 className="w-4 h-4 text-green-600" />;
                         } else if (isSelected && !isActuallyCorrect) {
                           bg = "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50";
                           text = "text-red-800 font-medium";
                           indicator = <XCircle className="w-4 h-4 text-red-600" />;
                         } else if (isActuallyCorrect) {
                           bg = "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 border-dashed";
                           text = "text-green-800 font-medium";
                           indicator = <CheckCircle2 className="w-4 h-4 text-green-600" />;
                         }

                         return (
                           <div key={opt} className={`flex items-center justify-between p-3 rounded-[10px] border ${bg} ${text}`}>
                             <div className="flex items-center gap-3">
                               <span className="font-bold text-xs uppercase opacity-50">{opt}</span>
                               <span className="text-[14px]">{optText as string}</span>
                             </div>
                             {indicator}
                           </div>
                         )
                       })}
                     </div>
                     
                     {attempt.question.explanation && (
                       <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-[10px] p-4 text-sm text-blue-800">
                         <strong>Explanation:</strong> {attempt.question.explanation}
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             )
          })}
        </div>
      </div>

    </div>
  );
}
