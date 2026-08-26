"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomTooltip } from "@/components/analytics/ChartComponents";
import {
  ApiErrorState,
  EmptyState,
  PanelSkeleton,
  StatGridSkeleton,
} from "@/components/admin/exams/ExamStateViews";
import { StatTile } from "@/components/admin/exams/StatTile";
import {
  adminExamApi,
  type ExamAnalyticsResponse,
  type ExamDifficulty,
  type ExamQuestionPerformance,
} from "@/lib/api/admin-exams";
import { formatDuration, formatNumber } from "@/lib/format";

const RESOURCE_LABEL = "examination analytics";
const DIFFICULTY_LEVELS: { key: ExamDifficulty; label: string; color: string }[] = [
  { key: "easy", label: "Easy", color: "#10b981" },
  { key: "medium", label: "Medium", color: "#D4A72C" },
  { key: "hard", label: "Hard", color: "#ef4444" },
];
const QUESTIONS_PER_PAGE = 10;

/** Colour a decile bucket from red (low) through amber to green (high). */
function bucketColor(range: string): string {
  const start = parseInt(range, 10);
  if (Number.isNaN(start)) return "#0B2545";
  if (start >= 80) return "#10b981";
  if (start >= 60) return "#84cc16";
  if (start >= 40) return "#D4A72C";
  if (start >= 20) return "#f97316";
  return "#ef4444";
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <header className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#0B2545]">{title}</h2>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function ExamAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const examId = Number(params?.id);
  const validId = Number.isFinite(examId) && examId > 0;

  const { data, isLoading, error, refetch, isFetching } = useQuery<ExamAnalyticsResponse>({
    queryKey: ["admin", "exam", examId, "analytics"],
    queryFn: () => adminExamApi.getAnalytics(examId),
    enabled: validId,
    retry: false,
  });

  const [questionSearch, setQuestionSearch] = useState("");
  const [questionPage, setQuestionPage] = useState(1);
  const [accuracyAscending, setAccuracyAscending] = useState(true);

  const questionPerformance: ExamQuestionPerformance[] = useMemo(
    () => data?.question_performance ?? [],
    [data]
  );

  /**
   * Correct / incorrect / skipped totals per difficulty. These are a plain
   * regrouping of the per-question rows the backend already returned — no
   * client-side estimation is involved. The response counts themselves
   * (`difficulty_performance`) stay authoritative for responses and accuracy.
   */
  const difficultyBreakdown = useMemo(() => {
    const totals = new Map<string, { correct: number; incorrect: number; skipped: number }>();
    for (const q of questionPerformance) {
      const key = String(q.difficulty).toLowerCase();
      const entry = totals.get(key) ?? { correct: 0, incorrect: 0, skipped: 0 };
      entry.correct += q.correct;
      entry.incorrect += q.incorrect;
      entry.skipped += q.skipped;
      totals.set(key, entry);
    }
    return totals;
  }, [questionPerformance]);

  const filteredQuestions = useMemo(() => {
    const term = questionSearch.trim().toLowerCase();
    const rows = term
      ? questionPerformance.filter(
          (q) =>
            q.question_text.toLowerCase().includes(term) ||
            String(q.question_number).includes(term)
        )
      : questionPerformance;
    return [...rows].sort((a, b) =>
      accuracyAscending ? a.accuracy - b.accuracy : b.accuracy - a.accuracy
    );
  }, [questionPerformance, questionSearch, accuracyAscending]);

  const questionTotalPages = Math.max(1, Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE));
  const currentQuestionPage = Math.min(questionPage, questionTotalPages);
  const visibleQuestions = filteredQuestions.slice(
    (currentQuestionPage - 1) * QUESTIONS_PER_PAGE,
    currentQuestionPage * QUESTIONS_PER_PAGE
  );

  if (!validId) {
    return <EmptyState title="Invalid examination reference." />;
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <StatGridSkeleton />
        <div className="grid gap-5 lg:grid-cols-2">
          <PanelSkeleton />
          <PanelSkeleton />
        </div>
        <PanelSkeleton height="h-80" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ApiErrorState
        error={error}
        resourceLabel={RESOURCE_LABEL}
        onRetry={() => refetch()}
        isRetrying={isFetching}
      />
    );
  }

  const summary = data.summary;
  const time = data.time_statistics;
  const distribution = data.score_distribution ?? [];
  const difficultyPerformance = data.difficulty_performance ?? [];

  const hasAttempts = summary.total_attempts > 0;
  const hasEvaluated = summary.completed_attempts > 0;
  const passRate =
    hasEvaluated && summary.pass_count !== undefined
      ? (summary.pass_count / summary.completed_attempts) * 100
      : null;

  return (
    <div className="space-y-5">
      {/* ---------------- Summary ---------------- */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Summary</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatTile
          label="Total Attempts"
          value={formatNumber(summary.total_attempts)}
          icon={<Users className="w-4 h-4" />}
        />
        <StatTile
          label="Completed"
          value={formatNumber(summary.completed_attempts)}
          hint="Evaluated attempts"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatTile
          label="In Progress"
          value={formatNumber(summary.in_progress_attempts)}
          icon={<Clock className="w-4 h-4" />}
        />
        <StatTile
          label="Average Score"
          value={hasEvaluated ? formatNumber(summary.average_score, 2) : "—"}
          hint={
            hasEvaluated && summary.average_percentage !== undefined
              ? `${formatNumber(summary.average_percentage, 2)}% average`
              : undefined
          }
          icon={<Activity className="w-4 h-4" />}
        />
        <StatTile
          label="Highest Score"
          value={hasEvaluated ? formatNumber(summary.highest_score, 2) : "—"}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatTile
          label="Lowest Score"
          value={hasEvaluated ? formatNumber(summary.lowest_score, 2) : "—"}
          icon={<TrendingDown className="w-4 h-4" />}
        />
        <StatTile
          label="Pass Rate"
          value={passRate === null ? "—" : `${passRate.toFixed(1)}%`}
          hint={
            hasEvaluated
              ? `${formatNumber(summary.pass_count)} passed · ${formatNumber(summary.fail_count)} failed`
              : undefined
          }
          icon={<Trophy className="w-4 h-4" />}
        />
      </div>

      {!hasAttempts && (
        <EmptyState
          title="No student attempts yet."
          description={
            data.message ??
            "Analytics will populate automatically once students start attempting this examination."
          }
          icon={<BarChart3 className="w-6 h-6" />}
        />
      )}

      {hasAttempts && !hasEvaluated && (
        <EmptyState
          title="No evaluated attempts yet."
          description="Scores, timings and question performance appear once attempts have been evaluated."
          icon={<Clock className="w-6 h-6" />}
        />
      )}

      {hasEvaluated && (
        <>
          {/* ---------------- Time performance ---------------- */}
          <Panel
            title="Time performance"
            description="Completion times recorded for evaluated attempts."
          >
            {time ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatTile
                  label="Average completion"
                  value={formatDuration(time.average_duration_seconds)}
                  icon={<Clock className="w-4 h-4" />}
                />
                <StatTile
                  label="Fastest completion"
                  value={formatDuration(time.min_duration_seconds)}
                  icon={<TrendingUp className="w-4 h-4" />}
                />
                <StatTile
                  label="Slowest completion"
                  value={formatDuration(time.max_duration_seconds)}
                  icon={<TrendingDown className="w-4 h-4" />}
                />
              </div>
            ) : (
              <EmptyState title="No timing data reported for this examination." />
            )}
          </Panel>

          <div className="grid gap-5 xl:grid-cols-2">
            {/* ---------------- Score distribution ---------------- */}
            <Panel
              title="Score distribution"
              description="Attempts grouped into 10% score bands by the backend."
            >
              {distribution.length === 0 ? (
                <EmptyState title="No score distribution available yet." />
              ) : (
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="range"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        dy={8}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
                      <Bar dataKey="count" name="Attempts" radius={[4, 4, 0, 0]}>
                        {distribution.map((bucket) => (
                          <Cell key={bucket.range} fill={bucketColor(bucket.range)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            {/* ---------------- Difficulty performance ---------------- */}
            <Panel
              title="Performance by difficulty"
              description="Response volume and accuracy for each difficulty band."
            >
              <div className="space-y-4">
                {DIFFICULTY_LEVELS.map((level) => {
                  const row = difficultyPerformance.find(
                    (d) => d.level.toLowerCase() === level.key
                  );
                  const breakdown = difficultyBreakdown.get(level.key);

                  if (!row) {
                    return (
                      <div
                        key={level.key}
                        className="rounded-lg border border-dashed border-slate-200 px-4 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-600">{level.label}</span>
                          <span className="text-xs text-slate-400">No responses recorded</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={level.key} className="rounded-lg border border-slate-200 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-700">{level.label}</span>
                        <span className="text-sm font-semibold text-[#0B2545] tabular-nums">
                          {row.accuracy}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, row.accuracy))}%`,
                            backgroundColor: level.color,
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500 tabular-nums">
                        <span>{formatNumber(row.attempts)} responses</span>
                        {breakdown && (
                          <>
                            <span className="text-emerald-600">
                              {formatNumber(breakdown.correct)} correct
                            </span>
                            <span className="text-red-500">
                              {formatNumber(breakdown.incorrect)} incorrect
                            </span>
                            <span className="text-slate-400">
                              {formatNumber(breakdown.skipped)} skipped
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>

          {/* ---------------- Question performance ---------------- */}
          <Panel
            title="Question performance"
            description={`${formatNumber(questionPerformance.length)} questions with recorded responses.`}
            action={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    value={questionSearch}
                    onChange={(e) => {
                      setQuestionSearch(e.target.value);
                      setQuestionPage(1);
                    }}
                    placeholder="Search questions"
                    className="h-9 pl-8 w-full sm:w-56"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAccuracyAscending((v) => !v)}
                  className="h-9 whitespace-nowrap"
                >
                  {accuracyAscending ? "Lowest accuracy" : "Highest accuracy"}
                </Button>
              </div>
            }
          >
            {questionPerformance.length === 0 ? (
              <EmptyState title="No question-level responses recorded yet." />
            ) : filteredQuestions.length === 0 ? (
              <EmptyState title="No questions match your search." />
            ) : (
              <>
                <div className="overflow-x-auto -mx-5 px-5">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="min-w-[260px]">Question</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead className="text-right">Responses</TableHead>
                        <TableHead className="text-right">Correct</TableHead>
                        <TableHead className="text-right">Incorrect</TableHead>
                        <TableHead className="text-right">Skipped</TableHead>
                        <TableHead className="text-right w-32">Accuracy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleQuestions.map((q) => {
                        const level = DIFFICULTY_LEVELS.find(
                          (d) => d.key === String(q.difficulty).toLowerCase()
                        );
                        return (
                          <TableRow key={q.question_id}>
                            <TableCell className="text-slate-400 tabular-nums">
                              {q.question_number}
                            </TableCell>
                            <TableCell className="text-slate-700">{q.question_text}</TableCell>
                            <TableCell>
                              <span
                                className="inline-flex items-center gap-1.5 text-xs capitalize text-slate-600"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: level?.color ?? "#94a3b8" }}
                                />
                                {q.difficulty}
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatNumber(q.total_responses)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-emerald-600">
                              {formatNumber(q.correct)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-red-500">
                              {formatNumber(q.incorrect)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-slate-400">
                              {formatNumber(q.skipped)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${Math.min(100, Math.max(0, q.accuracy))}%`,
                                      backgroundColor:
                                        q.accuracy >= 70
                                          ? "#10b981"
                                          : q.accuracy >= 40
                                            ? "#D4A72C"
                                            : "#ef4444",
                                    }}
                                  />
                                </div>
                                <span className="tabular-nums text-slate-700 w-12 text-right">
                                  {q.accuracy}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {questionTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
                    <span>
                      Showing {(currentQuestionPage - 1) * QUESTIONS_PER_PAGE + 1}–
                      {Math.min(currentQuestionPage * QUESTIONS_PER_PAGE, filteredQuestions.length)}{" "}
                      of {formatNumber(filteredQuestions.length)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        disabled={currentQuestionPage === 1}
                        onClick={() => setQuestionPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <span className="px-2 font-medium">
                        {currentQuestionPage} / {questionTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        disabled={currentQuestionPage >= questionTotalPages}
                        onClick={() =>
                          setQuestionPage((p) => Math.min(questionTotalPages, p + 1))
                        }
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
