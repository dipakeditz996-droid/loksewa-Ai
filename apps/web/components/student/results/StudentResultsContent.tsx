"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Search,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";

const PAGE_SIZE = 12;

// In-memory cache for instant 0ms tab switching and navigation
const cachedResultsData: Record<
  string,
  { attempts: StudentAttemptItem[]; totalCount: number; timestamp: number }
> = {};

function SkeletonCard() {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-16 rounded" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="border-t border-border/50 pt-4 flex justify-between items-center">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-7 w-24 rounded" />
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
    <div
      className={`bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between ${
        topRank === 1
          ? "border-yellow-400/50 shadow-yellow-500/10"
          : topRank === 2
          ? "border-slate-300 shadow-slate-400/10"
          : topRank === 3
          ? "border-amber-600/30 shadow-amber-700/10"
          : "border-border"
      }`}
    >
      {/* Top colour bar */}
      <div
        className={`absolute top-0 left-0 w-full h-1 ${
          isPending
            ? "bg-amber-400"
            : topRank
            ? "bg-yellow-400"
            : passed
            ? "bg-emerald-500"
            : "bg-rose-500"
        }`}
      />

      <div>
        <div className="flex justify-between items-start mb-3 mt-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {r.status === "evaluated"
              ? "Evaluated"
              : r.status === "submitted"
              ? "Pending Review"
              : "Submitted"}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded ${
              topRank
                ? "bg-yellow-100 text-yellow-800"
                : isPending
                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                : passed
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
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

        <h3 className="text-[16px] font-bold text-primary dark:text-foreground leading-tight mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {r.examination_title}
        </h3>

        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5 text-[12px] text-muted-foreground">
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
          {r.rank && (
            <span className="flex items-center gap-1 font-semibold text-primary dark:text-foreground">
              <Award className="h-3.5 w-3.5 text-[#D4A72C]" />
              Rank #{r.rank}
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 flex justify-between items-end">
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Score
          </p>
          {r.score !== null ? (
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-2xl font-black ${
                  isPending
                    ? "text-amber-600 dark:text-amber-400"
                    : passed
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {r.score}
              </span>
              {r.percentage !== null && (
                <span className="text-sm font-bold text-muted-foreground">
                  ({pct.toFixed(1)}%)
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-medium text-muted-foreground mt-0.5 block">
              Pending
            </span>
          )}
        </div>
        <Link
          href={`/student/results/${r.id}`}
          className="flex items-center gap-1 text-[13px] font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          {topRank ? "View Full Result" : "View Detail"}{" "}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function StudentResultsContent() {
  const [attempts, setAttempts] = useState<StudentAttemptItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "evaluated" | "submitted">("all");

  const cacheKey = useMemo(
    () => `results_${page}_${statusFilter}`,
    [page, statusFilter]
  );

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const fetchResults = useCallback(
    async (isBackground = false) => {
      // Check in-memory warm cache
      const cached = cachedResultsData[cacheKey];
      if (cached && !isBackground) {
        setAttempts(cached.attempts);
        setTotalCount(cached.totalCount);
        setLoading(false);
        // If fresh (< 60s), avoid background re-query
        if (Date.now() - cached.timestamp < 60_000) {
          return;
        }
      }

      if (!cached) {
        setLoading(true);
      }
      setError(false);

      try {
        const queryStatus = statusFilter === "all" ? "results" : statusFilter;
        const res: any = await evaluationService.getMyResults({
          page,
          page_size: PAGE_SIZE,
          status: queryStatus,
        });

        const resultsArray = Array.isArray(res) ? res : res.results || [];
        const count = Array.isArray(res) ? res.length : res.count || 0;

        // Filter out any active in-progress attempts
        const finished = resultsArray.filter((a: any) => a.status !== "in-progress");

        setAttempts(finished);
        setTotalCount(count);

        cachedResultsData[cacheKey] = {
          attempts: finished,
          totalCount: count,
          timestamp: Date.now(),
        };
      } catch (err: any) {
        console.error("fetchResults error:", err);
        if (!cached) {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [cacheKey, page, statusFilter]
  );

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Client-side instant title search filter over the loaded page
  const filteredAttempts = useMemo(() => {
    if (!searchQuery.trim()) return attempts;
    const q = searchQuery.toLowerCase().trim();
    return attempts.filter((a) =>
      a.examination_title?.toLowerCase().includes(q)
    );
  }, [attempts, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Subheader & Search/Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary dark:text-foreground tracking-tight">
            Examination Results
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            View your finalized and published examination results, answer sheets, and score breakdowns.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-semibold">
            <button
              onClick={() => {
                setStatusFilter("all");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === "all"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setStatusFilter("evaluated");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === "evaluated"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Evaluated
            </button>
            <button
              onClick={() => {
                setStatusFilter("submitted");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === "submitted"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pending
            </button>
          </div>

          {/* Title Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search exam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-7 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40 sm:w-48 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Unable to load your results. Please try again.</span>
          </div>
          <button
            onClick={() => fetchResults()}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-card text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 hover:bg-red-100/50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filteredAttempts.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-xl bg-muted/30">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-[15px] font-bold text-foreground">
              {searchQuery ? "No Matching Results" : "No Results Yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No examinations matching "${searchQuery}" found on this page.`
                : "You haven't submitted any examinations yet. Complete a mock exam or practice set to see your scores here."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          filteredAttempts.map((r) => <ResultCard key={r.id} r={r} />)
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-muted-foreground px-4">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
