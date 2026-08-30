"use client";

import React, { useEffect, useState } from 'react';
import { teacherAnalyticsApi, TopicResponse } from '@/lib/api/teacher-analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface TopicPerformanceProps {
  courseFilter: string;
}

export function TopicPerformance({ courseFilter }: TopicPerformanceProps) {
  const [data, setData] = useState<TopicResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await teacherAnalyticsApi.getTopics(courseFilter);
        setData(response);
      } catch (error) {
        console.error("Failed to fetch topic performance", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [courseFilter]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 w-full bg-muted" />
        <Skeleton className="h-64 w-full bg-muted" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none">
        <div className="border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-card-foreground">
            <Flame className="h-4 w-4 text-[#0F7A69] dark:text-[#4ADE9C]" />
            Strong Topics
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Topics where students perform well</p>
        </div>
        <div className="p-5">
          {data.strong_topics.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-muted-foreground">No strong topics identified yet.</p>
          ) : (
            <div className="space-y-4">
              {data.strong_topics.map((topic, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="mr-4 flex-1">
                    <p className="truncate text-[13px] font-semibold text-card-foreground">{topic.topic}</p>
                    <Progress value={topic.accuracy} className="mt-2 h-2 bg-muted" indicatorClassName="bg-[#159A82]" />
                  </div>
                  <span className="w-12 text-right text-[13px] font-bold text-[#0F7A69] dark:text-[#4ADE9C]">{topic.accuracy}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none">
        {/* Subtle warm glow for weak topics */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-destructive/[0.08] blur-3xl" />
        <div className="relative z-10 border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-card-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Needs Improvement
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Topics with lowest accuracy (&lt; 60%)</p>
        </div>
        <div className="relative z-10 p-5">
          {data.needs_improvement.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-muted-foreground">No weak topics identified. Great job!</p>
          ) : (
            <div className="space-y-4">
              {data.needs_improvement.map((topic, i) => (
                <div key={i} className="group flex items-center justify-between">
                  <div className="mr-4 flex-1">
                    <p className="truncate text-[13px] font-semibold text-card-foreground">{topic.topic}</p>
                    <Progress value={topic.accuracy} className="mt-2 h-2 bg-muted" indicatorClassName="bg-destructive" />
                  </div>
                  <span className="w-12 text-right text-[13px] font-bold text-destructive">{topic.accuracy}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
