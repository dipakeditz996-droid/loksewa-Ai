"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { QuestionSelectionWorkspace } from "@/components/admin/exams/QuestionSelectionWorkspace";
import { adminExamApi, Examination } from "@/lib/api/admin-exams";

export default function ExamQuestionsPage() {
  const params = useParams();
  const examId = Number(params?.id);

  const [exam, setExam] = useState<Examination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ count: number; marks: number } | null>(null);

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await adminExamApi.getExam(examId);
        if (!cancelled) setExam(data);
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.status === 403
            ? "You don't have permission to manage examinations."
            : err?.status === 404
              ? "That exam no longer exists."
              : "Unable to load this exam."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [examId]);

  const handleSelectionChange = useCallback((count: number, marks: number) => {
    setSummary({ count, marks });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#0B2545]" />
        <p className="text-sm text-slate-500">Loading exam...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <p className="font-semibold text-slate-800">{error || "Exam not found."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0B2545]">Question Selection</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {exam.title}
            {exam.subject_name ? ` · ${exam.subject_name}` : ""}
          </p>
        </div>
        {summary && (
          <div className="text-right">
            <p className="text-2xl font-bold text-[#0B2545]">{summary.count}</p>
            <p className="text-xs text-slate-500">questions · {summary.marks} marks</p>
          </div>
        )}
      </div>

      <QuestionSelectionWorkspace
        examinationId={examId}
        defaultSubjectId={exam.subject ?? null}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  );
}
