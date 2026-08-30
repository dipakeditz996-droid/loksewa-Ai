"use client";

import React, { useEffect, useState } from 'react';
import { Users, Target, CheckCircle2, Activity, TrendingUp } from 'lucide-react';
import { teacherAnalyticsApi, OverviewData } from '@/lib/api/teacher-analytics';
import { StatCard } from '@/components/teacher/portal';

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
          <div key={i} className="h-[124px] rounded-2xl border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatCard icon={Users} label="Total Students" value={data.total_students.toLocaleString()} />
      <StatCard
        icon={Target}
        label="Average Score"
        value={data.total_attempts > 0 ? data.average_score : "N/A"}
      />
      <StatCard
        icon={CheckCircle2}
        label="Average Accuracy"
        value={data.total_attempts > 0 ? `${data.average_accuracy}%` : "N/A"}
        tone={data.total_attempts > 0 && data.average_accuracy >= 70 ? "success" : "neutral"}
      />
      <StatCard icon={Activity} label="Total Attempts" value={data.total_attempts.toLocaleString()} />
      <StatCard icon={TrendingUp} label="Active Students" value={data.active_students.toLocaleString()} tone="success" />
    </div>
  );
}
