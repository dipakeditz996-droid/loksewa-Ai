"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useSavePreferences, useSelectedPreparation, useStudyPlan, useStudyPreparations, useStudyProgress, useStudyWeek,
  isPreparationDenied,
} from "@/lib/study-plan-hooks";
import { isSectionError } from "@/lib/api/study-plan-page";
import {
  ContinueCard, CountdownCard, PreferencesDialog, ProgressCard, RecommendationsCard, RevisionCard, SectionFailed,
  SectionShell, SectionSkeleton, TodayCard, WeakTopicsCard, WeekCard, errorText,
} from "@/components/study-plan/sections";
import { ListChecks, TrendingUp, BookOpen, CalendarClock, AlertCircle, Clock } from "lucide-react";

export default function StudyPlanPage() {
  const { exam, choose } = useSelectedPreparation();
  const preparations = useStudyPreparations(exam);
  const plan = useStudyPlan(exam);
  const progress = useStudyProgress(exam);
  const week = useStudyWeek(exam);
  const save = useSavePreferences(exam);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // A remembered preparation the student no longer owns is refused by the
  // server - fall back to the server's own default instead of showing an error.
  const denied = [preparations.error, plan.error, progress.error, week.error].some(isPreparationDenied);
  useEffect(() => {
    if (denied && exam !== null) choose(null);
  }, [denied, exam, choose]);

  const prep = preparations.data;
  const noPreparation =
    (prep && !prep.has_preparation) || (plan.data && !plan.data.has_preparation && !plan.isError);
  const selected = prep?.selected ?? plan.data?.exam?.id ?? null;
  const current = prep?.preparations.find((p) => p.id === selected);
  const examName = plan.data?.exam?.display_name ?? current?.display_name ?? "";
  const prefs = plan.data?.preferences ?? prep?.preferences ?? null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 min-h-[calc(100vh-72px)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-5 border-b border-border">
        <div>
          <h1 className="text-[28px] md:text-3xl font-bold tracking-tight text-primary dark:text-foreground">My Study Plan</h1>
          <p className="text-muted-foreground mt-1 font-medium">What to study today, what to practise, and where you stand for your exam.</p>
        </div>
        {prep && prep.has_preparation && (
          <div className="sm:min-w-[260px]">
            {prep.preparations.length > 1 ? (
              <>
                <label htmlFor="prep" className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Preparation</label>
                <select
                  id="prep"
                  value={selected ?? ""}
                  onChange={(e) => choose(Number(e.target.value))}
                  className="w-full h-11 px-3 bg-card border border-border rounded-[10px] text-[15px] font-medium text-primary dark:text-foreground outline-none focus:border-[#0B2545]"
                >
                  {prep.preparations.map((p) => (
                    <option key={p.id} value={p.id}>{p.display_name}{p.course ? ` — ${p.course.title}` : ""}</option>
                  ))}
                </select>
              </>
            ) : (
              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Preparation</p>
                <p className="font-bold text-primary dark:text-foreground">{current?.display_name}</p>
                {current?.course && <p className="text-[13px] text-muted-foreground">{current.course.title}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {noPreparation ? (
        <div className="bg-card rounded-[16px] border border-border shadow-sm p-10 text-center space-y-4 max-w-xl mx-auto">
          <p className="text-xl font-bold text-primary dark:text-foreground">Choose a course to create your study plan.</p>
          <p className="text-muted-foreground">Your plan is built from the syllabus, practice and exams of the course you enrol in.</p>
          <Button asChild><Link href="/student/plans">View Courses &amp; Packages</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start grid-flow-dense">
          {/* Today's plan first on every screen size */}
          <div className="lg:col-span-2">
            {plan.isError ? (
              <SectionShell title="Today's Plan" icon={<ListChecks className="w-4 h-4" />}>
                <SectionFailed message={errorText(plan.error)} onRetry={() => plan.refetch()} />
              </SectionShell>
            ) : plan.isPending || !plan.data || !prefs ? (
              <SectionShell title="Today's Plan" icon={<ListChecks className="w-4 h-4" />}><SectionSkeleton rows={4} /></SectionShell>
            ) : isSectionError(plan.data.today) || !plan.data.today ? (
              <SectionShell title="Today's Plan" icon={<ListChecks className="w-4 h-4" />}>
                <SectionFailed message="Today's plan could not be loaded." onRetry={() => plan.refetch()} />
              </SectionShell>
            ) : (
              <TodayCard today={plan.data.today} hasContent={!!plan.data.has_content} prefs={prefs}
                onSettings={() => { setSaveError(null); setSettingsOpen(true); }} />
            )}
          </div>

          <div>
            {plan.isError ? (
              <SectionShell title="Your Target Exam" icon={<CalendarClock className="w-4 h-4" />}>
                <SectionFailed message={errorText(plan.error)} onRetry={() => plan.refetch()} />
              </SectionShell>
            ) : plan.isPending || !plan.data ? (
              <SectionShell title="Your Target Exam" icon={<CalendarClock className="w-4 h-4" />}><SectionSkeleton rows={2} /></SectionShell>
            ) : (
              <CountdownCard countdown={plan.data.countdown} pace={plan.data.pace} examName={examName} />
            )}
          </div>

          <div>
            {plan.isError ? null : plan.isPending || !plan.data ? (
              <SectionShell title="Continue Learning" icon={<BookOpen className="w-4 h-4" />}><SectionSkeleton rows={2} /></SectionShell>
            ) : isSectionError(plan.data.continue_learning) ? (
              <SectionShell title="Continue Learning" icon={<BookOpen className="w-4 h-4" />}>
                <SectionFailed message="Could not load this section." onRetry={() => plan.refetch()} />
              </SectionShell>
            ) : (
              <ContinueCard data={plan.data.continue_learning ?? null} />
            )}
          </div>

          <div>
            {plan.data && !isSectionError(plan.data.revision) && plan.data.revision ? <RevisionCard data={plan.data.revision} /> : null}
            {plan.data && isSectionError(plan.data.revision) && (
              <SectionShell title="Revision Queue"><SectionFailed message="Could not load this section." onRetry={() => plan.refetch()} /></SectionShell>
            )}
          </div>

          <div>
            {plan.data && !isSectionError(plan.data.recommendations) && plan.data.recommendations
              ? <RecommendationsCard data={plan.data.recommendations} /> : null}
            {plan.data && isSectionError(plan.data.recommendations) && (
              <SectionShell title="Recommended"><SectionFailed message="Could not load this section." onRetry={() => plan.refetch()} /></SectionShell>
            )}
          </div>

          <div className="lg:col-span-2">
            {plan.isError ? null : plan.isPending || !plan.data ? (
              <SectionShell title="Needs Attention" icon={<AlertCircle className="w-4 h-4" />}><SectionSkeleton rows={2} /></SectionShell>
            ) : isSectionError(plan.data.weak_topics) || !plan.data.weak_topics ? (
              <SectionShell title="Needs Attention" icon={<AlertCircle className="w-4 h-4" />}>
                <SectionFailed message="Could not load weak topics." onRetry={() => plan.refetch()} />
              </SectionShell>
            ) : (
              <WeakTopicsCard topics={plan.data.weak_topics.topics} rule={plan.data.weak_topics.rule} />
            )}
          </div>

          <div>
            {week.isError ? (
              <SectionShell title="This Week" icon={<Clock className="w-4 h-4" />}>
                <SectionFailed message={errorText(week.error)} onRetry={() => week.refetch()} />
              </SectionShell>
            ) : week.isPending || !week.data ? (
              <SectionShell title="This Week" icon={<Clock className="w-4 h-4" />}><SectionSkeleton rows={3} /></SectionShell>
            ) : (
              <WeekCard data={week.data} />
            )}
          </div>

          <div className="lg:col-span-3">
            {progress.isError ? (
              <SectionShell title="Syllabus Progress" icon={<TrendingUp className="w-4 h-4" />}>
                <SectionFailed message={errorText(progress.error)} onRetry={() => progress.refetch()} />
              </SectionShell>
            ) : progress.isPending || !progress.data?.overall ? (
              <SectionShell title="Syllabus Progress" icon={<TrendingUp className="w-4 h-4" />}><SectionSkeleton rows={4} /></SectionShell>
            ) : (
              <ProgressCard overall={progress.data.overall} subjects={progress.data.subjects ?? []} />
            )}
          </div>
        </div>
      )}

      {prefs && (
        <PreferencesDialog
          key={`${prefs.daily_minutes}-${prefs.daily_questions}-${prefs.study_days.join(",")}-${settingsOpen}`}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          prefs={prefs}
          saving={save.isPending}
          error={saveError}
          onSave={(p) =>
            save.mutate(p, {
              onSuccess: () => setSettingsOpen(false),
              onError: () => setSaveError("We couldn't save your targets. Please check the values and try again."),
            })
          }
        />
      )}
    </div>
  );
}
