"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, AlertCircle, Loader2, Trophy, Flame, Target, TrendingUp,
  TrendingDown, CheckCircle2, XCircle, MinusCircle, ChevronLeft, ChevronRight,
  ChevronDown, Clock,
} from "lucide-react";

import {
  adminStudentPerformanceApi, AttemptReview, ExamHistoryResponse,
  StudentPerformance, TopicPerformance,
} from "@/lib/api/admin-student-performance";
import { ApiError } from "@/lib/api/client";
import { RetryImage } from "@/components/ui/retry-image";

const fmtTime = (seconds: number) => {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined,
    { year: "numeric", month: "short", day: "numeric" }) : "—";

const STATUS_STYLE = {
  correct: { label: "CORRECT", cls: "bg-emerald-50 border-emerald-200 text-emerald-700", Icon: CheckCircle2 },
  incorrect: { label: "WRONG", cls: "bg-red-50 border-red-200 text-red-700", Icon: XCircle },
  skipped: { label: "SKIPPED", cls: "bg-slate-50 border-slate-200 text-slate-500", Icon: MinusCircle },
} as const;

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

function AccuracyBar({ value }: { value: number }) {
  const tone = value >= 75 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function TopicList({ topics, empty }: { topics: TopicPerformance[]; empty: string }) {
  if (topics.length === 0) {
    return <p className="text-sm text-slate-500 py-6 text-center">{empty}</p>;
  }
  return (
    <div className="space-y-3">
      {topics.map(t => (
        <div key={t.topic_id}>
          <div className="flex justify-between items-baseline gap-3 mb-1">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{t.topic_name}</p>
              <p className="text-xs text-slate-500 truncate">
                {[t.subject_name, t.chapter_name].filter(Boolean).join(" › ")}
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-700 shrink-0">{t.accuracy}%</span>
          </div>
          <AccuracyBar value={t.accuracy} />
          <p className="text-[11px] text-slate-400 mt-1">
            {t.correct} correct · {t.incorrect} wrong · {t.skipped} skipped
          </p>
        </div>
      ))}
    </div>
  );
}

export default function StudentPerformancePage() {
  const params = useParams();
  const studentId = Number(params?.id);

  const [data, setData] = useState<StudentPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<ExamHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [resultFilter, setResultFilter] = useState<"" | "passed" | "failed">("");

  const [openAttempt, setOpenAttempt] = useState<number | null>(null);
  const [review, setReview] = useState<AttemptReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "correct" | "incorrect" | "skipped">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminStudentPerformanceApi.getPerformance(studentId));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(
          err.status === 403 ? "You don't have permission to view student performance."
            : err.status === 404 ? "That student was not found."
            : "Unable to load this student's performance."
        );
      } else {
        setError("Connection failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { if (studentId) load(); }, [studentId, load]);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const res = await adminStudentPerformanceApi.getExamHistory(studentId, {
          page: historyPage, page_size: 10, result: resultFilter || undefined,
        });
        if (!cancelled) setHistory(res);
      } catch {
        if (!cancelled) setHistory(null);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId, historyPage, resultFilter]);

  const openReview = async (attemptId: number) => {
    if (openAttempt === attemptId) { setOpenAttempt(null); setReview(null); return; }
    setOpenAttempt(attemptId);
    setReview(null);
    setReviewFilter("all");
    setReviewLoading(true);
    try {
      setReview(await adminStudentPerformanceApi.getAttemptReview(attemptId));
    } catch {
      setReview(null);
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center py-24">
        <AlertCircle className="w-10 h-10 mx-auto text-red-400 mb-4" />
        <p className="font-semibold text-slate-800">{error || "Student not found."}</p>
        <div className="flex justify-center gap-3 mt-6">
          <Link href="/admin-dashboard/rankings"
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50">
            Back to Rankings
          </Link>
          <button onClick={load}
            className="px-4 py-2 bg-[#0B2545] hover:bg-[#163E6B] text-white rounded-lg">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { student, exam_performance: exam, practice_performance: practice,
          subjects, strong_topics, weak_topics, mistake_analysis, trend, meta } = data;
  const hasExamData = exam.total_completed > 0;

  const filteredQuestions = review?.questions.filter(
    q => reviewFilter === "all" || q.status === reviewFilter
  ) ?? [];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1 — Student header */}
      <div className="flex flex-wrap items-start gap-4">
        <Link href="/admin-dashboard/rankings"
          className="p-2 rounded-full text-slate-500 hover:bg-slate-100 mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        {student.avatar ? (
          <RetryImage src={student.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <span className="w-14 h-14 rounded-full bg-[#0B2545] text-white font-bold text-lg flex items-center justify-center shrink-0">
            {student.full_name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-[#0B2545] truncate">{student.full_name}</h1>
          <p className="text-slate-500 text-sm truncate">
            @{student.username} · {student.email} · joined {fmtDate(student.joined_date)}
          </p>
          {student.active_courses.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {student.active_courses.map(c => (
                <span key={c.id} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {c.title}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xl font-bold text-[#0B2545] flex items-center gap-1.5 justify-end">
              <Trophy className="w-4 h-4 text-[#D4A72C]" /> {student.xp.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">XP · level {student.level}</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[#0B2545] flex items-center gap-1.5 justify-end">
              <Flame className="w-4 h-4 text-orange-500" /> {student.streak}
            </p>
            <p className="text-xs text-slate-500">day streak</p>
          </div>
        </div>
      </div>

      {/* 2 — Overall performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Average Score", value: hasExamData ? `${exam.average_percentage}%` : "—", icon: Target },
          { label: "Exams Completed", value: exam.total_completed, icon: CheckCircle2 },
          { label: "Accuracy", value: exam.questions_attempted > 0 ? `${exam.accuracy}%` : "—", icon: TrendingUp },
          { label: "Pass / Fail", value: hasExamData ? `${exam.pass_count} / ${exam.fail_count}` : "—", icon: Trophy },
        ].map(s => (
          <div key={s.label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <s.icon className="w-4 h-4" />
              <p className="text-xs font-medium">{s.label}</p>
            </div>
            <p className="text-2xl font-bold text-[#0B2545]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3 — Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#0B2545]">Performance Trend</h2>
            {trend.improvement !== null && (
              <span className={`text-sm font-semibold flex items-center gap-1 ${
                trend.improvement >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {trend.improvement >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {trend.improvement >= 0 ? "+" : ""}{trend.improvement}%
              </span>
            )}
          </div>

          {trend.points.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center">No completed exams yet.</p>
          ) : (
            <>
              <div className="flex items-end gap-1.5 h-40">
                {trend.points.map(p => (
                  <div key={p.attempt_id} className="flex-1 flex flex-col justify-end group relative min-w-[6px]">
                    <div
                      className={`w-full rounded-t ${p.passed ? "bg-emerald-400" : "bg-red-400"}`}
                      style={{ height: `${Math.max(4, p.percentage)}%` }}
                    />
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap bg-[#0B2545] text-white text-[11px] rounded px-2 py-1">
                      {p.percentage}% · {fmtDate(p.date)}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                {trend.points.length} completed attempt(s), oldest to newest.
                {trend.improvement === null && " Needs at least 4 to show a trend."}
              </p>
            </>
          )}
        </div>

        {/* 8 — Mistake analysis */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-[#0B2545] mb-4">Common Mistakes</h2>
          {exam.questions_attempted === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No answers recorded yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xl font-bold text-red-700">{mistake_analysis.total_wrong}</p>
                  <p className="text-xs text-red-600">wrong</p>
                </div>
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <p className="text-xl font-bold text-slate-700">{mistake_analysis.total_skipped}</p>
                  <p className="text-xs text-slate-500">skipped</p>
                </div>
              </div>

              {mistake_analysis.weakest_subject && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Weakest Subject</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">
                    {mistake_analysis.weakest_subject.subject_name}
                  </p>
                  <p className="text-xs text-red-600">
                    Accuracy {mistake_analysis.weakest_subject.accuracy}%
                  </p>
                </div>
              )}
              {mistake_analysis.weakest_topic && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Weakest Topic</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">
                    {mistake_analysis.weakest_topic.subject_name} → {mistake_analysis.weakest_topic.topic_name}
                  </p>
                  <p className="text-xs text-red-600">
                    Accuracy {mistake_analysis.weakest_topic.accuracy}%
                  </p>
                </div>
              )}

              {mistake_analysis.by_difficulty.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">By Difficulty</p>
                  <div className="space-y-2">
                    {mistake_analysis.by_difficulty.map(d => (
                      <div key={d.difficulty} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-slate-700">{d.difficulty}</span>
                        <span className="text-slate-500">
                          {d.accuracy}% <span className="text-xs">({d.incorrect} wrong)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4 — Subjects, 5/6 — strong & weak */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-[#0B2545] mb-4">Subject Performance</h2>
          {subjects.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No subject data yet.</p>
          ) : (
            <div className="space-y-3">
              {subjects.map(s => (
                <div key={s.subject_id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.subject_name}</p>
                    <span className="text-sm font-semibold text-slate-700">{s.accuracy}%</span>
                  </div>
                  <AccuracyBar value={s.accuracy} />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {s.correct}/{s.questions_attempted - s.skipped} correct · avg score {s.average_score}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-emerald-700 mb-1">Strong Areas</h2>
          <p className="text-xs text-slate-400 mb-4">
            Accuracy ≥ {meta.weak_accuracy_threshold}%, min {meta.min_answers_for_area} answers
          </p>
          <TopicList topics={strong_topics} empty="No topic has enough answers yet." />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-red-700 mb-1">Weak Areas</h2>
          <p className="text-xs text-slate-400 mb-4">
            Accuracy below {meta.weak_accuracy_threshold}%
          </p>
          <TopicList topics={weak_topics} empty="No weak areas identified." />
        </div>
      </div>

      {/* 9 — Practice */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-bold text-[#0B2545] mb-4">Practice Performance</h2>
        {practice.total_sessions === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No practice sessions yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              ["Sessions", practice.total_sessions],
              ["Completed", practice.completed_sessions],
              ["Accuracy", `${practice.accuracy}%`],
              ["Correct", practice.correct],
              ["Incorrect", practice.incorrect],
              ["Time", fmtTime(practice.total_time_seconds)],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-lg font-bold text-[#0B2545]">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7 — Exam history + 10 — question-by-question review */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-[#0B2545]">Exam History</h2>
          <select
            value={resultFilter}
            onChange={(e) => { setResultFilter(e.target.value as typeof resultFilter); setHistoryPage(1); }}
            className="h-9 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm"
          >
            <option value="">All results</option>
            <option value="passed">Passed only</option>
            <option value="failed">Failed only</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-5 py-3">Exam</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-center">Score</th>
                <th className="px-5 py-3 text-center">Correct</th>
                <th className="px-5 py-3 text-center">Wrong</th>
                <th className="px-5 py-3 text-center">Skipped</th>
                <th className="px-5 py-3 text-center">Time</th>
                <th className="px-5 py-3 text-center">Result</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {historyLoading ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0B2545]" />
                </td></tr>
              ) : !history || history.results.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                  {resultFilter ? "No attempts match this filter." : "No exam attempts yet."}
                </td></tr>
              ) : (
                history.results.map(row => (
                  <React.Fragment key={row.attempt_id}>
                    <tr
                      onClick={() => openReview(row.attempt_id)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-[#0B2545] truncate max-w-[220px]">
                          {row.exam_title || "—"}
                        </p>
                        <p className="text-xs text-slate-400 capitalize">{row.exam_type}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{fmtDate(row.submitted_at || row.started_at)}</td>
                      <td className="px-5 py-3 text-center font-semibold text-slate-800">{row.percentage}%</td>
                      <td className="px-5 py-3 text-center text-emerald-600">{row.correct}</td>
                      <td className="px-5 py-3 text-center text-red-600">{row.incorrect}</td>
                      <td className="px-5 py-3 text-center text-slate-400">{row.skipped}</td>
                      <td className="px-5 py-3 text-center text-slate-600">{fmtTime(row.time_taken_seconds)}</td>
                      <td className="px-5 py-3 text-center">
                        {row.status === "in-progress" ? (
                          <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600">In progress</span>
                        ) : row.passed ? (
                          <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700">Passed</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-red-50 text-red-700">Failed</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ChevronDown className={`w-4 h-4 text-slate-400 inline transition-transform ${
                          openAttempt === row.attempt_id ? "rotate-180" : ""}`} />
                      </td>
                    </tr>

                    {openAttempt === row.attempt_id && (
                      <tr>
                        <td colSpan={9} className="bg-slate-50/70 px-5 py-5">
                          {reviewLoading ? (
                            <div className="py-8 text-center">
                              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0B2545]" />
                            </div>
                          ) : !review ? (
                            <p className="text-sm text-slate-500 py-6 text-center">
                              Unable to load this attempt&rsquo;s review.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex flex-wrap items-center gap-3">
                                <p className="text-sm font-semibold text-[#0B2545]">
                                  {review.summary.total_questions} questions · {review.summary.accuracy}% accuracy
                                </p>
                                <div className="flex gap-1.5 ml-auto">
                                  {(["all", "correct", "incorrect", "skipped"] as const).map(f => (
                                    <button
                                      key={f}
                                      onClick={() => setReviewFilter(f)}
                                      className={`px-2.5 py-1 text-xs rounded-lg border capitalize ${
                                        reviewFilter === f
                                          ? "bg-[#0B2545] text-white border-[#0B2545]"
                                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                      }`}
                                    >
                                      {f}
                                      {f !== "all" && ` (${review.summary[f === "incorrect" ? "incorrect" : f === "correct" ? "correct" : "skipped"]})`}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {filteredQuestions.length === 0 ? (
                                <p className="text-sm text-slate-500 py-6 text-center">
                                  No {reviewFilter} questions in this attempt.
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {filteredQuestions.map(q => {
                                    const style = STATUS_STYLE[q.status];
                                    return (
                                      <div key={q.question_id}
                                        className={`border rounded-lg p-4 bg-white ${style.cls.split(" ")[1]}`}>
                                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                          <span className="text-xs font-semibold text-slate-500">
                                            Question {q.number}
                                          </span>
                                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${style.cls}`}>
                                            <style.Icon className="w-3 h-3" /> {style.label}
                                          </span>
                                        </div>

                                        <p className="text-sm text-slate-800 mb-3">{q.text}</p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                          <div>
                                            <p className="text-slate-500">Student answer</p>
                                            <p className="font-semibold text-slate-800">
                                              {q.student_answer
                                                ? `${q.student_answer} — ${q.options[q.student_answer as "A"] ?? ""}`
                                                : "Not answered"}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-slate-500">Correct answer</p>
                                            <p className="font-semibold text-emerald-700">
                                              {q.correct_answer
                                                ? `${q.correct_answer} — ${q.options[q.correct_answer as "A"] ?? ""}`
                                                : "—"}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-500">
                                          <span>{[q.subject, q.topic].filter(Boolean).join(" › ") || "Unclassified"}</span>
                                          <span className="capitalize">Difficulty: {q.difficulty}</span>
                                          <span>Marks: {q.marks_obtained} / {q.marks}</span>
                                          {q.time_spent_seconds !== null && (
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" /> {fmtTime(q.time_spent_seconds)}
                                            </span>
                                          )}
                                        </div>

                                        {q.explanation && (
                                          <p className="mt-3 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded p-2">
                                            <strong>Explanation:</strong> {q.explanation}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {!meta.per_question_timing_available.exam && (
                                <p className="text-[11px] text-slate-400">
                                  Per-question timing is not recorded for exams — only the total
                                  attempt duration ({fmtTime(review.attempt.time_taken_seconds)}).
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {history && history.total_pages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {history.count} attempt(s)
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={!history.has_previous}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-xs text-slate-500">
                Page {history.page} of {history.total_pages}
              </span>
              <button onClick={() => setHistoryPage(p => p + 1)}
                disabled={!history.has_next}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 flex items-center gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
