"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Info, RotateCcw,
  Search, Settings2, Target, TrendingUp, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bar, SectionFailed, SectionShell, SectionSkeleton, errorText } from "@/components/study-plan/sections";
import type {
  Overview, PlanStatus, PreparationOption, Rules, ScheduleGroup, StudentRow, StudentsResponse,
  TopicClass, TopicsResponse,
} from "@/lib/api/admin-study-plan-monitor";

// ─── shared bits ─────────────────────────────────────────────────────────────
export const STATUS_STYLE: Record<PlanStatus, string> = {
  on_track: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  slightly_behind: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  needs_attention: "bg-red-500/15 text-red-700 border-red-500/30",
  inactive: "bg-slate-500/15 text-slate-700 border-slate-500/30",
  no_schedule: "bg-sky-500/10 text-sky-700 border-sky-500/25",
};

export const STATUS_LABEL: Record<PlanStatus, string> = {
  on_track: "On Track", slightly_behind: "Slightly Behind", needs_attention: "Needs Attention",
  inactive: "Inactive", no_schedule: "No pace data",
};

export function StatusBadge({ status, label }: { status: PlanStatus; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-bold whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}

export function ago(iso: string | null): string {
  if (!iso) return "Never";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export const fullDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);

const nepalToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date());
const shiftDay = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export type RangeKey = "" | "today" | "week" | "month" | "custom";

/** Last-activity window as real dates (Nepal days), for the server to filter on. */
export function rangeToDates(range: RangeKey, from: string, to: string): { active_from?: string; active_to?: string } {
  const today = nepalToday();
  if (range === "today") return { active_from: today, active_to: today };
  if (range === "week") return { active_from: shiftDay(today, -6), active_to: today };
  if (range === "month") return { active_from: shiftDay(today, -29), active_to: today };
  if (range === "custom") return { active_from: from || undefined, active_to: to || undefined };
  return {};
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

// ─── filters ─────────────────────────────────────────────────────────────────
export interface Filters {
  exam: string;
  status: string;
  activity: string;
  progress: string;
  range: RangeKey;
  from: string;
  to: string;
  search: string;
}

export const NO_FILTERS: Filters = { exam: "", status: "", activity: "", progress: "", range: "", from: "", to: "", search: "" };

const SELECT = "h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm font-medium text-foreground outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function FilterBar({ filters, onChange, preparations, preparationsLoading }: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  preparations: PreparationOption[];
  preparationsLoading: boolean;
}) {
  const [search, setSearch] = useState(filters.search);
  useEffect(() => setSearch(filters.search), [filters.search]);
  useEffect(() => {
    if (search === filters.search) return;
    const t = setTimeout(() => onChange({ search }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const active = Object.entries(filters).some(([, v]) => v !== "");
  return (
    <div className="rounded-[16px] border border-border bg-card p-4 shadow-sm space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2 lg:col-span-2">
          <Field label="Search student">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, username or email"
                className="h-10 pl-9" aria-label="Search student" />
            </div>
          </Field>
        </div>
        <Field label="Course / preparation">
          <select className={SELECT} value={filters.exam} onChange={(e) => onChange({ exam: e.target.value })} disabled={preparationsLoading && !preparations.length}>
            <option value="">All preparations</option>
            {preparations.map((p) => (
              <option key={p.id} value={p.id}>{p.display_name} ({p.students})</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className={SELECT} value={filters.status} onChange={(e) => onChange({ status: e.target.value })}>
            <option value="">All statuses</option>
            {(Object.keys(STATUS_LABEL) as PlanStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Activity">
          <select className={SELECT} value={filters.activity} onChange={(e) => onChange({ activity: e.target.value })}>
            <option value="">Any activity</option>
            <option value="active_recently">Active recently</option>
            <option value="low_activity">Low activity</option>
            <option value="no_recent_activity">No recent activity</option>
          </select>
        </Field>
        <Field label="Course progress">
          <select className={SELECT} value={filters.progress} onChange={(e) => onChange({ progress: e.target.value })}>
            <option value="">Any progress</option>
            <option value="0-25">0–25%</option>
            <option value="26-50">26–50%</option>
            <option value="51-75">51–75%</option>
            <option value="76-100">76–100%</option>
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-52">
          <Field label="Last active">
            <select className={SELECT} value={filters.range} onChange={(e) => onChange({ range: e.target.value as RangeKey })}>
              <option value="">Any time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
          </Field>
        </div>
        {filters.range === "custom" && (
          <>
            <Field label="From"><Input type="date" className="h-10" value={filters.from} onChange={(e) => onChange({ from: e.target.value })} /></Field>
            <Field label="To"><Input type="date" className="h-10" value={filters.to} onChange={(e) => onChange({ to: e.target.value })} /></Field>
          </>
        )}
        {active && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...NO_FILTERS })} className="ml-auto">
            <X className="mr-1 h-4 w-4" /> Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── overview ────────────────────────────────────────────────────────────────
function Tile({ label, value, sub, icon, onClick, active }: {
  label: string; value: React.ReactNode; sub?: string; icon?: React.ReactNode; onClick?: () => void; active?: boolean;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <p className="mt-2 text-2xl font-black text-foreground tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-[12px] text-muted-foreground">{sub}</p>}
    </>
  );
  const cls = `rounded-[14px] border p-4 text-left ${active ? "border-primary ring-1 ring-primary" : "border-border"} bg-card`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:border-primary transition-colors`} aria-pressed={!!active}>{inner}</button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function OverviewCards({ data, status, onStatus }: { data: Overview; status: string; onStatus: (s: string) => void }) {
  const c = data.status.counts;
  const order: PlanStatus[] = ["on_track", "slightly_behind", "needs_attention", "inactive", "no_schedule"];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile label="Active study plans" value={data.students} icon={<Users className="h-4 w-4" />}
          sub={data.students ? "Students enrolled in a published course" : "No enrolled students yet"} onClick={() => onStatus("")} active={status === ""} />
        {order.slice(0, 5).map((s) => (
          <Tile key={s} label={STATUS_LABEL[s]} value={c[s]} onClick={() => onStatus(status === s ? "" : s)} active={status === s}
            sub={data.students ? `${Math.round((c[s] * 100) / data.students)}% of students` : undefined} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <Tile label="Course progress" icon={<TrendingUp className="h-4 w-4" />} value={pct(data.average_progress)}
          sub={data.students_with_progress ? `Average across ${plural(data.students_with_progress, "student")} with syllabus content` : "No syllabus progress yet"} />
        <Tile label="Practice accuracy" icon={<Target className="h-4 w-4" />} value={pct(data.accuracy.percent)}
          sub={data.accuracy.attempts ? `${plural(data.accuracy.attempts, "answer")} · ${plural(data.accuracy.students, "student")}` : "No answers yet"} />
        <Tile label="Today's tasks completed" icon={<ClipboardCheck className="h-4 w-4" />}
          value={data.tasks.total ? `${data.tasks.completed} / ${data.tasks.total}` : "—"}
          sub={data.tasks.total ? `${data.tasks.percent}% · ${data.tasks.students_all_done} of ${plural(data.tasks.students_with_tasks, "student")} finished all` : "No tasks planned today"} />
        <Tile label="Practice target met" icon={<Target className="h-4 w-4" />}
          value={data.daily_target.eligible ? `${data.daily_target.met} / ${data.daily_target.eligible}` : "—"}
          sub={data.daily_target.eligible ? "Students on a study day today" : "No students on a study day"} />
        <Tile label="Revision completed today" icon={<RotateCcw className="h-4 w-4" />}
          value={data.revision.due_today ? `${data.revision.completed} / ${data.revision.due_today}` : "—"}
          sub={data.revision.due_today ? `${data.revision.percent}% of questions due today` : "No revisions due today"} />
      </div>
    </div>
  );
}

// ─── students table ──────────────────────────────────────────────────────────
const COLS = "px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap";

function SortHead({ label, field, ordering, onOrder }: { label: string; field: string; ordering: string; onOrder: (o: string) => void }) {
  const on = ordering.replace("-", "") === field;
  const desc = ordering.startsWith("-");
  return (
    <th className={COLS} aria-sort={on ? (desc ? "descending" : "ascending") : "none"}>
      <button type="button" className="inline-flex items-center gap-1 uppercase tracking-wider font-bold" onClick={() => onOrder(on && !desc ? `-${field}` : field)}>
        {label}{on && <ChevronDown className={`h-3 w-3 ${desc ? "" : "rotate-180"}`} />}
      </button>
    </th>
  );
}

export function StudentsTable({ data, loading, ordering, onOrder, page, onPage }: {
  data: StudentsResponse; loading: boolean; ordering: string; onOrder: (o: string) => void;
  page: number; onPage: (p: number) => void;
}) {
  return (
    <div>
      <div className={`overflow-x-auto rounded-[12px] border border-border ${loading ? "opacity-60" : ""}`}>
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <SortHead label="Student" field="name" ordering={ordering} onOrder={onOrder} />
              <SortHead label="Attention status" field="attention" ordering={ordering} onOrder={onOrder} />
              <SortHead label="Course progress" field="progress" ordering={ordering} onOrder={onOrder} />
              <th className={COLS} title="Tasks completed today of the tasks planned for the student, and questions answered against the practice target">Today&apos;s progress</th>
              <SortHead label="Practice accuracy" field="accuracy" ordering={ordering} onOrder={onOrder} />
              <th className={COLS} title="Questions that were due today and were reviewed / all due today">Revision due</th>
              <th className={COLS} title="The exam date from the admin exam schedule">Exam date</th>
              <SortHead label="Last activity" field="activity" ordering={ordering} onOrder={onOrder} />
              <th className={COLS}>Course</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.results.map((r) => <StudentRowView key={`${r.student.id}-${r.exam_id}`} r={r} />)}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span aria-live="polite">
          {data.total ? `Showing ${(data.page - 1) * data.page_size + 1}–${Math.min(data.total, data.page * data.page_size)} of ${data.total}` : "No students"}
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button>
          <span className="tabular-nums">Page {data.page} of {Math.max(1, data.total_pages)}</span>
          <Button type="button" variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => onPage(page + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function StudentRowView({ r }: { r: StudentRow }) {
  const href = `/admin-dashboard/study-plans/students/${r.student.id}?exam=${r.exam_id}`;
  const started = r.progress !== null && r.topics_started > 0;
  return (
    <tr className="align-top hover:bg-muted/30">
      <td className="px-3 py-3 min-w-[180px]">
        <Link href={href} className="font-bold text-foreground hover:underline">{r.student.name}</Link>
        <p className="text-[12px] text-muted-foreground [overflow-wrap:anywhere]">{r.student.email || r.student.username}</p>
      </td>
      <td className="px-3 py-3 min-w-[180px]">
        <StatusBadge status={r.status} label={r.status_label} />
        {r.flags.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-[12px] text-muted-foreground">
            {r.flags.slice(0, 2).map((f) => <li key={f.code}>{f.label}</li>)}
            {r.flags.length > 2 && <li>+{r.flags.length - 2} more</li>}
          </ul>
        )}
      </td>
      <td className="px-3 py-3 min-w-[120px]">
        {r.progress === null ? <span className="text-muted-foreground">No syllabus content</span> : (
          <>
            <div className="flex items-center justify-between text-[12px] font-bold tabular-nums"><span>{r.progress}%</span></div>
            <Bar percent={r.progress} />
            {!started && <p className="mt-1 text-[11px] text-muted-foreground">Not started</p>}
          </>
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap tabular-nums">
        {r.tasks && r.tasks.total > 0 ? (
          <><span className="font-bold">{r.tasks.completed} / {r.tasks.total}</span> tasks</>
        ) : <span className="text-muted-foreground">No tasks</span>}
        <p className="text-[11px] text-muted-foreground">
          {r.today_questions} / {r.daily_target} questions{!r.study_day_today ? " · rest day" : ""}
        </p>
      </td>
      <td className="px-3 py-3 whitespace-nowrap tabular-nums">
        {r.accuracy === null ? <span className="text-muted-foreground">No data</span> : (
          <><span className="font-bold">{r.accuracy}%</span><p className="text-[11px] text-muted-foreground">{r.attempts} answers</p></>
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap tabular-nums">
        {r.revision.total === 0 ? <span className="text-muted-foreground">None</span> : (
          <>
            <span className="font-bold">{r.revision.reviewed_today}</span> / {r.revision.due_today} done
            {r.revision.overdue > 0 && <p className="text-[11px] text-red-600">{r.revision.overdue} overdue</p>}
          </>
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        {r.countdown && r.countdown.source === "schedule" ? (
          <>
            {new Date(`${r.countdown.exam_date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" })}
            <p className="text-[11px] text-muted-foreground">{plural(r.countdown.days_remaining, "day")} left</p>
          </>
        ) : <span className="text-muted-foreground">Not configured</span>}
      </td>
      <td className="px-3 py-3 whitespace-nowrap" title={fullDate(r.last_activity)}>
        {r.last_activity ? ago(r.last_activity) : <span className="text-muted-foreground">No activity yet</span>}
      </td>
      <td className="px-3 py-3 min-w-[150px] max-w-[190px]"><span className="line-clamp-2">{r.course}</span></td>
    </tr>
  );
}

// ─── analytics panels ────────────────────────────────────────────────────────
function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5" title={hint}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-bold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

export function RevisionPanel({ data }: { data: Overview }) {
  const r = data.revision;
  return (
    <>
      {!r.students_with_revision ? <Empty>No revision activity available yet.</Empty> : (
        <dl className="divide-y divide-border">
          <Stat label="Due today" value={r.due_today} hint="Questions due today: reviewed today plus still waiting" />
          <Stat label="Completed" value={r.completed} hint="Questions that were due and answered today" />
          <Stat label="Remaining" value={r.remaining} />
          <Stat label="Overdue" value={r.overdue} hint="Due before today and not yet reviewed" />
          <Stat label="Completion" value={pct(r.percent)} />
        </dl>
      )}
    </>
  );
}

export function PracticePanel({ data }: { data: Overview }) {
  const p = data.practice;
  return (
    <>
      {!p.answers ? <Empty>No practice activity available yet.</Empty> : (
        <dl className="divide-y divide-border">
          <Stat label="Students who practised" value={p.students_with_practice} />
          <Stat label="Active today" value={p.active_today} />
          <Stat label="Questions answered today" value={p.questions_today} />
          <Stat label="Answers, all time" value={p.answers.toLocaleString()} />
          <Stat label="Answered correctly" value={`${p.correct.toLocaleString()} (${pct(data.accuracy.percent)})`} />
          <Stat label="Practice sessions" value={`${p.sessions_completed} of ${p.sessions} completed`} hint="Sessions started in these preparations; completed ones were submitted" />
        </dl>
      )}
    </>
  );
}

export function ExamsPanel({ data }: { data: Overview }) {
  const o = data.exams.objective;
  const sub = data.exams.subjective;
  const sets = data.exams.subjective_sets;
  const any = o.attempts || sub.submitted || sets.submitted;
  return (
    <>
      {!any ? <Empty>No mock exam attempts yet.</Empty> : (
        <div className="space-y-4">
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Objective (scored on submission)</h3>
            {o.attempts ? (
              <dl className="divide-y divide-border">
                <Stat label="Attempts submitted" value={`${o.attempts} · ${plural(o.students, "student")}`} />
                <Stat label="Average score" value={pct(o.average)} />
                <Stat label="Passed / failed" value={`${o.passed} / ${o.failed}`} />
              </dl>
            ) : <Empty>No objective attempts.</Empty>}
          </div>
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Subjective (graded by a person)</h3>
            {sub.submitted || sets.submitted ? (
              <dl className="divide-y divide-border">
                {sub.submitted > 0 && <Stat label="Mock exams submitted" value={sub.submitted} />}
                {sub.submitted > 0 && <Stat label="Awaiting evaluation" value={sub.awaiting_evaluation} hint="Unscored - never counted as failed" />}
                {sub.submitted > 0 && <Stat label="Evaluated" value={`${sub.evaluated}${sub.average !== null ? ` · avg ${sub.average}%` : ""}`} />}
                {sets.submitted > 0 && <Stat label="Practice sets submitted" value={sets.submitted} />}
                {sets.submitted > 0 && <Stat label="Sets awaiting evaluation" value={sets.awaiting_evaluation} />}
                {sets.submitted > 0 && <Stat label="Sets evaluated" value={sets.evaluated} />}
              </dl>
            ) : <Empty>No subjective attempts.</Empty>}
          </div>
        </div>
      )}
    </>
  );
}

const SCOPE_LABEL: Record<string, string> = {
  exam: "This exam", level: "Its exam level", category: "Exam category", all: "All exams", student: "Student's own date",
};

export function SchedulePanel({ groups }: { groups: ScheduleGroup[] }) {
  return (
    <>
      {!groups.length ? <Empty>No students are preparing yet.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr>
              <th className={COLS}>Preparation</th><th className={COLS}>Target exam</th><th className={COLS}>Applies to</th><th className={COLS}>Date</th>
              <th className={COLS}>Days left</th><th className={COLS}>Students</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {groups.map((g) => (
                <tr key={g.exam_id}>
                  <td className="px-3 py-2.5 font-medium">{g.name}</td>
                  <td className="px-3 py-2.5">{g.countdown ? g.countdown.title : <span className="text-amber-700">No exam date configured</span>}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{g.countdown ? SCOPE_LABEL[g.countdown.scope ?? "exam"] : "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{g.countdown ? new Date(`${g.countdown.exam_date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}</td>
                  <td className="px-3 py-2.5 tabular-nums">{g.countdown ? g.countdown.days_remaining : "—"}</td>
                  <td className="px-3 py-2.5 tabular-nums">{g.students}{g.countdown && g.without_schedule > 0 ? ` (${g.without_schedule} without)` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export const ScheduleAction = (
  <Link href="/admin-dashboard/exams/schedules" className="text-[12px] font-bold text-primary underline">Manage exam schedule</Link>
);

// ─── syllabus / topic analytics ──────────────────────────────────────────────
const CLASS_STYLE: Record<TopicClass, { label: string; cls: string }> = {
  strong: { label: "Strong", cls: "bg-emerald-500/15 text-emerald-700" },
  moderate: { label: "Moderate", cls: "bg-slate-500/15 text-slate-700" },
  weak: { label: "Weak", cls: "bg-red-500/15 text-red-700" },
  rarely_studied: { label: "Rarely studied", cls: "bg-amber-500/15 text-amber-700" },
  no_content: { label: "No content", cls: "bg-muted text-muted-foreground" },
};

const acc = (a: number | null, insufficient: boolean) => (insufficient || a === null ? <span className="text-muted-foreground">Insufficient data</span> : <span className="font-bold">{a}%</span>);

export function TopicPanel({ data }: { data: TopicsResponse }) {
  const empty = !data.students || !data.subjects.length;
  const anyAttempts = data.subjects.some((s) => s.attempts > 0);
  return (
    <div className="space-y-4">
      {empty ? <Empty>No study plan activity is available for this course.</Empty> : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Strong areas</h3>
              {data.strong.length ? data.strong.map((s) => (
                <p key={s.id} className="flex justify-between text-sm py-1"><span>{s.name}</span><span className="font-bold tabular-nums">{s.accuracy}%</span></p>
              )) : <Empty>No subject has enough answers to be called strong yet.</Empty>}
            </div>
            <div>
              <h3 className="mb-1 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Needs improvement</h3>
              {data.needs_improvement.length ? data.needs_improvement.map((s) => (
                <p key={s.id} className="flex justify-between text-sm py-1"><span>{s.name}</span><span className="font-bold tabular-nums text-red-600">{s.accuracy}%</span></p>
              )) : <Empty>{anyAttempts ? "No subject is below the weak-topic line." : "Not enough activity data to calculate topic performance."}</Empty>}
            </div>
          </div>
          <div className="space-y-2">
            {data.subjects.map((s) => (
              <details key={s.id} className="rounded-[12px] border border-border">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 font-bold">
                  <span>{s.name}</span>
                  <span className="flex items-center gap-4 text-sm font-normal">
                    <span>Accuracy: {acc(s.accuracy, s.insufficient_data)}</span>
                    <span>Completion: <span className="font-bold">{pct(s.average_completion)}</span></span>
                    <span className="text-muted-foreground tabular-nums">{s.attempts} answers</span>
                  </span>
                </summary>
                <div className="overflow-x-auto border-t border-border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead><tr>
                      <th className={COLS}>Chapter / topic</th><th className={COLS}>Accuracy</th><th className={COLS}>Avg completion</th>
                      <th className={COLS}>Started by</th><th className={COLS}>Answers</th><th className={COLS}>Signal</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {s.chapters.map((c) => (
                        <ChapterRows key={c.id} chapter={c} students={data.students} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground flex items-start gap-1.5"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{data.rule}</p>
        </>
      )}
    </div>
  );
}

function ChapterRows({ chapter, students }: { chapter: TopicsResponse["subjects"][number]["chapters"][number]; students: number }) {
  return (
    <>
      <tr className="bg-muted/40">
        <td className="px-3 py-2 font-semibold">{chapter.title}</td>
        <td className="px-3 py-2">{acc(chapter.accuracy, chapter.insufficient_data)}</td>
        <td className="px-3 py-2 tabular-nums">{pct(chapter.average_completion)}</td>
        <td className="px-3 py-2" /><td className="px-3 py-2 tabular-nums">{chapter.attempts}</td><td className="px-3 py-2" />
      </tr>
      {chapter.topics.map((t) => (
        <tr key={t.id}>
          <td className="px-3 py-2 pl-8">{t.name}</td>
          <td className="px-3 py-2">{t.class === "no_content" ? "—" : acc(t.accuracy, t.insufficient_data)}</td>
          <td className="px-3 py-2 tabular-nums">{t.class === "no_content" ? "—" : pct(t.average_completion)}</td>
          <td className="px-3 py-2 tabular-nums">{t.class === "no_content" ? "—" : `${t.students_started} / ${students}`}</td>
          <td className="px-3 py-2 tabular-nums">{t.attempts}</td>
          <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[12px] font-bold whitespace-nowrap ${CLASS_STYLE[t.class].cls}`}>{CLASS_STYLE[t.class].label}</span></td>
        </tr>
      ))}
    </>
  );
}

export function RecommendationsPanel({ rules }: { rules: Rules }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold text-foreground">{rules.recommendation_events}</p>
      <p className="text-muted-foreground">{rules.recommendation_events_detail}</p>
      <div>
        <h3 className="mb-1 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">How recommendations are chosen</h3>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">{rules.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
      </div>
    </div>
  );
}

// ─── rules & configuration ───────────────────────────────────────────────────
export function RulesPanel({ rules }: { rules: Rules }) {
  return (
    <SectionShell title="How this page decides" icon={<Settings2 className="h-4 w-4" />}
      action={<Link href="/admin-dashboard/settings" className="text-[12px] font-bold text-primary underline">Turn Study Plans on/off in Settings</Link>}>
      <div className="grid gap-6 md:grid-cols-2 text-sm">
        <div>
          <h3 className="mb-1 font-bold">Status</h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">{rules.status.map((s) => <li key={s}>{s}</li>)}</ul>
          <p className="mt-2 text-muted-foreground">{rules.pace}</p>
          <h3 className="mb-1 mt-4 font-bold">Warnings shown as reasons</h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">{rules.warnings.map((s) => <li key={s}>{s}</li>)}</ul>
          <p className="mt-2 text-muted-foreground">{rules.activity}</p>
        </div>
        <div>
          <h3 className="mb-1 font-bold">Revision</h3>
          <p className="text-muted-foreground">{rules.revision}</p>
          <h3 className="mb-1 mt-4 font-bold">Student plan defaults</h3>
          <p className="text-muted-foreground">
            {rules.defaults.daily_questions} questions and {rules.defaults.daily_minutes} minutes a day, up to {rules.defaults.max_tasks_per_day} tasks,
            every day of the week. Each student can change their own targets on their Study Plan page. Task types: {rules.task_types.join(", ")}.
          </p>
          <h3 className="mb-1 mt-4 font-bold">Today&apos;s tasks</h3>
          <p className="text-muted-foreground">{rules.tasks}</p>
          <h3 className="mb-1 mt-4 font-bold">Mock exams</h3>
          <p className="text-muted-foreground">{rules.exams}</p>
        </div>
      </div>
    </SectionShell>
  );
}

// ─── section wrapper with skeleton / error / retry ───────────────────────────
export function Loadable<T>({ title, icon, query, rows = 3, children, action }: {
  title: string; icon?: React.ReactNode; rows?: number; action?: React.ReactNode;
  query: { isPending: boolean; isError: boolean; error: unknown; data: T | undefined; refetch: () => unknown };
  children: (data: T) => React.ReactNode;
}) {
  return (
    <SectionShell title={title} icon={icon} action={action}>
      {query.isError ? <SectionFailed message={errorText(query.error)} onRetry={() => query.refetch()} />
        : query.isPending || !query.data ? <SectionSkeleton rows={rows} />
        : children(query.data)}
    </SectionShell>
  );
}

