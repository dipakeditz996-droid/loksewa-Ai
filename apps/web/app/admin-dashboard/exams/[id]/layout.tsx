"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ChevronLeft, FileText, ListTodo, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { adminExamApi } from "@/lib/api/admin-exams";
import { ApiError } from "@/lib/api/client";
import { ApiErrorState } from "@/components/admin/exams/ExamStateViews";
import { ExamStatusBadge } from "@/components/admin/exams/ExamStatusBadge";

export default function ExamDetailLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const examId = Number(params?.id);
  const validId = Number.isFinite(examId) && examId > 0;

  const {
    data: exam,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin", "exam", examId],
    queryFn: () => adminExamApi.getExam(examId),
    enabled: validId,
    retry: false,
  });

  const base = `/admin-dashboard/exams/${params?.id}`;
  const tabs = [
    { label: "Overview", href: base, icon: FileText, exact: true },
    { label: "Questions", href: `${base}/questions`, icon: ListTodo },
    { label: "Analytics", href: `${base}/analytics`, icon: BarChart3 },
    { label: "Results", href: `${base}/results`, icon: Trophy },
  ];

  const meta = exam
    ? [exam.category_name, exam.exam_name, exam.subject_name].filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <Link
        href="/admin-dashboard/exams"
        className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" /> Back to exams
      </Link>

      {/* ---- Examination header ---- */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="px-5 py-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-3 w-80 mt-3" />
              </>
            ) : exam ? (
              <>
                <h1 className="text-xl font-semibold text-[#0B2545] truncate">{exam.title}</h1>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-slate-500">
                  <span className="capitalize font-medium text-slate-600">
                    {String(exam.exam_type ?? "").replace(/_/g, " ")}
                  </span>
                  {meta.map((item) => (
                    <React.Fragment key={item}>
                      <span className="text-slate-300">•</span>
                      <span>{item}</span>
                    </React.Fragment>
                  ))}
                </div>
              </>
            ) : (
              <h1 className="text-xl font-semibold text-[#0B2545]">Examination</h1>
            )}
          </div>

          {exam && (
            <div className="flex items-center gap-2 shrink-0">
              <ExamStatusBadge status={exam.status} />
            </div>
          )}
        </div>

        {/* ---- Section tabs ---- */}
        <div className="border-t border-slate-100 px-2 overflow-x-auto">
          <nav className="flex items-center gap-1 min-w-max">
            {tabs.map((tab) => {
              const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                    active
                      ? "border-[#D4A72C] text-[#0B2545]"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4", active ? "text-[#D4A72C]" : "text-slate-400")} />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {!validId ? (
        <ApiErrorState
          error={new ApiError(404, { detail: "Not found" })}
          resourceLabel="this examination"
        />
      ) : error ? (
        <ApiErrorState
          error={error}
          resourceLabel="this examination"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      ) : (
        children
      )}
    </div>
  );
}
