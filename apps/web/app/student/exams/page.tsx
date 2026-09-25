"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Clock, Target, Play, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { studentExamsApi } from "@/lib/api/student-exams";
import { LoksewaExamCountdown } from "@/components/student/countdown/LoksewaExamCountdown";
import { MockExamCountdown } from "@/components/student/countdown/MockExamCountdown";
import { useOptionalStudentContext } from "@/contexts/StudentContext";

const ExamSkeletonGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <Card key={i} className="border-border/60 flex flex-col animate-pulse">
        <CardHeader className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="h-5 w-16 bg-muted/60 rounded" />
            <div className="h-5 w-20 bg-muted/40 rounded" />
          </div>
          <div className="h-6 w-3/4 bg-muted/70 rounded" />
          <div className="h-4 w-1/2 bg-muted/50 rounded" />
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-11 bg-muted/40 rounded-lg" />
        </CardContent>
        <CardFooter className="pt-4 border-t border-border/50">
          <div className="h-10 w-full bg-muted/60 rounded" />
        </CardFooter>
      </Card>
    ))}
  </div>
);

const PastResultsSkeletonGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="border-border/60 flex flex-col animate-pulse">
        <CardHeader className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="h-5 w-16 bg-muted/60 rounded" />
            <div className="h-4 w-24 bg-muted/40 rounded" />
          </div>
          <div className="h-6 w-3/4 bg-muted/70 rounded" />
          <div className="h-4 w-1/3 bg-muted/50 rounded" />
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-11 bg-muted/40 rounded-lg" />
        </CardContent>
        <CardFooter className="pt-4 border-t border-border/50">
          <div className="h-10 w-full bg-muted/60 rounded" />
        </CardFooter>
      </Card>
    ))}
  </div>
);

export default function ExamsListingPage() {
  const [activeTab, setActiveTab] = useState("old_past");
  const studentCtx = useOptionalStudentContext();
  const effectiveCourseId = studentCtx?.activeCourse?.id;
  const isCtxLoading = studentCtx?.isLoading ?? false;

  const { data: exams, isLoading: isLoadingExams } = useQuery({
    queryKey: ['student-exams', effectiveCourseId ?? null],
    queryFn: () => studentExamsApi.getExams(effectiveCourseId),
    enabled: !isCtxLoading,
    staleTime: 60 * 1000,
  });

  const { data: pastResultsData, isLoading: isLoadingPast } = useQuery({
    queryKey: ['student-past-results'],
    queryFn: studentExamsApi.getPastResults,
    enabled: activeTab === 'past',
    staleTime: 60 * 1000,
  });

  const activeExams: any[] = exams || [];
  const pastExams = pastResultsData || [];

  // Group by effective_category — a Live Exam auto-promotes into the Model
  // Exams tab 48h after its scheduled start, so this reads the promoted
  // value rather than the raw admin-set category.
  const oldPastExams = activeExams.filter(e => e.effective_category === "old_past");
  const modelExams = activeExams.filter(e => e.effective_category === "model");
  const liveExams = activeExams.filter(e => e.effective_category === "live");
  const subjectiveExams = activeExams.filter(e => e.exam_type === "subjective");

  const ExamGrid = ({ list, emptyTitle, emptyBody }: { list: any[]; emptyTitle: string; emptyBody: string }) => {
    if (isLoadingExams && !exams) {
      return <ExamSkeletonGrid />;
    }

    if (list.length === 0) {
      return (
        <Card className="border-border/60 border-dashed flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mb-4 opacity-50 text-muted-foreground" />
          <h3 className="font-medium text-lg mb-1 text-foreground">
            {activeExams.length === 0 ? "No exams available for your course yet." : emptyTitle}
          </h3>
          <p className="text-sm text-muted-foreground">
            {activeExams.length === 0 ? "New examinations will appear here when they are published." : emptyBody}
          </p>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((exam: any) => (
          <Card key={exam.id} className="border-border/60 flex flex-col hover:border-primary/30 transition-colors">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant={exam.exam_type === "mock" ? "default" : "secondary"}>
                  {exam.exam_type.toUpperCase()}
                </Badge>
                {exam.has_attempted && (
                  <Badge variant="outline" className="text-primary border-primary/30">
                    Attempted
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl line-clamp-2">{exam.title}</CardTitle>
              <CardDescription className="text-primary font-medium mt-1">
                {exam.category_name} - {exam.exam_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{exam.time_limit} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>{exam.total_questions} Qs</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t border-border/50">
              <Link href={`/student/exams/${exam.id}`} className="w-full">
                <Button
                  className="w-full gap-2"
                  variant={exam.has_attempted ? "secondary" : "default"}
                >
                  {exam.has_attempted ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      Already Taken — Details
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Take Exam
                    </>
                  )}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in-50 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Mock Exams</h1>
          <p className="text-muted-foreground mt-1">Simulate the real examination environment.</p>
        </div>
        <Button variant="outline" className="gap-2">
          View Exam Syllabus
        </Button>
      </div>

      {/* Live & Upcoming Countdowns */}
      <div className="space-y-4">
        <LoksewaExamCountdown />
        <MockExamCountdown />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="old_past">Old Past Exams</TabsTrigger>
          <TabsTrigger value="model">Model Exams</TabsTrigger>
          <TabsTrigger value="live">Live Exams</TabsTrigger>
          <TabsTrigger value="subjective">Subjective Exams</TabsTrigger>
          <TabsTrigger value="past">Past Results</TabsTrigger>
          <TabsTrigger value="custom">Create Your Own</TabsTrigger>
        </TabsList>

        <TabsContent value="old_past" className="space-y-6">
          <ExamGrid
            list={oldPastExams}
            emptyTitle="No Old Past Exams"
            emptyBody="Original past papers will show up here once published."
          />
        </TabsContent>

        <TabsContent value="model" className="space-y-6">
          <ExamGrid
            list={modelExams}
            emptyTitle="No Model Exams"
            emptyBody="Start-anytime, fixed-duration mock exams will show up here once published."
          />
        </TabsContent>

        <TabsContent value="live" className="space-y-6">
          <ExamGrid
            list={liveExams}
            emptyTitle="No Live Exams Right Now"
            emptyBody="Live Exams run in a fixed shared window — a completed one moves to Model Exams after 48 hours."
          />
        </TabsContent>

        <TabsContent value="subjective" className="space-y-6">
          <ExamGrid
            list={subjectiveExams}
            emptyTitle="No Subjective Exams"
            emptyBody="Descriptive/written model exams will show up here once published."
          />
        </TabsContent>

        <TabsContent value="past" className="space-y-6">
          {isLoadingPast && !pastResultsData ? (
            <PastResultsSkeletonGrid />
          ) : pastExams.length === 0 ? (
            <Card className="border-border/60 border-dashed flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <CheckCircle className="h-10 w-10 mb-4 opacity-50" />
              <h3 className="font-medium text-lg mb-1">No Past Results</h3>
              <p className="text-sm">You haven't completed any exams yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastExams.map((attempt: any) => (
                <Card key={attempt.id} className="border-border/60 flex flex-col hover:border-primary/30 transition-colors">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      {attempt.needs_evaluation ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400">
                          Evaluation Pending
                        </Badge>
                      ) : (
                        <Badge variant={attempt.passed ? "default" : "destructive"}>
                          {attempt.passed ? "PASSED" : "FAILED"}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground font-medium">
                        {new Date(attempt.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                    <CardTitle className="text-xl line-clamp-2">{attempt.examination_title}</CardTitle>
                    <CardDescription className="text-primary font-medium mt-1">
                      {attempt.needs_evaluation
                        ? "Awaiting evaluation from a teacher"
                        : `Score: ${attempt.score} (${Math.round(attempt.percentage)}%)`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>{attempt.correct_answers} Correct</span>
                      </div>
                      <div className="flex items-center gap-2 text-destructive">
                        <Target className="h-4 w-4" />
                        <span>{attempt.wrong_answers} Wrong</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-border/50">
                    <Link href={`/student/exams/${attempt.examination}/result/${attempt.id}`} className="w-full">
                      <Button className="w-full gap-2" variant="outline">
                        View Details
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="custom">
          <Card className="border-border/60 p-12 flex flex-col items-center justify-center text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Custom Exam Builder</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Generate personalized mock exams based on your weak topics and preferred difficulty.
            </p>
            <Link href="/student/exams/custom-builder">
              <Button className="mt-6">Launch Builder</Button>
            </Link>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
