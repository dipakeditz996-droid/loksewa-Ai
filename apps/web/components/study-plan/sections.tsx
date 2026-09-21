"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle, BookOpen, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, Circle, Clock, Flame,
  ListChecks, PenLine, RotateCcw, Settings2, Target, Timer, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Countdown, ContinueLearning, Pace, PlanPreferences, PlanTask, PlanTaskType, ProgressSubject, RevisionQueue,
  TodayPlan, WeakTopic, WeekResponse, Recommendations, isSectionError, SectionError,
} from "@/lib/api/study-plan-page";
import { ApiError } from "@/lib/api/client";

export const CARD = "bg-card rounded-[16px] border border-border shadow-sm";

/** What a section says when it could not load - never a blank page, never raw codes. */
export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403 && /disabled/i.test(error.message)) return "Study plans are currently turned off by the administrator.";
    if (error.status >= 500) return "Something went wrong on our side. Please try again in a moment.";
    return "We couldn't load this section. Please try again.";
  }
  return "We couldn't connect to the server. Please check your connection and try again.";
}

export function SectionShell({ title, icon, children, action, id }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode; id?: string;
}) {
  return (
    <section id={id} className={`${CARD} p-5`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
          {icon}{title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-[10px] bg-muted" />
      ))}
    </div>
  );
}

export function SectionFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-red-600" role="alert">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
      <button type="button" className="underline font-bold" onClick={onRetry}>Retry</button>
    </div>
  );
}

const TASK_ICON: Record<PlanTaskType, React.ReactNode> = {
  STUDY: <BookOpen className="w-5 h-5" />,
  PRACTICE: <Target className="w-5 h-5" />,
  REVISION: <RotateCcw className="w-5 h-5" />,
  MOCK_EXAM: <ListChecks className="w-5 h-5" />,
  REVIEW: <PenLine className="w-5 h-5" />,
};

export function Bar({ percent, tone = "primary" }: { percent: number; tone?: "primary" | "gold" | "green" }) {
  const color = tone === "gold" ? "bg-[#D4A72C]" : tone === "green" ? "bg-green-600" : "bg-primary";
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}

// ─── Today's plan ────────────────────────────────────────────────────────────
export function TodayCard({ today, hasContent, prefs, onSettings }: {
  today: TodayPlan; hasContent: boolean; prefs: PlanPreferences; onSettings: () => void;
}) {
  const { tasks, progress } = today;
  return (
    <SectionShell
      id="today"
      title="Today's Plan"
      icon={<ListChecks className="w-4 h-4" />}
      action={
        <button type="button" onClick={onSettings} className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary dark:hover:text-foreground">
          <Settings2 className="w-3.5 h-3.5" /> {prefs.daily_minutes} min · {prefs.daily_questions} questions
        </button>
      }
    >
      {!today.is_study_day && (
        <p className="mb-3 text-[13px] font-medium text-muted-foreground bg-muted/60 rounded-[10px] p-3" role="status">
          Today isn&apos;t one of your study days, so this is optional. You can change your study days in settings.
        </p>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-6 space-y-3">
          <p className="font-semibold text-primary dark:text-foreground">
            {hasContent ? "Nothing is due today — you're all caught up." : "Your study plan is ready to begin."}
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {hasContent
              ? "Practice any topic to keep your streak going."
              : "Choose your first topic from your enrolled course and we'll build your progress from there."}
          </p>
          <Button asChild variant="outline"><Link href={hasContent ? "/student/practice" : "/student/syllabus"}>{hasContent ? "Open Practice" : "Explore Syllabus"}</Link></Button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm font-bold mb-1.5">
              <span className="text-primary dark:text-foreground">Today&apos;s Progress</span>
              <span className="text-muted-foreground">{progress.completed} / {progress.total} tasks completed</span>
            </div>
            <Bar percent={progress.percent} tone={progress.percent >= 100 ? "green" : "primary"} />
          </div>
          <ul className="space-y-3">
            {tasks.map((t) => <TaskRow key={t.id} task={t} />)}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            About {today.planned_minutes} of your {today.budget_minutes} minutes planned. Tasks tick themselves when you do the real work.
          </p>
          {today.tomorrow.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Tomorrow</h3>
              <ul className="space-y-1.5">
                {today.tomorrow.map((t) => (
                  <li key={t.id}>
                    <Link href={t.action.url} className="text-sm text-primary dark:text-foreground hover:underline inline-flex items-center gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />{t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-semibold">How this plan is chosen</summary>
            <ul className="mt-2 list-disc pl-5 space-y-1">{today.rules.map((r) => <li key={r}>{r}</li>)}</ul>
          </details>
        </>
      )}
    </SectionShell>
  );
}

function TaskRow({ task }: { task: PlanTask }) {
  const partial = !task.completed && task.target && task.done ? Math.round((task.done / task.target) * 100) : 0;
  return (
    <li className={`flex gap-3 rounded-[12px] border p-3.5 ${task.completed ? "border-green-300/60 bg-green-50/60 dark:bg-green-950/20 dark:border-green-900/50" : "border-border"}`}>
      <div className={`mt-0.5 shrink-0 ${task.completed ? "text-green-600" : "text-muted-foreground"}`} aria-hidden="true">
        {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-primary dark:text-foreground/80" aria-hidden="true">{TASK_ICON[task.type]}</span>
          <p className={`font-semibold text-[15px] ${task.completed ? "line-through text-muted-foreground" : "text-primary dark:text-foreground"}`}>{task.title}</p>
        </div>
        <p className="text-[13px] text-muted-foreground mt-0.5">{task.detail}</p>
        <p className="text-[12px] text-muted-foreground mt-1">Why: {task.reason}</p>
        {task.target ? (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 max-w-[180px]"><Bar percent={task.completed ? 100 : partial} tone={task.completed ? "green" : "gold"} /></div>
            <span className="text-xs font-bold text-muted-foreground">{task.done ?? 0} / {task.target}</span>
          </div>
        ) : null}
      </div>
      <div className="shrink-0 self-center">
        <Button asChild size="sm" variant={task.completed ? "outline" : "default"} className="whitespace-nowrap">
          <Link href={task.action.url}>{task.completed ? "Review" : task.action.label}</Link>
        </Button>
      </div>
    </li>
  );
}

// ─── Countdown & pace ────────────────────────────────────────────────────────
const PACE_STYLE: Record<string, string> = {
  on_track: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  slightly_behind: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  needs_attention: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
};

export function CountdownCard({ countdown, pace, examName }: { countdown: Countdown | null | undefined; pace: Pace | undefined; examName: string }) {
  return (
    <SectionShell title="Your Target Exam" icon={<CalendarClock className="w-4 h-4" />}>
      {!countdown ? (
        <p className="text-sm text-muted-foreground">No upcoming exam schedule configured.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-4xl font-black text-primary dark:text-foreground leading-none">{countdown.days_remaining}</p>
            <p className="text-sm font-semibold text-muted-foreground mt-1">{countdown.days_remaining === 1 ? "Day" : "Days"} Remaining</p>
          </div>
          <div className="text-[13px] text-muted-foreground">
            <p><span className="font-bold text-primary dark:text-foreground">{countdown.title}</span></p>
            <p>{new Date(countdown.exam_date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
              {countdown.source === "student_target" ? " (your own target date)" : ""}</p>
            <p>Target: {examName}</p>
          </div>
        </div>
      )}
      {pace && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          {pace.status && pace.label ? (
            <>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${PACE_STYLE[pace.status]}`}>
                <TrendingUp className="w-4 h-4" /> {pace.label}
              </span>
              <p className="text-[13px] text-muted-foreground">{pace.reason}</p>
              {pace.rule && (
                <details className="text-xs text-muted-foreground"><summary className="cursor-pointer font-semibold">How this is worked out</summary><p className="mt-1">{pace.rule}</p></details>
              )}
            </>
          ) : countdown ? (
            <p className="text-[13px] text-muted-foreground">{pace.reason}</p>
          ) : null}
        </div>
      )}
    </SectionShell>
  );
}

// ─── Continue learning ───────────────────────────────────────────────────────
export function ContinueCard({ data }: { data: ContinueLearning | null }) {
  return (
    <SectionShell title="Continue Learning" icon={<BookOpen className="w-4 h-4" />}>
      {!data ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Start your first topic — your progress will appear here.</p>
          <Button asChild variant="outline" size="sm"><Link href="/student/syllabus">Explore Syllabus</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="font-bold text-primary dark:text-foreground">{data.topic}</p>
            <p className="text-[13px] text-muted-foreground">{data.subject} › {data.chapter}</p>
          </div>
          {data.percent !== null && (
            <div><div className="flex justify-between text-xs font-bold text-muted-foreground mb-1"><span>Progress</span><span>{data.percent}%</span></div><Bar percent={data.percent} tone="gold" /></div>
          )}
          <Button asChild size="sm"><Link href={data.action.url}>{data.action.label}</Link></Button>
        </div>
      )}
    </SectionShell>
  );
}

// ─── Revision queue ──────────────────────────────────────────────────────────
export function RevisionCard({ data }: { data: RevisionQueue }) {
  if (!data.total && !data.reviewed_today) {
    return (
      <SectionShell title="Revision Queue" icon={<RotateCcw className="w-4 h-4" />}>
        <p className="text-sm text-muted-foreground">You&apos;re all caught up. No revisions are due today.</p>
      </SectionShell>
    );
  }
  const dueTotal = data.due_total_today ?? data.due_today;
  const caughtUp = dueTotal === 0 || data.due_today === 0;
  return (
    <SectionShell title="Revision Queue" icon={<RotateCcw className="w-4 h-4" />}>
      {dueTotal > 0 ? (
        <dl className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-muted-foreground">Revision due today</dt>
            <dd className="text-lg font-black text-primary dark:text-foreground">{dueTotal}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-muted-foreground">Completed</dt>
            <dd className="font-bold text-primary dark:text-foreground">{data.reviewed_today} / {dueTotal}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">You&apos;re all caught up. No revisions are due today.</p>
      )}
      {dueTotal > 0 && data.due_today === 0 && (
        <p className="mt-2 text-sm font-medium text-green-700 dark:text-green-400">All of today&apos;s revisions are done.</p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
        {[["Tomorrow", data.due_tomorrow], ["Later", data.later]].map(([label, n]) => (
          <div key={label as string} className="rounded-[10px] bg-muted/60 py-2">
            <dd className="text-lg font-black text-primary dark:text-foreground">{n}</dd>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>
      {!caughtUp && <Button asChild size="sm" className="mt-4"><Link href="/student/practice/revision">Start Revision</Link></Button>}
    </SectionShell>
  );
}

// ─── Recommendations ─────────────────────────────────────────────────────────
export function RecommendationsCard({ data }: { data: Recommendations }) {
  return (
    <SectionShell title="Recommended" icon={<Target className="w-4 h-4" />}>
      <div className="space-y-4">
        {!data.practice && !data.mock && (
          <p className="text-sm text-muted-foreground">No practice topics are available to recommend yet.</p>
        )}
        {data.practice && (
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Practice</p>
            <p className="font-bold text-primary dark:text-foreground">{data.practice.topic}</p>
            <p className="text-[13px] text-muted-foreground">{data.practice.questions} questions · {data.practice.reason}</p>
            <Button asChild size="sm" className="mt-2"><Link href={data.practice.url}>Practice Now</Link></Button>
          </div>
        )}
        {data.mock && (
          <div className={data.practice ? "pt-4 border-t border-border" : ""}>
            <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Mock exam</p>
            <p className="font-bold text-primary dark:text-foreground">{data.mock.title}</p>
            <p className="text-[13px] text-muted-foreground">{data.mock.total_questions} questions · {data.mock.time_limit} minutes</p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href={data.mock.url}>{data.mock.available_now ? "Start Mock" : "View Mock"}</Link>
            </Button>
          </div>
        )}
        {!data.mock && (
          <div className={data.practice ? "pt-4 border-t border-border" : ""}>
            <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Mock exam</p>
            <p className="text-sm text-muted-foreground">No mock exams are available right now.</p>
          </div>
        )}
      </div>
    </SectionShell>
  );
}

// ─── Weak topics ─────────────────────────────────────────────────────────────
export function WeakTopicsCard({ topics, rule }: { topics: WeakTopic[]; rule: string }) {
  return (
    <SectionShell title="Needs Attention" icon={<AlertCircle className="w-4 h-4" />}>
      {topics.length === 0 ? (
        <p className="text-sm text-muted-foreground">No weak topics yet. Once you have answered a few questions in a topic, the ones you struggle with will show up here.</p>
      ) : (
        <ul className="space-y-3">
          {topics.map((t) => (
            <li key={t.id} className="rounded-[12px] border border-border p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-primary dark:text-foreground">{t.name}</p>
                  <p className="text-[12px] text-muted-foreground">{t.subject} › {t.chapter}</p>
                </div>
                <p className="text-right shrink-0"><span className="text-lg font-black text-red-600">{t.accuracy}%</span><span className="block text-[11px] text-muted-foreground">{t.attempts} attempts</span></p>
              </div>
              {(t.repeated_incorrect > 0 || t.exam_accuracy !== null) && (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {t.repeated_incorrect > 0 && `${t.repeated_incorrect} question${t.repeated_incorrect === 1 ? "" : "s"} repeatedly wrong. `}
                  {t.exam_accuracy !== null && `${t.exam_accuracy}% in mock exams (${t.exam_attempts} answers).`}
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap gap-2">
                {t.practice_url && <Button asChild size="sm"><Link href={t.practice_url}>Practice</Link></Button>}
                <Button asChild size="sm" variant="outline"><Link href={t.review_url}>Review</Link></Button>
                {t.notes_url && <Button asChild size="sm" variant="outline"><Link href={t.notes_url}>Study Notes</Link></Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{rule}</p>
    </SectionShell>
  );
}

// ─── Syllabus progress ───────────────────────────────────────────────────────
function pctLabel(p: number | null, status: string) {
  if (status === "no_content") return "No content yet";
  if (p === null) return "Not started";
  return `${p}%`;
}

export function ProgressCard({ overall, subjects }: {
  overall: { percent: number | null; topics_with_content: number; topics_started: number; topics_completed: number; basis: string };
  subjects: ProgressSubject[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <SectionShell title="Syllabus Progress" icon={<TrendingUp className="w-4 h-4" />}>
      {overall.topics_with_content === 0 ? (
        <p className="text-sm text-muted-foreground">Your course doesn&apos;t have any questions or notes published yet, so there is no progress to measure.</p>
      ) : (
        <>
          <div className="mb-5">
            <div className="flex items-center justify-between text-sm font-bold mb-1.5">
              <span className="text-primary dark:text-foreground">Overall Course Progress</span>
              <span className="text-primary dark:text-foreground">{overall.percent ?? 0}%</span>
            </div>
            <Bar percent={overall.percent ?? 0} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {overall.topics_started} of {overall.topics_with_content} topics started · {overall.topics_completed} completed
            </p>
          </div>
          <ul className="space-y-2">
            {subjects.map((s) => (
              <li key={s.id} className="rounded-[12px] border border-border">
                <button type="button" className="w-full flex items-center gap-3 p-3 text-left" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
                  {open === s.id ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
                  <span className="flex-1 min-w-0 font-semibold text-[14px] text-primary dark:text-foreground truncate">{s.name}</span>
                  <span className={`text-sm font-bold shrink-0 ${s.percent === null ? "text-muted-foreground" : "text-primary dark:text-foreground"}`}>{pctLabel(s.percent, s.status)}</span>
                </button>
                {s.percent !== null && <div className="px-3 pb-3 -mt-1"><Bar percent={s.percent} /></div>}
                {open === s.id && (
                  <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                    {s.chapters.map((c) => (
                      <div key={c.id}>
                        <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">{c.title} · {pctLabel(c.percent, c.status)}</p>
                        <ul className="mt-1 space-y-1">
                          {c.topics.map((t) => (
                            <li key={t.id} className="flex items-center justify-between gap-3 text-[13px]">
                              <span className="min-w-0 truncate text-foreground">{t.name}</span>
                              <span className="shrink-0 text-muted-foreground font-medium">{pctLabel(t.percent, t.status)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{overall.basis}</p>
        </>
      )}
    </SectionShell>
  );
}

// ─── Weekly overview, streak, study time ─────────────────────────────────────
export function WeekCard({ data }: { data: WeekResponse }) {
  const days = data.days ?? [];
  return (
    <SectionShell title="This Week" icon={<Clock className="w-4 h-4" />}>
      <div className="flex items-center gap-2 mb-4">
        <Flame className={`w-5 h-5 ${data.streak && data.streak.current > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
        <p className="font-bold text-primary dark:text-foreground">
          {data.streak && data.streak.current > 0
            ? `${data.streak.current} day study streak`
            : "No study streak yet — answer a question to start one."}
        </p>
      </div>
      <ol className="grid grid-cols-7 gap-1.5 text-center">
        {days.map((d) => (
          <li key={d.date} className={`rounded-[10px] border py-2 px-0.5 ${d.is_today ? "border-primary" : "border-border"}`}>
            <p className="text-[11px] font-bold uppercase text-muted-foreground">{d.label}</p>
            <p className="mt-1 text-[13px] font-bold min-h-[20px]">
              {d.is_today && d.state !== "done" ? <span className="text-primary dark:text-foreground">Today</span>
                : d.state === "done" ? <CheckCircle2 className="w-4 h-4 mx-auto text-green-600" aria-label="Target reached" />
                : d.state === "partial" || d.state === "missed" || d.state === "open" ? <span className="text-muted-foreground">{d.percent ?? 0}%</span>
                : <span className="text-muted-foreground">—</span>}
            </p>
            {d.is_today && d.state !== "none" && d.state !== "open" && (
              <p className="text-[10px] text-muted-foreground">{d.percent ?? 0}%</p>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">Share of your daily question target answered each day. {data.questions_this_week ?? 0} questions this week.</p>
      <div className="mt-4 pt-4 border-t border-border flex items-start gap-2 text-[13px] text-muted-foreground">
        <Timer className="w-4 h-4 mt-0.5 shrink-0" />
        {data.study_time?.available ? (
          <p>{data.study_time.label ?? "Tracked Practice & Exam Time"}: <span className="font-bold text-primary dark:text-foreground">{Math.floor((data.study_time.recorded_minutes) / 60)}h {data.study_time.recorded_minutes % 60}m</span> this week. {data.study_time.note}</p>
        ) : (
          <p>{data.study_time?.label ?? "Tracked Practice & Exam Time"}: none recorded this week. {data.study_time?.note ?? "Time spent reading notes or in untimed practice is not measured."}</p>
        )}
      </div>
    </SectionShell>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────
const MINUTES = [30, 60, 90, 120];
const QUESTIONS = [10, 20, 30, 50, 100];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function PreferencesDialog({ open, onOpenChange, prefs, saving, error, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; prefs: PlanPreferences; saving: boolean; error: string | null;
  onSave: (p: { daily_minutes: number; daily_questions: number; study_days: string[] }) => void;
}) {
  const [minutes, setMinutes] = useState(prefs.daily_minutes);
  const [questions, setQuestions] = useState(prefs.daily_questions);
  const [days, setDays] = useState<string[]>(prefs.study_days);
  const toggle = (d: string) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  const chip = (active: boolean) =>
    `px-3 h-9 rounded-[10px] border text-sm font-semibold transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your daily targets</DialogTitle>
          <DialogDescription>Today&apos;s plan is sized to these.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <fieldset>
            <legend className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Study time per day</legend>
            <div className="flex flex-wrap gap-2 items-center">
              {MINUTES.map((m) => <button key={m} type="button" className={chip(minutes === m)} onClick={() => setMinutes(m)}>{m} min</button>)}
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">Custom
                <input type="number" min={10} max={720} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}
                  className="w-20 h-9 rounded-[10px] border border-border bg-background px-2 text-foreground" aria-label="Custom minutes" />
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Questions per day</legend>
            <div className="flex flex-wrap gap-2 items-center">
              {QUESTIONS.map((n) => <button key={n} type="button" className={chip(questions === n)} onClick={() => setQuestions(n)}>{n}</button>)}
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">Custom
                <input type="number" min={5} max={300} value={questions} onChange={(e) => setQuestions(Number(e.target.value))}
                  className="w-20 h-9 rounded-[10px] border border-border bg-background px-2 text-foreground" aria-label="Custom questions" />
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Study days</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => <button key={d} type="button" className={chip(days.includes(d))} aria-pressed={days.includes(d)} onClick={() => toggle(d)}>{d.slice(0, 3)}</button>)}
            </div>
          </fieldset>
          {error && <p className="text-sm font-medium text-red-600" role="alert">{error}</p>}
          <Button className="w-full" disabled={saving || days.length === 0}
            onClick={() => onSave({ daily_minutes: minutes, daily_questions: questions, study_days: days })}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { isSectionError };
export type { SectionError };
