"use client";

import React, { useState } from "react";
import { 
  BarChart3, Activity, Users, MessageSquare, DollarSign, Clock, 
  TrendingUp, Download, Calendar as CalendarIcon, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockAIUsageAnalytics } from "@/lib/mock/admin-ai-tutor";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function AITutorUsagePage() {
  const [timeRange, setTimeRange] = useState("14d");

  // Create simple mock chart bars based on the mock data array
  const maxMessages = Math.max(...mockAIUsageAnalytics.dailyUsage.map(d => d.messages));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Usage Analytics</h2>
          <p className="text-sm text-slate-500">Monitor AI interaction volumes, performance, and estimated costs.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            className="h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="14d">Last 14 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button variant="outline" className="bg-white gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Total Messages</p>
            <MessageSquare className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{mockAIUsageAnalytics.totalMessages.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +12.5% vs last period
          </p>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Unique Students</p>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{mockAIUsageAnalytics.uniqueStudents.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +5.2% vs last period
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium">Avg. Response Time</p>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545]">{(mockAIUsageAnalytics.averageResponseTimeMs / 1000).toFixed(2)}s</p>
          <p className="text-xs text-slate-500 mt-1">Provider: OpenAI (gpt-4o-mini)</p>
        </div>

        <div className="bg-gradient-to-br from-[#0B2545] to-[#1e467a] p-5 rounded-xl shadow-sm text-white">
          <div className="flex justify-between items-start mb-2">
            <p className="text-blue-200 text-sm font-medium">Est. API Cost</p>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">${mockAIUsageAnalytics.estimatedCostUSD.toFixed(2)}</p>
          <p className="text-xs text-blue-200 mt-1 flex items-center gap-1">
            <Zap className="w-3 h-3" /> {(mockAIUsageAnalytics.estimatedTokensUsed / 1000000).toFixed(1)}M Tokens Used
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mock Chart Section */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#D4A72C]" /> Daily Message Volume
          </h3>
          
          <div className="h-64 flex items-end gap-2 px-2">
            {mockAIUsageAnalytics.dailyUsage.map((day, i) => {
              const heightPercentage = (day.messages / maxMessages) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative h-full flex items-end justify-center rounded-t-sm hover:bg-slate-50 transition-colors">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-[#0B2545] text-white text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity z-10">
                      {day.messages.toLocaleString()} msgs<br/>
                      <span className="text-slate-300">{day.students} students</span>
                    </div>
                    {/* Bar */}
                    <div 
                      className="w-full max-w-[32px] bg-blue-500 rounded-t-md group-hover:bg-blue-400 transition-colors"
                      style={{ height: `${heightPercentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap -rotate-45 origin-top-left translate-y-2 translate-x-2">
                    {day.date}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center text-xs text-slate-500 flex justify-center gap-6">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> Total Messages</span>
          </div>
        </div>

        {/* Popular Topics */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-0 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-[#0B2545]">Most Asked Topics</h3>
            <p className="text-xs text-slate-500 mt-1">Based on recent conversation analysis.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>Topic</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAIUsageAnalytics.popularTopics.map((topic, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-slate-700">{topic.topic}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
                        {topic.requests.toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
