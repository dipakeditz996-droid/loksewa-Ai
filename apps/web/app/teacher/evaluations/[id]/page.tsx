"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2, MessageSquare, Save, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { teacherEvaluationService, SubjectiveAnswerDetail } from "@/lib/api/teacher-evaluations";
import toast from "react-hot-toast";
import { StatusPill } from "@/components/teacher/portal";

export default function EvaluationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const evaluationId = params?.id as string;

  const [evaluation, setEvaluation] = useState<SubjectiveAnswerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [marks, setMarks] = useState<number | "">("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (evaluationId) {
      loadEvaluation();
    }
  }, [evaluationId]);

  const loadEvaluation = async () => {
    setIsLoading(true);
    try {
      const data = await teacherEvaluationService.getEvaluationDetail(evaluationId);
      setEvaluation(data);
      if (data.evaluation) {
        setMarks(data.evaluation.marks_obtained);
        setFeedback(data.evaluation.feedback || "");
      }
    } catch (error) {
      console.error("Error loading evaluation:", error);
      toast.error("Evaluation not found or you do not have permission.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndNext = async () => {
    if (!evaluation) return;
    if (marks === "" || Number(marks) < 0 || Number(marks) > (evaluation.question?.marks || 100)) {
      toast.error(`Marks must be between 0 and ${evaluation.question?.marks || 100}`);
      return;
    }

    setIsSaving(true);
    try {
      await teacherEvaluationService.submitEvaluation(evaluationId, {
        marks_obtained: Number(marks),
        feedback,
      });

      toast.success("Evaluation saved successfully!");

      // Try to find the next pending evaluation to auto-navigate
      try {
        const pending = await teacherEvaluationService.getEvaluations("submitted");
        if (pending && pending.length > 0) {
          const firstPending = pending[0];
          if (firstPending) {
            router.push(`/teacher/evaluations/${firstPending.id}`);
          } else {
            router.push("/teacher/evaluations");
          }
        } else {
          toast.success("Evaluation completed. You're all caught up.");
          router.push("/teacher/evaluations");
        }
      } catch (e) {
        router.push("/teacher/evaluations");
      }
    } catch (error) {
      toast.error("Failed to save evaluation. Please try again.");
      setIsSaving(false); // only re-enable if failed, otherwise navigating
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center p-12">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#0B2545] border-t-transparent"></div>
        <p className="font-medium text-muted-foreground">Loading evaluation workspace...</p>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="mx-auto mt-20 flex max-w-7xl flex-col items-center p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Evaluation Not Found</h2>
        <p className="mb-6 text-muted-foreground">This submission might have been deleted or you lack permission.</p>
        <Link href="/teacher/evaluations">
          <Button className="rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C] text-white">Return to List</Button>
        </Link>
      </div>
    );
  }

  const isEvaluated = evaluation.status === "evaluated";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col p-4 pb-12 md:p-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Link href="/teacher/evaluations">
            <Button variant="ghost" size="icon" className="-ml-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <StatusPill status={isEvaluated ? "evaluated" : "pending"} tone={isEvaluated ? "success" : "pending"} className="mb-1" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Submission #{evaluation.id}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {evaluation.question?.topic_name ? `${evaluation.question.topic_name} - ` : ""}
              Question: {evaluation.question?.text}
            </p>
          </div>
        </div>

        <div className="flex w-full gap-4 md:w-auto">
          <Button
            className="w-full gap-2 rounded-[9px] bg-[#0B2545] shadow-sm hover:bg-[#163E6C] md:w-auto"
            onClick={handleSaveAndNext}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save & Next"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 lg:flex-row">

        {/* Student's Answer Viewer */}
        <div className="flex flex-1 flex-col">
          <Card className="flex flex-1 flex-col overflow-hidden rounded-2xl border-border shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted py-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Submitted Answer
              </CardTitle>
            </CardHeader>
            <CardContent className="relative min-h-[400px] flex-1 bg-card p-0">
              <div className="absolute inset-0 overflow-y-auto p-6">
                {evaluation.file_url ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4">
                    <p className="text-muted-foreground">The student uploaded a file.</p>
                    <a href={evaluation.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-2 rounded-[9px] border-border">
                        <Eye className="h-4 w-4" /> View Attachment
                      </Button>
                    </a>
                  </div>
                ) : evaluation.answer_text ? (
                  <div
                    className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-foreground/90"
                    dangerouslySetInnerHTML={{ __html: evaluation.answer_text }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center italic text-muted-foreground">
                    No answer content provided.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Evaluation Panel */}
        <div className="flex w-full flex-col space-y-6 lg:w-[400px]">
          <Card className="rounded-2xl border-border shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Marks</CardTitle>
              <CardDescription>Maximum marks for this question: {evaluation.question?.marks}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Marks Obtained</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-24 rounded-lg border-border text-right"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value === "" ? "" : Number(e.target.value))}
                    max={evaluation.question?.marks}
                    min={0}
                    step={0.5}
                  />
                  <span className="text-muted-foreground">/ {evaluation.question?.marks}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-1 flex-col rounded-2xl border-border shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <MessageSquare className="h-4 w-4 text-primary" /> Overall Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <Textarea
                placeholder="Write constructive feedback for the student..."
                className="min-h-[200px] flex-1 resize-none rounded-lg border-border bg-muted"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </CardContent>
            <CardFooter>
              <Button
                className="w-full gap-2 rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C] text-white"
                onClick={handleSaveAndNext}
                disabled={isSaving}
              >
                <CheckCircle2 className="h-4 w-4" /> {isSaving ? "Saving..." : "Submit Evaluation"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
