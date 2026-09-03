"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, FileText, CheckCircle, Clock, BookOpen, AlertCircle,
  RefreshCcw, Target, Trophy, Activity, TrendingUp, Bell, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RetryImage } from "@/components/ui/retry-image";
import { teacherDashboardApi, TeacherDashboardData as DashboardData } from "@/lib/api/teacher-dashboard";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/teacher/portal";

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const responseData = await teacherDashboardApi.getDashboardData();
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
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const teacherName = user?.name ? `${user.name}` : (user?.username || "Teacher");
  const firstName = teacherName.split(" ")[0];

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-8 animate-pulse">
        <div className="h-[104px] rounded-2xl border border-border bg-card" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[124px] rounded-2xl border border-border bg-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-2xl border border-border bg-card" />
          <div className="h-64 rounded-2xl border border-border bg-card" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center p-4 text-center md:p-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">{error}</h2>
        <Button onClick={fetchDashboardData} className="mt-4 gap-2 rounded-[9px] bg-primary text-primary-foreground hover:opacity-90">
          <RefreshCcw className="h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const totalEvaluations = data.stats.pending_evaluations + data.stats.completed_evaluations;
  const completedPercent = totalEvaluations > 0 ? (data.stats.completed_evaluations / totalEvaluations) * 100 : 0;
  const pendingPercent = totalEvaluations > 0 ? (data.stats.pending_evaluations / totalEvaluations) * 100 : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-8">

      {/* HERO STRIP — deliberately its own fixed dark-navy gradient regardless
          of theme, so its white/gold text never needs a dark: pairing. */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-lg border border-[#163E6B]" style={{ background: "radial-gradient(120% 160% at 100% 0%, #163E6C 0%, #0B2545 46%, #08192F 100%)" }}>
        {/* Soft gold glow overlay */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A72C] opacity-[0.08] blur-[80px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3" />

        <div className="relative z-10">
          <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-white/50">{currentDate}</div>
          <h1 className="font-heading mt-2 text-[26px] sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
            {getGreeting()}, <span className="text-white">{firstName}</span>
          </h1>
          <p className="mt-2 max-w-xl text-[14px] text-white/70">
            {data.stats.assigned_courses} courses, {data.stats.total_students} students, and {data.stats.pending_evaluations} evaluations waiting for you today.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Button className="rounded-xl bg-white text-[#0B2545] hover:bg-slate-100 font-bold h-10 px-5 transition-transform hover:scale-[1.02] active:scale-[0.98]" asChild>
              <Link href="/teacher/questions">
                <Target className="mr-2 h-4 w-4" /> New Question
              </Link>
            </Button>
            <Button variant="outline" className="rounded-xl border-white/20 text-white hover:bg-white/10 hover:text-white font-semibold h-10 px-5 transition-colors bg-white/5" asChild>
              <Link href="/teacher/practice-sets/new">
                <Trophy className="mr-2 h-4 w-4" /> New Practice Set
              </Link>
            </Button>
          </div>
        </div>

        {/* Weekly Goal / Progress Ring */}
        <div className="relative z-10 flex shrink-0 items-center justify-center p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm sm:w-[140px] sm:h-[140px]">
           <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <circle
                  cx="48" cy="48" r="42" fill="none" stroke="#D4A72C" strokeWidth="6"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * (completedPercent || 0) / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold text-white">{completedPercent.toFixed(0)}%</span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-white/50">Done</span>
              </div>
           </div>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Assigned Courses" value={data.stats.assigned_courses} />
        <StatCard icon={Users} label="Total Students" value={data.stats.total_students} />
        <StatCard
          icon={Clock}
          label="Pending Evaluations"
          value={data.stats.pending_evaluations}
          tone="pending"
          badge={data.stats.pending_evaluations > 0 ? `${data.stats.pending_evaluations} due` : undefined}
        />
        <StatCard icon={FileText} label="Published Content" value={data.stats.published_content} />
      </div>

      {/* NEEDS ATTENTION + WORKLOAD */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none">
          <div className="border-b border-border px-5 py-4 text-[14.5px] font-bold text-card-foreground">
            Needs Attention
          </div>
          <div className="p-5">
            {data.stats.pending_evaluations > 0 ? (
              <div className="flex items-center justify-between gap-4 rounded-[11px] border border-[#946B00]/25 bg-[#946B00]/10 p-4">
                <div>
                  <div className="text-[13.5px] font-bold text-[#946B00] dark:text-[#F2C94C]">Pending Evaluations</div>
                  <div className="mt-0.5 text-[12.5px] text-[#946B00]/80 dark:text-[#F2C94C]/80">
                    {data.stats.pending_evaluations} submissions waiting for your review
                  </div>
                </div>
                <Button className="flex-shrink-0 rounded-lg bg-[#D4A72C] text-[12.5px] font-bold text-[#0A1118] hover:bg-[#c2971f]" asChild>
                  <Link href="/teacher/evaluations">Review Now</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F7A69]/10">
                  <CheckCircle className="h-6 w-6 text-[#0F7A69] dark:text-[#4ADE9C]" />
                </div>
                <h3 className="text-[15px] font-bold text-card-foreground">Everything looks good</h3>
                <p className="text-[13px] text-muted-foreground">No urgent tasks require your attention right now.</p>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="text-[14.5px] font-bold text-card-foreground">Evaluation Workload</div>
            <Link href="/teacher/evaluations" className="text-[12px] font-semibold text-primary hover:underline">
              Open Center
            </Link>
          </div>
          <div className="p-5 pb-[22px]">
            <div className="mb-4 flex justify-around">
              <div className="text-center">
                <div className="text-xl font-extrabold text-card-foreground">{data.stats.pending_evaluations}</div>
                <div className="mt-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-extrabold text-card-foreground">{data.stats.completed_evaluations}</div>
                <div className="mt-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground">Completed</div>
              </div>
            </div>
            <div className="mb-1.5 flex justify-between text-[11.5px] font-semibold">
              <span className="text-[#946B00] dark:text-[#F2C94C]">Needs Review ({pendingPercent.toFixed(0)}%)</span>
              <span className="text-[#0F7A69] dark:text-[#4ADE9C]">Done ({completedPercent.toFixed(0)}%)</span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
              {totalEvaluations === 0 ? (
                <div className="h-full w-full bg-muted" />
              ) : (
                <>
                  <div className="h-full bg-[#D4A72C] transition-all duration-500" style={{ width: `${pendingPercent}%` }} />
                  <div className="h-full bg-[#159A82] transition-all duration-500" style={{ width: `${completedPercent}%` }} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* COURSES + PRACTICE SETS */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-[14.5px] font-bold text-card-foreground">Course Performance</h2>
            <Link href="/teacher/courses" className="flex items-center text-[12px] font-semibold text-primary hover:underline">
              View All <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Link>
          </div>
          {data.courses.length > 0 ? (
            <div className="divide-y divide-border">
              {data.courses.slice(0, 4).map((course) => (
                <div key={course.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:gap-6">
                  <div className="flex w-full items-center gap-3.5 md:w-1/3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-primary/10 text-primary">
                      {course.thumbnail ? (
                        <RetryImage src={course.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <BookOpen className="h-[18px] w-[18px]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-[13.5px] font-bold text-card-foreground">{course.title}</h4>
                      <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.03em] text-primary">
                        {course.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between gap-6 md:w-2/3">
                    <div className="w-[70px] flex-shrink-0 text-center">
                      <div className="text-base font-extrabold text-card-foreground">{course.student_count}</div>
                      <div className="text-[9.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground">Students</div>
                    </div>
                    <div className="flex-1">
                      <div className="mb-1.5 flex justify-between text-[11.5px] font-semibold text-muted-foreground">
                        <span>Completion</span>
                        <span className={course.completion_percentage > 0 ? "" : "italic"}>
                          {course.completion_percentage > 0 ? `${course.completion_percentage}%` : "Gathering data"}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-[#D4A72C]" style={{ width: `${course.completion_percentage}%` }} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="mb-1.5 flex justify-between text-[11.5px] font-semibold text-muted-foreground">
                        <span>Avg Score</span>
                        <span className={course.average_score > 0 ? "" : "italic"}>
                          {course.average_score > 0 ? `${course.average_score}%` : "Gathering data"}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-[#159A82]" style={{ width: `${course.average_score}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-[15px] font-bold text-card-foreground">No courses assigned yet</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">Courses assigned by the administrator will appear here.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-[14.5px] font-bold text-card-foreground">Recent Practice Sets</h2>
          </div>
          <div className="flex-1 divide-y divide-border">
            {data.recent_practice_sets?.length > 0 ? (
              data.recent_practice_sets.map((pset) => (
                <div key={pset.id} className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h4 className="line-clamp-1 text-[13px] font-bold text-card-foreground">{pset.name}</h4>
                    <span
                      className={`flex-shrink-0 rounded-full px-[7px] py-[2px] text-[9.5px] font-bold uppercase ${
                        pset.status === "published"
                          ? "bg-[#0F7A69]/10 text-[#0F7A69] dark:text-[#4ADE9C]"
                          : pset.status === "pending" || pset.status === "pending_review"
                          ? "bg-[#946B00]/10 text-[#946B00] dark:text-[#F2C94C]"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {pset.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-medium text-muted-foreground">{pset.questions_count} Questions</span>
                    <Link href={`/teacher/practice-sets/${pset.id}/edit`} className="text-[11.5px] font-semibold text-primary hover:underline">
                      Manage
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Trophy className="mx-auto mb-3 h-7 w-7 text-muted-foreground/40" />
                <p className="text-[13px] text-muted-foreground">No practice sets created.</p>
              </div>
            )}
          </div>
          <div className="border-t border-border p-3.5">
            <Button variant="outline" className="w-full rounded-lg border-border text-[12.5px] text-foreground" asChild>
              <Link href="/teacher/practice-sets">View All Practice Sets</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ANALYTICS + ACTIVITY */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none xl:col-span-2">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-[22px] w-[22px]" />
          </div>
          <h3 className="text-[15px] font-bold text-card-foreground">Not enough student activity yet</h3>
          <p className="mt-1.5 max-w-md text-[12.5px] text-muted-foreground">
            Score trends, accuracy, and completion rates will appear here as your students engage with the materials.
          </p>
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-card-foreground">
              <Bell className="h-4 w-4 text-muted-foreground" /> Activity Feed
            </h2>
          </div>
          <div className="max-h-[400px] flex-1 overflow-y-auto p-5">
            {data.recent_activity.length > 0 ? (
              <div className="flex flex-col gap-[18px]">
                {data.recent_activity.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="mt-0.5 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Activity className="h-3 w-3" />
                    </div>
                    <div>
                      <div className="text-[12.5px] font-semibold text-card-foreground">{activity.description}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{new Date(activity.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                <p className="text-[13px] font-medium text-muted-foreground">No recent activity.</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
