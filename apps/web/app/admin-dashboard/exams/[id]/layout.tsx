"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ChevronLeft, FileText, ListTodo, Trophy, ClipboardList, Pencil, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { adminExamApi } from "@/lib/api/admin-exams";
import { ApiError } from "@/lib/api/client";
import { ApiErrorState } from "@/components/admin/exams/ExamStateViews";
import { ExamStatusBadge } from "@/components/admin/exams/ExamStatusBadge";

export default function ExamDetailLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const examId = Number(params?.id);
  const validId = Number.isFinite(examId) && examId > 0;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteExam = async () => {
    if (!validId) return;
    try {
      setIsDeleting(true);
      await adminExamApi.deleteExam(examId, { permanent: true });
      toast.success(`Exam "${exam?.title || ''}" permanently deleted.`);
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      queryClient.invalidateQueries({ queryKey: ["admin-exams-overview"] });
      router.push("/admin-dashboard/exams");
    } catch (err: any) {
      console.error("Failed to delete exam:", err);
      toast.error(err?.message || "Failed to permanently delete exam.");
    } finally {
      setIsDeleting(false);
    }
  };

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

  const searchParams = useSearchParams();
  const collectionParam = searchParams.get("collection");
  const questionsHref = `${`/admin-dashboard/exams/${params?.id}`}/questions${collectionParam ? `?collection=${collectionParam}` : ""}`;

  const base = `/admin-dashboard/exams/${params?.id}`;
  const isSubjective = exam?.exam_type === "subjective";
  const tabs = [
    { label: "Overview", href: base, icon: FileText, exact: true },
    ...(isSubjective
      ? [{ label: "Submissions & Grading", href: `${base}/submissions`, icon: ClipboardList }]
      : [{ label: "Questions", href: questionsHref, icon: ListTodo }]),
    { label: "Analytics", href: `${base}/analytics`, icon: BarChart3 },
    { label: "Results", href: `${base}/results`, icon: Trophy },
    { label: "Edit", href: `/admin-dashboard/exams/new?draft=${params?.id}`, icon: Pencil, external: true },
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
              <Link
                href={`/admin-dashboard/exams/new?draft=${params?.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0B2545] text-white hover:bg-[#0B2545]/90 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Exam
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-xs font-medium h-8"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
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

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setDeleteDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5 text-red-600" />
              Permanently Delete Exam
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2 text-slate-600" asChild>
              <div>
                <p className="text-sm">
                  Are you sure you want to permanently delete{" "}
                  <span className="font-semibold text-slate-900">"{exam?.title}"</span>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 space-y-1.5 mt-2">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    This action is permanent and cannot be undone!
                  </p>
                  <p>
                    All associated questions, test configurations, and student attempt records (
                    {exam?.attempts_count ? `${exam.attempts_count} attempt(s)` : "no attempts recorded"}
                    ) will be permanently deleted from the database.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5"
              onClick={handleDeleteExam}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
