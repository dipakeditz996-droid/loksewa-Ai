"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { studentExamsApi } from "@/lib/api/student-exams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Clock, Target, Play, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCalmDownGate } from "@/components/calm-down/useCalmDownGate";

export default function ExamDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = Number(params.id);
  const [isStarting, setIsStarting] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const { data: exam, isLoading, error } = useQuery({
    queryKey: ['student-exam', examId],
    queryFn: () => studentExamsApi.getExamDetails(examId)
  });

  const startExamMutation = useMutation({
    mutationFn: () => studentExamsApi.startExam(examId),
    onSuccess: (data) => {
      toast.success("Exam started successfully!");
      router.push(`/student/exams/${examId}/attempt/${data.id}`);
    },
    onError: (error: any) => {
      setIsStarting(false);
      const errorMessage = error.data?.detail || error.message || "Failed to start exam. Please try again.";
      toast.error(errorMessage);
    }
  });

  const handleStartExam = () => {
    setIsStarting(true);
    startExamMutation.mutate();
  };

  const { requestStart, gate } = useCalmDownGate(handleStartExam);

  const handleConfirmStart = () => {
    setIsConfirmDialogOpen(false);
    requestStart();
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load exam details. The exam might have been removed or you don't have permission to view it.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/student/exams')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Exams
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-500">
      <Link href="/student/exams">
        <Button variant="ghost" size="sm" className="mb-2 -ml-3 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Exams
        </Button>
      </Link>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start mb-2">
            <Badge variant={exam.exam_type === "mock" ? "default" : "secondary"}>
              {exam.exam_type.toUpperCase()}
            </Badge>
          </div>
          <CardTitle className="text-2xl md:text-3xl">{exam.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {exam.category_name} - {exam.exam_name} {exam.subject_name ? `• ${exam.subject_name}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 mb-6 border-y border-border/50">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Duration
              </span>
              <span className="font-medium text-lg">{exam.time_limit} mins</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <Target className="h-3.5 w-3.5" /> Questions
              </span>
              <span className="font-medium text-lg">{exam.total_questions}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Marks
              </span>
              <span className="font-medium text-lg">{exam.total_marks}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" /> Negative Marking
              </span>
              <span className="font-medium text-lg">
                {exam.negative_marking ? `Yes (${exam.negative_marking_value * 100}%)` : 'No'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Instructions
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground bg-muted/30 p-4 rounded-lg">
              {exam.instructions ? (
                <div dangerouslySetInnerHTML={{ __html: exam.instructions }} />
              ) : (
                <ul className="list-disc pl-4 space-y-2">
                  <li>This is a timed exam. The timer will start as soon as you click "Start Exam".</li>
                  <li>Do not refresh the page or navigate away during the exam.</li>
                  <li>Your answers will be autosaved.</li>
                  {exam.negative_marking && (
                    <li>There is a negative marking of {exam.negative_marking_value * 100}% for every incorrect answer.</li>
                  )}
                  <li>The exam will automatically submit when the time is up.</li>
                </ul>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/student/exams')} className="w-full sm:w-auto">
            Cancel
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {exam.active_attempt_id ? (
              <Button asChild className="w-full sm:w-auto bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0B2545] font-bold gap-2">
                <Link href={`/student/exams/${examId}/attempt/${exam.active_attempt_id}`}>
                  <Play className="h-4 w-4 fill-current" /> Resume Exam
                </Link>
              </Button>
            ) : exam.has_attempted ? (
              <>
                <Button asChild variant="outline" size="sm" className="text-xs font-semibold">
                  <Link href="/student/results">View Result</Link>
                </Button>
                <Button
                  disabled
                  className="w-full sm:w-auto bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-70 pointer-events-none font-bold gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Already Taken
                </Button>
              </>
            ) : !exam.can_start ? (
              <Button
                disabled
                className="w-full sm:w-auto bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-70 font-bold"
              >
                {exam.start_blocked_reason || 'Not available'}
              </Button>
            ) : (
              <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={isStarting} className="w-full sm:w-auto gap-2 bg-[#0B2545] hover:bg-[#133E6D] text-white font-bold">
                    <Play className="h-4 w-4" /> Start Exam
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ready to begin?</DialogTitle>
                    <DialogDescription>
                      You are about to start <strong>{exam.title}</strong>. 
                      The timer of {exam.time_limit} minutes will start immediately.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md my-2 flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>Ensure you have a stable internet connection. Do not close the browser during the exam.</p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)} disabled={isStarting}>Cancel</Button>
                    <Button onClick={handleConfirmStart} disabled={isStarting} className="bg-[#0B2545] hover:bg-[#133E6D] text-white">
                      {isStarting ? "Starting..." : "Yes, Start Now"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardFooter>

      </Card>

      {gate}
    </div>
  );
}
