"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, FileText, CheckCircle, Clock, BookOpen, AlertCircle, 
  RefreshCcw, Target, Trophy, ArrowRight, Activity, TrendingUp, Bell, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PremiumIcon } from "@/components/ui/premium-icon";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface DashboardData {
  stats: {
    total_students: number;
    assigned_courses: number;
    pending_evaluations: number;
    completed_evaluations: number;
    published_content: number;
  };
  courses: {
    id: number;
    title: string;
    thumbnail: string | null;
    status: string;
    student_count: number;
  }[];
  pending_evaluations: {
    id: number;
    student_name: string;
    question_id: string;
    context: string;
    submitted_at: string;
    status: string;
  }[];
  recent_practice_sets: {
    id: number;
    name: string;
    status: string;
    questions_count: number;
    created_at: string;
  }[];
  recent_activity: {
    id: string;
    type: string;
    description: string;
    date: string;
  }[];
}

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const responseData = await apiClient<DashboardData>('/teacher/dashboard/');
      setData(responseData);
    } catch (err: any) {
      console.error("Failed to load teacher dashboard:", err);
      setError("Unable to load your dashboard. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const teacherName = user?.name ? `${user.name}` : (user?.username || "Teacher");
  const firstLetter = teacherName.charAt(0).toUpperCase();

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="flex flex-col gap-4 bg-muted/20 p-8 rounded-3xl border border-border/50">
          <div className="h-8 bg-muted rounded w-64 mb-2"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border border-border/50 bg-card rounded-2xl h-32"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-border/50 bg-card rounded-2xl h-80"></div>
          <div className="border border-border/50 bg-card rounded-2xl h-80"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{error}</h2>
        <Button onClick={fetchDashboardData} className="mt-4 flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Try Again
        </Button>
      </div>
    );
  }

  if (!data) return null;

  // Workload calculations
  const totalEvaluations = data.stats.pending_evaluations + data.stats.completed_evaluations;
  const completedPercent = totalEvaluations > 0 ? (data.stats.completed_evaluations / totalEvaluations) * 100 : 0;
  const pendingPercent = totalEvaluations > 0 ? (data.stats.pending_evaluations / totalEvaluations) * 100 : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-12">
      
      {/* 1. HERO COMMAND CENTER */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-blue-50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
        <div className="relative p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-white/60 dark:bg-background/40 border border-border/50 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                <Clock className="w-3.5 h-3.5" />
                Teaching Overview — {currentDate}
              </div>
              <h1 className="text-3xl md:text-4xl font-[800] tracking-tight text-foreground">
                {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">{teacherName}</span>
              </h1>
              <p className="text-muted-foreground mt-2 font-medium max-w-xl">
                Here's what's happening across your teaching workspace today. Manage your courses, track performance, and review pending evaluations.
              </p>
            </div>
          </div>
          
          <div className="shrink-0 flex items-center gap-3">
             <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md rounded-full px-6" asChild>
                <Link href="/teacher/questions">
                   <Target className="mr-2 h-4 w-4" /> Create Question
                </Link>
             </Button>
             <Button variant="outline" className="rounded-full shadow-sm bg-white/50 dark:bg-background/50 backdrop-blur-sm px-6" asChild>
                <Link href="/teacher/practice-sets/new">
                   <Trophy className="mr-2 h-4 w-4" /> Create Practice Set
                </Link>
             </Button>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="relative overflow-hidden border border-border/50 bg-card/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800/50">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex h-6 items-center rounded-full bg-blue-50 dark:bg-blue-900/20 px-2 text-xs font-medium text-blue-600 dark:text-blue-400">
               Active
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground">Assigned Courses</h3>
            <div className="text-3xl font-bold tracking-tight text-foreground">{data.stats.assigned_courses}</div>
          </div>
        </div>

        <div className="relative overflow-hidden border border-border/50 bg-card/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground">Total Students</h3>
            <div className="text-3xl font-bold tracking-tight text-foreground">{data.stats.total_students}</div>
          </div>
        </div>

        <div className="relative overflow-hidden border border-border/50 bg-card/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/50">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            {data.stats.pending_evaluations > 0 && (
               <div className="flex h-6 items-center rounded-full bg-amber-500 text-white px-2 text-xs font-bold animate-pulse">
                  {data.stats.pending_evaluations} Due
               </div>
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground">Pending Evaluations</h3>
            <div className="text-3xl font-bold tracking-tight text-foreground">{data.stats.pending_evaluations}</div>
          </div>
        </div>

        <div className="relative overflow-hidden border border-border/50 bg-card/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-purple-500/30 transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800/50">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground">Published Content</h3>
            <div className="text-3xl font-bold tracking-tight text-foreground">{data.stats.published_content}</div>
          </div>
        </div>

      </div>

      {/* 3. NEEDS ATTENTION & WORKLOAD (GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Needs Attention */}
         <div className="border border-border/50 bg-card rounded-2xl flex flex-col overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border/50 flex items-center gap-2">
               <AlertCircle className="w-5 h-5 text-amber-500" />
               <h2 className="text-lg font-bold">Needs Attention</h2>
            </div>
            <div className="flex-1 p-6 flex flex-col justify-center">
               {data.stats.pending_evaluations > 0 ? (
                  <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl">
                     <div>
                        <h4 className="font-semibold text-amber-900 dark:text-amber-400">Pending Evaluations</h4>
                        <p className="text-sm text-amber-700/80 dark:text-amber-500/80">{data.stats.pending_evaluations} submissions waiting for your review.</p>
                     </div>
                     <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" asChild>
                        <Link href="/teacher/evaluations">Review Now</Link>
                     </Button>
                  </div>
               ) : (
                  <div className="text-center space-y-2 py-4">
                     <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-2">
                        <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                     </div>
                     <h3 className="text-lg font-bold">Everything looks good 🎉</h3>
                     <p className="text-sm text-muted-foreground">No urgent tasks require your attention right now.</p>
                  </div>
               )}
            </div>
         </div>

         {/* Evaluation Workload */}
         <div className="border border-border/50 bg-card rounded-2xl flex flex-col overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-bold">Evaluation Workload</h2>
               </div>
               <Link href="/teacher/evaluations" className="text-xs font-semibold text-blue-600 hover:underline">
                  Open Center
               </Link>
            </div>
            <div className="flex-1 p-6 flex flex-col justify-center">
               <div className="flex justify-between mb-2 px-1">
                  <div className="text-center">
                     <div className="text-2xl font-bold text-foreground">{data.stats.pending_evaluations}</div>
                     <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Pending</div>
                  </div>
                  <div className="text-center">
                     <div className="text-2xl font-bold text-foreground">{data.stats.completed_evaluations}</div>
                     <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Completed</div>
                  </div>
               </div>
               
               <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                     <span className="text-amber-600 dark:text-amber-400">Needs Review ({pendingPercent.toFixed(0)}%)</span>
                     <span className="text-emerald-600 dark:text-emerald-400">Done ({completedPercent.toFixed(0)}%)</span>
                  </div>
                  <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
                     {totalEvaluations === 0 ? (
                        <div className="w-full bg-muted/50 h-full" />
                     ) : (
                        <>
                           <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${pendingPercent}%` }} />
                           <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${completedPercent}%` }} />
                        </>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* 4. MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
         
         {/* Course Performance */}
         <div className="xl:col-span-2 border border-border/50 bg-card rounded-2xl flex flex-col overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-border/50 flex justify-between items-center bg-muted/5">
               <h2 className="text-lg font-bold">Course Performance</h2>
               <Link href="/teacher/courses" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
               </Link>
            </div>
            <div className="p-0">
               {data.courses.length > 0 ? (
                  <div className="divide-y divide-border/50">
                     {data.courses.slice(0, 4).map((course) => (
                        <div key={course.id} className="p-6 hover:bg-muted/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                           <div className="flex items-center gap-4 w-full md:w-1/3">
                              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border/50 overflow-hidden">
                                 {course.thumbnail ? (
                                    <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                                 ) : (
                                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                                 )}
                              </div>
                              <div className="min-w-0">
                                 <h4 className="font-bold text-sm truncate">{course.title}</h4>
                                 <Badge variant="secondary" className="mt-1 text-[10px] uppercase font-semibold">
                                    {course.status}
                                 </Badge>
                              </div>
                           </div>

                           <div className="flex items-center justify-between w-full md:w-2/3 gap-8">
                              <div className="text-center min-w-[80px]">
                                 <div className="text-xl font-bold">{course.student_count}</div>
                                 <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Students</div>
                              </div>
                              <div className="flex-1 max-w-[200px]">
                                 <div className="flex justify-between text-xs mb-1.5 font-medium">
                                    <span>Completion</span>
                                    <span className="text-muted-foreground italic">Gathering data</span>
                                 </div>
                                 <Progress value={0} className="h-2 bg-muted/50" />
                              </div>
                              <div className="flex-1 max-w-[200px]">
                                 <div className="flex justify-between text-xs mb-1.5 font-medium">
                                    <span>Avg Score</span>
                                    <span className="text-muted-foreground italic">Gathering data</span>
                                 </div>
                                 <Progress value={0} className="h-2 bg-muted/50" />
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="text-center p-12">
                     <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                        <BookOpen className="w-5 h-5 text-muted-foreground" />
                     </div>
                     <h3 className="text-lg font-bold">No courses assigned yet</h3>
                     <p className="text-sm text-muted-foreground mt-1">Courses assigned by the administrator will appear here.</p>
                  </div>
               )}
            </div>
         </div>

         {/* Right Sidebar: Recent Practice Sets */}
         <div className="border border-border/50 bg-card rounded-2xl flex flex-col overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-border/50 bg-muted/5">
               <h2 className="text-lg font-bold">Recent Practice Sets</h2>
            </div>
            <div className="flex-1 divide-y divide-border/50">
               {data.recent_practice_sets?.length > 0 ? (
                  data.recent_practice_sets.map((pset) => (
                     <div key={pset.id} className="p-5 hover:bg-muted/5 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="font-semibold text-sm line-clamp-1">{pset.name}</h4>
                           <Badge variant="outline" className="text-[10px] shrink-0 border-border/50">{pset.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                           <span className="text-xs font-medium text-muted-foreground">
                              {pset.questions_count} Questions
                           </span>
                           <Button variant="ghost" size="sm" className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                              <Link href={`/teacher/practice-sets/${pset.id}/edit`}>Manage</Link>
                           </Button>
                        </div>
                     </div>
                  ))
               ) : (
                  <div className="text-center p-10">
                     <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                     <p className="text-sm text-muted-foreground">No practice sets created.</p>
                  </div>
               )}
            </div>
            <div className="p-4 border-t border-border/50 bg-muted/5">
               <Button variant="outline" className="w-full text-xs" asChild>
                  <Link href="/teacher/practice-sets">View All Practice Sets</Link>
               </Button>
            </div>
         </div>

      </div>

      {/* 5. ANALYTICS & ACTIVITY */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
         
         {/* Student Analytics Placeholder */}
         <div className="xl:col-span-2 border border-border/50 bg-card rounded-2xl flex flex-col overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-border/50 bg-muted/5 flex items-center gap-2">
               <TrendingUp className="w-5 h-5 text-indigo-500" />
               <h2 className="text-lg font-bold">Student Analytics</h2>
            </div>
            <div className="flex-1 p-12 flex flex-col items-center justify-center text-center">
               <Activity className="w-12 h-12 text-muted-foreground/20 mb-4" />
               <h3 className="text-lg font-bold">Not enough student activity yet</h3>
               <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Detailed analytics covering average score trends, overall accuracy, and completion rates will appear here as your students start engaging with the materials.
               </p>
            </div>
         </div>

         {/* Activity Feed */}
         <div className="border border-border/50 bg-card rounded-2xl flex flex-col overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-border/50 bg-muted/5 flex items-center gap-2">
               <Bell className="w-5 h-5 text-slate-500" />
               <h2 className="text-lg font-bold">Activity Feed</h2>
            </div>
            <div className="flex-1 p-6 overflow-y-auto max-h-[400px]">
               {data.recent_activity.length > 0 ? (
                  <div className="relative before:absolute before:inset-0 before:ml-[13px] before:h-full before:w-px before:bg-border/50">
                     <div className="space-y-6">
                        {data.recent_activity.map((activity) => (
                           <div key={activity.id} className="relative flex items-start gap-4">
                              <div className="absolute left-0 mt-1 flex items-center justify-center w-7 h-7 rounded-full border border-background bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0 z-10">
                                 <Activity className="w-3 h-3" />
                              </div>
                              <div className="pl-11">
                                 <div className="font-medium text-sm text-foreground leading-snug">{activity.description}</div>
                                 <div className="text-[10px] font-medium text-muted-foreground mt-1">
                                    {new Date(activity.date).toLocaleDateString()}
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8">
                     <p className="text-sm font-medium text-muted-foreground">No recent activity.</p>
                  </div>
               )}
            </div>
         </div>

      </div>

    </div>
  );
}
