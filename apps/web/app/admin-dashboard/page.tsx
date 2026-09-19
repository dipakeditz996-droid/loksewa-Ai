"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import dynamic from "next/dynamic";
import { adminApi } from "@/lib/api/admin";
import { StatCard } from "@/components/admin/stat-card";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  FileText,
  BookOpen,
  Library,
  Brain,
  ShoppingBag,
  DollarSign,
  ArrowRight,
  Plus,
  ClipboardList,
  BookMarked,
  Layers,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Activity,
} from "lucide-react";


// recharts (~110 KB gzip) is deferred: it is below the stat cards, so the
// dashboard's first meaningful content no longer waits for it.
const PlatformActivityChart = dynamic(
  () => import("@/components/admin/dashboard-charts").then((m) => m.PlatformActivityChart),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" /> }
);
const AiTrendMiniChart = dynamic(
  () => import("@/components/admin/dashboard-charts").then((m) => m.AiTrendMiniChart),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded bg-slate-100" /> }
);

// ===== Time period filter =====
const PERIODS = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
  { label: "1 Year", value: "1y" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

// ===== Helpers =====
function formatCurrency(n: number) {
  return `NPR ${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string, days: number) {
  const d = new Date(dateStr);
  if (days <= 30) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (days <= 90) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// ===== Sub-components =====
function SectionCard({
  title,
  description,
  children,
  action,
  actionHref,
  loading,
  error,
  onRetry,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: string;
  actionHref?: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col ${className}`}>
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-[14px] font-bold text-[#0B2545]">{title}</h3>
          {description && <p className="text-[12px] text-slate-600 mt-0.5">{description}</p>}
        </div>
        {action && actionHref && (
          <Link
            href={actionHref}
            className="flex items-center gap-1 text-[12px] font-semibold text-[#0B2545] hover:text-[#D4A72C] transition-colors"
          >
            {action} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="flex-1 px-5 py-4">
        {error ? (
          <div className="flex items-center gap-2 py-4 text-red-500 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Unable to load</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold text-[#0B2545] border border-slate-200 rounded-md hover:bg-slate-50"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const config: Record<string, { label: string; cls: string }> = {
    published: { label: "Published", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-200" },
    active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    completed: { label: "Completed", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    accepted: { label: "Accepted", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const c = config[normalized] ?? { label: status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${c.cls}`}>
      {c.label}
    </span>
  );
}


// ===== MAIN PAGE =====
export default function AdminDashboardOverview() {
  const [period, setPeriod] = useState<Period>("30d");
  // Cache entries are scoped to the authenticated identity (defense in depth
  // on top of AuthContext purging the cache on any identity change).
  const { user } = useAuth();
  const uid = user?.id ?? "anon";

  // Critical: drives most of the stat cards + the activity feed.
  const {
    data: stats,
    isLoading: loadingStats,
    isFetching: statsFetching,
    isError: errorStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["admin-dashboard-stats", uid],
    enabled: !!user,
    retry: 1,
    queryFn: () => adminApi.getDashboardStats(),
    staleTime: 45 * 1000,
  });

  // Secondary: independent of stats and of each other, loaded in parallel
  // (each its own useQuery fires immediately, not chained/awaited).
  const {
    data: examsData,
    isLoading: loadingExams,
    isError: errorExams,
    refetch: refetchExams,
  } = useQuery({
    queryKey: ["admin-exams-overview", uid],
    enabled: !!user,
    retry: 1,
    queryFn: () => adminApi.getExamsOverview(),
    staleTime: 45 * 1000,
  });
  const {
    data: aiData,
    isLoading: loadingAI,
    isError: errorAI,
    refetch: refetchAI,
  } = useQuery({
    queryKey: ["admin-ai-tutor-overview", uid],
    enabled: !!user,
    retry: 1,
    queryFn: () => adminApi.getAITutorOverview(),
    staleTime: 45 * 1000,
  });
  const {
    data: marketData,
    isLoading: loadingMarket,
    isError: errorMarket,
    refetch: refetchMarket,
  } = useQuery({
    queryKey: ["admin-marketplace-overview", uid],
    enabled: !!user,
    retry: 1,
    queryFn: () => adminApi.getMarketplaceOverview(),
    staleTime: 45 * 1000,
  });

  // Heavy: keyed by period so each period is independently cached - switching
  // between two previously-viewed periods is itself an instant cache hit.
  const {
    data: chartResponse,
    isLoading: loadingChart,
    isError: errorChart,
    refetch: refetchChart,
  } = useQuery({
    queryKey: ["admin-analytics", uid, period],
    enabled: !!user,
    retry: 1,
    queryFn: () => adminApi.getAnalytics(period),
    staleTime: 60 * 1000,
  });
  const chartData = chartResponse?.chartData ?? [];
  const days = chartResponse?.days ?? 30;

  const refreshAll = () => {
    refetchStats();
    refetchExams();
    refetchAI();
    refetchMarket();
    refetchChart();
  };

  // ===== Quick Actions =====
  const quickActions = [
    { label: "Add Question", icon: Plus, href: "/admin-dashboard/academic/questions", color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" },
    { label: "Create Exam", icon: FileText, href: "/admin-dashboard/academic/exams", color: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200" },
    { label: "Add Material", icon: BookMarked, href: "/admin-dashboard/study-materials", color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" },
    { label: "Manage Users", icon: Users, href: "/admin-dashboard/users", color: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200" },
    { label: "Evaluations", icon: ClipboardList, href: "/admin-dashboard/evaluations", color: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200" },
    { label: "AI Tutor", icon: Brain, href: "/admin-dashboard/ai-tutor", color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200" },
  ];

  // Chart data formatted
  const formattedChart = chartData.map((d) => ({
    ...d,
    label: formatDate(d.date, days),
  }));

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1600px]">

      {/* ===== Page Header ===== */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#0B2545] tracking-tight flex items-center gap-2">
            Dashboard Overview
            {statsFetching && !loadingStats && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">Monitor your platform metrics and activity.</p>
        </div>
        <button
          onClick={refreshAll}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* ===== STAT CARDS — Row 1 ===== */}
      {errorStats && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Unable to load dashboard statistics.</span>
          <button
            onClick={() => refetchStats()}
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold border border-red-200 rounded-md hover:bg-red-100"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats?.users.totalStudents ?? 0}
          subtitle={`${stats?.users.activeStudents ?? 0} active`}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          loading={loadingStats}
          href="/admin-dashboard/users"
        />
        <StatCard
          title="Active Students"
          value={stats?.users.activeStudents ?? 0}
          subtitle={`${stats?.users.evaluators ?? 0} evaluators`}
          icon={UserCheck}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          loading={loadingStats}
          href="/admin-dashboard/users"
        />
        <StatCard
          title="Total Exams"
          value={examsData?.totalModelExams ?? 0}
          subtitle={`${examsData?.publishedModelExams ?? 0} published`}
          icon={FileText}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          loading={loadingExams}
          href="/admin-dashboard/academic/exams"
        />
        <StatCard
          title="Questions Bank"
          value={stats?.academic.questions ?? 0}
          subtitle={`Across ${stats?.academic.publishedExams ?? 0} exams`}
          icon={BookOpen}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
          loading={loadingStats}
          href="/admin-dashboard/academic/questions"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Study Materials"
          value={stats?.academic.studyMaterials ?? 0}
          subtitle="Published"
          icon={Library}
          iconColor="text-teal-600"
          iconBg="bg-teal-50"
          loading={loadingStats}
          href="/admin-dashboard/study-materials"
        />
        <StatCard
          title="AI Tutor Sessions"
          value={aiData?.totalSessions ?? stats?.aiTutor.totalSessions ?? 0}
          subtitle={`${aiData?.sessionsToday ?? stats?.aiTutor.sessionsToday ?? 0} today`}
          icon={Brain}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
          loading={loadingAI && loadingStats}
          href="/admin-dashboard/ai-tutor"
        />
        <StatCard
          title="Orders"
          value={marketData?.totalOrders ?? stats?.marketplace.totalOrders ?? 0}
          subtitle={`${stats?.marketplace.orderRequests ?? 0} pending`}
          icon={ShoppingBag}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          loading={loadingMarket && loadingStats}
          href="/admin-dashboard/marketplace/orders"
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(marketData?.revenue ?? stats?.marketplace.revenue ?? 0)}
          subtitle="From completed orders"
          icon={DollarSign}
          iconColor="text-[#D4A72C]"
          iconBg="bg-yellow-50"
          loading={loadingMarket && loadingStats}
          href="/admin-dashboard/marketplace"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="MRR"
          value={formatCurrency(stats?.marketplace.mrr ?? 0)}
          subtitle="Monthly Recurring"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          loading={loadingStats}
          href="/admin-dashboard/marketplace"
        />
        <StatCard
          title="Support Tickets"
          value={stats?.support.pendingTickets ?? 0}
          subtitle="Pending resolution"
          icon={AlertCircle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          loading={loadingStats}
        />
        <StatCard
          title="Pending Evals"
          value={stats?.evaluations.pending ?? 0}
          subtitle="Require grading"
          icon={ClipboardList}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
          loading={loadingStats}
          href="/admin-dashboard/evaluations"
        />
        <StatCard
          title="Active Listings"
          value={stats?.marketplace.activeListings ?? 0}
          subtitle="Marketplace products"
          icon={ShoppingBag}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          loading={loadingStats}
          href="/admin-dashboard/marketplace/listings"
        />
      </div>

      {/* ===== CHARTS + ACTIVITY ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Chart */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-[14px] font-bold text-[#0B2545] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#D4A72C]" />
                Platform Activity
              </h3>
              <p className="text-[12px] text-slate-600 mt-0.5">Registrations, exam attempts &amp; AI sessions</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                    period === p.value
                      ? "bg-white text-[#0B2545] shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-4 h-56">
            {loadingChart ? (
              <div className="h-full flex items-end gap-1 px-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${30 + Math.random() * 60}%` }} />
                ))}
              </div>
            ) : errorChart ? (
              <div className="h-full flex items-center justify-center gap-3 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" /> Unable to load
                <button
                  onClick={() => refetchChart()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold text-[#0B2545] border border-slate-200 rounded-md hover:bg-slate-50"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-600">
                No data available for this period.
              </div>
            ) : (
              <PlatformActivityChart data={formattedChart} />
            )}
          </div>
          {/* Chart legend */}
          <div className="flex items-center gap-5 px-5 pb-4">
            {[
              { color: "#0B2545", label: "Registrations" },
              { color: "#D4A72C", label: "Exam Attempts" },
              { color: "#8b5cf6", label: "AI Sessions" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                <span className="text-[11px] text-slate-600 font-medium">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <SectionCard
          title="Recent Activity"
          description="Latest platform events"
          className="lg:col-span-2"
          action="View All"
          actionHref="/admin-dashboard/analytics"
          loading={false}
          error={errorStats}
          onRetry={() => refetchStats()}
        >
          <ActivityFeed
            activities={stats?.recentActivity ?? []}
            loading={loadingStats}
            maxItems={8}
          />
        </SectionCard>
      </div>

      {/* ===== SECTION OVERVIEWS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* User Overview */}
        <SectionCard
          title="User Overview"
          description="Student & staff breakdown"
          action="Manage Users"
          actionHref="/admin-dashboard/users"
          loading={false}
          error={errorStats}
          onRetry={() => refetchStats()}
        >
          {loadingStats ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { label: "Total Students", value: stats?.users.totalStudents ?? 0, color: "bg-blue-500" },
                { label: "Active Students", value: stats?.users.activeStudents ?? 0, color: "bg-emerald-500" },
                { label: "Inactive Students", value: (stats?.users.totalStudents ?? 0) - (stats?.users.activeStudents ?? 0), color: "bg-slate-300" },
                { label: "Evaluators", value: stats?.users.evaluators ?? 0, color: "bg-amber-500" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-2 w-2 rounded-full ${row.color}`} />
                    <span className="text-[13px] text-slate-600 font-medium">{row.label}</span>
                  </div>
                  <span className="text-[14px] font-bold text-[#0B2545] tabular-nums">{row.value.toLocaleString()}</span>
                </div>
              ))}
              <Link
                href="/admin-dashboard/users"
                className="flex items-center justify-center gap-2 w-full mt-1 py-2 text-[12px] font-semibold text-[#0B2545] border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Users className="h-3.5 w-3.5" />
                View All Users
              </Link>
            </div>
          )}
        </SectionCard>

        {/* Exam Overview */}
        <SectionCard
          title="Exam Overview"
          description="Model exams and attempts"
          action="Manage Exams"
          actionHref="/admin-dashboard/academic/exams"
          loading={false}
          error={errorExams}
          onRetry={() => refetchExams()}
        >
          {loadingExams ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Total Exams", value: examsData?.totalModelExams ?? 0 },
                  { label: "Published", value: examsData?.publishedModelExams ?? 0 },
                  { label: "Drafts", value: examsData?.draftModelExams ?? 0 },
                  { label: "Total Attempts", value: examsData?.totalAttempts ?? 0 },
                ].map((s) => (
                  <div key={s.label} className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-[18px] font-bold text-[#0B2545] tabular-nums">{s.value.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-600 font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Recent exams list */}
              <div className="space-y-1.5 pt-1">
                {(examsData?.recentExams ?? []).slice(0, 3).map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-slate-700 truncate">{e.title}</p>
                      <p className="text-[11px] text-slate-600">{e.attempts} attempts</p>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                ))}
                {(examsData?.recentExams?.length ?? 0) === 0 && (
                  <p className="text-sm text-slate-600 text-center py-2">No exams yet.</p>
                )}
              </div>
            </div>
          )}
        </SectionCard>

        {/* AI Tutor Overview */}
        <SectionCard
          title="AI Tutor Overview"
          description="Conversation and usage metrics"
          action="AI Management"
          actionHref="/admin-dashboard/ai-tutor"
          loading={false}
          error={errorAI}
          onRetry={() => refetchAI()}
        >
          {loadingAI ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Total Sessions", value: aiData?.totalSessions ?? 0 },
                  { label: "Today", value: aiData?.sessionsToday ?? 0 },
                  { label: "Active Students", value: aiData?.activeStudents ?? 0 },
                  { label: "Modes", value: aiData?.topModes.length ?? 0 },
                ].map((s) => (
                  <div key={s.label} className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-[18px] font-bold text-[#0B2545] tabular-nums">{s.value.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-600 font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Usage trend mini bar */}
              {aiData && aiData.trend.length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-600 font-medium mb-2">Last 7 days trend</p>
                  <div className="h-12">
                    <AiTrendMiniChart data={aiData.trend} />
                  </div>
                </div>
              )}
              {/* Top modes */}
              {aiData && aiData.topModes.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-600 font-medium">Top modes</p>
                  {aiData.topModes.slice(0, 3).map((m) => (
                    <div key={m.mode} className="flex items-center justify-between">
                      <span className="text-[12px] text-slate-600 capitalize">{m.mode.toLowerCase().replace("_", " ")}</span>
                      <span className="text-[12px] font-bold text-[#0B2545]">{m.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ===== MARKETPLACE + QUICK ACTIONS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Marketplace Overview */}
        <SectionCard
          title="Marketplace Overview"
          description="Products, orders & revenue"
          action="View Marketplace"
          actionHref="/admin-dashboard/marketplace"
          className="lg:col-span-3"
          loading={false}
          error={errorMarket}
          onRetry={() => refetchMarket()}
        >
          {loadingMarket ? (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Orders", value: marketData?.totalOrders ?? 0 },
                  { label: "Pending", value: marketData?.pendingOrders ?? 0 },
                  { label: "Products", value: marketData?.activeProducts ?? 0 },
                  { label: "Revenue", value: `NPR ${(marketData?.revenue ?? 0).toLocaleString()}` },
                ].map((s) => (
                  <div key={s.label} className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-[16px] font-bold text-[#0B2545]">{s.value}</p>
                    <p className="text-[10px] text-slate-600 font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent orders table */}
              <div>
                <p className="text-[11px] text-slate-600 font-semibold uppercase tracking-wide mb-2">Recent Orders</p>
                <div className="space-y-1">
                  {(marketData?.recentOrders ?? []).length === 0 ? (
                    <p className="text-sm text-slate-600 text-center py-3">No orders yet.</p>
                  ) : (
                    (marketData?.recentOrders ?? []).map((o) => (
                      <div key={o.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-slate-700 truncate">{o.product}</p>
                          <p className="text-[11px] text-slate-600">by {o.buyer}</p>
                        </div>
                        <span className="text-[12px] font-semibold text-[#0B2545] shrink-0">NPR {o.price.toLocaleString()}</span>
                        <StatusBadge status={o.status} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100">
            <h3 className="text-[14px] font-bold text-[#0B2545] flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#D4A72C]" />
              Quick Actions
            </h3>
            <p className="text-[12px] text-slate-600 mt-0.5">Frequently used admin actions</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-2.5">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-150 hover:shadow-sm ${action.color}`}
              >
                <action.icon className="h-5 w-5" strokeWidth={1.75} />
                <span className="text-[11px] font-bold leading-tight">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
