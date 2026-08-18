"use client";

import React from "react";
import { 
  BarChart3, PieChart, Activity, TrendingUp, CheckCircle2,
  Mail, Smartphone, BellRing, Users
} from "lucide-react";
import { mockNotificationAnalytics } from "@/lib/mock/admin-notifications";

export default function NotificationAnalyticsPage() {
  const maxReadRate = Math.max(...mockNotificationAnalytics.readRateOverTime.map(d => d.rate));
  
  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-xl font-bold text-[#0B2545]">Notification Analytics</h2>
        <p className="text-sm text-slate-500">Monitor engagement and delivery performance.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="w-16 h-16 text-[#0B2545]" />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1 relative z-10">Total Notifications</p>
          <p className="text-3xl font-bold text-[#0B2545] relative z-10">{mockNotificationAnalytics.totalSent.toLocaleString()}</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1 relative z-10">Avg. Read Rate</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <p className="text-3xl font-bold text-emerald-600">{mockNotificationAnalytics.averageReadRate}%</p>
            <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">+2.4%</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-sm font-medium mb-2">Best Performing Type</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="font-bold text-[#0B2545]">{mockNotificationAnalytics.bestPerformingType}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-sm font-medium mb-2">Most Active Channel</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D4A72C]/20 flex items-center justify-center text-[#D4A72C]">
              <BellRing className="w-5 h-5 text-[#0B2545]" />
            </div>
            <p className="font-bold text-[#0B2545]">{mockNotificationAnalytics.mostActiveChannel}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Read Rate Over Time Chart (Mock CSS Chart) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            Read Rate Over Time
          </h3>
          
          <div className="h-64 flex items-end justify-between gap-4 px-2">
            {mockNotificationAnalytics.readRateOverTime.map((point, idx) => {
              const height = (point.rate / maxReadRate) * 100;
              return (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1 group">
                  <div className="w-full relative flex items-end justify-center h-full bg-slate-50 rounded-t-sm">
                    <div 
                      className="w-full bg-[#0B2545] rounded-t-sm transition-all duration-500 group-hover:bg-[#163E6C] relative"
                      style={{ height: `${height}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap transition-opacity">
                        {point.rate}%
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-500">{point.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel Performance (Mock Horizontal Bars) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-slate-400" />
            Channel Performance
          </h3>
          
          <div className="space-y-6">
            {mockNotificationAnalytics.channelPerformance.map((ch, idx) => {
              const readRate = ch.delivered > 0 ? Math.round((ch.read / ch.delivered) * 100) : 0;
              let Icon = BellRing;
              let color = "bg-blue-500";
              let lightColor = "bg-blue-100";
              let textColor = "text-blue-600";
              
              if (ch.channel === "Email") { Icon = Mail; color = "bg-emerald-500"; lightColor = "bg-emerald-100"; textColor = "text-emerald-600"; }
              if (ch.channel === "Push") { Icon = Smartphone; color = "bg-purple-500"; lightColor = "bg-purple-100"; textColor = "text-purple-600"; }
              if (ch.channel === "SMS") { Icon = Smartphone; color = "bg-amber-500"; lightColor = "bg-amber-100"; textColor = "text-amber-600"; }

              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${lightColor} ${textColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-slate-700">{ch.channel}</span>
                    </div>
                    <span className="font-bold text-[#0B2545]">{readRate}% Read</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${color} rounded-full`}
                      style={{ width: `${readRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Delivered: {ch.delivered.toLocaleString()}</span>
                    <span>Read: {ch.read.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
