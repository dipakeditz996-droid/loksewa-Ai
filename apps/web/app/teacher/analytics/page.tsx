"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { teacherCourseService } from '@/lib/api/teacher-courses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/teacher/portal';
import { SummaryMetrics } from './_components/summary-metrics';
import { PerformanceTrend } from './_components/performance-trend';
import { CoursePerformance } from './_components/course-performance';
import { SubjectPerformance } from './_components/subject-performance';
import { TopicPerformance } from './_components/topic-performance';
import { StudentRanking } from './_components/student-ranking';
import { NeedsAttention } from './_components/needs-attention';

const FILTER_TRIGGER_CLASS = "border-border text-[13px] font-medium text-foreground focus:ring-primary/20";

export default function TeacherAnalyticsPage() {
  const searchParams = useSearchParams();
  const [courseFilter, setCourseFilter] = useState<string>(searchParams.get('course') || 'all');
  const [daysFilter, setDaysFilter] = useState<string>('30');
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    // Fetch assigned courses for filter
    const fetchCourses = async () => {
      try {
        const data = await teacherCourseService.getMyCourses();
        setCourses(data || []);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      <PageHeader
        title="Analytics & Results"
        description="Understand student performance, identify weak areas, and track learning progress."
        action={
          <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className={`w-full sm:w-[200px] ${FILTER_TRIGGER_CLASS}`}>
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assigned Courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={daysFilter} onValueChange={setDaysFilter}>
              <SelectTrigger className={`w-full sm:w-[150px] ${FILTER_TRIGGER_CLASS}`}>
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 3 Months</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <SummaryMetrics courseFilter={courseFilter} daysFilter={daysFilter} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="rounded-xl border border-border bg-card p-1">
          <TabsTrigger value="overview" className="rounded-lg text-[13px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="performance" className="rounded-lg text-[13px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Course &amp; Subject Performance</TabsTrigger>
          <TabsTrigger value="students" className="rounded-lg text-[13px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Student Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none lg:col-span-4">
              <div className="border-b border-border px-5 py-4">
                <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-card-foreground">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Performance Trend
                </h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">Average accuracy across practice and exams</p>
              </div>
              <div className="p-5 pl-2">
                <PerformanceTrend courseFilter={courseFilter} daysFilter={daysFilter} />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none lg:col-span-3">
              <div className="border-b border-border px-5 py-4">
                <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Needs Attention
                </h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">Students requiring intervention</p>
              </div>
              <div className="p-5">
                <NeedsAttention courseFilter={courseFilter} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <TopicPerformance courseFilter={courseFilter} />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CoursePerformance />
            <SubjectPerformance courseFilter={courseFilter} />
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <StudentRanking courseFilter={courseFilter} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
