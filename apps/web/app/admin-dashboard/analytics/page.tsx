"use client";

import React from "react";
import { 
  Users, GraduationCap, Bot, Store, Activity, 
  HelpCircle, CreditCard, Ticket
} from "lucide-react";
import { mockPlatformHealth, mockPlatformActivityChart } from "@/lib/mock/admin-analytics";
import { TrendCard, AreaChart } from "@/components/analytics/ChartComponents";
import { Area, AreaChart as RechartsAreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CustomTooltip, COLORS } from "@/components/analytics/ChartComponents";

export default function AnalyticsOverviewPage() {
  return (
    <div className="space-y-6">
      
      {/* Platform Health Scorecard (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TrendCard 
          title="Total Students" 
          value={mockPlatformHealth.totalStudents.toLocaleString()} 
          trend={12} 
          icon={<Users className="w-5 h-5 text-blue-500" />} 
        />
        <TrendCard 
          title="Active Students" 
          value={mockPlatformHealth.activeStudents.toLocaleString()} 
          trend={18} 
          icon={<Activity className="w-5 h-5 text-emerald-500" />} 
        />
        <TrendCard 
          title="Total Exams Taken" 
          value={mockPlatformHealth.totalExams.toLocaleString()} 
          trend={8} 
          icon={<GraduationCap className="w-5 h-5 text-purple-500" />} 
        />
        <TrendCard 
          title="Questions Solved" 
          value={mockPlatformHealth.questionsSolved.toLocaleString()} 
          trend={24} 
          icon={<HelpCircle className="w-5 h-5 text-amber-500" />} 
        />
        <TrendCard 
          title="Active Study Plans" 
          value={mockPlatformHealth.studyPlansActive.toLocaleString()} 
          trend={15} 
          icon={<GraduationCap className="w-5 h-5 text-indigo-500" />} 
        />
        <TrendCard 
          title="AI Conversations" 
          value={mockPlatformHealth.aiConversations.toLocaleString()} 
          trend={45} 
          icon={<Bot className="w-5 h-5 text-cyan-500" />} 
        />
        <TrendCard 
          title="Marketplace Orders" 
          value={mockPlatformHealth.marketplaceOrders.toLocaleString()} 
          trend={5} 
          icon={<Store className="w-5 h-5 text-rose-500" />} 
        />
        <TrendCard 
          title="Total Revenue" 
          value={`Rs. ${mockPlatformHealth.revenue.toLocaleString()}`} 
          trend={2} 
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
          <ResponsiveContainer width="100%" height="100%">
            <RechartsAreaChart data={mockPlatformActivityChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={COLORS[2]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              
              <Area yAxisId="left" type="monotone" dataKey="students" stroke={COLORS[0]} fillOpacity={1} fill="url(#colorStudents)" strokeWidth={2} name="Active Students" />
              <Area yAxisId="right" type="monotone" dataKey="questions" stroke={COLORS[2]} fillOpacity={1} fill="url(#colorQuestions)" strokeWidth={2} name="Questions Solved" />
            </RechartsAreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cross Module Mini Status */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-[#0B2545] mb-4">Platform Health Indicators</h3>
          <div className="space-y-4">
            {[
              { name: "Student Engagement", status: "Healthy", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
              { name: "Server Load / Exams", status: "Normal", color: "text-blue-600 bg-blue-50 border-blue-200" },
              { name: "AI Tutor Latency", status: "Needs Attention", color: "text-amber-600 bg-amber-50 border-amber-200" },
              { name: "Support Ticket Volume", status: "Healthy", color: "text-emerald-600 bg-emerald-50 border-emerald-200" }
            ].map((indicator, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50">
                <span className="font-medium text-slate-700">{indicator.name}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded border ${indicator.color}`}>
                  {indicator.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Report Generate */}
        <div className="bg-[#0B2545] rounded-xl shadow-sm border border-[#0B2545] p-6 text-white flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
            <Ticket className="w-8 h-8 text-[#D4A72C]" />
          </div>
          <h3 className="text-xl font-bold mb-2">Generate Custom Report</h3>
          <p className="text-white/70 text-sm mb-6 max-w-sm">
            Need specific data? Use the Report Builder to extract and export metrics across all LoksewaAI modules.
          </p>
          <a href="/admin-dashboard/analytics/reports" className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0B2545] font-bold py-2 px-6 rounded-lg transition-colors">
            Open Report Builder
          </a>
        </div>
      </div>
      
    </div>
  );
}
