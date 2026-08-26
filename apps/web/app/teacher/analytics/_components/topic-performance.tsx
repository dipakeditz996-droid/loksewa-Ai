"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { teacherAnalyticsApi, TopicResponse } from '@/lib/api/teacher-analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Flame, AlertTriangle } from 'lucide-react';
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
        <Skeleton className="h-64 w-full bg-slate-800" />
        <Skeleton className="h-64 w-full bg-slate-800" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Flame className="w-5 h-5 mr-2 text-emerald-500" />
            Strong Topics
          </CardTitle>
          <CardDescription>Topics where students perform well</CardDescription>
        </CardHeader>
        <CardContent>
          {data.strong_topics.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No strong topics identified yet.</p>
          ) : (
            <div className="space-y-4">
              {data.strong_topics.map((topic, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <p className="text-sm font-medium text-slate-200 truncate">{topic.topic}</p>
                    <Progress value={topic.accuracy} className="h-2 mt-2 bg-slate-800" indicatorClassName="bg-emerald-500" />
                  </div>
                  <span className="text-sm font-bold text-emerald-400 w-12 text-right">{topic.accuracy}%</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 relative overflow-hidden">
        {/* Subtle red glow for weak topics */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-rose-500" />
            Needs Improvement
          </CardTitle>
          <CardDescription>Topics with lowest accuracy (&lt; 60%)</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          {data.needs_improvement.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No weak topics identified. Great job!</p>
          ) : (
            <div className="space-y-4">
              {data.needs_improvement.map((topic, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex-1 mr-4">
                    <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">{topic.topic}</p>
                    <Progress value={topic.accuracy} className="h-2 mt-2 bg-slate-800" indicatorClassName="bg-rose-500" />
                  </div>
                  <span className="text-sm font-bold text-rose-400 w-12 text-right">{topic.accuracy}%</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
