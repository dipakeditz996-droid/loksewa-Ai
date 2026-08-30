"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft, FileText, Save, CheckCircle2, MessageSquare,
  Loader2, AlertCircle, GraduationCap, BookOpen, Calendar, Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adminApi, AdminEvaluationDetail } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-700",
    "under-review": "bg-yellow-100 text-yellow-700",
    evaluated: "bg-emerald-100 text-emerald-700",
    returned: "bg-orange-100 text-orange-700",
    draft: "bg-slate-100 text-slate-700",
  };
  const cls = map[status] || "bg-slate-100 text-slate-700";
  const label = status.replace("-", " ");
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded capitalize ${cls}`}>
      {label}
    </span>
  );
}

export default function AdminEvaluationAnswerPage() {
  const params = useParams();
  const id = params?.id as string;

  const [detail, setDetail] = useState<AdminEvaluationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [marks, setMarks] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState<"draft" | "final" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await adminApi.getEvaluation(id);
      setDetail(data);
      setMarks(data.evaluation ? String(data.evaluation.marks_obtained) : "");
      setFeedback(data.evaluation?.feedback || "");
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const maxMarks = detail?.question?.marks ?? 0;

  const handleSave = async (finalize: boolean) => {
    if (!detail) return;
    const parsed = Number(marks);
    if (marks === "" || Number.isNaN(parsed)) {
      toast.error("Enter the marks awarded before saving.");
      return;
    }
    if (parsed < 0 || parsed > maxMarks) {
      toast.error(`Marks must be between 0 and ${maxMarks}.`);
      return;
    }

    setSaving(finalize ? "final" : "draft");
    try {
      const updated = await adminApi.saveEvaluation(id, {
        marks_obtained: parsed,
        feedback,
        finalize,
      });
      setDetail(updated);
      toast.success(finalize ? "Evaluation submitted." : "Evaluation saved.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to save evaluation.";
      toast.error(message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">Loading evaluation…</p>
      </div>
    );
  }

  if (notFound || !detail) {
    return (
      <div className="mx-auto mt-20 flex max-w-lg flex-col items-center p-8 text-center">
        <AlertCircle className="mb-4 h-10 w-10 text-rose-500" />
        <h2 className="mb-2 text-xl font-bold text-slate-800">Submission not found</h2>
        <p className="mb-6 text-sm text-slate-500">
          This submission may have been removed, or you don&apos;t have permission to evaluate it.
        </p>
        <Link href="/admin-dashboard/evaluations">
          <Button className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white">Back to Evaluations</Button>
        </Link>
      </div>
    );
  }

  const isEvaluated = detail.status === "evaluated";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin-dashboard/evaluations">
            <Button variant="ghost" size="icon" className="-ml-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#0B2545]">Submission #{detail.id}</h1>
              {statusBadge(detail.status)}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Review the answer and record marks and feedback.</p>
          </div>
        </div>
      </div>

      {/* Student + Exam context */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <GraduationCap className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase">Student</p>
              <p className="text-sm font-semibold text-[#0B2545] truncate">{detail.student.name}</p>
              <p className="text-xs text-slate-500 truncate">{detail.student.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase">Examination / Paper</p>
              <p className="text-sm font-semibold text-[#0B2545] truncate">{detail.exam || detail.paper || "—"}</p>
              {detail.subject && <p className="text-xs text-slate-500 truncate">{detail.subject}</p>}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase">Submitted</p>
              <p className="text-sm font-semibold text-[#0B2545]">
                {detail.submittedAt ? new Date(detail.submittedAt).toLocaleString() : "—"}
              </p>
              <p className="text-xs text-slate-500">{detail.wordCount} words</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase">Evaluator</p>
              <p className="text-sm font-semibold text-[#0B2545] truncate">
                {detail.evaluation?.evaluator_name || "Not yet evaluated"}
              </p>
              {detail.evaluation?.evaluated_at && (
                <p className="text-xs text-slate-500">{new Date(detail.evaluation.evaluated_at).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Center: Question + Answer + Reference */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-bold text-[#0B2545]">Question</h2>
            </div>
            <div className="p-5 space-y-2">
              <p className="text-[15px] text-slate-800 leading-relaxed">{detail.question?.text}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {detail.question?.topic_name && <span>{detail.question.topic_name}</span>}
                <span className="font-semibold text-slate-600">Max marks: {detail.question?.marks}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#0B2545]" />
              <h2 className="text-sm font-bold text-[#0B2545]">Student&apos;s Answer</h2>
            </div>
            <div className="p-5 min-h-[200px]">
              {detail.fileUrl ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <Paperclip className="h-8 w-8 text-slate-400" />
                  <p className="text-sm text-slate-500">The student uploaded a file.</p>
                  <a href={detail.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="bg-white gap-2">
                      <FileText className="h-4 w-4" /> View Attachment
                    </Button>
                  </a>
                </div>
              ) : detail.answerText ? (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{detail.answerText}</p>
              ) : (
                <p className="italic text-slate-400 text-center py-10">No answer content provided.</p>
              )}
            </div>
          </div>

          {detail.question?.model_answer && (
            <div className="bg-blue-50/50 rounded-xl border border-blue-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-blue-100">
                <h2 className="text-sm font-bold text-blue-800">Reference / Expected Answer</h2>
              </div>
              <div className="p-5">
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-blue-900">{detail.question.model_answer}</p>
              </div>
            </div>
          )}

          {detail.evaluation && detail.evaluation.annotations.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-bold text-[#0B2545]">Annotations</h2>
              </div>
              <div className="p-5 space-y-3">
                {detail.evaluation.annotations.map((a) => (
                  <div key={a.id} className="border-l-2 border-amber-300 pl-3 text-sm">
                    <p className="italic text-slate-500">&quot;{a.selected_text}&quot;</p>
                    <p className="text-slate-700 mt-1">{a.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Marks + Feedback + Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-bold text-[#0B2545]">Awarded Marks</h2>
              <p className="text-xs text-slate-500 mt-0.5">Maximum: {maxMarks}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  min={0}
                  max={maxMarks}
                  step={0.5}
                  placeholder="0"
                  className="w-full px-3 py-2 text-lg font-bold border border-slate-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/40"
                />
                <span className="text-sm font-semibold text-slate-400 shrink-0">/ {maxMarks}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5 mb-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Evaluator Feedback
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Write feedback for the student…"
                  className="min-h-[140px] resize-none bg-slate-50"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  variant="outline"
                  className="bg-white gap-2"
                  onClick={() => handleSave(false)}
                  disabled={saving !== null}
                >
                  <Save className="h-4 w-4" />
                  {saving === "draft" ? "Saving…" : "Save Progress"}
                </Button>
                <Button
                  className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white gap-2"
                  onClick={() => handleSave(true)}
                  disabled={saving !== null}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {saving === "final" ? "Submitting…" : isEvaluated ? "Re-submit Evaluation" : "Submit Evaluation"}
                </Button>
              </div>
              {isEvaluated && (
                <p className="text-xs text-slate-400 text-center">
                  Already evaluated - saving again will update the recorded marks and feedback.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
