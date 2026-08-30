"use client";

import React, { useEffect, useState } from 'react';
import { teacherAnalyticsApi, StudentData } from '@/lib/api/teacher-analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export interface StudentRankingProps {
  courseFilter: string;
}

export function StudentRanking({ courseFilter }: StudentRankingProps) {
  const [data, setData] = useState<StudentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await teacherAnalyticsApi.getStudents(courseFilter);
        setData(response || []);
      } catch (error) {
        console.error("Failed to fetch student ranking", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [courseFilter]);

  const renderRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-[#D4A72C]" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-[#9AA4B2]" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-[#B08130]" />;
    return <span className="inline-block w-5 text-center font-semibold text-muted-foreground">{rank}</span>;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none">
      <div className="border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-card-foreground">
          <Trophy className="h-4 w-4 text-[#D4A72C]" />
          Top Performing Students
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">Ranked by average accuracy across attempts</p>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-muted" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-[13px]">No student data available in this scope.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-16 text-center text-muted-foreground">Rank</TableHead>
                  <TableHead className="text-muted-foreground">Student</TableHead>
                  <TableHead className="text-muted-foreground">Courses</TableHead>
                  <TableHead className="text-right text-muted-foreground">Avg Score</TableHead>
                  <TableHead className="text-right text-muted-foreground">Accuracy</TableHead>
                  <TableHead className="text-right text-muted-foreground">Attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((student) => (
                  <TableRow key={student.id} className="group border-border transition-colors hover:bg-muted/50">
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        {renderRankIcon(student.rank)}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      <Link href={`/teacher/students/${student.id}`} className="text-primary hover:opacity-80 transition-opacity">
                        {student.name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground" title={student.courses}>
                      {student.courses}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {student.average_score > 0 ? student.average_score : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${
                        student.accuracy >= 80 ? 'text-[#0F7A69] dark:text-[#4ADE9C]' :
                        student.accuracy >= 60 ? 'text-[#946B00] dark:text-[#F2C94C]' : 'text-destructive'
                      }`}>
                        {student.accuracy}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {student.attempts}
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
