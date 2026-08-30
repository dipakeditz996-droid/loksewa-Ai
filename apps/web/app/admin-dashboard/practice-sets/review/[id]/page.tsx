"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, RefreshCcw, XCircle, Play, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { adminPracticeSetsApi } from "@/lib/api/admin-practice-sets";
import { PracticeSet } from "@/lib/api/teacher-practice-sets";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function PracticeSetModerationPanel({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [practiceSet, setPracticeSet] = useState<PracticeSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  
  // Modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPracticeSet();
    }
  }, [params.id]);

  const fetchPracticeSet = async () => {
    try {
      setLoading(true);
      const data = await adminPracticeSetsApi.getReviewSet(params.id);
      setPracticeSet(data);
      if (data.reviewer_comment) {
        setFeedback(data.reviewer_comment);
      }
    } catch (error) {
      toast.error("Failed to load practice set");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await adminPracticeSetsApi.approve(params.id, feedback);
      toast.success("Practice Set approved and published");
      router.push("/admin-dashboard/practice-sets/review");
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      toast.error("Feedback is required to reject");
      return;
    }
    try {
      await adminPracticeSetsApi.reject(params.id, feedback);
      toast.success("Practice Set rejected");
      setShowRejectModal(false);
      router.push("/admin-dashboard/practice-sets/review");
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  const handleRequestChanges = async () => {
    if (!feedback.trim()) {
      toast.error("Feedback is required to request changes");
      return;
    }
    try {
      await adminPracticeSetsApi.requestChanges(params.id, feedback);
      toast.success("Changes requested");
      setShowChangesModal(false);
      router.push("/admin-dashboard/practice-sets/review");
    } catch (error) {
      toast.error("Failed to request changes");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending_review': return 'bg-purple-100 text-purple-800';
      case 'approved': return 'bg-teal-100 text-teal-800';
      case 'changes_requested': return 'bg-orange-100 text-orange-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'published': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-12 w-full max-w-md" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-[600px] md:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!practiceSet) {
    return <div className="p-12 text-center">Practice set not found</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-card p-4 rounded-xl shadow-sm border border-border/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full bg-muted/50 hover:bg-muted">
            <Link href="/admin-dashboard/practice-sets/review">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Review Practice Set</h1>
              <Badge className={getStatusColor(practiceSet.status)}>
                {practiceSet.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Review configuration and questions before approving.</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 flex-1">
        {/* Left Col: Details & Questions */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Config Details */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-muted/20 border-b pb-4">
              <CardTitle className="text-lg">Set Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="text-xs text-muted-foreground mb-1">Title</p><p className="font-medium">{practiceSet.name}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1">Type</p><p className="font-medium uppercase">{practiceSet.set_type.replace('_', ' ')}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1">Time Limit</p><p className="font-medium">{practiceSet.time_limit} mins</p></div>
              <div><p className="text-xs text-muted-foreground mb-1">Total Marks</p><p className="font-medium">{practiceSet.total_marks}</p></div>
              
              <div className="col-span-2 md:col-span-4 mt-2 pt-4 border-t flex flex-wrap gap-4">
                <Badge variant={practiceSet.randomize_questions ? "default" : "secondary"}>Shuffle Qs: {practiceSet.randomize_questions ? 'Yes' : 'No'}</Badge>
                <Badge variant={practiceSet.randomize_options ? "default" : "secondary"}>Shuffle Opts: {practiceSet.randomize_options ? 'Yes' : 'No'}</Badge>
                <Badge variant={practiceSet.negative_marking ? "destructive" : "secondary"}>Negative Marking: {practiceSet.negative_marking ? `${practiceSet.negative_marking_value}` : 'No'}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <Card className="border-border/50 shadow-sm flex flex-col h-[600px]">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
              <CardTitle className="text-lg text-blue-900 flex items-center justify-between">
                <span>Questions in this Set</span>
                <Badge className="bg-blue-600 text-white">{practiceSet.total_questions}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
              {practiceSet.questions_list?.map((sq, idx) => (
                <div key={sq.id || idx} className="p-4 bg-background border rounded-xl shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                      {sq.order}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{sq.question_details?.text}</p>
                      
                      {sq.question_details?.question_type === 'mcq' && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className={`p-2 rounded border ${sq.question_details.correct_option === 'A' ? 'bg-emerald-50 border-emerald-200 font-medium text-emerald-800' : 'bg-muted/30'}`}>A. {sq.question_details.option_a}</div>
                          <div className={`p-2 rounded border ${sq.question_details.correct_option === 'B' ? 'bg-emerald-50 border-emerald-200 font-medium text-emerald-800' : 'bg-muted/30'}`}>B. {sq.question_details.option_b}</div>
                          <div className={`p-2 rounded border ${sq.question_details.correct_option === 'C' ? 'bg-emerald-50 border-emerald-200 font-medium text-emerald-800' : 'bg-muted/30'}`}>C. {sq.question_details.option_c}</div>
                          <div className={`p-2 rounded border ${sq.question_details.correct_option === 'D' ? 'bg-emerald-50 border-emerald-200 font-medium text-emerald-800' : 'bg-muted/30'}`}>D. {sq.question_details.option_d}</div>
                        </div>
                      )}
                      
                      <div className="mt-4 pt-3 border-t flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {sq.question_details?.status.toUpperCase()}</span>
                        <span>Marks: {sq.marks}</span>
                        <span>Diff: {sq.question_details?.difficulty}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Moderation Panel */}
        <div className="space-y-6">
          <Card className="border-purple-200 shadow-md sticky top-6">
            <CardHeader className="bg-purple-50/80 border-b border-purple-100">
              <CardTitle className="flex items-center text-purple-900">
                <ShieldCheck className="mr-2 h-5 w-5" />
                Moderation Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Feedback / Comments</label>
                <Textarea 
                  placeholder="Explain why changes are needed, or leave a note..." 
                  className="min-h-[150px] resize-none"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Feedback is required for Rejection and Requesting Changes.</p>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-md"
                  onClick={handleApprove}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" /> Approve & Publish
                </Button>

                <Dialog open={showChangesModal} onOpenChange={setShowChangesModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-12 text-md border-orange-200 text-orange-700 hover:bg-orange-50">
                      <RefreshCcw className="mr-2 h-4 w-4" /> Request Changes
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Request Changes</DialogTitle><DialogDescription>This will send the set back to the teacher with your feedback.</DialogDescription></DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowChangesModal(false)}>Cancel</Button>
                      <Button className="bg-orange-600 text-white" onClick={handleRequestChanges}>Confirm</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-12 text-md border-red-200 text-red-700 hover:bg-red-50">
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Reject Practice Set</DialogTitle><DialogDescription>This will mark the practice set as rejected. Make sure you have provided feedback.</DialogDescription></DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={handleReject}>Reject</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
