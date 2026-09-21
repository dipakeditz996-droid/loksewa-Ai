"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, GraduationCap, Layers, RotateCcw, Sparkles, Target, Trophy, Users } from "lucide-react";
import {
  useAdminOverview, useAdminPreparations, useAdminStudents, useAdminTopics,
} from "@/lib/admin-study-plan-hooks";
import {
  ExamsPanel, FilterBar, Filters, Loadable, OverviewCards, PracticePanel, RangeKey, RecommendationsPanel, RevisionPanel, RulesPanel,
  SchedulePanel, ScheduleAction, StudentsTable, TopicPanel, rangeToDates,
} from "@/components/admin/study-plan/monitor";
import type { Overview } from "@/lib/api/admin-study-plan-monitor";
import { SectionFailed, SectionShell, SectionSkeleton, errorText } from "@/components/study-plan/sections";

const PAGE_SIZE = 20;

/** The filters live in the URL, so the list survives opening a student and coming back. */
function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters: Filters = {
    exam: params.get("exam") ?? "",
    status: params.get("status") ?? "",
    activity: params.get("activity") ?? "",
    progress: params.get("progress") ?? "",
    range: (params.get("range") ?? "") as RangeKey,
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    search: params.get("q") ?? "",
  };
  const page = Math.max(1, Number(params.get("page")) || 1);
  const ordering = params.get("ordering") ?? "attention";

  const update = useCallback(
    (patch: Record<string, string | number | null>) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === "" || v === undefined) next.delete(k);
        else next.set(k, String(v));
      });
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router]
  );

  const setFilters = useCallback(
    (patch: Partial<Filters>) => {
      const map: Record<string, string> = { search: "q" };
      const out: Record<string, string | number | null> = { page: null };       // any filter change returns to page 1
      Object.entries(patch).forEach(([k, v]) => (out[map[k] ?? k] = v as string));
      if (patch.range && patch.range !== "custom") {
        out.from = null;
        out.to = null;
      }
      update(out);
    },
    [update]
  );
  return { filters, page, ordering, setFilters, setPage: (p: number) => update({ page: p > 1 ? p : null }), setOrdering: (o: string) => update({ ordering: o === "attention" ? null : o, page: null }) };
}

function MonitoringPage() {
  const { filters, page, ordering, setFilters, setPage, setOrdering } = useUrlFilters();
  const exam = filters.exam ? Number(filters.exam) : null;

  const preparations = useAdminPreparations();
  const overview = useAdminOverview(exam);
  const students = useAdminStudents({
    exam, status: filters.status, activity: filters.activity, progress: filters.progress, search: filters.search,
    ...rangeToDates(filters.range, filters.from, filters.to), ordering, page, page_size: PAGE_SIZE,
  });
  const topics = useAdminTopics(exam);
  const prepOptions = useMemo(() => preparations.data?.preparations ?? [], [preparations.data]);
  const examName = prepOptions.find((p) => p.id === exam)?.display_name;

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onChange={setFilters} preparations={prepOptions} preparationsLoading={preparations.isPending} />

      {/* 1. Overview - whole-scope numbers from the server */}
      <section aria-label="Overview" className="space-y-3">
        {overview.isError ? (
          <SectionShell title="Overview" icon={<Users className="h-4 w-4" />}>
            <SectionFailed message={errorText(overview.error)} onRetry={() => overview.refetch()} />
          </SectionShell>
        ) : overview.isPending || !overview.data ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-busy="true" aria-label="Loading overview">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-[104px] animate-pulse rounded-[14px] bg-muted" />)}
          </div>
        ) : (
          <OverviewCards data={overview.data} status={filters.status} onStatus={(s) => setFilters({ status: s })} />
        )}
      </section>

      {/* 2. Student monitoring table */}
      <SectionShell title="Student study plans" icon={<GraduationCap className="h-4 w-4" />}>
        {students.isError ? <SectionFailed message={errorText(students.error)} onRetry={() => students.refetch()} />
          : students.isPending || !students.data ? <SectionSkeleton rows={6} />
          : students.data.total === 0 ? (
            <p className="text-sm text-muted-foreground">
              {Object.entries(filters).some(([, v]) => v !== "")
                ? "No students match these filters."
                : "No active student study plans yet."}
            </p>
          ) : (
            <StudentsTable data={students.data} loading={students.isPlaceholderData} ordering={ordering}
              onOrder={setOrdering} page={page} onPage={setPage} />
          )}
      </SectionShell>

      {/* 3. Secondary analytics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Loadable title="Revision" icon={<RotateCcw className="h-4 w-4" />} query={overview} rows={4}>
          {(d: Overview) => <RevisionPanel data={d} />}
        </Loadable>
        <Loadable title="Practice" icon={<Target className="h-4 w-4" />} query={overview} rows={4}>
          {(d: Overview) => <PracticePanel data={d} />}
        </Loadable>
        <Loadable title="Mock exams" icon={<Trophy className="h-4 w-4" />} query={overview} rows={4}>
          {(d: Overview) => <ExamsPanel data={d} />}
        </Loadable>
      </div>
      <Loadable title="Exam dates" icon={<CalendarClock className="h-4 w-4" />} query={overview} rows={2} action={ScheduleAction}>
        {(d: Overview) => <SchedulePanel groups={d.schedules} />}
      </Loadable>

      <Loadable title="Recommendations" icon={<Sparkles className="h-4 w-4" />} query={overview} rows={2}>
        {(d: Overview) => <RecommendationsPanel rules={d.rules} />}
      </Loadable>

      {/* 4. Detailed syllabus analytics - needs one preparation */}
      <SectionShell title={examName ? `Syllabus performance — ${examName}` : "Syllabus performance"} icon={<Layers className="h-4 w-4" />}>
        {exam === null ? (
          <p className="text-sm text-muted-foreground">Choose a course / preparation above to see which parts of its syllabus are strong, weak or rarely studied.</p>
        ) : topics.isError ? <SectionFailed message={errorText(topics.error)} onRetry={() => topics.refetch()} />
          : topics.isPending || !topics.data ? <SectionSkeleton rows={4} />
          : <TopicPanel data={topics.data} />}
      </SectionShell>

      {overview.data && <RulesPanel rules={overview.data.rules} />}
    </div>
  );
}

export default function StudyPlanMonitoringPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-[16px] bg-muted" aria-busy="true" aria-label="Loading" />}>
      <MonitoringPage />
    </Suspense>
  );
}

