"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Users, Activity, UserX, Trophy, AlertCircle, RefreshCw } from "lucide-react";
import { TrendCard, BarChart, LineChart } from "@/components/analytics/ChartComponents";
import { AnalyticsPeriod } from "@/components/analytics/DateRangeFilter";
import { adminApi } from "@/lib/api/admin";

function StudentsAnalyticsContent() {
  const searchParams = useSearchParams();
  const period = (searchParams.get("period") as AnalyticsPeriod) || "30d";

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "analytics", "students", period],
    queryFn: () => adminApi.getStudentsAnalytics(period),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 text-red-500 p-6 rounded-xl flex items-center gap-4">
        <AlertCircle className="w-6 h-6" />
        <p>Failed to load student analytics from the server.</p>
      </div>
    );
  }

  const registrationData = data.registrationTrend.map((r) => ({ name: r.date, Registrations: r.count }));
  const scoreData = data.scoreDistribution.map((s) => ({ name: `${s.range}%`, Students: s.count }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#0B2545]">Student Analytics</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TrendCard title="Total Students" value={data.summary.totalStudents.toLocaleString()} icon={<Users className="w-5 h-5 text-blue-500" />} />
        <TrendCard title="Active (7 days)" value={data.summary.active7d.toLocaleString()} icon={<Activity className="w-5 h-5 text-emerald-500" />} />
        <TrendCard title="Active (30 days)" value={data.summary.active30d.toLocaleString()} icon={<Activity className="w-5 h-5 text-teal-500" />} />
        <TrendCard title="Never Logged In" value={data.summary.neverLoggedIn.toLocaleString()} icon={<UserX className="w-5 h-5 text-slate-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[340px] flex flex-col">
          <h3 className="font-bold text-[#0B2545] mb-4">Registration Trend</h3>
          <div className="flex-1">
            {registrationData.length > 0 ? (
              <LineChart data={registrationData} dataKeys={["Registrations"]} />
            ) : (
              <div className="flex justify-center items-center h-full text-slate-400 text-sm">No registrations in this period.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[340px] flex flex-col">
          <h3 className="font-bold text-[#0B2545] mb-4">Exam Score Distribution</h3>
          <div className="flex-1">
            {data.scoreDistribution.some((s) => s.count > 0) ? (
              <BarChart data={scoreData} dataKeys={["Students"]} />
            ) : (
              <div className="flex justify-center items-center h-full text-slate-400 text-sm">No completed exam attempts yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#D4A72C]" />
          <h3 className="font-bold text-[#0B2545]">Top Performers</h3>
          <span className="text-xs text-slate-400 ml-auto">By average score, all completed exams</span>
        </div>
        {data.topPerformers.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No students have completed an exam yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-6 py-3 font-medium">Student</th>
                <th className="text-center px-6 py-3 font-medium">Exams Completed</th>
                <th className="text-center px-6 py-3 font-medium">Average Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.topPerformers.map((p, i) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-3">
                    <span className="text-xs font-bold text-slate-400 mr-2">#{i + 1}</span>
                    <span className="font-semibold text-[#0B2545]">{p.name}</span>
                    <span className="text-xs text-slate-400 ml-1">@{p.username}</span>
                  </td>
                  <td className="text-center px-6 py-3">{p.examsCompleted}</td>
                  <td className="text-center px-6 py-3 font-bold text-emerald-600">{p.averagePercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function StudentsAnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading…</div>}>
      <StudentsAnalyticsContent />
    </Suspense>
  );
}
