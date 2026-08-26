"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { teacherAnalyticsApi, SubjectData } from '@/lib/api/teacher-analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Layers, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export interface SubjectPerformanceProps {
  courseFilter: string;
}

export function SubjectPerformance({ courseFilter }: SubjectPerformanceProps) {
  const [data, setData] = useState<SubjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await teacherAnalyticsApi.getSubjectPerformance(courseFilter);
        setData(response || []);
      } catch (error) {
        console.error("Failed to fetch subject performance", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [courseFilter]);

  return (
    <Card className="bg-slate-900 border-slate-800 flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Layers className="w-5 h-5 mr-2 text-violet-400" />
          Subject Performance
        </CardTitle>
        <CardDescription>Accuracy and attempts by subject</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-slate-800" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
            <p>No subject data available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Subject</TableHead>
                  <TableHead className="text-slate-400 text-right">Students</TableHead>
                  <TableHead className="text-slate-400 text-right">Questions</TableHead>
                  <TableHead className="text-slate-400 text-right">Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((subject) => (
                  <TableRow key={subject.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-medium text-slate-200">
                      {subject.subject}
                    </TableCell>
                    <TableCell className="text-right text-slate-400">
                      {subject.students}
                    </TableCell>
                    <TableCell className="text-right text-slate-400">
                      {subject.questions_attempted.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <span className={`font-semibold ${
                          subject.accuracy >= 70 ? 'text-emerald-400' :
                          subject.accuracy >= 50 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {subject.accuracy}%
                        </span>
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
