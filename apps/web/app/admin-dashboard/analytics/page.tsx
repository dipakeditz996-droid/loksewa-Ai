"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Users, GraduationCap, Bot, Store, Activity,
  CreditCard, AlertCircle, RefreshCw, HelpCircle, FileText
} from "lucide-react";
import { TrendCard } from "@/components/analytics/ChartComponents";
import { Area, AreaChart as RechartsAreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CustomTooltip, COLORS } from "@/components/analytics/ChartComponents";
import { adminApi } from "@/lib/api/admin";
import { useQuery } from "@tanstack/react-query";
import { AnalyticsPeriod } from "@/components/analytics/DateRangeFilter";

const MODULE_LINKS = [
  { name: "Students", href: "/admin-dashboard/analytics/students", icon: Users },
  { name: "Exams", href: "/admin-dashboard/exams", icon: FileText },
  { name: "Questions", href: "/admin-dashboard/questions/review", icon: HelpCircle },
  { name: "Study Plans", href: "/admin-dashboard/study-plans", icon: GraduationCap },
  { name: "AI Tutor", href: "/admin-dashboard/ai-tutor/overview", icon: Bot },
  { name: "Marketplace", href: "/admin-dashboard/marketplace", icon: Store },
];

export default function AnalyticsOverviewPage() {
  const searchParams = useSearchParams();
  const period = (searchParams.get("period") as AnalyticsPeriod) || "30d";

  // Fetch KPI Stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["admin", "dashboard", "stats"],
    queryFn: adminApi.getDashboardStats,
  });

  // Fetch Time-Series Analytics
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ["admin", "analytics", period],
    queryFn: () => adminApi.getAnalytics(period),
  });

  const isLoading = statsLoading || analyticsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (statsError || analyticsError) {
    return (
      <div className="bg-red-50 text-red-500 p-6 rounded-xl flex items-center gap-4">
        <AlertCircle className="w-6 h-6" />
        <p>Failed to load analytics data from the server.</p>
      </div>
    );
  }

  const chartData = analytics?.chartData || [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#0B2545]">Analytics Overview</h2>
      
      {/* Platform Health Scorecard (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TrendCard 
          title="Total Students" 
          value={(stats?.users.totalStudents || 0).toLocaleString()} 
          trend={0} // Backend doesn't provide trend percentage currently
          icon={<Users className="w-5 h-5 text-blue-500" />} 
        />
        <TrendCard 
          title="Active Students" 
          value={(stats?.users.activeStudents || 0).toLocaleString()} 
          trend={0}
          icon={<Activity className="w-5 h-5 text-emerald-500" />} 
        />
        <TrendCard 
          title="Total Exams" 
          value={(stats?.academic.publishedExams || 0).toLocaleString()} 
          trend={0} 
          icon={<GraduationCap className="w-5 h-5 text-purple-500" />} 
        />
        <TrendCard 
          title="Questions Available" 
          value={(stats?.academic.questions || 0).toLocaleString()} 
          trend={0} 
          icon={<HelpCircle className="w-5 h-5 text-amber-500" />} 
        />
        <TrendCard 
          title="Games Played" 
          value={(stats?.games.totalPlayed || 0).toLocaleString()} 
          trend={0} 
          icon={<Activity className="w-5 h-5 text-indigo-500" />} 
        />
        <TrendCard 
          title="AI Conversations" 
          value={(stats?.aiTutor.totalSessions || 0).toLocaleString()} 
          trend={0} 
          icon={<Bot className="w-5 h-5 text-cyan-500" />} 
        />
        <TrendCard 
          title="Marketplace Orders" 
          value={(stats?.marketplace.totalOrders || 0).toLocaleString()} 
          trend={0} 
          icon={<Store className="w-5 h-5 text-rose-500" />} 
        />
        <TrendCard 
          title="Total Revenue" 
          value={`Rs. ${(stats?.marketplace.revenue || 0).toLocaleString()}`} 
          trend={0} 
          icon={<CreditCard className="w-5 h-5 text-emerald-600" />} 
        />
      </div>

      {/* Main Activity Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[400px]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-[#0B2545] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#D4A72C]" />
            Platform Activity (Multi-metric)
          </h3>
        </div>
        <div className="flex-1">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsAreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExams" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={COLORS[2]} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPractice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[3]} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={COLORS[3]} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                
                <Area yAxisId="left" type="monotone" dataKey="registrations" stroke={COLORS[0]} fillOpacity={1} fill="url(#colorRegistrations)" strokeWidth={2} name="Registrations" />
                <Area yAxisId="left" type="monotone" dataKey="examAttempts" stroke={COLORS[1]} fillOpacity={1} fill="url(#colorExams)" strokeWidth={2} name="Exam Attempts" />
                <Area yAxisId="left" type="monotone" dataKey="aiSessions" stroke={COLORS[2]} fillOpacity={1} fill="url(#colorAI)" strokeWidth={2} name="AI Sessions" />
                <Area yAxisId="left" type="monotone" dataKey="practiceSessions" stroke={COLORS[3]} fillOpacity={1} fill="url(#colorPractice)" strokeWidth={2} name="Practice Sessions" />
              </RechartsAreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center h-full text-slate-500">
              No activity data available for this period.
            </div>
          )}
        </div>
      </div>

      {/* Module deep-dives - each of these already has its own real,
          backend-connected admin section, so this links out rather than
          duplicating that page as a second thinner dashboard. */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-bold text-[#0B2545] mb-1">Module Deep-Dives</h3>
        <p className="text-slate-500 text-sm mb-4">
          Detailed, module-specific data lives in each section&apos;s own admin page.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MODULE_LINKS.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 hover:border-[#D4A72C]/50 hover:bg-slate-50 transition-colors"
            >
              <m.icon className="w-4 h-4 text-[#D4A72C] shrink-0" />
              <span className="text-sm font-medium text-slate-700">{m.name}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
