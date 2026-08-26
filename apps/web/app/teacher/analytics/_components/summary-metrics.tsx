"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Target, Activity, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';
import { teacherAnalyticsApi, OverviewData } from '@/lib/api/teacher-analytics';
import { Skeleton } from '@/components/ui/skeleton';

export interface SummaryMetricsProps {
  courseFilter: string;
  daysFilter: string;
}

export function SummaryMetrics({ courseFilter, daysFilter }: SummaryMetricsProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await teacherAnalyticsApi.getOverview(courseFilter, daysFilter);
        setData(response);
      } catch (error) {
        console.error("Failed to fetch overview data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [courseFilter, daysFilter]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24 bg-slate-800" />
              <Skeleton className="h-4 w-4 rounded-full bg-slate-800" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 bg-slate-800 mb-1" />
              <Skeleton className="h-3 w-32 bg-slate-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card className="bg-slate-900 border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Users className="w-24 h-24" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-slate-400">Total Students</CardTitle>
          <Users className="h-4 w-4 text-blue-400" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold text-white">{data.total_students.toLocaleString()}</div>
          <p className="text-xs text-slate-500 mt-1">Assigned in scope</p>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Target className="w-24 h-24" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-slate-400">Average Score</CardTitle>
          <Target className="h-4 w-4 text-emerald-400" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold text-white">
            {data.total_attempts > 0 ? `${data.average_score}` : "N/A"}
          </div>
          <p className="text-xs text-slate-500 mt-1">Across mock exams</p>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <CheckCircle2 className="w-24 h-24" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-slate-400">Average Accuracy</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-violet-400" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold text-white">
            {data.total_attempts > 0 ? `${data.average_accuracy}%` : "N/A"}
          </div>
          <p className="text-xs text-slate-500 mt-1">Overall correctness</p>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Activity className="w-24 h-24" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-slate-400">Total Attempts</CardTitle>
          <Activity className="h-4 w-4 text-amber-400" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold text-white">{data.total_attempts.toLocaleString()}</div>
          <p className="text-xs text-slate-500 mt-1">Practice & Exams</p>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <TrendingUp className="w-24 h-24" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-slate-400">Active Students</CardTitle>
          <TrendingUp className="h-4 w-4 text-sky-400" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold text-white">{data.active_students.toLocaleString()}</div>
          <p className="text-xs text-slate-500 mt-1">Active in selected period</p>
        </CardContent>
      </Card>
    </div>
  );
}
