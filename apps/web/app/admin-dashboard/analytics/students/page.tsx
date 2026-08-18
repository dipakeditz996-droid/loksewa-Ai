"use client";

import React from "react";
import { Users, UserPlus, UserCheck, Clock, CheckCircle2 } from "lucide-react";
import { 
  mockStudentMetrics, 
  mockStudentGrowthChart, 
  mockTopStudents 
} from "@/lib/mock/admin-analytics";
import { TrendCard, AreaChart, BarChart } from "@/components/analytics/ChartComponents";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function StudentAnalyticsPage() {
  return (
    <div className="space-y-6">
      
      {/* Student Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <TrendCard 
          title="New Students" 
          value={mockStudentMetrics.newStudents.toLocaleString()} 
          trend={22} 
          icon={<UserPlus className="w-5 h-5 text-emerald-500" />} 
        />
        <TrendCard 
          title="Active Students" 
          value={(mockStudentMetrics.newStudents + mockStudentMetrics.returningStudents).toLocaleString()} 
          trend={14} 
          icon={<UserCheck className="w-5 h-5 text-blue-500" />} 
        />
        <TrendCard 
          title="Returning Students" 
          value={mockStudentMetrics.returningStudents.toLocaleString()} 
          trend={5} 
          icon={<Users className="w-5 h-5 text-purple-500" />} 
        />
        <TrendCard 
          title="Avg Session" 
          value={mockStudentMetrics.avgSessionDuration} 
          trend={12} 
          icon={<Clock className="w-5 h-5 text-amber-500" />} 
        />
        <TrendCard 
          title="Questions / Student" 
          value={mockStudentMetrics.questionsPerStudent} 
          trend={-3} 
          icon={<CheckCircle2 className="w-5 h-5 text-indigo-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[350px]">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            Student Growth (Last 4 Weeks)
          </h3>
          <div className="flex-1">
            <BarChart 
              data={mockStudentGrowthChart} 
              dataKeys={["new", "active"]} 
              colors={["#10b981", "#0B2545"]}
              stacked={true}
            />
          </div>
        </div>

        {/* Engagement Over Time */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[350px]">
          <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Average Session Duration (Minutes)
          </h3>
          <div className="flex-1">
            <AreaChart 
              data={mockStudentGrowthChart.map(d => ({ name: d.name, duration: Math.floor(Math.random() * 15) + 15 }))} 
              dataKeys={["duration"]} 
              colors={["#D4A72C"]}
            />
          </div>
        </div>
      </div>

      {/* Top Students Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-[#0B2545]">Top Performing Students</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white">
                <TableHead>Student Name</TableHead>
                <TableHead className="text-center">Questions Solved</TableHead>
                <TableHead className="text-center">Exam Attempts</TableHead>
                <TableHead className="text-center">Average Score</TableHead>
                <TableHead>AI Usage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTopStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-semibold text-[#0B2545]">{student.name}</TableCell>
                  <TableCell className="text-center font-medium text-slate-700">{student.questions.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-medium text-slate-700">{student.exams}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{student.score}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      student.aiUsage === "High" ? "bg-purple-100 text-purple-700" :
                      student.aiUsage === "Medium" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {student.aiUsage}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-[#0B2545] hover:bg-slate-100">
                      View Profile
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
