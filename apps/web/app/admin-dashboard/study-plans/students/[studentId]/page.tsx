"use client";

import { Suspense, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarClock, Layers, ListChecks, RotateCcw, Target, Trophy, TrendingUp } from "lucide-react";
import {
  useAdminStudent, useAdminStudentPlan, useAdminStudentProgress, useAdminStudentWeek,
} from "@/lib/admin-study-plan-hooks";
import { Loadable, StatusBadge, ago, fullDate, pct } from "@/components/admin/study-plan/monitor";
import {
  ExamDate, ExamsDetail, Kpi, PracticeDetail, RevisionDetail, SyllabusProgress, TodaysPlan, Warnings, WeakTopics,
} from "@/components/admin/study-plan/student-detail";
import { SectionFailed, SectionSkeleton, errorText } from "@/components/study-plan/sections";
import type { StudentDetail } from "@/lib/api/admin-study-plan-monitor";
import { isSectionError } from "@/lib/api/study-plan-page";
import type { PlanResponse, ProgressResponse, WeekResponse } from "@/lib/api/study-plan-page";

function StudentPlanPage({ studentId }: { studentId: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const examParam = params.get("exam");
  const exam = examParam ? Number(examParam) : null;

  const detail = useAdminStudent(studentId, exam);
  // Everything else waits for nothing: these requests run alongside the summary.
  const plan = useAdminStudentPlan(studentId, exam);
  const progress = useAdminStudentProgress(studentId, exam);
  const week = useAdminStudentWeek(studentId, exam);

  const today = plan.data?.today;
  const todayTasks = today && !isSectionError(today) && today.progress.total > 0 ? today.progress : null;

  const back = () => (window.history.length > 1 ? router.back() : router.push("/admin-dashboard/study-plans"));
  const choose = (id: number) => router.replace(`/admin-dashboard/study-plans/students/${studentId}?exam=${id}`, { scroll: false });

  return (
    <div className="space-y-6">
      <button type="button" onClick={back} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to students
      </button>

      {/* Header */}
      {detail.isError ? (
        <div className="rounded-[16px] border border-border bg-card p-5">
          <SectionFailed message={(detail.error as { status?: number })?.status === 404
            ? "This student has no active course enrolment, so there is no study plan to show." : errorText(detail.error)} onRetry={() => detail.refetch()} />
        </div>
      ) : detail.isPending || !detail.data ? (
        <div className="h-28 animate-pulse rounded-[16px] bg-muted" aria-busy="true" aria-label="Loading student" />
      ) : (
        <Header data={detail.data} onChoose={choose} />
      )}

      {detail.data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Course progress" value={pct(detail.data.detail.progress)}
              sub={detail.data.detail.progress === null ? "No syllabus content" : `${detail.data.detail.topics_started} of ${detail.data.detail.topics_with_content} topics started`} />
            <Kpi label="Today's tasks" value={todayTasks ? `${todayTasks.completed} / ${todayTasks.total}` : plan.isPending ? "…" : "—"}
              sub={todayTasks ? "Completed of planned" : plan.isPending ? "Loading" : "No tasks planned"} />
            <Kpi label="Practice target" value={`${detail.data.detail.today_questions} / ${detail.data.detail.daily_target}`}
              sub={!detail.data.detail.study_day_today ? "Rest day" : detail.data.detail.target_met ? "Target met" : "Questions answered today"} />
            <Kpi label="Practice accuracy" value={pct(detail.data.detail.accuracy)}
              sub={detail.data.detail.attempts ? `${detail.data.detail.attempts} answers` : "No performance data"} />
            <Kpi label="Revision due" value={detail.data.detail.revision.due_today ? `${detail.data.detail.revision.reviewed_today} / ${detail.data.detail.revision.due_today}` : "—"}
              sub={detail.data.detail.revision.due_today ? "Reviewed of due today" : "Nothing due today"} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Loadable title="Today's tasks" icon={<ListChecks className="h-4 w-4" />} query={plan} rows={3}>
                {(d: PlanResponse) => <TodaysPlan plan={d} />}
              </Loadable>
              <Loadable title="Course progress" icon={<Layers className="h-4 w-4" />} query={progress} rows={4}>
                {(d: ProgressResponse) => <SyllabusProgress progress={d} />}
              </Loadable>
            </div>
            <div className="space-y-6">
              <Section title="Attention status" icon={<AlertTriangle className="h-4 w-4" />}><Warnings detail={detail.data.detail} /></Section>
              <Loadable title="Exam date" icon={<CalendarClock className="h-4 w-4" />} query={plan} rows={2}>
                {(d: PlanResponse) => <ExamDate plan={d} />}
              </Loadable>
              <Loadable title="Weak topics" icon={<TrendingUp className="h-4 w-4" />} query={plan} rows={3}>
                {(d: PlanResponse) => <WeakTopics plan={d} rule={detail.data?.rules.weak_topic} />}
              </Loadable>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Loadable title="Revision" icon={<RotateCcw className="h-4 w-4" />} query={plan} rows={2}>
              {(d: PlanResponse) => <RevisionDetail plan={d} detail={detail.data!.detail} />}
            </Loadable>
            <Loadable title="Practice" icon={<Target className="h-4 w-4" />} query={week} rows={3}>
              {(d: WeekResponse) => <PracticeDetail detail={detail.data!.detail} week={d} />}
            </Loadable>
          </div>
          <Section title="Mock exams" icon={<Trophy className="h-4 w-4" />}><ExamsDetail detail={detail.data.detail} /></Section>
        </>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[16px] border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">{icon}{title}</h2>
      {children}
    </section>
  );
}

function Header({ data, onChoose }: { data: StudentDetail; onChoose: (id: number) => void }) {
  const d = data.detail;
  const s = data.student;
  return (
    <div className="rounded-[16px] border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-black tracking-tight text-foreground">{s.name}</h2>
          <p className="text-sm text-muted-foreground break-all">{s.username}{s.email ? ` · ${s.email}` : ""}</p>
          <p className="mt-2 text-sm"><span className="font-semibold">{d.course}</span> <span className="text-muted-foreground">({d.preparation})</span></p>
        </div>
        <div className="text-right space-y-1">
          <StatusBadge status={d.status} label={d.status_label} />
          <p className="text-sm text-muted-foreground" title={fullDate(d.last_activity)}>Last activity: {d.last_activity ? ago(d.last_activity) : "none yet"}</p>
          <p className="text-sm text-muted-foreground">Study streak: {d.streak} day{d.streak === 1 ? "" : "s"}</p>
          <p className="text-sm text-muted-foreground">Joined {s.joined ? new Date(s.joined).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"} · enrolled {new Date(d.enrolled_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
        </div>
      </div>
      {data.preparations.length > 1 && (
        <div className="mt-4 max-w-sm">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="prep">Preparation</label>
          <select id="prep" value={data.selected} onChange={(e) => onChoose(Number(e.target.value))}
            className="h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm font-medium">
            {data.preparations.map((p) => <option key={p.id} value={p.id}>{p.display_name} — {p.status_label}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

export default function AdminStudentStudyPlanPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  const id = Number(studentId);
  return (
    <Suspense fallback={<SectionSkeleton rows={4} />}>
      {Number.isInteger(id) && id > 0 ? <StudentPlanPage studentId={id} /> : <p className="text-sm text-muted-foreground">Unknown student.</p>}
    </Suspense>
  );
}
