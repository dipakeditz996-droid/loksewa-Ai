"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import * as adminQuestionsApi from "@/lib/api/admin-questions";
import { QuestionData } from "@/lib/api/teacher-questions";
import toast from "react-hot-toast";

export default function AdminModerationPanel({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const data = await adminQuestionsApi.getAdminQuestion(Number(params.id));
        setQuestion(data);
        if (data.reviewer_comment) {
          setFeedback(data.reviewer_comment);
        }
      } catch (error) {
        toast.error("Failed to load question for review.");
        router.push("/admin-dashboard/questions/review");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, [params.id, router]);

  const handleAction = async (action: 'approve' | 'reject' | 'request_changes') => {
    if ((action === 'reject' || action === 'request_changes') && !feedback.trim()) {
      toast.error("Feedback is required for this action.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (action === 'approve') {
        await adminQuestionsApi.approveQuestion(Number(params.id), feedback);
      } else if (action === 'reject') {
        await adminQuestionsApi.rejectQuestion(Number(params.id), feedback);
      } else if (action === 'request_changes') {
        await adminQuestionsApi.requestChanges(Number(params.id), feedback);
      }
      
      toast.success(`Question ${action.replace('_', ' ')}d successfully.`);
      router.push("/admin-dashboard/questions/review");
    } catch (error: any) {
      toast.error(error?.data?.detail || "Action failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !question) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      <div className="flex-shrink-0 px-6 py-4 border-b bg-muted/20 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin-dashboard/questions/review")}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-3">
            Review Question <span className="text-muted-foreground font-mono text-sm bg-muted px-2 py-0.5 rounded">{question.question_id}</span>
          </h1>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Question Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-muted/5">
          <div className="max-w-3xl mx-auto space-y-6">
             <Card className="shadow-sm">
               <div className="bg-primary/5 p-4 border-b border-primary/10 flex items-center justify-between">
                 <span className="font-semibold text-primary uppercase text-xs tracking-wider">Content Preview</span>
                 <div className="flex gap-2">
                    <Badge variant="outline" className="bg-background">{question.marks} Marks</Badge>
                    <Badge variant="outline" className="bg-background capitalize">{question.difficulty}</Badge>
                    <Badge variant="outline" className="bg-background uppercase">{question.question_type}</Badge>
                 </div>
               </div>
               <CardContent className="p-6 space-y-8">
                 <div className="prose  max-w-none text-lg">
                    {question.text}
                 </div>
                 
                 {question.question_type === 'mcq' && (
                   <div className="space-y-3">
                     {['A', 'B', 'C', 'D'].map((letter) => {
                       const field = `option_${letter.toLowerCase()}` as keyof QuestionData;
                       const val = question[field];
                       const isCorrect = question.correct_option === letter;
                       
                       return (
                         <div key={letter} className={`flex items-start p-4 rounded-lg border ${isCorrect ? 'border-emerald-500 bg-emerald-50 ' : 'bg-background'}`}>
                           <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold mr-4 ${isCorrect ? 'border-emerald-500 text-emerald-600' : 'border-muted text-muted-foreground'}`}>
                             {letter}
                           </div>
                           <div className={`mt-1 ${isCorrect ? 'font-medium' : ''}`}>{val as string}</div>
                           {isCorrect && <CheckCircle2 className="w-5 h-5 ml-auto text-emerald-500 mt-1" />}
                         </div>
                       )
                     })}
                   </div>
                 )}

                 {question.question_type === 'subjective' && question.model_answer && (
                   <div className="bg-blue-50  border border-blue-200  rounded-lg p-4">
                     <h4 className="font-semibold text-blue-800  mb-2">Model Answer / Rubric:</h4>
                     <p className="text-blue-700  whitespace-pre-wrap">{question.model_answer}</p>
                   </div>
                 )}

                 {question.explanation && (
                   <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                     <strong className="block mb-1 text-foreground">Explanation:</strong>
                     {question.explanation}
                   </div>
                 )}
               </CardContent>
             </Card>

             <Card className="shadow-sm">
               <div className="bg-muted/30 p-4 border-b">
                 <span className="font-semibold uppercase text-xs tracking-wider">Metadata</span>
               </div>
               <CardContent className="p-4 grid grid-cols-2 gap-4 text-sm">
                 <div><span className="text-muted-foreground">Topic ID:</span> {question.topic}</div>
                 <div><span className="text-muted-foreground">Time Expected:</span> {question.expected_time_minutes} min</div>
                 <div><span className="text-muted-foreground">Negative Marks:</span> {question.negative_marks}</div>
                 <div><span className="text-muted-foreground">Tags:</span> {question.tags || 'None'}</div>
                 <div className="col-span-2"><span className="text-muted-foreground">Reference:</span> {question.reference || 'None'}</div>
               </CardContent>
             </Card>
          </div>
        </div>

        {/* Right: Moderation Tools */}
        <div className="w-96 border-l bg-background flex-shrink-0 flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b">
             <h2 className="font-bold text-lg">Moderation Actions</h2>
             <p className="text-sm text-muted-foreground mt-1">Status: <Badge variant="secondary" className="ml-2">{question.status.replace('_', ' ')}</Badge></p>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="space-y-4">
              <label className="text-sm font-semibold text-foreground">Feedback / Comments</label>
              <p className="text-xs text-muted-foreground">Provide feedback to the teacher. Required for requesting changes or rejecting.</p>
              <Textarea 
                placeholder="Write your feedback here..." 
                className="min-h-[150px] resize-y"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
          </div>

          <div className="p-6 border-t bg-muted/10 space-y-3">
             <Button 
               className="w-full bg-emerald-600 hover:bg-emerald-700" 
               disabled={isSubmitting || question.status === 'approved'}
               onClick={() => handleAction('approve')}
             >
               <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Question
             </Button>
             
             <Button 
               variant="outline"
               className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 :bg-blue-900/20" 
               disabled={isSubmitting || question.status === 'changes_requested'}
               onClick={() => handleAction('request_changes')}
             >
               <AlertCircle className="w-4 h-4 mr-2" /> Request Changes
             </Button>

             <Button 
               variant="outline"
               className="w-full border-red-200 text-red-700 hover:bg-red-50 :bg-red-900/20" 
               disabled={isSubmitting || question.status === 'rejected'}
               onClick={() => handleAction('reject')}
             >
               <XCircle className="w-4 h-4 mr-2" /> Reject Submission
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

