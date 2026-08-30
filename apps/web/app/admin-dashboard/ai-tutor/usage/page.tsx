"use client";

import React from "react";
import { RefreshCw, AlertCircle, Zap, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { adminApi } from "@/lib/api/admin";

export default function AITutorUsagePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "ai-tutor", "usage"],
    queryFn: () => adminApi.getAITutorUsage(30),
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
        <p>Failed to load usage analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-50">
              <MessageCircle className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-slate-500 text-sm font-medium">Total Requests (30 days)</p>
          </div>
          <p className="text-3xl font-bold text-[#0B2545]">{data.totalRequests.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-50">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-slate-500 text-sm font-medium">Total Tokens Used (30 days)</p>
          </div>
          <p className="text-3xl font-bold text-[#0B2545]">{data.totalTokens.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Requests per day</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="requests" stroke="#D4A72C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-sm font-bold text-slate-700">Top students by usage</h3>
        </div>
        {data.topStudents.length === 0 ? (
          <p className="text-sm text-slate-400 p-6">No AI Tutor usage recorded yet.</p>
        ) : (
          <table className="w-full mt-4">
            <thead>
              <tr className="border-t border-slate-100 text-left text-xs text-slate-500">
                <th className="px-6 py-2 font-medium">Student</th>
                <th className="px-6 py-2 font-medium">Requests</th>
                <th className="px-6 py-2 font-medium">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {data.topStudents.map((s) => (
                <tr key={s.studentId} className="border-t border-slate-100 text-sm">
                  <td className="px-6 py-2.5 text-slate-800">{s.name}</td>
                  <td className="px-6 py-2.5 text-slate-600">{s.requests.toLocaleString()}</td>
                  <td className="px-6 py-2.5 text-slate-600">{s.tokens.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
