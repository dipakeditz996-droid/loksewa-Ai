"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2, FileText, User, CheckCircle2, Clock, AlertCircle, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  teacherExamEvaluationsApi,
  EvaluationQueueEntry,
  EvaluationAttemptDetail,
} from "@/lib/api/teacher-exam-evaluations";
import { toast } from "react-hot-toast";

export default function TeacherExamEvaluationsPage() {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [queue, setQueue] = useState<EvaluationQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EvaluationAttemptDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await teacherExamEvaluationsApi.getQueue(tab);
      setQueue(data);
    } catch {
      toast.error("Failed to load evaluation queue.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const openAttempt = async (id: number) => {
    setLoadingDetail(true);
    setSelected(null);
    try {
      const data = await teacherExamEvaluationsApi.getAttempt(id);
      setSelected(data);
      const initialMarks: Record<number, string> = {};
      data.answers.forEach((a) => {
        if (a.evaluated_at) initialMarks[a.id] = String(a.marks_awarded);
      });
      setMarks(initialMarks);
    } catch {
      toast.error("Failed to load this attempt.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveEvaluation = async () => {
    if (!selected) return;
    const entries = Object.entries(marks)
      .filter(([, v]) => v.trim() !== "")
      .map(([answerId, v]) => ({ answer_id: Number(answerId), marks_awarded: Number(v) }));

    if (entries.length === 0) {
      toast.error("Enter marks for at least one answer.");
      return;
    }

    setSaving(true);
    try {
      const updated = await teacherExamEvaluationsApi.evaluate(selected.id, entries);
      setSelected(updated);
      toast.success(
        updated.status === "evaluated"
          ? "Evaluation complete — the student's result is now final."
          : "Marks saved. Some answers still need evaluation."
      );
      loadQueue();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save evaluation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-6 h-6" /> Subjective Model Exam Evaluations
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Grade descriptive answers submitted for Subjective Model Exams.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Queue */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col max-h-[75vh]">
          <div className="flex border-b border-border shrink-0">
            {(["pending", "all"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-colors ${
                  tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : queue.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No {tab === "pending" ? "pending" : ""} evaluations.
              </div>
            ) : (
              queue.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => openAttempt(entry.id)}
                  className={`w-full text-left p-3 hover:bg-muted transition-colors ${selected?.id === entry.id ? "bg-muted" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm text-foreground truncate">{entry.examination_title}</span>
                    {entry.pending_count > 0 ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-500/10 shrink-0">
                        {entry.pending_count} pending
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-300 bg-green-500/10 shrink-0">Done</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="w-3 h-3" /> {entry.student_name}
                    <span>·</span>
                    <Clock className="w-3 h-3" /> {new Date(entry.submitted_at).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail / grading */}
        <div className="bg-card border border-border rounded-xl p-5">
          {loadingDetail ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !selected ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Select an attempt from the queue to grade it.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
                <div>
                  <h2 className="font-bold text-foreground">{selected.examination_title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selected.student_name} · submitted {new Date(selected.submitted_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline" className={selected.status === "evaluated" ? "text-green-600 border-green-300 bg-green-500/10" : "text-amber-600 border-amber-300 bg-amber-500/10"}>
                  {selected.status === "evaluated" ? "Evaluated" : "Pending"}
                </Badge>
              </div>

              {selected.answers.map((answer, idx) => (
                <div key={answer.id} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase text-muted-foreground">Question {idx + 1} · {answer.question_detail.marks} marks</span>
                    {answer.evaluated_at && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Graded
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{answer.question_detail.text}</p>

                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Student&apos;s Answer</p>
                    {answer.answer_text ? (
                      <p className="text-sm text-foreground whitespace-pre-wrap">{answer.answer_text}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No answer submitted.</p>
                    )}
                  </div>

                  {answer.question_detail.model_answer && (
                    <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-3">
                      <p className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400 mb-1">Reference Answer</p>
                      <p className="text-sm text-blue-900 dark:text-blue-200 whitespace-pre-wrap">{answer.question_detail.model_answer}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">Marks awarded</label>
                    <input
                      type="number"
                      min={0}
                      max={answer.question_detail.marks}
                      step={0.5}
                      value={marks[answer.id] ?? ""}
                      onChange={(e) => setMarks({ ...marks, [answer.id]: e.target.value })}
                      className="w-24 h-9 px-2 rounded-md border border-input bg-background text-sm"
                      placeholder={`0-${answer.question_detail.marks}`}
                    />
                    <span className="text-xs text-muted-foreground">/ {answer.question_detail.marks}</span>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  The student sees their final score only once every subjective answer is graded.
                </p>
                <Button onClick={handleSaveEvaluation} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                  Save Evaluation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
