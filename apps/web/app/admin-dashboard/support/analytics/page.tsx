"use client";

import React from "react";
import { 
  BarChart3, PieChart, Activity, CheckCircle2,
  Clock, MessageSquare, Star, Users
} from "lucide-react";
import { mockSupportAnalytics } from "@/lib/mock/admin-support";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function SupportAnalyticsPage() {
  const maxTickets = Math.max(...mockSupportAnalytics.ticketsOverTime.map(d => d.count));
  
  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-xl font-bold text-[#0B2545]">Support Analytics</h2>
        <p className="text-sm text-slate-500">Monitor support performance, SLA adherence, and customer satisfaction.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1 relative z-10">Resolution Rate</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <p className="text-3xl font-bold text-emerald-600">{mockSupportAnalytics.resolutionRate}%</p>
            <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">+1.2%</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Clock className="w-16 h-16 text-[#0B2545]" />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1 relative z-10">Avg Response Time</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <p className="text-3xl font-bold text-[#0B2545]">{mockSupportAnalytics.avgResponseTime}</p>
            <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">-15m</span>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="w-16 h-16 text-purple-500" />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1 relative z-10">Avg Resolution Time</p>
          <p className="text-3xl font-bold text-[#0B2545] relative z-10">{mockSupportAnalytics.avgResolutionTime}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Star className="w-16 h-16 text-amber-500" />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1 relative z-10">Customer Satisfaction</p>
          <div className="flex items-center gap-2 relative z-10">
            <p className="text-3xl font-bold text-[#0B2545]">{mockSupportAnalytics.csatRating}</p>
            <div className="flex">
              {[1,2,3,4,5].map(star => (
                <Star key={star} className={`w-4 h-4 ${star <= Math.round(mockSupportAnalytics.csatRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets Over Time Chart (Mock CSS Chart) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            Tickets Volume (Last 7 Days)
          </h3>
          
          <div className="h-64 flex items-end justify-between gap-4 px-2">
            {mockSupportAnalytics.ticketsOverTime.map((point, idx) => {
              const height = (point.count / maxTickets) * 100;
              return (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1 group">
                  <div className="w-full relative flex items-end justify-center h-full bg-slate-50 rounded-t-sm">
                    <div 
                      className="w-full bg-[#0B2545] rounded-t-sm transition-all duration-500 group-hover:bg-[#163E6C] relative"
                      style={{ height: `${height}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap transition-opacity">
                        {point.count} tickets
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-500">{point.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tickets by Category */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-slate-400" />
            Tickets by Category
          </h3>
          
          <div className="space-y-6">
            {mockSupportAnalytics.ticketsByCategory.map((cat, idx) => {
              // Generate slightly different colors for each category based on index
              const colors = [
                { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-100" },
                { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-100" },
                { bg: "bg-purple-500", text: "text-purple-600", light: "bg-purple-100" },
                { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-100" },
                { bg: "bg-slate-500", text: "text-slate-600", light: "bg-slate-100" }
              ];
              const colorSet = colors[idx % colors.length]!;

              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-700">{cat.category}</span>
                    <span className={`font-bold ${colorSet.text}`}>{cat.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colorSet.bg} rounded-full`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-400" />
          <h3 className="font-bold text-[#0B2545]">Agent Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>Agent</TableHead>
                <TableHead className="text-center">Assigned</TableHead>
                <TableHead className="text-center">Resolved</TableHead>
                <TableHead>Avg Response</TableHead>
                <TableHead>Satisfaction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSupportAnalytics.agentPerformance.map((agent, i) => (
                <TableRow key={i} className="hover:bg-slate-50/80">
                  <TableCell className="font-semibold text-[#0B2545]">
                    {agent.name}
                  </TableCell>
                  <TableCell className="text-center font-medium text-slate-600">
                    {agent.assigned}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {agent.resolved}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {agent.avgResponse}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-bold text-slate-800">{agent.csat}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
