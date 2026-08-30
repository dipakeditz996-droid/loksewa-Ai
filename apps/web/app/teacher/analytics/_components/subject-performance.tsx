"use client";

import React, { useEffect, useState } from 'react';
import { teacherAnalyticsApi, SubjectData } from '@/lib/api/teacher-analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Layers, AlertCircle } from 'lucide-react';

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
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none">
      <div className="border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-card-foreground">
          <Layers className="h-4 w-4 text-primary" />
          Subject Performance
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">Accuracy and attempts by subject</p>
      </div>
      <div className="flex-1 p-5">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-muted" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-[13px]">No subject data available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Subject</TableHead>
                  <TableHead className="text-right text-muted-foreground">Students</TableHead>
                  <TableHead className="text-right text-muted-foreground">Questions</TableHead>
                  <TableHead className="text-right text-muted-foreground">Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((subject) => (
                  <TableRow key={subject.id} className="border-border transition-colors hover:bg-muted/50">
                    <TableCell className="font-semibold text-card-foreground">
                      {subject.subject}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {subject.students}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {subject.questions_attempted.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${
                        subject.accuracy >= 70 ? 'text-[#0F7A69] dark:text-[#4ADE9C]' :
                        subject.accuracy >= 50 ? 'text-[#946B00] dark:text-[#F2C94C]' : 'text-destructive'
                      }`}>
                        {subject.accuracy}%
                      </span>
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
