"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-slate-500 font-medium w-5 text-center inline-block">{rank}</span>;
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
          Top Performing Students
        </CardTitle>
        <CardDescription>Ranked by average accuracy across attempts</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-slate-800" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
            <p>No student data available in this scope.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="w-16 text-center text-slate-400">Rank</TableHead>
                  <TableHead className="text-slate-400">Student</TableHead>
                  <TableHead className="text-slate-400">Courses</TableHead>
                  <TableHead className="text-slate-400 text-right">Avg Score</TableHead>
                  <TableHead className="text-slate-400 text-right">Accuracy</TableHead>
                  <TableHead className="text-slate-400 text-right">Attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((student) => (
                  <TableRow key={student.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors group">
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        {renderRankIcon(student.rank)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/teacher/students/${student.id}`} className="text-indigo-400 hover:text-indigo-300">
                        {student.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-400 max-w-[200px] truncate" title={student.courses}>
                      {student.courses}
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {student.average_score > 0 ? student.average_score : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${
                        student.accuracy >= 80 ? 'text-emerald-400' :
                        student.accuracy >= 60 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {student.accuracy}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-slate-400">
                      {student.attempts}
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
