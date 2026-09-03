"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { teacherMockExamsApi, MockExam, MockExamAnalytics } from "@/lib/api/teacher-mock-exams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Users, Target, Clock, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MockExamAnalyticsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [exam, setExam] = useState<MockExam | null>(null);
  const [analytics, setAnalytics] = useState<MockExamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      Promise.all([
        teacherMockExamsApi.getById(Number(id)),
        teacherMockExamsApi.getAnalytics(Number(id)),
      ])
        .then(([examData, analyticsData]) => {
          setExam(examData);
          setAnalytics(analyticsData);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!exam) return <div className="p-8">Exam not found.</div>;

  const summary = analytics?.summary;
  const hasAttempts = (summary?.total_attempts ?? 0) > 0;
  const performanceData = hasAttempts && analytics?.score_distribution?.length
    ? analytics.score_distribution.map(d => ({ name: d.range, students: d.count }))
    : [
        { name: '0-20%', students: 0 },
        { name: '21-40%', students: 0 },
        { name: '41-60%', students: 0 },
        { name: '61-80%', students: 0 },
        { name: '81-100%', students: 0 },
      ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" onClick={() => router.push('/teacher/mock-exams')} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{exam.title}</h1>
          <p className="text-slate-500">Performance Analytics & Insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Attempts</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{summary?.total_attempts ?? 0}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Average Score</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{summary?.average_percentage ?? 0}%</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Avg Time Taken</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {Math.round((analytics?.time_statistics?.average_duration_seconds ?? 0) / 60)}m
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Highest Score</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{summary?.highest_score ?? 0}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl">
                <Trophy className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {!hasAttempts && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-[1px]">
                  <div className="text-center">
                    <p className="text-slate-600 font-medium">No Data Available</p>
                    <p className="text-sm text-slate-500">Waiting for students to attempt this exam.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Question Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] overflow-y-auto">
            {hasAttempts && analytics?.question_performance?.length ? (
              <div className="space-y-3">
                {analytics.question_performance.map((q) => (
                  <div key={q.question_id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="font-medium text-slate-700 truncate">Q{q.question_number}. {q.question_text}</p>
                      <p className="text-xs text-slate-400">{q.correct} correct · {q.incorrect} incorrect · {q.skipped} skipped</p>
                    </div>
                    <span className={`font-bold shrink-0 ${q.accuracy >= 60 ? 'text-green-600' : 'text-red-500'}`}>{q.accuracy}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                    <Users className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-600 font-medium">No attempts yet</p>
                  <p className="text-sm text-slate-500">Student responses will appear here.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
