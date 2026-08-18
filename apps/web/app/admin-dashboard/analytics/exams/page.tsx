"use client";

import React from "react";
import { FileText, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { 
  mockExamMetrics, 
  mockExamPerformance,
  mockPassFailChart,
  mockPlatformActivityChart
} from "@/lib/mock/admin-analytics";
import { TrendCard, LineChart, DonutChart } from "@/components/analytics/ChartComponents";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function ExamAnalyticsPage() {
  return (
    <div className="space-y-6">
      
      {/* Exam Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TrendCard 
          title="Total Attempts" 
          value={mockExamMetrics.totalAttempts.toLocaleString()} 
          trend={15} 
          icon={<FileText className="w-5 h-5 text-blue-500" />} 
        />
        <TrendCard 
          title="Completed Attempts" 
          value={mockExamMetrics.completedAttempts.toLocaleString()} 
          trend={12} 
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} 
        />
        <TrendCard 
          title="Average Score" 
          value={mockExamMetrics.averageScore} 
          trend={4} 
          icon={<TrendingUp className="w-5 h-5 text-amber-500" />} 
        />
        <TrendCard 
          title="Overall Pass Rate" 
          value={mockExamMetrics.passRate} 
          trend={-2} 
          icon={<CheckCircle2 className="w-5 h-5 text-purple-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attempts Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[350px] lg:col-span-2">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-400" />
            Exam Attempts Over Time
          </h3>
          <div className="flex-1">
            <LineChart 
              data={mockPlatformActivityChart} 
              dataKeys={["exams"]} 
              colors={["#0B2545"]}
            />
          </div>
        </div>

        {/* Pass vs Fail */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[350px]">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-slate-400" />
            Pass vs Fail Ratio
          </h3>
          <div className="flex-1">
            <DonutChart 
              data={mockPassFailChart} 
              colors={["#10b981", "#ef4444"]}
            />
          </div>
          <div className="mt-4 flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-600">Passed (42%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-slate-600">Failed (58%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Exam Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-[#0B2545]">Performance by Exam</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white">
                <TableHead>Exam Name</TableHead>
                <TableHead className="text-center">Total Attempts</TableHead>
                <TableHead className="text-center">Average Score</TableHead>
                <TableHead className="text-center">Pass Rate</TableHead>
                <TableHead className="text-center">Completion Rate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockExamPerformance.map((exam, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-semibold text-[#0B2545]">{exam.name}</TableCell>
                  <TableCell className="text-center font-medium text-slate-700">{exam.attempts.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold text-slate-800">{exam.avgScore}%</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      exam.passRate >= 50 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>
                      {exam.passRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-medium text-slate-600">{exam.completionRate}%</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0B2545]" style={{ width: `${exam.completionRate}%` }}></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-[#0B2545] hover:bg-slate-100">
                      View Results
                    </Button>
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
