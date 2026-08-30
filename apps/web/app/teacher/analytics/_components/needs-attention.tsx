"use client";

import React, { useEffect, useState } from 'react';
import { teacherAnalyticsApi, NeedsAttentionData } from '@/lib/api/teacher-analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export interface NeedsAttentionProps {
  courseFilter: string;
}

export function NeedsAttention({ courseFilter }: NeedsAttentionProps) {
  const [data, setData] = useState<NeedsAttentionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await teacherAnalyticsApi.getNeedsAttention(courseFilter);
        setData(response || []);
      } catch (error) {
        console.error("Failed to fetch needs attention data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [courseFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4 mt-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full bg-slate-100" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-500 mt-2">
        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6 text-slate-300" />
        </div>
        <p>No students currently flagged for attention.</p>
      </div>
    );
  }

  const getIconForIssue = (issue: string) => {
    if (issue.includes('Inactive')) return <Clock className="w-4 h-4 text-amber-500 mr-2 flex-shrink-0" />;
    if (issue.includes('Declining')) return <TrendingDown className="w-4 h-4 text-rose-500 mr-2 flex-shrink-0" />;
    return <AlertTriangle className="w-4 h-4 text-rose-500 mr-2 flex-shrink-0" />;
  };

  return (
    <div className="space-y-3 mt-2 overflow-y-auto pr-2 max-h-[300px] scrollbar-thin scrollbar-thumb-slate-200">
      {data.map((student, i) => (
        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-200 bg-card hover:bg-slate-50 transition-colors shadow-sm">
          <div className="mb-2 sm:mb-0">
            <Link href={`/teacher/students/${student.id}`} className="font-semibold text-primary hover:text-[#D4A72C] transition-colors">
              {student.name}
            </Link>
            <div className="flex items-center text-sm text-slate-500 mt-1">
              {getIconForIssue(student.issue)}
              <span className="truncate max-w-[200px]" title={student.issue}>{student.issue}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:items-end text-sm">
            <div className="flex space-x-3 mb-1">
              <div className="text-slate-500">
                Performance: <span className="text-rose-600 font-medium">{student.current_performance}</span>
              </div>
              <div className="text-slate-500">
                Active: <span className="text-slate-700 font-medium">{student.last_active}</span>
              </div>
            </div>
            <Badge variant="outline" className="border-[#0B2545]/20 text-primary bg-[#0B2545]/5 w-fit rounded-full px-3 font-medium">
              {student.recommended_action}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
