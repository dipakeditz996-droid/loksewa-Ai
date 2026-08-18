"use client";

import React from "react";
import { GraduationCap, Map, Users, Target, Activity } from "lucide-react";
import { 
  mockStudyPlanMetrics, 
  mockStudyPlanPerformance
} from "@/lib/mock/admin-analytics";
import { TrendCard, BarChart } from "@/components/analytics/ChartComponents";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function StudyPlanAnalyticsPage() {
  return (
    <div className="space-y-6">
      
      {/* Study Plan Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <TrendCard 
          title="Total Plans" 
          value={mockStudyPlanMetrics.totalPlans} 
          icon={<Map className="w-5 h-5 text-blue-500" />} 
        />
        <TrendCard 
          title="Active Enrollments" 
          value={mockStudyPlanMetrics.activeEnrollments.toLocaleString()} 
          trend={15} 
          icon={<Users className="w-5 h-5 text-emerald-500" />} 
        />
        <TrendCard 
          title="Completed Plans" 
          value={mockStudyPlanMetrics.completedPlans.toLocaleString()} 
          trend={8} 
          icon={<GraduationCap className="w-5 h-5 text-amber-500" />} 
        />
        <TrendCard 
          title="Average Progress" 
          value={mockStudyPlanMetrics.averageProgress} 
          trend={4} 
          icon={<Activity className="w-5 h-5 text-indigo-500" />} 
        />
        <TrendCard 
          title="Completion Rate" 
          value={mockStudyPlanMetrics.completionRate} 
          trend={-2} 
          icon={<Target className="w-5 h-5 text-rose-500" />} 
        />
      </div>

      {/* Plan Enrollment Chart (Mocked dynamically for layout) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[350px]">
        <h3 className="font-bold text-[#0B2545] mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-400" />
          Plan Enrollment vs Completion
        </h3>
        <div className="flex-1">
          <BarChart 
            data={mockStudyPlanPerformance.map(p => ({
              name: p.name.substring(0, 15) + "...",
              Enrolled: p.students,
              Completed: Math.floor(p.students * (p.completionRate / 100))
            }))} 
            dataKeys={["Enrolled", "Completed"]} 
            colors={["#0B2545", "#10b981"]}
          />
        </div>
      </div>

      {/* Study Plan Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-[#0B2545]">Study Plan Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white">
                <TableHead>Study Plan</TableHead>
                <TableHead className="text-center">Enrolled Students</TableHead>
                <TableHead className="text-center">Average Progress</TableHead>
                <TableHead className="text-center">Completion Rate</TableHead>
                <TableHead className="text-center">Drop-off Rate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockStudyPlanPerformance.map((plan, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-semibold text-[#0B2545]">{plan.name}</TableCell>
                  <TableCell className="text-center font-medium text-slate-700">{plan.students.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-medium text-slate-600">{plan.avgProgress}%</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${plan.avgProgress}%` }}></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                      {plan.completionRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      plan.dropOff > 20 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                    }`}>
                      {plan.dropOff}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-[#0B2545] hover:bg-slate-100">
                      View Students
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
