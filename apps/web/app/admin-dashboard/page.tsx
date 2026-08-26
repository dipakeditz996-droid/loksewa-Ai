"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  adminApi,
  AdminStats,
  AdminExamsOverview,
  AdminAITutorOverview,
  AdminMarketplaceOverview,
  AnalyticsDataPoint,
} from "@/lib/api/admin";
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
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: string;
  actionHref?: string;
  loading?: boolean;
  error?: boolean;
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
            <span>Failed to load data.</span>
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

// Custom tooltip for recharts
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-600 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

// ===== MAIN PAGE =====
export default function AdminDashboardOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [examsData, setExamsData] = useState<AdminExamsOverview | null>(null);
  const [aiData, setAiData] = useState<AdminAITutorOverview | null>(null);
  const [marketData, setMarketData] = useState<AdminMarketplaceOverview | null>(null);
  const [chartData, setChartData] = useState<AnalyticsDataPoint[]>([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingAI, setLoadingAI] = useState(true);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);

  const [errorStats, setErrorStats] = useState(false);
  const [errorExams, setErrorExams] = useState(false);
  const [errorAI, setErrorAI] = useState(false);
  const [errorMarket, setErrorMarket] = useState(false);

  const [period, setPeriod] = useState<Period>("30d");
  const [days, setDays] = useState(30);

  const fetchStats = useCallback(() => {
    setLoadingStats(true);
    setErrorStats(false);
    adminApi.getDashboardStats()
      .then(setStats)
      .catch(() => setErrorStats(true))
      .finally(() => setLoadingStats(false));
  }, []);

  const fetchSupplementary = useCallback(() => {
    setLoadingExams(true);
    adminApi.getExamsOverview()
      .then(setExamsData)
      .catch(() => setErrorExams(true))
      .finally(() => setLoadingExams(false));

    setLoadingAI(true);
    adminApi.getAITutorOverview()
      .then(setAiData)
      .catch(() => setErrorAI(true))
      .finally(() => setLoadingAI(false));

    setLoadingMarket(true);
    adminApi.getMarketplaceOverview()
      .then(setMarketData)
      .catch(() => setErrorMarket(true))
      .finally(() => setLoadingMarket(false));
  }, []);

  const fetchChart = useCallback((p: Period) => {
    setLoadingChart(true);
    adminApi.getAnalytics(p)
      .then((d) => {
        setChartData(d.chartData);
        setDays(d.days);
      })
      .catch(() => setChartData([]))
      .finally(() => setLoadingChart(false));
  }, []);

  useEffect(() => {
    fetchStats();
    fetchSupplementary();
  }, [fetchStats, fetchSupplementary]);

  useEffect(() => {
    fetchChart(period);
  }, [period, fetchChart]);

  // ===== Quick Actions =====
  const quickActions = [
    { label: "Add Question", icon: Plus, href: "/admin-dashboard/academic/questions", color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" },
    { label: "Create Exam", icon: FileText, href: "/admin-dashboard/academic/exams", color: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200" },
    { label: "Add Material", icon: BookMarked, href: "/admin-dashboard/materials", color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" },
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
          <h1 className="text-[22px] font-bold text-[#0B2545] tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-600 mt-0.5">Monitor your platform metrics and activity.</p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchSupplementary(); fetchChart(period); }}
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
          <span>Failed to load dashboard statistics. Please check your connection and try refreshing.</span>
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
        />
        <StatCard
          title="Active Students"
          value={stats?.users.activeStudents ?? 0}
          subtitle={`${stats?.users.evaluators ?? 0} evaluators`}
          icon={UserCheck}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          loading={loadingStats}
        />
        <StatCard
          title="Total Exams"
          value={examsData?.totalModelExams ?? 0}
          subtitle={`${examsData?.publishedModelExams ?? 0} published`}
          icon={FileText}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          loading={loadingExams}
        />
        <StatCard
          title="Questions Bank"
          value={stats?.academic.questions ?? 0}
          subtitle={`Across ${stats?.academic.publishedExams ?? 0} exams`}
          icon={BookOpen}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
          loading={loadingStats}
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
        />
        <StatCard
          title="AI Tutor Sessions"
          value={aiData?.totalSessions ?? stats?.aiTutor.totalSessions ?? 0}
          subtitle={`${aiData?.sessionsToday ?? stats?.aiTutor.sessionsToday ?? 0} today`}
          icon={Brain}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
          loading={loadingAI && loadingStats}
        />
        <StatCard
          title="Orders"
          value={marketData?.totalOrders ?? stats?.marketplace.totalOrders ?? 0}
          subtitle={`${stats?.marketplace.orderRequests ?? 0} pending`}
          icon={ShoppingBag}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          loading={loadingMarket && loadingStats}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(marketData?.revenue ?? stats?.marketplace.revenue ?? 0)}
          subtitle="From completed orders"
          icon={DollarSign}
          iconColor="text-[#D4A72C]"
          iconBg="bg-yellow-50"
          loading={loadingMarket && loadingStats}
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
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-600">
                No data available for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedChart} margin={{ top: 4, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    interval={Math.floor(formattedChart.length / 6)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="registrations"
                    name="Registrations"
                    stroke="#0B2545"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#0B2545" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="examAttempts"
                    name="Exam Attempts"
                    stroke="#D4A72C"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#D4A72C" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="aiSessions"
                    name="AI Sessions"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#8b5cf6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
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
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aiData.trend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Bar dataKey="sessions" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                        <Tooltip
                          content={({ active, payload }) =>
                            active && payload?.length ? (
                              <div className="bg-white border border-slate-200 rounded px-2 py-1 text-xs shadow">
                                <span className="font-bold text-violet-700">{payload[0]?.value} sessions</span>
                              </div>
                            ) : null
                          }
                        />
                      </BarChart>
                    </ResponsiveContainer>
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
