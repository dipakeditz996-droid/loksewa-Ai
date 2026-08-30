"use client";

import React from "react";
import {
  MessageSquare, Users, Activity, Clock, Server,
  ShieldAlert,
  CheckCircle2, AlertCircle, RefreshCw
} from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { useQuery } from "@tanstack/react-query";

export default function AITutorOverviewPage() {
  const { data: overview, isLoading, error } = useQuery({
    queryKey: ["admin", "ai-tutor", "overview"],
    queryFn: adminApi.getAITutorOverview,
  });

  const { data: providerStatus } = useQuery({
    queryKey: ["admin", "ai-tutor", "provider-status"],
    queryFn: adminApi.getAITutorProviderStatus,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-6 rounded-xl flex items-center gap-4">
        <AlertCircle className="w-6 h-6" />
        <p>Failed to load AI Tutor overview data.</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Sessions", value: (overview?.totalSessions || 0).toLocaleString(), icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active Students", value: (overview?.activeStudents || 0).toLocaleString(), icon: Users, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Sessions Today", value: (overview?.sessionsToday || 0).toLocaleString(), icon: Activity, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Questions Asked", value: (overview?.totalQuestions || 0).toLocaleString(), icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  const isConfigured = providerStatus?.status === "configured";

  return (
    <div className="space-y-6">
      {/* Top Section - Status & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#0B2545]">System Status</h2>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isConfigured ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}>
              {isConfigured ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {isConfigured ? "Operational" : "Not Configured"}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className={`p-4 rounded-xl ${isConfigured ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
              <Server className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Provider ({providerStatus?.provider || "gemini"})</p>
              <p className="text-lg font-bold text-slate-800">
                {isConfigured ? `Configured (${providerStatus?.model})` : "Not Configured"}
              </p>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {isConfigured
                ? "Provider status reflects whether the AI Tutor's API key is configured on the backend. Live requests are not made just to check status."
                : "GEMINI_API_KEY is not set on the backend - the AI Tutor is running in mock-response mode for students."}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#0B2545]">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Backend Gaps Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0B2545] mb-2 flex items-center gap-3">
              Safety & Moderation Logs
              <span className="text-xs font-bold px-2 py-1 rounded border text-amber-600 bg-amber-50 border-amber-200">
                Backend Gap
              </span>
            </h3>
            <p className="text-sm text-slate-600 mb-4 max-w-3xl leading-relaxed">
              A moderation/safety log (flagged content, admin review trail) is not currently supported -
              there is no logging model for it in this codebase yet. Configuration, Prompts, Knowledge
              Base, and Usage Analytics are all real and already available in their own tabs.
            </p>

            <div className="grid grid-cols-1 max-w-xs gap-4 mt-6 opacity-60 pointer-events-none">
              <div className="border border-slate-200 rounded-lg p-4 flex items-center gap-3 bg-slate-50">
                <ShieldAlert className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-500">Safety Logs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
