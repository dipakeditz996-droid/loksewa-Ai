"use client";

import React, { memo } from "react";
import Link from "next/link";
import {
  BookOpen, Target, Sparkles, ArrowRight,
  Flame, Coins, GraduationCap
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RetryImage } from "@/components/ui/retry-image";
import type { User } from "@/lib/api/auth";
import type { DashboardData, StudentReferralDashboardData } from "./dashboard-types";

interface DashboardHeaderSectionProps {
  data: DashboardData | undefined;
  loading: boolean;
  user: User | null;
  activeCourse: { id?: number; title: string; level_name?: string | null } | null;
  isCtxLoading: boolean;
  dashboardFetching: boolean;
  mounted: boolean;
  referralData: StudentReferralDashboardData | null | undefined;
  refetchReferral: () => void;
}

export const DashboardHeaderSection = memo(function DashboardHeaderSection({
  data,
  loading,
  user,
  activeCourse,
  isCtxLoading,
  dashboardFetching,
  mounted,
  referralData,
  refetchReferral,
}: DashboardHeaderSectionProps) {
  const studentName = data?.profile?.name || user?.name || user?.username || "";
  const studentAvatar = data?.profile?.avatar || user?.avatar || null;
  const targetPosition =
    data?.profile?.targetPosition && data.profile.targetPosition !== "Student"
      ? data.profile.targetPosition
      : user?.role
      ? user.role.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())
      : "Section Officer";

  const analytics = data
    ? { journey_progress: data.stats.progress, active_course: data.activeCourse }
    : null;

  return (
    <section className="bg-card p-6 md:p-8 rounded-[16px] border border-border shadow-sm flex flex-col xl:flex-row justify-between gap-8 relative">
      {mounted && !loading && dashboardFetching && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Updating...
        </div>
      )}

      {/* Left Side: Avatar & Gamification */}
      <div className="flex-1 flex flex-col justify-between gap-6">
        <div className="flex gap-4 items-center">
          {!mounted ? (
            <div className="w-14 h-14 rounded-full shrink-0">
              <Skeleton className="w-14 h-14 rounded-full" />
            </div>
          ) : studentAvatar ? (
            <RetryImage
              src={studentAvatar}
              alt="Avatar"
              className="w-14 h-14 rounded-full object-cover border-2 border-border/50 shadow-sm shrink-0"
            />
          ) : studentName ? (
            <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center text-xl font-bold shrink-0 border-2 border-border/50 shadow-sm">
              {studentName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <Skeleton className="w-14 h-14 rounded-full" />
          )}

          <div className="flex flex-col justify-center">
            {studentName ? (
              <h1 className="text-lg font-bold text-primary dark:text-foreground tracking-tight leading-tight">
                {studentName}
              </h1>
            ) : (
              <Skeleton className="h-6 w-40" />
            )}
            <p className="text-[12px] font-medium text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span className="bg-muted/80 text-muted-foreground px-2 py-0.5 rounded flex items-center gap-1">
                <GraduationCap className="w-3 h-3" /> Student
              </span>
              <span className="w-1 h-1 rounded-full bg-secondary"></span>
              <span>
                Applied for:{" "}
                <span className="font-semibold text-primary dark:text-foreground">
                  {targetPosition}
                </span>
              </span>
            </p>
            {activeCourse ? (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Active Course:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-[#D4A72C]/15 text-[#D4A72C] border border-[#D4A72C]/30">
                  <BookOpen className="w-3.5 h-3.5" />
                  {activeCourse.title}
                </span>
                {activeCourse.level_name && (
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-medium">
                    {activeCourse.level_name}
                  </span>
                )}
              </div>
            ) : loading || isCtxLoading ? (
              <div className="flex items-center gap-2 mt-2">
                <Skeleton className="h-5 w-36 rounded-full" />
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[12px] text-muted-foreground">No active course yet.</span>
                <Link
                  href="/courses"
                  className="text-[12px] font-semibold text-[#D4A72C] hover:underline flex items-center gap-1"
                >
                  Explore Courses <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
            {referralData && (
              <div className="mt-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/30 inline-flex px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/50 self-start">
                Level {referralData.profile.level}
              </div>
            )}
          </div>
        </div>

        {/* Gamification Stats */}
        {referralData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-2">
            <div className="bg-muted border border-border/50 rounded-xl p-3 md:p-4 flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D4A72C] fill-[#D4A72C]" /> Total XP
              </div>
              <div className="text-xl md:text-2xl font-bold text-primary dark:text-foreground mt-auto">
                {referralData.profile.xp.toLocaleString()} XP
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">All time</div>
            </div>

            <div className="bg-muted border border-border/50 rounded-xl p-3 md:p-4 flex flex-col relative overflow-hidden">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                <Target className="w-3.5 h-3.5 text-blue-500" /> Current Level
              </div>
              <div className="text-xl md:text-2xl font-bold text-primary dark:text-foreground mt-auto">
                Level {referralData.profile.level}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium z-10">
                {referralData.profile.xp.toLocaleString()} /{" "}
                {referralData.settings?.xp_per_level
                  ? (referralData.profile.level * referralData.settings.xp_per_level).toLocaleString()
                  : "---"}{" "}
                XP
              </div>
              {referralData.settings?.xp_per_level && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-blue-500/20"
                  style={{
                    width: `${Math.min(
                      (referralData.profile.xp /
                        (referralData.profile.level * referralData.settings.xp_per_level)) *
                        100,
                      100
                    )}%`,
                  }}
                />
              )}
            </div>

            <div className="bg-muted border border-border/50 rounded-xl p-3 md:p-4 flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> Day Streak
              </div>
              <div className="text-xl md:text-2xl font-bold text-primary dark:text-foreground mt-auto">
                {data?.stats?.studyStreak !== undefined ? data.stats.studyStreak : "—"} Days
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">Active streak</div>
            </div>

            <div className="bg-muted border border-border/50 rounded-xl p-3 md:p-4 flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                <Coins className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> Coins
              </div>
              <div className="text-xl md:text-2xl font-bold text-primary dark:text-foreground mt-auto">
                {referralData.profile.coins.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">Available balance</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-2">
            <div className="bg-muted border border-border/50 rounded-xl p-3 md:p-4 flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D4A72C] fill-[#D4A72C]" /> Total XP
              </div>
              <div className="text-xl md:text-2xl font-bold text-muted-foreground mt-auto">
                {referralData === null ? "—" : <Skeleton className="h-7 w-20 my-0.5" />}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                {referralData === null ? (
                  <>
                    Unable to load{" "}
                    <button
                      type="button"
                      onClick={() => refetchReferral()}
                      className="underline font-semibold text-foreground"
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  <span className="text-muted-foreground/60">All time</span>
                )}
              </div>
            </div>

            <div className="bg-muted border border-border/50 rounded-xl p-3 md:p-4 flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                <Target className="w-3.5 h-3.5 text-blue-500" /> Current Level
              </div>
              <div className="text-xl md:text-2xl font-bold text-muted-foreground mt-auto">
                {referralData === null ? "—" : <Skeleton className="h-7 w-16 my-0.5" />}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                <span className="text-muted-foreground/60">Tier level</span>
              </div>
            </div>

            <div className="bg-muted border border-border/50 rounded-xl p-3 md:p-4 flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> Day Streak
              </div>
              <div className="text-xl md:text-2xl font-bold text-primary dark:text-foreground mt-auto">
                {data?.stats?.studyStreak !== undefined ? (
                  `${data.stats.studyStreak} Days`
                ) : loading ? (
                  <Skeleton className="h-7 w-20 my-0.5" />
                ) : (
                  "0 Days"
                )}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">Active streak</div>
            </div>

            <div className="bg-muted border border-border/50 rounded-xl p-3 md:p-4 flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                <Coins className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> Coins
              </div>
              <div className="text-xl md:text-2xl font-bold text-muted-foreground mt-auto">
                {referralData === null ? "—" : <Skeleton className="h-7 w-16 my-0.5" />}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                <span className="text-muted-foreground/60">Available balance</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Side: Profile Completion and Subscription */}
      <div className="xl:w-[280px] shrink-0 self-start w-full flex flex-col gap-4">
        {data?.profile && data.profile.completionPercentage < 100 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
                Profile Completion
              </span>
              <span className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
                {data.profile.completionPercentage}%
              </span>
            </div>
            <Progress
              value={data.profile.completionPercentage}
              className="h-1.5 bg-yellow-200 dark:bg-yellow-900/40"
              indicatorClassName="bg-yellow-500"
            />
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
              Complete your profile to get better recommendations.
            </p>
            <Link
              href="/student/settings"
              className="text-xs font-bold text-yellow-800 dark:text-yellow-200 hover:underline mt-1 inline-block"
            >
              Complete Profile &rarr;
            </Link>
          </div>
        )}

        <div className="bg-[#0B2545] dark:bg-[#0D1B2A] text-white p-5 rounded-2xl border border-[#163E6B] dark:border-[#243B53] shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

          {data?.package?.hasActivePackage && data.package.planName ? (
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#D4A72C] rounded-lg">
                    <Sparkles className="w-4 h-4 text-[#0A1118]" />
                  </div>
                  <span className="font-bold text-[15px] tracking-tight text-white">
                    {data.package.planName}
                  </span>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-emerald-500/30">
                  {data.package.status || "ACTIVE"}
                </span>
              </div>

              {(activeCourse?.title || data.activeCourse?.name) && (
                <div className="font-semibold text-slate-200 text-xs leading-snug">
                  {activeCourse?.title || data.activeCourse?.name}
                </div>
              )}

              <div className="pt-2 border-t border-white/15 text-xs text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Remaining Access:</span>
                  <span className="font-bold text-[#D4A72C]">
                    {data.package.remainingDays ?? 0} days
                  </span>
                </div>
                {data.package.expiryDate && (
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Expires:</span>
                    <span className="font-medium text-slate-200" suppressHydrationWarning>
                      {new Date(data.package.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <Button
                asChild
                className="w-full mt-2 bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] h-9 text-xs font-bold shadow-sm transition-colors"
              >
                <Link href="/student/courses">Go to My Courses</Link>
              </Button>
            </div>
          ) : analytics?.active_course ? (
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#D4A72C] rounded-lg">
                  <Sparkles className="w-4 h-4 text-[#0A1118]" />
                </div>
                <span className="font-bold text-lg tracking-tight text-white">Active Plan</span>
              </div>
              <div className="font-semibold text-white text-sm">
                {analytics.active_course.name}
              </div>
              <div className="pt-2 border-t border-white/15">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-400 font-medium">Journey Progress</span>
                  <span className="text-xs font-bold text-[#D4A72C]">
                    {analytics.journey_progress}%
                  </span>
                </div>
                <Progress
                  value={analytics.journey_progress}
                  className="h-1.5 bg-white/10"
                  indicatorClassName="bg-[#D4A72C]"
                />
              </div>
              <Button
                asChild
                className="w-full mt-2 bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] h-9 text-xs font-bold"
              >
                <Link href="/student/study-plan">Resume Journey</Link>
              </Button>
            </div>
          ) : loading ? (
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#D4A72C]/20 rounded-lg">
                  <Sparkles className="w-4 h-4 text-[#D4A72C]" />
                </div>
                <Skeleton className="h-5 w-28 bg-white/20" />
              </div>
              <Skeleton className="h-4 w-44 bg-white/10" />
              <Skeleton className="h-9 w-full bg-white/10 mt-2 rounded-xl" />
            </div>
          ) : (
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#D4A72C]/20 rounded-lg">
                  <Sparkles className="w-4 h-4 text-[#D4A72C]" />
                </div>
                <span className="font-bold text-lg tracking-tight text-white">Unlock Full Access</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Get access to premium preparation tools, AI tutoring, and advanced mock exams.
              </p>
              <Button
                asChild
                className="w-full mt-2 bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] h-9 text-xs font-bold"
              >
                <Link href="/student/plans">View Plans</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
