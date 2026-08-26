"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock, HelpCircle, Layers, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/admin/exams/StatTile";
import { EmptyState } from "@/components/admin/exams/ExamStateViews";
import { adminExamApi } from "@/lib/api/admin-exams";
import { formatDateTime, formatNumber } from "@/lib/format";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm text-slate-800 text-right">{value}</span>
    </div>
  );
}

export default function ExamOverviewPage() {
  const params = useParams<{ id: string }>();
  const examId = Number(params?.id);
  const validId = Number.isFinite(examId) && examId > 0;

  // Shares the cache entry populated by the exam detail layout — no extra request.
  const { data: exam, isLoading } = useQuery({
    queryKey: ["admin", "exam", examId],
    queryFn: () => adminExamApi.getExam(examId),
    enabled: validId,
    retry: false,
  });

  if (!validId) return <EmptyState title="Invalid examination reference." />;

  if (isLoading || !exam) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile
          label="Questions"
          value={formatNumber(exam.total_questions)}
          icon={<HelpCircle className="w-4 h-4" />}
        />
        <StatTile
          label="Total marks"
          value={formatNumber(exam.total_marks)}
          hint={`Pass mark ${formatNumber(exam.passing_marks)}`}
          icon={<Trophy className="w-4 h-4" />}
        />
        <StatTile
          label="Time limit"
          value={exam.time_limit ? `${formatNumber(exam.time_limit)} min` : "Unlimited"}
          icon={<Clock className="w-4 h-4" />}
        />
        <StatTile
          label="Attempts"
          value={formatNumber(exam.attempts_count)}
          icon={<Users className="w-4 h-4" />}
        />
        <StatTile
          label="Max attempts"
          value={exam.max_attempts ? formatNumber(exam.max_attempts) : "Unlimited"}
          icon={<Layers className="w-4 h-4" />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white lg:col-span-2">
          <header className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-[#0B2545]">Configuration</h2>
          </header>
          <div className="px-5 py-2">
            <DetailRow label="Question set" value={exam.question_set_name ?? "Not assigned"} />
            <DetailRow
              label="Marks per question"
              value={formatNumber(exam.marks_per_question, 2)}
            />
            <DetailRow
              label="Negative marking"
              value={
                exam.negative_marking
                  ? `Yes (−${formatNumber(exam.negative_marking_value, 2)})`
                  : "No"
              }
            />
            <DetailRow label="Resume allowed" value={exam.allow_resume ? "Yes" : "No"} />
            <DetailRow label="Auto submit" value={exam.auto_submit ? "Yes" : "No"} />
            <DetailRow
              label="Randomisation"
              value={
                [
                  exam.randomize_questions ? "Questions" : null,
                  exam.randomize_options ? "Options" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Disabled"
              }
            />
            <DetailRow
              label="Result visibility"
              value={<span className="capitalize">{String(exam.result_visibility).replace(/_/g, " ")}</span>}
            />
            <DetailRow
              label="Correct answers shown"
              value={exam.show_correct_answers ? "Yes" : "No"}
            />
            <DetailRow label="Window opens" value={formatDateTime(exam.start_time)} />
            <DetailRow label="Window closes" value={formatDateTime(exam.end_time)} />
            <DetailRow label="Last updated" value={formatDateTime(exam.updated_at)} />
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white">
            <header className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-[#0B2545]">Reporting</h2>
            </header>
            <div className="p-5 space-y-2">
              <Link href={`/admin-dashboard/exams/${examId}/analytics`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4" />
                  View analytics
                </Button>
              </Link>
              <Link href={`/admin-dashboard/exams/${examId}/results`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Trophy className="w-4 h-4" />
                  View student results
                </Button>
              </Link>
            </div>
          </section>

          {exam.description && (
            <section className="rounded-xl border border-slate-200 bg-white">
              <header className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-[#0B2545]">Description</h2>
              </header>
              <p className="p-5 text-sm text-slate-600 whitespace-pre-line">{exam.description}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
