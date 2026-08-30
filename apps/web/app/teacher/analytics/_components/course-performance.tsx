"use client";

import React, { useEffect, useState } from 'react';
import { teacherAnalyticsApi, CourseData } from '@/lib/api/teacher-analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function CoursePerformance() {
  const [data, setData] = useState<CourseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await teacherAnalyticsApi.getCoursePerformance();
        setData(response || []);
      } catch (error) {
        console.error("Failed to fetch course performance", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none">
      <div className="border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-card-foreground">
          <BookOpen className="h-4 w-4 text-primary" />
          Course Performance
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">Metrics aggregated by assigned courses</p>
      </div>
      <div className="flex-1 p-5">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-muted" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-[13px]">No course data available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Course</TableHead>
                  <TableHead className="text-right text-muted-foreground">Students</TableHead>
                  <TableHead className="text-right text-muted-foreground">Avg Score</TableHead>
                  <TableHead className="text-right text-muted-foreground">Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((course) => (
                  <TableRow key={course.id} className="cursor-pointer border-border transition-colors hover:bg-muted/50">
                    <TableCell className="font-semibold text-card-foreground">
                      <div>{course.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{course.attempts} attempts</div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <div className="text-card-foreground">{course.students}</div>
                      <div className="mt-1 text-xs text-[#0F7A69] dark:text-[#4ADE9C]">{course.active_students} active</div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {course.average_score > 0 ? course.average_score : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span className="text-muted-foreground">{course.accuracy}%</span>
                        <Progress value={course.accuracy} className="h-2 w-12 bg-muted" indicatorClassName={
                          course.accuracy >= 70 ? 'bg-[#159A82]' :
                          course.accuracy >= 50 ? 'bg-[#D4A72C]' : 'bg-[#D2665A]'
                        } />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
