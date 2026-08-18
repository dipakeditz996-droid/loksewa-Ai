"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminMockExamsApi } from "@/lib/api/admin-mock-exams";
import { MockExam } from "@/lib/api/teacher-mock-exams";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle, XCircle, FileText, AlertCircle, Clock } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AdminMockExamReview() {
  const { id } = useParams();
  const router = useRouter();
  const [exam, setExam] = useState<MockExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      adminMockExamsApi.getReviewExamById(Number(id))
        .then(data => {
          setExam(data);
          setComment(data.reviewer_comment || "");
          setLoading(false);
        })
        .catch(err => {
          toast.error("Failed to load exam details");
          setLoading(false);
        });
    }
  }, [id]);

  const handleModerate = async (action: 'approve' | 'request_changes' | 'reject') => {
    if ((action === 'request_changes' || action === 'reject') && !comment.trim()) {
      toast.error("Please provide a comment for this action.");
      return;
    }

    setSubmitting(true);
    try {
      await adminMockExamsApi.moderateExam(Number(id), action, comment);
      toast.success(`Exam ${action === 'approve' ? 'approved' : action === 'request_changes' ? 'returned for changes' : 'rejected'}`);
      router.push('/admin/mock-exams');
    } catch (error) {
      toast.error("Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading exam details...</div>;
  if (!exam) return <div className="p-12 text-center text-red-500">Exam not found</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/mock-exams')} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Review: {exam.title}</h1>
          <p className="text-sm text-slate-500">Submitted by {(exam as any).created_by_name || 'Unknown Teacher'}</p>
        </div>
        {exam.status === 'pending_review' && (
          <span className="ml-auto px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pending Review
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                <FileText className="w-5 h-5 text-blue-600" /> Exam Configuration
              </h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                  <div className="text-slate-500 mb-1">Description</div>
                  <div className="text-slate-900">{exam.description || 'No description provided.'}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Time Limit</div>
                  <div className="font-medium text-slate-900">{exam.time_limit} minutes</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Total Marks / Passing</div>
                  <div className="font-medium text-slate-900">{exam.total_marks} / {exam.passing_marks}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Negative Marking</div>
                  <div className="font-medium text-slate-900">{exam.negative_marking ? `Yes (${exam.negative_marking_value})` : 'No'}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Questions</div>
                  <div className="font-medium text-slate-900">{exam.total_questions} (Marks per Q: {exam.marks_per_question})</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Behavior</div>
                  <div className="font-medium text-slate-900">
                    Randomize: {exam.randomize_questions ? 'Yes' : 'No'} | Max Attempts: {exam.max_attempts === 0 ? 'Unlimited' : exam.max_attempts}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-800 border-b pb-2 mb-4">Questions Preview ({exam.questions_list?.length || 0})</h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {exam.questions_list?.map((sq, idx) => (
                  <div key={sq.id} className="p-4 border rounded-lg bg-slate-50">
                    <div className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="text-slate-900 font-medium mb-3" dangerouslySetInnerHTML={{__html: sq.question_detail?.text || ''}} />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {['option_a', 'option_b', 'option_c', 'option_d'].map((opt, i) => {
                            const optText = (sq.question_detail as any)?.[opt];
                            const isCorrect = (sq.question_detail as any)?.correct_option === String.fromCharCode(97 + i); // a, b, c, d
                            if (!optText) return null;
                            return (
                              <div key={i} className={`p-2 border rounded ${isCorrect ? 'bg-green-100 border-green-300 font-medium text-green-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                                {String.fromCharCode(65 + i)}. {optText}
                                {isCorrect && <CheckCircle className="w-4 h-4 inline-block ml-2 text-green-600" />}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-slate-200 shadow-sm sticky top-6">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-semibold text-slate-800 border-b pb-2">Moderation Action</h3>
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Reviewer Comments</label>
                <Textarea 
                  placeholder="Provide feedback to the teacher (Required for Request Changes or Reject)..."
                  rows={5}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={exam.status !== 'pending_review'}
                  className="bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              {exam.status === 'pending_review' ? (
                <div className="space-y-3 pt-4 border-t">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    onClick={() => handleModerate('approve')}
                    disabled={submitting}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve & Publish
                  </Button>
                  <Button 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white" 
                    onClick={() => handleModerate('request_changes')}
                    disabled={submitting}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" /> Request Changes
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50" 
                    onClick={() => handleModerate('reject')}
                    disabled={submitting}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject Exam
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-500 text-sm border">
                  This exam has already been moderated. Current status: <span className="font-semibold uppercase">{exam.status.replace('_', ' ')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
