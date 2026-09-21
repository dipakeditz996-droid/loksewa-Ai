"use client";

import { Fragment } from "react";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { Bar } from "@/components/study-plan/sections";
import type { PlanResponse, PlanTask, ProgressResponse, WeekResponse } from "@/lib/api/study-plan-page";
import { isSectionError } from "@/lib/api/study-plan-page";
import type { StudentDetail } from "@/lib/api/admin-study-plan-monitor";
import { pct } from "@/components/admin/study-plan/monitor";

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

export function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums text-foreground">{value}</p>
      {sub && <p className="mt-1 text-[12px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Warnings({ detail }: { detail: StudentDetail["detail"] }) {
  if (!detail.flags.length) {
    return (
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> No warnings for this student.</p>
        <p className="text-sm text-muted-foreground">{detail.pace.admin_reason ?? detail.pace.reason}</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {detail.flags.map((f) => (
        <li key={f.code} className="rounded-[12px] border border-red-500/30 bg-red-500/5 p-3">
          <p className="flex items-start gap-2 font-bold text-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />{f.label}</p>
          <p className="mt-1 pl-6 text-sm text-muted-foreground">Recommended action: {f.action}</p>
        </li>
      ))}
    </ul>
  );
}

function TaskRow({ t }: { t: PlanTask }) {
  const TYPE: Record<string, string> = { STUDY: "Study", PRACTICE: "Practice", REVISION: "Revision", MOCK_EXAM: "Mock exam", REVIEW: "Review" };
  return (
    <li className="flex items-start gap-3 rounded-[12px] border border-border p-3">
      {t.completed ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="Completed" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-label="Not completed" />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{t.title}</p>
        <p className="text-[12px] text-muted-foreground">
          {TYPE[t.type] ?? t.type}{t.topic ? ` · ${t.topic.name}` : ""}{t.detail ? ` · ${t.detail}` : ""}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">Reason: {t.admin_reason ?? t.reason}</p>
      </div>
      {t.target ? <span className="shrink-0 text-sm font-bold tabular-nums">{t.done ?? 0} / {t.target}</span> : null}
    </li>
  );
}

export function TodaysPlan({ plan }: { plan: PlanResponse }) {
  if (!plan.has_preparation) return <Empty>No preparation.</Empty>;
  const today = plan.today;
  if (!today || isSectionError(today)) return <Empty>Today&apos;s plan could not be computed.</Empty>;
  if (!today.tasks.length) return <Empty>{today.is_study_day ? "No tasks today: there is nothing to practise, revise or study yet." : "Rest day - no tasks planned."}</Empty>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{today.progress.completed} of {today.progress.total} tasks completed · {today.date}</p>
      <ul className="space-y-2">{today.tasks.map((t) => <TaskRow key={t.id} t={t} />)}</ul>
      <p className="text-[12px] text-muted-foreground">Tasks are planned by the Study Plan rules and completed by the student&apos;s real activity today.</p>
    </div>
  );
}

const STATUS_TEXT: Record<string, string> = { no_content: "No content", not_started: "Not started", in_progress: "In progress", completed: "Completed" };

export function SyllabusProgress({ progress }: { progress: ProgressResponse }) {
  if (!progress.overall || !progress.subjects) return <Empty>No progress data.</Empty>;
  if (!progress.overall.topics_with_content) return <Empty>This syllabus has no questions or notes yet, so there is no progress to measure.</Empty>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {progress.overall.topics_started} of {progress.overall.topics_with_content} topics started · {progress.overall.topics_completed} completed
      </p>
      {progress.subjects.map((s) => (
        <details key={s.id} className="rounded-[12px] border border-border" open={false}>
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="font-bold">{s.name}</span>
            <span className="flex items-center gap-3 text-sm">
              {s.status === "no_content" ? <span className="text-muted-foreground">No content</span>
                : s.status === "not_started" ? <span className="text-muted-foreground">Not started</span>
                : <><span className="w-24 hidden sm:block"><Bar percent={s.percent ?? 0} /></span><span className="font-bold tabular-nums">{pct(s.percent)}</span></>}
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Chapter / topic</th><th className="px-3 py-2">Progress</th><th className="px-3 py-2">Accuracy</th>
                <th className="px-3 py-2">Answers</th><th className="px-3 py-2">Questions answered</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {s.chapters.map((c) => (
                  <Fragment key={c.id}>
                    <tr className="bg-muted/40 font-semibold">
                      <td className="px-3 py-2">{c.title}</td>
                      <td className="px-3 py-2">{c.status === "no_content" ? "No content" : c.status === "not_started" ? "Not started" : pct(c.percent)}</td>
                      <td className="px-3 py-2" /><td className="px-3 py-2" /><td className="px-3 py-2" />
                    </tr>
                    {c.topics.map((t) => (
                      <tr key={t.id}>
                        <td className="px-3 py-2 pl-8">{t.name}</td>
                        <td className="px-3 py-2">{t.percent !== null ? `${t.percent}%` : STATUS_TEXT[t.status]}</td>
                        <td className="px-3 py-2">{t.accuracy !== null ? `${t.accuracy}%` : <span className="text-muted-foreground">No performance data</span>}</td>
                        <td className="px-3 py-2 tabular-nums">{t.attempts}</td>
                        <td className="px-3 py-2 tabular-nums">{t.available_questions ? `${t.answered_questions} / ${t.available_questions}` : "—"}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  );
}

export function WeakTopics({ plan, rule }: { plan: PlanResponse; rule?: string }) {
  const weak = plan.weak_topics;
  if (!weak || isSectionError(weak)) return <Empty>Weak topics could not be computed.</Empty>;
  if (!weak.topics.length) return <Empty>No weak topics: no topic has enough answers and a low enough accuracy.</Empty>;
  return (
    <div className="space-y-2">
      {weak.topics.map((t) => (
        <div key={t.id} className="flex items-start justify-between gap-3 rounded-[12px] border border-border p-3">
          <div className="min-w-0">
            <p className="font-semibold">{t.name}</p>
            <p className="text-[12px] text-muted-foreground">{t.subject} › {t.chapter}</p>
            {(t.repeated_incorrect > 0 || t.exam_accuracy !== null) && (
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {t.repeated_incorrect > 0 && `${t.repeated_incorrect} question${t.repeated_incorrect === 1 ? "" : "s"} repeatedly wrong. `}
                {t.exam_accuracy !== null && `${t.exam_accuracy}% in mock exams (${t.exam_attempts} answers).`}
              </p>
            )}
          </div>
          <p className="shrink-0 text-right"><span className="text-lg font-black text-red-600">{t.accuracy}%</span><span className="block text-[11px] text-muted-foreground">{t.attempts} answers</span></p>
        </div>
      ))}
      <p className="text-[12px] text-muted-foreground">{rule ?? weak.rule}</p>
    </div>
  );
}

export function RevisionDetail({ plan, detail }: { plan: PlanResponse; detail: StudentDetail["detail"] }) {
  const r = plan.revision;
  if (!r || isSectionError(r)) return <Empty>Revision could not be computed.</Empty>;
  if (!r.total && !r.reviewed_today) return <Empty>No revision activity available yet.</Empty>;
  const rows: [string, number][] = [
    ["Due today", r.due_total_today], ["Completed", r.reviewed_today], ["Remaining", r.due_today],
    ["Overdue", detail.revision.overdue], ["Due tomorrow", r.due_tomorrow], ["Later", r.later],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {rows.map(([label, n]) => (
        <div key={label} className="rounded-[12px] bg-muted/50 p-3">
          <dd className="text-xl font-black tabular-nums">{n}</dd>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

export function PracticeDetail({ detail, week }: { detail: StudentDetail["detail"]; week?: WeekResponse }) {
  if (!detail.attempts && !detail.practice_sessions) return <Empty>No practice activity available yet.</Empty>;
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ["Answers", detail.attempts], ["Correct", detail.correct], ["Accuracy", pct(detail.accuracy)],
          ["Sessions", `${detail.practice_sessions_completed} / ${detail.practice_sessions} done`],
        ] as [string, React.ReactNode][]).map(([label, v]) => (
          <div key={label} className="rounded-[12px] bg-muted/50 p-3">
            <dd className="text-xl font-black tabular-nums">{v}</dd>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>
      {week?.days && (
        <div>
          <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">This week · questions per day (target {detail.daily_target})</p>
          <ol className="grid grid-cols-7 gap-1.5 text-center">
            {week.days.map((d) => (
              <li key={d.date} className={`rounded-[10px] border py-2 ${d.is_today ? "border-primary" : "border-border"}`}>
                <p className="text-[11px] font-bold uppercase text-muted-foreground">{d.label}</p>
                <p className="mt-1 text-sm font-bold tabular-nums">{d.state === "none" && d.questions === 0 ? "—" : d.questions}</p>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[12px] text-muted-foreground">
            {week.questions_this_week ?? 0} questions this week{week.streak ? ` · streak ${week.streak.current} day${week.streak.current === 1 ? "" : "s"} (best ${week.streak.highest})` : ""}.
            {" "}Tracked practice &amp; exam time: {week.study_time?.available ? `${week.study_time.recorded_minutes} min` : "none recorded"}. Reading notes and untimed practice are not measured.
          </p>
        </div>
      )}
    </div>
  );
}

export function ExamsDetail({ detail }: { detail: StudentDetail["detail"] }) {
  const o = detail.exams.objective;
  const sub = detail.exams.subjective;
  const sets = detail.exams.subjective_sets;
  if (!o.attempts && !sub.submitted && !sets.submitted) return <Empty>No mock exam attempts yet.</Empty>;
  const STATE: Record<string, string> = { scored: "Scored", awaiting_evaluation: "Awaiting evaluation", evaluated: "Evaluated" };
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ["Objective attempts", o.attempts], ["Average score", pct(o.average)], ["Passed / failed", `${o.passed} / ${o.failed}`],
          ["Awaiting evaluation", sub.awaiting_evaluation + sets.awaiting_evaluation],
        ] as [string, React.ReactNode][]).map(([label, v]) => (
          <div key={label} className="rounded-[12px] bg-muted/50 p-3">
            <dd className="text-xl font-black tabular-nums">{v}</dd>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>
      <p className="text-[12px] text-muted-foreground">
        Subjective: {sub.submitted} mock exam{sub.submitted === 1 ? "" : "s"} submitted ({sub.evaluated} evaluated{sub.average !== null ? `, avg ${sub.average}%` : ""}) and {sets.submitted} practice set{sets.submitted === 1 ? "" : "s"} submitted ({sets.evaluated} evaluated{sets.average !== null ? `, avg ${sets.average}%` : ""}). Unevaluated work is never counted as failed.
      </p>
      {detail.recent_exams.length > 0 && (
        <ul className="space-y-1.5">
          {detail.recent_exams.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-border px-3 py-2 text-sm">
              <span className="min-w-0 truncate font-medium">{e.title}</span>
              <span className="shrink-0 tabular-nums">
                {e.percentage === null ? <span className="text-muted-foreground">{STATE[e.state]}</span> : (
                  <>{e.percentage}%{e.passed === null ? ` · ${STATE[e.state]}` : ""}{e.passed !== null && (
                    <> · <span className={e.passed ? "text-emerald-700" : "text-red-600"}>{e.passed ? "Passed" : "Not passed"}</span></>
                  )}</>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const SCOPE_TEXT: Record<string, string> = { exam: "this exam", level: "its exam level", category: "its exam category", all: "applies to all exams" };

export function ExamDate({ plan }: { plan: PlanResponse }) {
  const c = plan.countdown;
  if (!c) return <Empty>{plan.pace?.admin_reason ?? "No exam date configured for this course."}</Empty>;
  return (
    <div className="space-y-1 text-sm">
      <p className="font-bold text-foreground">{c.title}</p>
      <p className="text-muted-foreground">{new Date(`${c.exam_date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "long" })} · {c.days_remaining} day{c.days_remaining === 1 ? "" : "s"} remaining</p>
      <p className="text-muted-foreground">
        {c.source === "schedule"
          ? `From the admin exam schedule (${SCOPE_TEXT[c.scope ?? "exam"] ?? "schedule"}).`
          : "The student's own target date (no schedule applies)."}
      </p>
      {plan.pace?.admin_reason && <p className="pt-1 text-muted-foreground">{plan.pace.admin_reason}</p>}
    </div>
  );
}
