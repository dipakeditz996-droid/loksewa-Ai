"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  RefreshCw,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ApiErrorState,
  EmptyState,
  TableSkeleton,
} from "@/components/admin/exams/ExamStateViews";
import {
  adminExamApi,
  type ExamAttemptStatus,
  type ExamResultRow,
  type ExamResultsOrdering,
  type ExamResultsQueryParams,
  type ExamResultsResponse,
} from "@/lib/api/admin-exams";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";

const RESOURCE_LABEL = "examination results";
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

type PassFilter = "all" | "passed" | "failed";

const PASS_FILTERS: { key: PassFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "passed", label: "Passed" },
  { key: "failed", label: "Failed" },
];

const ATTEMPT_STATUSES: { key: "all" | ExamAttemptStatus; label: string }[] = [
  { key: "all", label: "All attempts" },
  { key: "in-progress", label: "In progress" },
  { key: "submitted", label: "Submitted" },
  { key: "evaluated", label: "Evaluated" },
];

const ORDERING_OPTIONS: { key: ExamResultsOrdering; label: string }[] = [
  { key: "-score", label: "Highest score" },
  { key: "score", label: "Lowest score" },
  { key: "time_taken_seconds", label: "Fastest time" },
  { key: "-time_taken_seconds", label: "Slowest time" },
  { key: "-submitted_at", label: "Most recent submission" },
];

function AttemptStatusBadge({ row }: { row: ExamResultRow }) {
  if (row.status !== "evaluated") {
    return (
      <Badge variant="outline" className="capitalize bg-slate-50 text-slate-600 border-slate-200">
        {row.status.replace(/-/g, " ")}
      </Badge>
    );
  }
  return row.passed ? (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
      Passed
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
      Failed
    </Badge>
  );
}

export default function ExamResultsPage() {
  const params = useParams<{ id: string }>();
  const examId = Number(params?.id);
  const validId = Number.isFinite(examId) && examId > 0;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [passFilter, setPassFilter] = useState<PassFilter>("all");
  const [attemptStatus, setAttemptStatus] = useState<"all" | ExamAttemptStatus>("all");
  const [ordering, setOrdering] = useState<ExamResultsOrdering>("-score");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Debounce the search box so filtering stays server-side without a request
  // per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryParams: ExamResultsQueryParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      ordering,
      ...(passFilter !== "all" ? { passed: passFilter === "passed" } : {}),
      ...(attemptStatus !== "all" ? { status: attemptStatus } : {}),
      ...(search ? { search } : {}),
    }),
    [page, pageSize, ordering, passFilter, attemptStatus, search]
  );

  const { data, isLoading, isFetching, error, refetch } = useQuery<ExamResultsResponse>({
    queryKey: ["admin", "exam", examId, "results", queryParams],
    queryFn: () => adminExamApi.getResults(examId, queryParams),
    enabled: validId,
    retry: false,
    placeholderData: keepPreviousData,
  });

  const rows = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, data?.num_pages ?? 1);
  const currentPage = data?.current_page ?? page;
  const filtersDisabled = isFetching;

  if (!validId) {
    return <EmptyState title="Invalid examination reference." />;
  }

  if (error) {
    return (
      <ApiErrorState
        error={error}
        resourceLabel={RESOURCE_LABEL}
        onRetry={() => refetch()}
        isRetrying={isFetching}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ---------------- Filters ---------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-slate-100 p-1 rounded-lg">
            {PASS_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                disabled={filtersDisabled}
                onClick={() => {
                  setPassFilter(filter.key);
                  setPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                  passFilter === filter.key
                    ? "bg-white text-[#0B2545] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <select
            value={attemptStatus}
            disabled={filtersDisabled}
            onChange={(e) => {
              setAttemptStatus(e.target.value as "all" | ExamAttemptStatus);
              setPage(1);
            }}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 disabled:opacity-60"
          >
            {ATTEMPT_STATUSES.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={ordering}
            disabled={filtersDisabled}
            onChange={(e) => {
              setOrdering(e.target.value as ExamResultsOrdering);
              setPage(1);
            }}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 disabled:opacity-60"
          >
            {ORDERING_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search students"
              className="h-9 pl-8 w-full lg:w-56"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-9">
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ---------------- Results table ---------------- */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={8} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={
            passFilter !== "all" || attemptStatus !== "all" || search
              ? "No results match the current filters."
              : "No results available yet."
          }
          description={
            passFilter !== "all" || attemptStatus !== "all" || search
              ? "Try clearing the filters or searching for a different student."
              : "Student results appear here once attempts have been submitted and evaluated."
          }
          icon={<Trophy className="w-6 h-6" />}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead className="min-w-[220px]">Student</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Correct</TableHead>
                  <TableHead className="text-right">Incorrect</TableHead>
                  <TableHead className="text-right">Skipped</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const expanded = expandedId === row.id;
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow className={cn(expanded && "bg-slate-50/60")}>
                        <TableCell className="tabular-nums font-semibold text-[#0B2545]">
                          {row.rank ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate">{row.student_name}</p>
                            <p className="text-xs text-slate-400 truncate">{row.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className="font-semibold text-slate-800">
                            {formatNumber(row.score, 2)}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {formatNumber(row.percentage, 2)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600">
                          {formatNumber(row.correct_answers)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-red-500">
                          {formatNumber(row.incorrect_answers)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-400">
                          {formatNumber(row.skipped_answers)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-600">
                          {formatDuration(row.time_taken_seconds)}
                        </TableCell>
                        <TableCell>
                          <AttemptStatusBadge row={row} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400"
                            aria-label={expanded ? "Hide attempt details" : "Show attempt details"}
                            onClick={() => setExpandedId(expanded ? null : row.id)}
                          >
                            {expanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {expanded && (
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                          <TableCell colSpan={9} className="p-0">
                            <div className="px-5 py-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                  Attempt started
                                </p>
                                <p className="text-slate-700 mt-0.5">
                                  {formatDateTime(row.started_at)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                  Submitted
                                </p>
                                <p className="text-slate-700 mt-0.5">
                                  {formatDateTime(row.submitted_at)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                  Attempt status
                                </p>
                                <p className="text-slate-700 mt-0.5 capitalize">
                                  {row.status.replace(/-/g, " ")}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                  Rank
                                </p>
                                <p className="text-slate-700 mt-0.5 tabular-nums">
                                  {row.rank ?? "Not ranked until evaluated"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* ---------------- Pagination ---------------- */}
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-slate-500">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                {formatNumber(totalCount)} result{totalCount === 1 ? "" : "s"}
              </span>
              <select
                value={pageSize}
                disabled={filtersDisabled}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 disabled:opacity-60"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={currentPage <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="px-3 font-medium text-slate-600 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={currentPage >= totalPages || isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        Ranking is computed by the backend across all attempts matching the current filters
        (score descending, then time taken ascending).
      </p>
    </div>
  );
}
