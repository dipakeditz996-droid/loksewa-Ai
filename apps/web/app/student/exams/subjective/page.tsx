"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PenTool, Clock, FileText, CheckCircle, UploadCloud, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { subjectiveApi, SubjectivePracticeSet, SubjectiveAttempt } from "@/lib/api/subjective";
import { useCalmDownGate } from "@/components/calm-down/useCalmDownGate";

export default function SubjectiveExamsPage() {
  const router = useRouter();
  const [pendingExams, setPendingExams] = useState<SubjectivePracticeSet[]>([]);
  const [submittedExams, setSubmittedExams] = useState<SubjectiveAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [pendingSetId, setPendingSetId] = useState<number | null>(null);

  const handleStart = async (setId: number) => {
    setStartingId(setId);
    try {
      // Real attempt creation, same endpoint the working practice-sets flow
      // uses - the /student/exams/subjective/[id] page this used to link to
      // was a static mockup with no state, no data fetch, and no submit
      // handler at all, so "Start Assignment" led to a dead end.
      const attempt = await subjectiveApi.startAttempt({
        mode: 'practice',
        practice_set_id: setId,
      });
      router.push(`/subjective/answer?attempt_id=${attempt.id}`);
    } catch (error) {
      console.error("Failed to start subjective assignment", error);
      setStartingId(null);
    }
  };

  const { requestStart, gate } = useCalmDownGate(() => {
    if (pendingSetId !== null) handleStart(pendingSetId);
  });

  const handleStartClick = (setId: number) => {
    setPendingSetId(setId);
    requestStart();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch practice sets that the user hasn't completed yet
        const practiceSets = await subjectiveApi.getPracticeSets();
        setPendingExams(practiceSets.filter(ps => ps.status === 'published'));
        
        // Fetch attempt history for submitted/in-progress
        const attempts = await subjectiveApi.getAttemptsHistory();
        setSubmittedExams(attempts.filter(a => a.status === 'submitted' || a.status === 'in-progress'));
      } catch (error) {
        console.error("Failed to load subjective exams", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in-50 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Subjective Exams</h1>
          <p className="text-muted-foreground mt-1 font-light">Submit written assignments and get expert evaluation.</p>
        </div>
        <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/10">
          <FileText className="h-4 w-4" /> View Model Answers
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-6 bg-muted/50 border border-border/50">
          <TabsTrigger value="pending">Pending Assignments</TabsTrigger>
          <TabsTrigger value="submitted">Submitted & Evaluated</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map(n => (
                <div key={n} className="h-64 bg-muted animate-pulse rounded-xl border border-border"></div>
              ))}
            </div>
          ) : pendingExams.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-xl bg-card">
              <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium">All caught up!</h3>
              <p className="text-muted-foreground mt-1">You have no pending subjective assignments at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pendingExams.map((exam) => (
                <Card key={exam.id} className="border-border bg-card shadow-sm hover:border-primary/40 transition-all flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                        {exam.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{exam.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Clock className="h-4 w-4" /> Est. Time: {exam.estimated_time_minutes} min
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="flex items-center gap-6 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg border border-border/50">
                      <div>
                        <span className="block text-xs uppercase tracking-wider mb-1">Subject</span>
                        <span className="font-semibold text-foreground truncate max-w-[120px] inline-block" title={exam.subject_name}>{exam.subject_name}</span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-wider mb-1">Questions</span>
                        <span className="font-semibold text-foreground">{exam.question_count}</span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-wider mb-1">Format</span>
                        <span className="font-semibold text-foreground">Written</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-border/50 bg-muted/10">
                    <Button
                      onClick={() => handleStartClick(exam.id)}
                      disabled={startingId === exam.id}
                      className="w-full gap-2 shadow-[0_0_15px_rgba(0,212,255,0.15)] bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {startingId === exam.id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Preparing...
                        </div>
                      ) : (
                        <><PenTool className="h-4 w-4" /> Start Assignment</>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="submitted" className="space-y-6">
          {loading ? (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {[1, 2].map(n => (
                 <div key={n} className="h-48 bg-muted animate-pulse rounded-xl border border-border"></div>
               ))}
             </div>
          ) : submittedExams.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-xl bg-card">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No submissions yet</h3>
              <p className="text-muted-foreground mt-1">Complete a subjective assignment to see your evaluations here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {submittedExams.map((attempt) => {
                const title = attempt.practice_set_detail?.title || attempt.model_exam_detail?.title || "Subjective Exam";
                
                // Determine overall status based on answers if needed, or use attempt status
                let isEvaluated = false;
                let totalScore = 0;
                let totalMarks = attempt.practice_set_detail?.question_count ? attempt.practice_set_detail.question_count * 10 : 100; // Mock total marks calculation
                
                if (attempt.answers && attempt.answers.length > 0) {
                  // If all answers are evaluated
                  isEvaluated = attempt.answers.every(a => a.status === 'evaluated');
                  if (isEvaluated) {
                    totalScore = attempt.answers.reduce((acc, curr) => acc + (curr.evaluation?.marks_obtained || 0), 0);
                  }
                }
                
                return (
                  <Card key={attempt.id} className="border-border bg-card shadow-sm flex flex-col">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className={
                          isEvaluated 
                            ? "bg-green-500/10 text-green-500 border-green-500/30" 
                            : attempt.status === "submitted" ? "bg-blue-500/10 text-blue-500 border-blue-500/30" : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                        }>
                          {isEvaluated ? "Evaluated" : (attempt.status === "submitted" ? "Under Review" : "Draft")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {attempt.submitted_at ? `Submitted: ${new Date(attempt.submitted_at).toLocaleDateString()}` : `Started: ${new Date(attempt.started_at).toLocaleDateString()}`}
                        </span>
                      </div>
                      <CardTitle className="text-lg">{title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="flex items-end gap-2">
                        {isEvaluated ? (
                          <>
                            <span className="text-3xl font-bold text-primary">{totalScore}</span>
                            <span className="text-muted-foreground mb-1">/ {totalMarks} Marks</span>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-5 w-5" />
                            <span>{attempt.status === "in-progress" ? "Continue writing" : "Awaiting teacher evaluation"}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-4 border-t border-border/50 bg-muted/10">
                      <Button
                        variant={isEvaluated ? "default" : "outline"}
                        className="w-full"
                        onClick={() => {
                          if (attempt.status === "in-progress") {
                            router.push(`/subjective/answer?attempt_id=${attempt.id}`);
                          } else {
                            router.push(`/student/subjective/evaluation/${attempt.id}`);
                          }
                        }}
                      >
                        {isEvaluated ? "View Feedback" : (attempt.status === "in-progress" ? "Resume" : "View Submission")}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {gate}
    </div>
  );
}
