"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2, MessageSquare, Save, X, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PremiumIcon } from "@/components/ui/premium-icon";
import { teacherEvaluationService, SubjectiveAnswerDetail } from "@/lib/api/teacher-evaluations";
import toast from "react-hot-toast";

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
          toast.success("Evaluation completed 🎉 You're all caught up.");
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
      <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground font-medium">Loading evaluation workspace...</p>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center text-center mt-20">
        <h2 className="text-2xl font-bold text-foreground mb-2">Evaluation Not Found</h2>
        <p className="text-muted-foreground mb-6">This submission might have been deleted or you lack permission.</p>
        <Link href="/teacher/evaluations">
          <Button>Return to List</Button>
        </Link>
      </div>
    );
  }

  const isEvaluated = evaluation.status === "evaluated";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col animate-in fade-in-50 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/teacher/evaluations">
            <Button variant="ghost" size="icon" className="-ml-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <Badge 
              variant="outline" 
              className={`mb-1 px-2 py-0.5 ${
                isEvaluated 
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              }`}
            >
              {isEvaluated ? "Evaluated" : "Pending Evaluation"}
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Submission #{evaluation.id}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {evaluation.question?.topic_name ? `${evaluation.question.topic_name} - ` : ""}
              Question: {evaluation.question?.text}
            </p>
          </div>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <Button 
            className="gap-2 w-full md:w-auto shadow-[0_0_15px_rgba(0,212,255,0.15)] bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSaveAndNext}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" /> 
            {isSaving ? "Saving..." : "Save & Next"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6">
        
        {/* Student's Answer Viewer */}
        <div className="flex-1 flex flex-col">
          <Card className="border-border bg-card shadow-sm flex-1 flex flex-col overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/10 py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> 
                Submitted Answer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 relative bg-muted/5 min-h-[400px]">
              <div className="absolute inset-0 overflow-y-auto p-6">
                {evaluation.file_url ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <p className="text-muted-foreground">The student uploaded a file.</p>
                    <a href={evaluation.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-2">
                        <Eye className="w-4 h-4" /> View Attachment
                      </Button>
                    </a>
                  </div>
                ) : evaluation.answer_text ? (
                  <div 
                    className="text-foreground/90 leading-relaxed font-serif text-lg whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: evaluation.answer_text }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground italic">
                    No answer content provided.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Evaluation Panel */}
        <div className="w-full lg:w-[400px] flex flex-col space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Marks</CardTitle>
              <CardDescription>Maximum marks for this question: {evaluation.question?.marks}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Marks Obtained</label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    className="w-24 text-right" 
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

          <Card className="border-border bg-card shadow-sm flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Overall Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Textarea 
                placeholder="Write constructive feedback for the student..." 
                className="flex-1 min-h-[200px] resize-none bg-muted/10 border-border"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
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
