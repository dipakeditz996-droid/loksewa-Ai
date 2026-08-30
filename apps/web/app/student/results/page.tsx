"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { evaluationService, StudentAttemptItem } from "@/lib/api/evaluations";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  AlertCircle,
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 12;

function SkeletonCard() {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-6 w-3/4 mb-4" />
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="border-t border-border/50 pt-4 flex justify-between items-center">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

function ResultCard({ r }: { r: StudentAttemptItem }) {
  const passed = r.passed ?? (r.percentage !== null && r.percentage >= 40);
  const pct = r.percentage ?? 0;
  const submittedAt = r.submitted_at ? new Date(r.submitted_at) : null;
  const timeMins = r.time_taken_seconds ? Math.round(r.time_taken_seconds / 60) : null;
  const isPending = r.status === "submitted"; // submitted but not yet evaluated
  const topRank = r.rank && r.rank <= 3 ? r.rank : null;

  return (
    <div className={`bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${topRank === 1 ? 'border-yellow-400/50 shadow-yellow-500/10' : topRank === 2 ? 'border-slate-300 shadow-slate-400/10' : topRank === 3 ? 'border-amber-600/30 shadow-amber-700/10' : 'border-border'}`}>
      {/* Top colour bar */}
      <div
        className={`absolute top-0 left-0 w-full h-1 ${
          isPending ? "bg-amber-400" : topRank ? "bg-yellow-400" : passed ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />

      <div className="flex justify-between items-start mb-3 mt-1">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          {r.status === "evaluated" ? "Evaluated" : r.status === "submitted" ? "Pending Review" : "Submitted"}
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded ${
            topRank 
              ? "bg-yellow-100 text-yellow-800"
              : isPending
              ? "bg-amber-50 text-amber-700"
              : passed
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {topRank ? (
            <Award className="h-3 w-3" />
          ) : isPending ? (
            <Clock className="h-3 w-3" />
          ) : passed ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {isPending ? "PENDING" : passed ? "PASSED" : "FAILED"}
        </span>
      </div>

      <h3 className="text-[16px] font-bold text-primary dark:text-foreground leading-tight mb-4 group-hover:text-blue-700 transition-colors">
        {r.examination_title}
      </h3>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 text-[12px] text-muted-foreground">
        {submittedAt && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {submittedAt.toLocaleDateString()}
          </span>
        )}
        {timeMins !== null && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {timeMins} min{timeMins !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="border-t border-border/50 pt-4 flex justify-between items-end">
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase">Score</p>
          {r.score !== null ? (
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-2xl font-black ${
                  isPending ? "text-amber-600" : passed ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {r.score}
              </span>
              {r.percentage !== null && (
                <span className="text-sm font-bold text-muted-foreground">({pct.toFixed(1)}%)</span>
              )}
            </div>
          ) : (
            <span className="text-sm font-medium text-muted-foreground mt-0.5 block">Pending</span>
          )}
        </div>
        <Link 
          href={`/student/results/${r.id}`}
          className="flex items-center gap-1 text-[13px] font-bold text-blue-600 hover:text-blue-800"
        >
          {topRank ? "View Full Result" : "View Detail"} <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function StudentResultsPage() {
  const [attempts, setAttempts] = useState<StudentAttemptItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res: any = await evaluationService.getMyResults({ page, page_size: PAGE_SIZE });
      const resultsArray = Array.isArray(res) ? res : (res.results || []);
      const count = Array.isArray(res) ? res.length : (res.count || 0);

      // Only show submitted or evaluated attempts (not in-progress)
      const finished = resultsArray.filter((a: any) => a.status !== "in-progress");
      setAttempts(finished);
      setTotalCount(count);
    } catch (err: any) {
      console.error("fetchResults error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1200px] mx-auto min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-bold text-primary dark:text-foreground tracking-tight flex items-center gap-2">
          <Award className="h-6 w-6 text-[#D4A72C]" />
          My Results
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View your finalized and published examination results.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Unable to load your results. Please try again later.</span>
          <button
            onClick={fetchResults}
            className="ml-auto underline font-medium text-xs"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : attempts.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-xl bg-muted">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-[15px] font-bold text-muted-foreground">No Results Yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              You haven't submitted any exams yet. Complete a mock exam to see your results here.
            </p>
          </div>
        ) : (
          attempts.map((r) => <ResultCard key={r.id} r={r} />)
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-muted-foreground px-4">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
