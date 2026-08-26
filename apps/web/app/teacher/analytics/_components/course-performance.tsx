"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    <Card className="bg-slate-900 border-slate-800 flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-indigo-400" />
          Course Performance
        </CardTitle>
        <CardDescription>Metrics aggregated by assigned courses</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-slate-800" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
            <p>No course data available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Course</TableHead>
                  <TableHead className="text-slate-400 text-right">Students</TableHead>
                  <TableHead className="text-slate-400 text-right">Avg Score</TableHead>
                  <TableHead className="text-slate-400 text-right">Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((course) => (
                  <TableRow key={course.id} className="border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <TableCell className="font-medium text-slate-200">
                      <div>{course.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{course.attempts} attempts</div>
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      <div>{course.students}</div>
                      <div className="text-xs text-emerald-500 mt-1">{course.active_students} active</div>
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {course.average_score > 0 ? course.average_score : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span className="text-slate-300">{course.accuracy}%</span>
                        <Progress value={course.accuracy} className="w-12 h-2 bg-slate-800" indicatorClassName={
                          course.accuracy >= 70 ? 'bg-emerald-500' :
                          course.accuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        } />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
