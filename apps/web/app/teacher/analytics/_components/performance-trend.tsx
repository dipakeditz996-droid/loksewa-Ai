"use client";

import React, { useEffect, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { teacherAnalyticsApi, TrendData } from '@/lib/api/teacher-analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

export interface PerformanceTrendProps {
  courseFilter: string;
  daysFilter: string;
}

export function PerformanceTrend({ courseFilter, daysFilter }: PerformanceTrendProps) {
  const [data, setData] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await teacherAnalyticsApi.getTrends(courseFilter, daysFilter);
        setData(response || []);
      } catch (error) {
        console.error("Failed to fetch trend data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [courseFilter, daysFilter]);

  if (isLoading) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <Skeleton className="h-full w-full bg-muted rounded-lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
        <AlertCircle className="w-10 h-10 mb-2 opacity-40" />
        <p className="text-[13px]">Not enough historical data to display a trend.</p>
      </div>
    );
  }

  // Format dates for display
  const chartData = data.map(item => {
    const dateObj = new Date(item.date);
    return {
      ...item,
      displayDate: dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };
  });

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="displayDate"
            stroke="var(--color-muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            stroke="var(--color-muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '10px', color: 'var(--color-card-foreground)', boxShadow: '0 4px 12px rgba(16,24,40,0.08)' }}
            itemStyle={{ color: 'var(--color-primary)', fontWeight: 600 }}
            formatter={(value: any) => [`${value}%`, 'Accuracy']}
            labelStyle={{ color: 'var(--color-muted-foreground)', marginBottom: '4px' }}
          />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="var(--color-primary)"
            strokeWidth={3}
            dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: 'var(--color-accent)', strokeWidth: 0 }}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
