"use client";

import React, { memo } from "react";
import Link from "next/link";
import {
  BookOpen, Target, Clock, Calendar, CheckCircle2,
  ChevronRight, Sparkles, MessageSquare, FileText, ArrowRight, TrendingUp,
  ShoppingBag, Flame, Gift, Copy, Share2, Users, Coins
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { QUICK_ACTIONS, DashboardStudyTask } from "@/lib/api/dashboard";
import type {
  DashboardData,
  StudentReferralDashboardData,
  ReferralHistoryEntry,
} from "./dashboard-types";

// ─── 1. Motivation Widget ──────────────────────────────────────────────────────
interface MotivationWidgetProps {
  motivation: { message: string } | null | undefined;
  dragHandle?: React.ReactNode;
}

export const MotivationWidget = memo(function MotivationWidget({
  motivation,
  dragHandle,
}: MotivationWidgetProps) {
  if (!motivation) return null;

  return (
    <section className="bg-gradient-to-r from-blue-50 dark:from-blue-950/40 to-indigo-50 dark:to-indigo-950/40 border border-blue-100 dark:border-blue-900/50 rounded-[16px] p-6 shadow-sm relative overflow-hidden group/widget">
      {dragHandle}
      <div data-focus-hide className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="w-24 h-24 text-blue-600" />
      </div>
      <div className="flex items-start gap-4 relative z-10">
        <div className="p-3 bg-card rounded-full shadow-sm">
          <Flame className="w-6 h-6 text-orange-500 fill-orange-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider mb-1">
            Quote of the Day
          </h3>
          <p className="text-lg md:text-xl font-medium text-foreground italic">
            &ldquo;{motivation.message}&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
});

// ─── 2. Quick Actions Widget ───────────────────────────────────────────────────
interface QuickActionsWidgetProps {
  dragHandle?: React.ReactNode;
}

export const QuickActionsWidget = memo(function QuickActionsWidget({
  dragHandle,
}: QuickActionsWidgetProps) {
  return (
    <div className="relative group/widget">
      {dragHandle}
      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {QUICK_ACTIONS.map((action, i) => (
          <Link
            key={i}
            href={action.href}
            className="flex flex-col items-center justify-center p-4 bg-card rounded-xl border hover:border-[#D4A72C] hover:shadow-md transition-all group text-center gap-2"
          >
            <div className="p-3 rounded-full bg-muted group-hover:bg-[#D4A72C]/10 transition-colors">
              {action.icon === "target" && (
                <Target className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />
              )}
              {action.icon === "file-text" && (
                <FileText className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />
              )}
              {action.icon === "book-open" && (
                <BookOpen className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />
              )}
              {action.icon === "message-square" && (
                <MessageSquare className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />
              )}
              {action.icon === "calendar" && (
                <Calendar className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />
              )}
              {action.icon === "shopping-bag" && (
                <ShoppingBag className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />
              )}
              {action.icon === "check-circle" && (
                <CheckCircle2 className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />
              )}
              {action.icon === "gift" && (
                <Gift className="w-5 h-5 text-blue-600 group-hover:text-[#D4A72C]" />
              )}
            </div>
            <span className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
              {action.label}
              {action.label === "Invite Friends" && (
                <span
                  data-focus-hide
                  className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                >
                  New
                </span>
              )}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
});

// ─── 3. Continue Study Widget ──────────────────────────────────────────────────
interface ContinueStudyWidgetProps {
  data: DashboardData | undefined;
  loading: boolean;
  dragHandle?: React.ReactNode;
}

export const ContinueStudyWidget = memo(function ContinueStudyWidget({
  data,
  loading,
  dragHandle,
}: ContinueStudyWidgetProps) {
  if (data?.continueLearning) {
    return (
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0B2545] via-[#0E3259] to-[#163E6B] text-white rounded-[16px] shadow-lg border border-[#163E6B] group/widget">
        {dragHandle}
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-[#163E6B]/50 to-transparent pointer-events-none"></div>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#D4A72C] opacity-10 blur-[60px] pointer-events-none"></div>
        <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div className="flex items-start gap-5">
            <div className="bg-[#0B2545] border border-[#163E6B] p-3.5 rounded-[12px] hidden sm:flex shrink-0">
              <BookOpen className="h-7 w-7 text-[#D4A72C]" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[12px] font-bold text-[#D4A72C] uppercase tracking-widest mb-1">
                Unfinished {data.continueLearning.type === "practice" ? "Practice" : "Exam"}
              </div>
              <h3 className="font-bold text-[20px] text-white tracking-tight">
                {data.continueLearning.title}
              </h3>
              <div className="flex items-center gap-4 mt-5">
                <Progress
                  value={data.continueLearning.progress}
                  className="w-48 h-1.5 bg-card/20"
                  indicatorClassName="bg-[#D4A72C]"
                />
                <span className="text-[13px] font-bold text-white">
                  {data.continueLearning.progress}%
                </span>
              </div>
            </div>
          </div>
          <Button
            className="bg-[#D4A72C] hover:bg-[#b08b25] text-slate-950 font-bold px-8 h-12 rounded-xl shrink-0 shadow-md transition-all hover:scale-[1.02]"
            asChild
          >
            <Link href={data.continueLearning.url}>
              Resume <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="h-28 rounded-[16px] bg-card border border-border p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
    );
  }

  return null;
});

// ─── 4. Referral Card Widget ───────────────────────────────────────────────────
interface ReferralCardWidgetProps {
  referralData: StudentReferralDashboardData | null | undefined;
  dragHandle?: React.ReactNode;
}

export const ReferralCardWidget = memo(function ReferralCardWidget({
  referralData,
  dragHandle,
}: ReferralCardWidgetProps) {
  if (!referralData || !referralData.settings?.is_enabled) return null;

  return (
    <section
      data-focus-hide
      className="bg-gradient-to-r from-[#0B2545] to-[#163E6B] rounded-[16px] shadow-lg border border-[#163E6B] overflow-hidden text-white group/widget"
    >
      {dragHandle}
      <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-[#D4A72C]" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Invite Friends & Earn</h2>
          </div>
          <p className="text-slate-300 text-sm">
            Earn{" "}
            <span className="font-bold text-[#D4A72C]">
              {referralData.settings.referrer_xp_reward} XP
            </span>{" "}
            for every friend who joins LoksewaAI and completes registration.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/10">
            <div>
              <div className="text-slate-300 text-xs font-medium uppercase mb-1">Referrals</div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="font-bold">{referralData.stats.successful_referrals}</span>
              </div>
            </div>
            <div>
              <div className="text-slate-300 text-xs font-medium uppercase mb-1">Pending</div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="font-bold">{referralData.stats.pending_referrals}</span>
              </div>
            </div>
            <div>
              <div className="text-slate-300 text-xs font-medium uppercase mb-1">XP Earned</div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="font-bold">{referralData.stats.total_xp_earned}</span>
              </div>
            </div>
            <div>
              <div className="text-slate-300 text-xs font-medium uppercase mb-1">Coins</div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="font-bold">{referralData.stats.total_coins_earned}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 hidden md:block">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-300">
                Next Reward: <strong className="text-white">10 Referrals</strong>
              </span>
              <span className="text-xs text-slate-300 font-bold">
                {referralData.stats.successful_referrals} / 10
              </span>
            </div>
            <Progress
              value={Math.min((referralData.stats.successful_referrals / 10) * 100, 100)}
              className="h-2 bg-card/10"
              indicatorClassName="bg-[#4ade80]"
            />
            <p className="text-[10px] text-slate-300 mt-2">
              {Math.max(10 - referralData.stats.successful_referrals, 0)} more referrals to unlock:{" "}
              <strong className="text-[#D4A72C]">Referral Champion (+500 XP)</strong>
            </p>
          </div>
        </div>
        <div className="w-full md:w-auto shrink-0 flex flex-col gap-4">
          <div className="bg-black/20 p-5 rounded-xl border border-white/10">
            <div className="text-xs text-slate-300 font-medium uppercase tracking-wider mb-2 text-center">
              Your Referral Code
            </div>
            <div className="font-mono text-xl font-bold tracking-widest text-[#4ade80] text-center mb-4">
              {referralData.profile.referral_code}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="secondary"
                className="bg-card/10 hover:bg-card/20 text-white border-0 flex-1 h-9 px-2"
                onClick={() => {
                  const link = `${
                    typeof window !== "undefined" ? window.location.origin : ""
                  }/signup?ref=${referralData.profile.referral_code}`;
                  navigator.clipboard.writeText(link);
                  alert("Referral link copied!");
                }}
                title="Copy Link"
              >
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
              <Button
                variant="secondary"
                className="bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/40 text-[#1DA1F2] border-0 h-9 px-3"
                onClick={() => {
                  const link = `${
                    typeof window !== "undefined" ? window.location.origin : ""
                  }/signup?ref=${referralData.profile.referral_code}`;
                  if (navigator.share) {
                    navigator
                      .share({
                        title: "Join me on LoksewaAI",
                        text: "Join me on LoksewaAI and start your Loksewa preparation. Use my referral link to get started!",
                        url: link,
                      })
                      .catch(console.error);
                  } else {
                    window.open(
                      `https://twitter.com/intent/tweet?url=${encodeURIComponent(
                        link
                      )}&text=Join me on LoksewaAI!`
                    );
                  }
                }}
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-white flex-1 h-9 px-2"
                asChild
              >
                <Link href="/student/referrals">
                  Details <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

// ─── 5. Referrals List Widget ──────────────────────────────────────────────────
interface ReferralsListWidgetProps {
  referralHistory: ReferralHistoryEntry[];
  isLoading: boolean;
  dragHandle?: React.ReactNode;
}

export const ReferralsListWidget = memo(function ReferralsListWidget({
  referralHistory,
  isLoading,
  dragHandle,
}: ReferralsListWidgetProps) {
  return (
    <div className="bg-card border border-border shadow-sm rounded-[16px] flex flex-col overflow-hidden group/widget">
      <div className="p-4 border-b border-border/50 bg-muted/50 flex justify-between items-center">
        <h3 className="text-base font-bold text-primary dark:text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" /> Recent Referrals
        </h3>
        <div className="flex items-center gap-1">
          {dragHandle}
          <Button variant="ghost" size="sm" className="text-xs text-blue-600 h-8 font-semibold" asChild>
            <Link href="/student/referrals">View all</Link>
          </Button>
        </div>
      </div>
      <div className="p-0 flex-1 flex flex-col">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center py-2">
                <Skeleton className="h-4 w-28" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-12 rounded-md" />
                  <Skeleton className="h-4 w-10" />
                </div>
              </div>
            ))}
          </div>
        ) : referralHistory.length > 0 ? (
          <div className="divide-y divide-border/50">
            {referralHistory.slice(0, 4).map((item, i) => (
              <div key={i} className="flex justify-between items-center p-4 hover:bg-muted transition-colors">
                <span className="text-sm font-semibold text-primary dark:text-foreground">
                  {item.referred_username}
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
                      item.status === "rewarded"
                        ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                        : item.status === "qualified"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                    )}
                  >
                    {item.status}
                  </span>
                  <span className="text-xs font-bold text-[#D4A72C] w-14 text-right">
                    {item.reward_amount > 0 ? `+${item.reward_amount} XP` : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center flex flex-col items-center justify-center h-full text-muted-foreground">
            <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-primary dark:text-foreground">No referrals yet</p>
            <p className="text-xs mt-1">Share your code to start earning!</p>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── 6. Your Progress Widget ───────────────────────────────────────────────────
interface YourProgressWidgetProps {
  data: DashboardData | undefined;
  loading: boolean;
  dragHandle?: React.ReactNode;
}

export const YourProgressWidget = memo(function YourProgressWidget({
  data,
  loading,
  dragHandle,
}: YourProgressWidgetProps) {
  return (
    <div className="bg-card border border-border shadow-sm rounded-[16px] flex flex-col overflow-hidden group/widget">
      <div className="p-4 border-b border-border/50 bg-muted/50 flex justify-between items-center">
        <h3 className="text-base font-bold text-primary dark:text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-500" /> Your Progress
        </h3>
        <div className="flex items-center gap-2">
          {dragHandle}
          <div className="text-[11px] font-bold text-muted-foreground flex items-center cursor-pointer hover:text-primary dark:text-foreground uppercase tracking-wider">
            This Week <ChevronRight className="w-3 h-3 ml-0.5 rotate-90" />
          </div>
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-center gap-6">
        {!data && loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </>
        ) : data ? (
          <>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-muted-foreground">Practice Score</span>
                <span className="text-sm font-bold text-primary dark:text-foreground">
                  {data.stats.averageScore}%
                </span>
              </div>
              <Progress
                value={data.stats.averageScore}
                className="h-2 bg-muted/80"
                indicatorClassName="bg-blue-500"
              />
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-muted-foreground">Mock Exams</span>
                <span className="text-sm font-bold text-primary dark:text-foreground">
                  {data.stats.completedExams} /{" "}
                  {Math.max(data.stats.completedExams, data.stats.totalExams)}
                </span>
              </div>
              <Progress
                value={
                  data.stats.totalExams > 0
                    ? Math.min((data.stats.completedExams / data.stats.totalExams) * 100, 100)
                    : 0
                }
                className="h-2 bg-muted/80"
                indicatorClassName="bg-purple-500"
              />
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-muted-foreground">Questions Solved</span>
                <span className="text-sm font-bold text-primary dark:text-foreground">
                  {data.stats.questionsAttempted}
                </span>
              </div>
              <Progress
                value={Math.min(
                  (data.stats.questionsAttempted /
                    Math.max(data.stats.questionsAttempted + 50, 100)) *
                    100,
                  100
                )}
                className="h-2 bg-muted/80"
                indicatorClassName="bg-[#D4A72C]"
              />
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-muted-foreground">Accuracy</span>
                <span className="text-sm font-bold text-primary dark:text-foreground">
                  {data.stats.accuracy}%
                </span>
              </div>
              <Progress
                value={data.stats.accuracy}
                className="h-2 bg-muted/80"
                indicatorClassName="bg-green-500"
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
});

// ─── 7. Upcoming Exams Widget ──────────────────────────────────────────────────
interface UpcomingExamsWidgetProps {
  data: DashboardData | undefined;
  loading: boolean;
  dragHandle?: React.ReactNode;
}

export const UpcomingExamsWidget = memo(function UpcomingExamsWidget({
  data,
  loading,
  dragHandle,
}: UpcomingExamsWidgetProps) {
  const upcomingExams = data
    ? data.todaysPlan.filter((p: DashboardStudyTask) => p.type === "exam")
    : [];

  return (
    <div className="bg-card border border-border shadow-sm rounded-[16px] flex flex-col overflow-hidden group/widget">
      <div className="p-4 border-b border-border/50 bg-muted/50 flex justify-between items-center">
        <h3 className="text-base font-bold text-primary dark:text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orange-500" /> Upcoming
        </h3>
        <div className="flex items-center gap-1">
          {dragHandle}
          <Button variant="ghost" size="sm" className="text-xs text-blue-600 h-8 font-semibold" asChild>
            <Link href="/student/exams">View all</Link>
          </Button>
        </div>
      </div>
      <div className="p-0 flex-1 flex flex-col">
        {!data && loading ? (
          <div className="p-5 space-y-4">
            <div className="flex gap-4">
              <Skeleton className="w-5 h-5 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-8 w-full mt-3 rounded-md" />
              </div>
            </div>
          </div>
        ) : upcomingExams.length > 0 ? (
          <div className="divide-y divide-border/50">
            {upcomingExams.map((exam: DashboardStudyTask) => (
              <div key={exam.id} className="p-5 hover:bg-muted transition-colors">
                <div className="flex gap-4">
                  <div className="mt-1">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-primary dark:text-foreground leading-tight mb-1">
                      {exam.title}
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium">
                      Today • {exam.duration} mins
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-4 text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 dark:bg-blue-950/30 hover:text-blue-800"
                      asChild
                    >
                      <Link href={`/student/exams/${exam.id}`}>Start Now</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center flex flex-col items-center justify-center h-full text-muted-foreground">
            <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-primary dark:text-foreground">No upcoming exams</p>
            <p className="text-xs mt-1">Check back later or view past results.</p>
          </div>
        )}
      </div>
    </div>
  );
});
