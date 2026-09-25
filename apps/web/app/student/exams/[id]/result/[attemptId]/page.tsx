"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { studentExamsApi, isSubjectiveQuestionType } from "@/lib/api/student-exams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2, XCircle, LayoutGrid, ArrowLeft, Loader2, AlertTriangle,
  Play, HelpCircle, FileText, Download, Award, MessageSquare, Clock, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

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
  const correctCount = result.answers?.filter((a: any) => a.is_correct)?.length ?? 0;
  const incorrectCount = result.answers?.filter((a: any) => a.is_correct === false && a.selected_option)?.length ?? 0;
  const unattemptedCount = totalQuestions - (result.answers?.filter((a: any) => a.selected_option || a.answer_text)?.length ?? 0);

  const isSubjective =
    result.is_subjective ||
    result.examination_exam_type === "subjective" ||
    result.has_answer_pdf ||
    result.has_submitted_answer_pdf ||
    Boolean(result.subjective_submission);

  const handleViewAnswerSheet = async () => {
    try {
      const blob = await studentExamsApi.getAnswerSheetBlob(attemptId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast.error("Could not load submitted answer sheet.");
    }
  };

  if (isSubjective) {
    const isPublished = Boolean(
      result.is_published ??
      result.subjective_submission?.is_published ??
      (result.status === "evaluated" && !result.needs_evaluation)
    );
    const questionScoresList = (result.question_scores && result.question_scores.length > 0)
      ? result.question_scores
      : (result.subjective_submission?.question_scores || []);
    const evaluatorFeedback = result.evaluator_feedback || result.subjective_submission?.evaluator_feedback;
    const evaluatorName = result.evaluator_name || result.subjective_submission?.evaluator_name;
    const evaluatedAt = result.evaluated_at || result.subjective_submission?.evaluated_at;
    const totalPossibleMarks = result.total_marks || (questionScoresList.reduce((s: number, q: any) => s + (Number(q.max_marks) || 0), 0) || 100);

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center shadow-sm">
          <Link href="/student/exams">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Exams
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-lg">{result.examination_title} - Subjective Result</h1>
            <p className="text-xs text-muted-foreground">
              Submitted on {new Date(result.submitted_at || result.started_at || "").toLocaleString()}
            </p>
          </div>
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6">
          {!isPublished ? (
            <Card className="border-border/60 shadow-sm bg-amber-500/5 border-amber-500/20">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 bg-amber-500/10 border border-amber-500/30">
                  <Clock className="h-8 w-8 text-amber-500 animate-pulse" />
                </div>
                <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  Evaluation Under Review
                </CardTitle>
                <CardDescription className="text-base mt-2 max-w-lg mx-auto">
                  Your handwritten answer sheet has been securely submitted and is awaiting evaluation by our examiners.
                  Your score and qualitative feedback will appear here as soon as the result is published.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-center gap-3 pt-2">
                <Button onClick={handleViewAnswerSheet} variant="outline" className="gap-2">
                  <Eye className="w-4 h-4" /> View Submitted Answer Sheet
                </Button>
                <Link href="/student/exams">
                  <Button className="bg-[#0B2545] text-white">Back to Examinations</Button>
                </Link>
              </CardFooter>
            </Card>
          ) : (
            <>
              {/* Published Score Card */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 bg-background border shadow-sm">
                    {result.passed ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    ) : (
                      <XCircle className="h-8 w-8 text-destructive" />
                    )}
                  </div>
                  <CardTitle className="text-2xl font-bold">
                    {result.passed ? "Congratulations, you passed!" : "Evaluation Complete"}
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    You scored <span className="font-bold text-foreground">{result.score}</span> / <span className="font-semibold text-muted-foreground">{totalPossibleMarks}</span> marks ({Math.round(result.percentage)}%).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="bg-card p-4 rounded-xl border">
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Marks Obtained</p>
                      <p className="text-2xl font-bold text-primary">
                        {result.score} <span className="text-sm font-normal text-muted-foreground">/ {totalPossibleMarks}</span>
                      </p>
                    </div>
                    <div className="bg-card p-4 rounded-xl border">
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Percentage</p>
                      <p className="text-2xl font-bold text-primary">{result.percentage != null ? `${result.percentage}%` : "0%"}</p>
                    </div>
                    <div className="bg-card p-4 rounded-xl border">
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Status</p>
                      <p className={`text-2xl font-bold ${result.passed ? "text-green-600" : "text-destructive"}`}>
                        {result.passed ? "PASSED" : "FAILED"}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-border/50 pt-4">
                  <Button onClick={handleViewAnswerSheet} variant="outline" className="gap-2">
                    <Eye className="w-4 h-4" /> View Your Graded Answer Sheet
                  </Button>
                </CardFooter>
              </Card>

              {/* Evaluator Qualitative Feedback */}
              {evaluatorFeedback && (
                <Card className="border-border/60 shadow-sm bg-muted/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Examiner Qualitative Feedback
                    </CardTitle>
                    {evaluatorName && (
                      <CardDescription className="text-xs">
                        Evaluated by {evaluatorName} on {evaluatedAt ? new Date(evaluatedAt).toLocaleDateString() : ""}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{evaluatorFeedback}</p>
                  </CardContent>
                </Card>
              )}

              {/* Question Scores breakdown if available */}
              {questionScoresList.length > 0 && (
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Question-Wise Marks Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border/60">
                      {questionScoresList.map((qs: any, i: number) => (
                        <div key={i} className="py-3 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-sm">Question #{qs.question_number}</span>
                            {qs.feedback && <p className="text-xs text-muted-foreground mt-0.5">{qs.feedback}</p>}
                          </div>
                          <span className="font-bold text-sm">
                            {qs.marks_obtained} / {qs.max_marks}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    );
  }

  const currentQuestion = questions?.[currentIdx];
  const currentAnswer = result.answers?.find((a: any) => a.question === currentQuestion?.id);

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
              {result.needs_evaluation ? (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 bg-amber-500/10 border border-amber-500/30">
                    <Loader2 className="h-8 w-8 text-amber-500" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Evaluation Pending</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Your descriptive answers are awaiting review from a teacher. Your final score will be available once evaluation is complete.
                  </CardDescription>
                </>
              ) : (
                <>
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
                </>
              )}
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
                  {isSubjectiveQuestionType(currentQuestion.question_type) ? (
                    currentAnswer?.evaluated_at ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">Evaluated (+{currentAnswer.marks_awarded})</Badge>
                    ) : currentAnswer?.answer_text ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-500/10">Evaluation Pending</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Unattempted</Badge>
                    )
                  ) : (
                    <>
                      {currentAnswer?.is_correct === true && <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">Correct (+{currentAnswer.marks_awarded})</Badge>}
                      {currentAnswer?.is_correct === false && currentAnswer?.selected_option && <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">Incorrect ({currentAnswer.marks_awarded})</Badge>}
                      {!currentAnswer?.selected_option && <Badge variant="outline" className="text-muted-foreground">Unattempted</Badge>}
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
                   <div dangerouslySetInnerHTML={{ __html: currentQuestion.text }} />
                </div>

                {(() => {
                  const canReviewAnswers = Boolean(result.can_review_answers ?? result.show_correct_answers);
                  const correctOption = canReviewAnswers
                    ? (currentAnswer?.correct_option || currentQuestion.correct_option)?.trim().toUpperCase()
                    : null;
                  const explanation = canReviewAnswers
                    ? (currentAnswer?.explanation || currentQuestion.explanation)
                    : null;
                  const modelAnswer = canReviewAnswers
                    ? (currentAnswer?.model_answer || currentQuestion.model_answer)
                    : null;

                  return (
                    <>
                      {isSubjectiveQuestionType(currentQuestion.question_type) ? (
                        <div className="space-y-4">
                          <div className="rounded-xl border border-border bg-muted/20 p-4">
                            <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Your Answer</p>
                            {currentAnswer?.answer_text ? (
                              <p className="text-base leading-relaxed whitespace-pre-wrap">{currentAnswer.answer_text}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">You did not answer this question.</p>
                            )}
                          </div>

                          {canReviewAnswers && modelAnswer && (
                            <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 p-4">
                              <p className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 mb-2">Model Answer</p>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap text-blue-950 dark:text-blue-100">{modelAnswer}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {['A', 'B', 'C', 'D'].map((letter) => {
                            const optionKey = `option_${letter.toLowerCase()}` as keyof typeof currentQuestion;
                            const optionText = currentQuestion[optionKey];
                            if (!optionText) return null;

                            const isSelected = currentAnswer?.selected_option?.trim().toUpperCase() === letter;
                            const isCorrect = canReviewAnswers && correctOption === letter;

                            let borderClass = "border-border bg-card";
                            let letterClass = "border-muted-foreground/30 text-muted-foreground";

                            if (isCorrect) {
                              borderClass = "border-green-500 bg-green-500/10 text-green-950 dark:text-green-100";
                              letterClass = "border-green-500 bg-green-500 text-white font-bold";
                            } else if (isSelected) {
                              if (currentAnswer?.is_correct) {
                                borderClass = "border-green-500 bg-green-500/10 text-green-950 dark:text-green-100";
                                letterClass = "border-green-500 bg-green-500 text-white font-bold";
                              } else {
                                borderClass = "border-destructive bg-destructive/10 text-destructive dark:text-red-300";
                                letterClass = "border-destructive bg-destructive text-white font-bold";
                              }
                            }

                            return (
                              <div
                                key={letter}
                                className={cn(
                                  "w-full text-left p-4 rounded-xl border-2 flex items-center justify-between gap-4 transition-colors",
                                  borderClass
                                )}
                              >
                                <div className="flex items-start gap-4">
                                  <div className={cn(
                                    "w-7 h-7 rounded-full border flex-shrink-0 flex items-center justify-center text-xs mt-0.5",
                                    letterClass
                                  )}>
                                    {letter}
                                  </div>
                                  <span className="text-base leading-relaxed">{String(optionText)}</span>
                                </div>

                                <div className="shrink-0 flex items-center gap-2">
                                  {isCorrect && (
                                    <Badge variant="outline" className="border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 flex items-center gap-1 text-xs">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Correct Answer
                                    </Badge>
                                  )}
                                  {!isCorrect && isSelected && (
                                    <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-1 text-xs">
                                      <XCircle className="w-3.5 h-3.5" /> Your Answer
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {canReviewAnswers && (
                        <div className="mt-6 pt-4 border-t border-border">
                          <p className="text-xs font-bold uppercase text-muted-foreground mb-1.5 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-green-600" /> Explanation
                          </p>
                          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                            {explanation && explanation.trim() ? explanation : "Explanation unavailable."}
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}

                {!isSubjectiveQuestionType(currentQuestion.question_type) && currentAnswer?.is_correct !== true && (
                  <Link
                    href={`/student/community/ask?question_id=${currentQuestion.id}&question_text=${encodeURIComponent(currentQuestion.text.replace(/<[^>]*>/g, ""))}&question_type=mcq${(['a', 'b', 'c', 'd'] as const).map(opt => {
                      const optText = currentQuestion[`option_${opt}` as keyof typeof currentQuestion];
                      return optText ? `&option_${opt}=${encodeURIComponent(String(optText))}` : "";
                    }).join("")}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mt-4"
                  >
                    <HelpCircle className="h-3.5 w-3.5" /> Still confused? Ask the Community
                  </Link>
                )}
                {isSubjectiveQuestionType(currentQuestion.question_type) && (
                  <Link
                    href={`/student/community/ask?question_id=${currentQuestion.id}&question_text=${encodeURIComponent(currentQuestion.text.replace(/<[^>]*>/g, ""))}&question_type=subjective`}
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
