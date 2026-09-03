"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { studentExamsApi } from "@/lib/api/student-exams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, LayoutGrid, ArrowLeft, Loader2, AlertTriangle, Play, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ExamResultPage() {
  const params = useParams();
  const attemptId = Number(params.attemptId);
  const examId = Number(params.id);
  const router = useRouter();

  const [currentIdx, setCurrentIdx] = useState<number>(0);

  const { data: result, isLoading: isLoadingResult, error } = useQuery({
    queryKey: ['student-attempt-result', attemptId],
    queryFn: () => studentExamsApi.getResult(attemptId),
    refetchOnWindowFocus: false,
  });

  const { data: questions, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['student-attempt-questions', attemptId],
    queryFn: () => studentExamsApi.getAttemptQuestions(attemptId),
    refetchOnWindowFocus: false,
  });

  if (isLoadingResult || isLoadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold">Result Not Available</h2>
          <p className="text-muted-foreground">This exam's result is either pending or not accessible yet.</p>
          <Button onClick={() => router.push('/student/exams')}>
            Back to Exams
          </Button>
        </div>
      </div>
    );
  }

  const totalQuestions = questions?.length || 0;
  const correctCount = result.answers.filter((a: any) => a.is_correct).length;
  const incorrectCount = result.answers.filter((a: any) => a.is_correct === false && a.selected_option).length;
  const unattemptedCount = totalQuestions - result.answers.filter((a: any) => a.selected_option).length;

  const currentQuestion = questions?.[currentIdx];
  const currentAnswer = result.answers.find((a: any) => a.question === currentQuestion?.id);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center shadow-sm">
        <Link href="/student/exams">
          <Button variant="ghost" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="font-bold text-lg">{result.examination_title} - Results</h1>
          <p className="text-xs text-muted-foreground">Completed on {new Date(result.submitted_at || "").toLocaleString()}</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-8">
          {/* Summary Card */}
          <Card className="border-border/60 shadow-sm bg-muted/10">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 bg-background border shadow-sm">
                {result.passed ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-destructive" />
                )}
              </div>
              <CardTitle className="text-2xl font-bold">
                {result.passed ? "Congratulations, you passed!" : "Keep practicing, you failed."}
              </CardTitle>
              <CardDescription className="text-base mt-1">
                You scored <span className="font-bold text-foreground">{result.score}</span> marks ({Math.round(result.percentage)}%).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-card p-4 rounded-xl border">
                  <p className="text-sm text-muted-foreground mb-1">Total</p>
                  <p className="text-2xl font-bold">{totalQuestions}</p>
                </div>
                <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-1">Correct</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{correctCount}</p>
                </div>
                <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/20">
                  <p className="text-sm text-destructive mb-1">Incorrect</p>
                  <p className="text-2xl font-bold text-destructive">{incorrectCount}</p>
                </div>
                <div className="bg-card p-4 rounded-xl border">
                  <p className="text-sm text-muted-foreground mb-1">Unattempted</p>
                  <p className="text-2xl font-bold text-muted-foreground">{unattemptedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question Review Area */}
          {currentQuestion && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4 border-b border-border/50 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">
                  Question {currentIdx + 1}
                </CardTitle>
                <div className="flex gap-2">
                  {currentAnswer?.is_correct === true && <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">Correct (+{currentAnswer.marks_awarded})</Badge>}
                  {currentAnswer?.is_correct === false && <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">Incorrect ({currentAnswer.marks_awarded})</Badge>}
                  {!currentAnswer?.selected_option && <Badge variant="outline" className="text-muted-foreground">Unattempted</Badge>}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
                   <div dangerouslySetInnerHTML={{ __html: currentQuestion.text }} />
                </div>

                <div className="space-y-4">
                  {['A', 'B', 'C', 'D'].map((letter, idx) => {
                    const optionKey = `option_${letter.toLowerCase()}` as keyof typeof currentQuestion;
                    const optionText = currentQuestion[optionKey];
                    if (!optionText) return null;
                    
                    const isSelected = currentAnswer?.selected_option === letter;
                    // Security note: if backend didn't return correct option to students, we can't show it.
                    // Assuming for result view, backend included correct_option if result_visibility == 'immediate'.
                    // For now, if we don't have correct_option, we just show what they selected.
                    // (To make this perfect, the StudentSecureQuestionSerializer should be swapped with a full one for result API).
                    
                    return (
                      <div
                        key={letter}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border-2 flex items-start gap-4",
                          isSelected ? (currentAnswer.is_correct ? "border-green-500 bg-green-500/5" : "border-destructive bg-destructive/5") : "border-border bg-card"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full border flex-shrink-0 flex items-center justify-center text-xs font-medium mt-0.5",
                          isSelected ? (currentAnswer.is_correct ? "border-green-500 bg-green-500 text-white" : "border-destructive bg-destructive text-white") : "border-muted-foreground/30 text-muted-foreground"
                        )}>
                          {letter}
                        </div>
                        <span className="text-base leading-relaxed">{String(optionText)}</span>
                      </div>
                    );
                  })}
                </div>

                {currentAnswer?.is_correct !== true && (
                  <Link
                    href={`/student/community/ask?question_id=${currentQuestion.id}&question_text=${encodeURIComponent(currentQuestion.text.replace(/<[^>]*>/g, ""))}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mt-4"
                  >
                    <HelpCircle className="h-3.5 w-3.5" /> Still confused? Ask the Community
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </main>
        
        {/* Right Sidebar - Question Palette */}
        <aside className="w-full md:w-80 border-l border-border bg-muted/10 flex flex-col h-[calc(100vh-65px)]">
          <div className="p-4 border-b border-border bg-card">
            <h3 className="font-semibold flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" /> Review Palette
            </h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: totalQuestions }).map((_, idx) => {
                const qId = questions?.[idx]?.id;
                const ans = result.answers.find((a: any) => a.question === qId);
                const isCurrent = currentIdx === idx;
                
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIdx(idx)}
                    className={cn(
                      "w-10 h-10 rounded-md flex items-center justify-center text-sm font-medium border transition-all",
                      isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
                      ans?.is_correct === true ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400" :
                      ans?.is_correct === false ? "bg-destructive/20 border-destructive text-destructive" :
                      "bg-card border-border text-foreground hover:bg-muted"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", className)}>{children}</span>;
}
