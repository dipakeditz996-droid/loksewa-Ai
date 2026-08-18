"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Edit, Copy, MoreHorizontal, Send, Archive, Trash2, 
  CalendarDays, BookOpen, Clock, Users, Target, Activity, Settings2, BarChart3,
  CheckCircle2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { 
  mockStudyPlans, mockStudyPlanStudents, mockStudyPlanAnalytics 
} from "@/lib/mock/admin-study-plans";
import { mockExamCategories, mockPositions } from "@/lib/mock/admin-academic";

export default function StudyPlanDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  const plan = mockStudyPlans.find(p => p.id === planId);
  const students = mockStudyPlanStudents.filter(s => s.planId === planId);

  const [activeTab, setActiveTab] = useState("overview");

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 flex items-center justify-center rounded-2xl mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-[#0B2545] mb-2">Plan Not Found</h2>
        <p className="text-slate-500 mb-6">The study plan you are looking for does not exist or has been removed.</p>
        <Link href="/admin-dashboard/study-plans">
          <Button className="bg-[#0B2545]">Back to Study Plans</Button>
        </Link>
      </div>
    );
  }

  const category = mockExamCategories.find(c => c.id === plan.categoryId);
  const position = mockPositions.find(p => p.id === plan.positionId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin-dashboard/study-plans">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 bg-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                plan.status === 'Active' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                plan.status === 'Published' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {plan.status}
              </span>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {plan.type}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#0B2545]">{plan.name}</h1>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          {plan.status === "Draft" && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 flex-1 md:flex-none">
              <Send className="w-4 h-4" /> Publish Plan
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-white gap-2">
                Actions <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem>
              <DropdownMenuItem><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-amber-600 focus:text-amber-600"><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border border-slate-200 p-1 w-full flex overflow-x-auto no-scrollbar justify-start mb-6 rounded-lg h-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-[#0B2545] data-[state=active]:text-white rounded-md whitespace-nowrap">
            <Target className="w-4 h-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-[#0B2545] data-[state=active]:text-white rounded-md whitespace-nowrap">
            <CalendarDays className="w-4 h-4" /> Schedule & Tasks
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-[#0B2545] data-[state=active]:text-white rounded-md whitespace-nowrap">
            <Users className="w-4 h-4" /> Enrolled Students
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-[#0B2545] data-[state=active]:text-white rounded-md whitespace-nowrap">
            <BarChart3 className="w-4 h-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <CalendarDays className="w-6 h-6 text-[#D4A72C] mx-auto mb-2" />
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Duration</p>
              <p className="text-xl font-bold text-[#0B2545]">{plan.durationDays} Days</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Daily Goal</p>
              <p className="text-xl font-bold text-[#0B2545]">{plan.dailyStudyHours} Hours</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <BookOpen className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Tasks</p>
              <p className="text-xl font-bold text-[#0B2545]">{plan.tasks.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <Users className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Students</p>
              <p className="text-xl font-bold text-[#0B2545]">{students.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-[#0B2545] mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#D4A72C]" /> Target Information
                </h3>
                <div className="space-y-4 text-sm">
                  <div className="flex pb-4 border-b border-slate-100">
                    <span className="w-1/3 text-slate-500">Category:</span>
                    <span className="w-2/3 font-medium text-slate-800">{category?.name || 'N/A'}</span>
                  </div>
                  <div className="flex pb-4 border-b border-slate-100">
                    <span className="w-1/3 text-slate-500">Position:</span>
                    <span className="w-2/3 font-medium text-slate-800">{position?.name || 'N/A'}</span>
                  </div>
                  <div className="flex pb-4 border-b border-slate-100">
                    <span className="w-1/3 text-slate-500">Description:</span>
                    <span className="w-2/3 font-medium text-slate-800">{plan.description}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-md font-bold text-[#0B2545] mb-4 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-blue-500" /> Plan Rules
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                    <span className="text-sm text-slate-600">Task Reordering</span>
                    {plan.allowReorder ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="text-xs text-slate-400">Disabled</span>}
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                    <span className="text-sm text-slate-600">Task Skipping</span>
                    {plan.allowSkip ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="text-xs text-slate-400">Disabled</span>}
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                    <span className="text-sm text-slate-600">Revision Cycle</span>
                    {plan.enableRevisionCycle ? <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{plan.revisionFrequency}</span> : <span className="text-xs text-slate-400">Disabled</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="students" className="mt-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-[#0B2545]">Enrolled Students</h3>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-center">Current Day</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      No students are currently using this plan.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map(student => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium text-[#0B2545]">{student.studentName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${student.progressPercentage}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 font-medium">{student.progressPercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-slate-700">Day {student.currentDay}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{new Date(student.lastActivityAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          student.status === 'Active' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          student.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                          {student.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">View Details</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">Schedule & Tasks View</h3>
            <p className="mt-2 text-sm max-w-md mx-auto">This section will display the calendar view of all tasks assigned across the {plan.durationDays} days of the plan. You can edit the schedule directly from here.</p>
            <Button variant="outline" className="mt-6" onClick={() => router.push(`/admin-dashboard/study-plans/create`)}>
              <Edit className="w-4 h-4 mr-2" /> Edit Plan Schedule
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">Advanced Analytics</h3>
            <p className="mt-2 text-sm max-w-md mx-auto">Comprehensive analytics showing drop-off rates, task completion metrics, and subject performance for students enrolled in this plan.</p>
            <div className="mt-6 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg">
                <p className="text-sm font-semibold text-slate-600 mb-1">Avg. Completion</p>
                <p className="text-2xl font-bold text-emerald-600">{mockStudyPlanAnalytics.completionRate}%</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg">
                <p className="text-sm font-semibold text-slate-600 mb-1">Avg. Progress</p>
                <p className="text-2xl font-bold text-blue-600">{mockStudyPlanAnalytics.averageProgress}%</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg">
                <p className="text-sm font-semibold text-slate-600 mb-1">Drop-off Rate</p>
                <p className="text-2xl font-bold text-red-500">{mockStudyPlanAnalytics.dropOffRate}%</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
