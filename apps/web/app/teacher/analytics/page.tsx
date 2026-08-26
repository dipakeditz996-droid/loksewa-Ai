"use client";

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { teacherCourseService } from '@/lib/api/teacher-courses';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle } from 'lucide-react';
import { SummaryMetrics } from './_components/summary-metrics';
import { PerformanceTrend } from './_components/performance-trend';
import { CoursePerformance } from './_components/course-performance';
import { SubjectPerformance } from './_components/subject-performance';
import { TopicPerformance } from './_components/topic-performance';
import { StudentRanking } from './_components/student-ranking';
import { NeedsAttention } from './_components/needs-attention';

export default function TeacherAnalyticsPage() {
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<string>('30');
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Fetch assigned courses for filter
    const fetchCourses = async () => {
      try {
        const data = await teacherCourseService.getMyCourses();
        setCourses(data || []);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0B2545]">Analytics & Results</h2>
          <p className="text-slate-500 mt-1">
            Understand student performance, identify weak areas, and track learning progress.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assigned Courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={daysFilter} onValueChange={setDaysFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
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
      </div>

      <SummaryMetrics courseFilter={courseFilter} daysFilter={daysFilter} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Course & Subject Performance</TabsTrigger>
          <TabsTrigger value="students">Student Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
            <Card className="col-span-1 lg:col-span-4 bg-white border border-slate-200/80 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-[#0B2545]">Performance Trend</CardTitle>
                <CardDescription>Average accuracy across practice and exams</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <PerformanceTrend courseFilter={courseFilter} daysFilter={daysFilter} />
              </CardContent>
            </Card>
            
            <Card className="col-span-1 lg:col-span-3 bg-white border border-slate-200/80 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-rose-600">Needs Attention</CardTitle>
                <CardDescription>Students requiring intervention</CardDescription>
              </CardHeader>
              <CardContent>
                <NeedsAttention courseFilter={courseFilter} />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 grid-cols-1">
            <TopicPerformance courseFilter={courseFilter} />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
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
