"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Edit, ShieldAlert, ShieldCheck, Key, 
  MapPin, Phone, Mail, BookOpen, GraduationCap,
  Calendar, CheckCircle2, Clock, History, FileText,
  Activity, Store, MessageSquare, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { mockStudents, AdminStudent } from "@/lib/mock/admin-students";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<AdminStudent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    const fetchStudent = () => {
      setLoading(true);
      setTimeout(() => {
        const found = mockStudents.find(s => s.id === params.id);
        if (found) {
          setStudent(found);
        }
        setLoading(false);
      }, 600);
    };
    fetchStudent();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto bg-slate-50 min-h-screen">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold text-slate-700">Student not found</h2>
        <p className="text-slate-500 mt-2">The student you're looking for doesn't exist.</p>
        <Button className="mt-4" onClick={() => router.push('/admin-dashboard/students')}>
          Back to Students
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100/80">Active</Badge>;
      case 'Inactive': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100/80">Inactive</Badge>;
      case 'Suspended': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100/80">Suspended</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'exam': return <FileText className="w-4 h-4 text-blue-600" />;
      case 'practice': return <Activity className="w-4 h-4 text-green-600" />;
      case 'purchase': return <Store className="w-4 h-4 text-purple-600" />;
      case 'tutor': return <MessageSquare className="w-4 h-4 text-[#D4A72C]" />;
      case 'profile': return <Edit className="w-4 h-4 text-slate-600" />;
      case 'support': return <History className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto bg-slate-50 min-h-screen">
      {/* 26. NAVIGATION */}
      <Link href="/admin-dashboard/students" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-[#0B2545] transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Students
      </Link>

      {/* 7. STUDENT DETAILS HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-[#0B2545]">{student.name}</h1>
              {getStatusBadge(student.status)}
            </div>
            <p className="text-slate-500 font-medium">@{student.username}</p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {student.email}</span>
              <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {student.phone}</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {student.location}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Edit className="w-4 h-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Key className="w-4 h-4" /> Reset Password
          </Button>
          {student.status !== 'Suspended' ? (
            <Button variant="destructive" size="sm" className="gap-2">
              <ShieldAlert className="w-4 h-4" /> Suspend
            </Button>
          ) : (
            <Button className="bg-green-600 hover:bg-green-700 gap-2 text-white" size="sm">
              <ShieldCheck className="w-4 h-4" /> Activate
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 8. STUDENT PROFILE OVERVIEW */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-slate-500" /> Academic Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-sm text-slate-500">Target Position</p>
                <p className="font-medium text-slate-800">{student.targetPosition}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Target Exam</p>
                <p className="font-medium text-slate-800">{student.targetExam}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Education</p>
                <p className="font-medium text-slate-800">{student.education}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Preferred Subjects</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {student.preferredSubjects.length > 0 ? (
                    student.preferredSubjects.map(sub => (
                      <Badge key={sub} variant="secondary" className="bg-slate-100">{sub}</Badge>
                    ))
                  ) : (
                    <span className="text-slate-400 text-sm">Not specified</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-slate-500" /> Account Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm text-slate-500">Profile Completion</p>
                  <span className="text-sm font-medium text-[#0B2545]">{student.profileCompletion}%</span>
                </div>
                <Progress value={student.profileCompletion} className="h-2" />
              </div>
              <div className="pt-2">
                <p className="text-sm text-slate-500 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Joined Date</p>
                <p className="font-medium text-slate-800 ml-5.5 mt-0.5">{new Date(student.joinedAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Last Active</p>
                <p className="font-medium text-slate-800 ml-5.5 mt-0.5">{new Date(student.lastActiveAt).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 9. STUDENT PERFORMANCE */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-[#D4A72C]" /> Overall Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">Total Exams</p>
                  <p className="text-2xl font-bold text-[#0B2545]">{student.stats.totalExams}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">Average Score</p>
                  <p className="text-2xl font-bold text-[#0B2545]">{student.stats.averageScore}%</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">Best Score</p>
                  <p className="text-2xl font-bold text-[#0B2545]">{student.stats.bestScore}%</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">Questions Attempted</p>
                  <p className="text-2xl font-bold text-[#0B2545]">{student.stats.questionsAttempted.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">Accuracy</p>
                  <p className="text-2xl font-bold text-[#0B2545]">{student.stats.accuracy}%</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">Study Streak</p>
                  <p className="text-2xl font-bold text-orange-500">{student.stats.studyStreak} Days</p>
                </div>
              </div>

              {student.performanceChart.length > 0 ? (
                <div className="h-64 w-full">
                  <h4 className="text-sm font-semibold text-slate-700 mb-4">Recent Exam Scores</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={student.performanceChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#0B2545" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#D4A72C', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, fill: '#D4A72C', stroke: '#fff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 w-full flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                  <p className="text-slate-500">No exam performance data available yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 10. SUBJECT PERFORMANCE */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-slate-500" /> Subject Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {student.subjectPerformance.length > 0 ? (
                <div className="space-y-6">
                  {student.subjectPerformance.map((subj, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-slate-800">{subj.subject}</span>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span>{subj.accuracy}% accuracy</span>
                          <span className="font-bold text-[#0B2545]">{subj.scorePercent}%</span>
                        </div>
                      </div>
                      <Progress value={subj.scorePercent} className="h-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No subject performance data available yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 11. RECENT ACTIVITY */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-slate-500" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {student.recentActivity.length > 0 ? (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {student.recentActivity.map((activity, idx) => (
                  <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-slate-800 capitalize">{activity.type}</span>
                        <time className="text-xs font-medium text-slate-500">{activity.timestamp}</time>
                      </div>
                      <p className="text-sm text-slate-600">{activity.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No recent activity found.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* 12. PURCHASE HISTORY */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Store className="w-5 h-5 text-slate-500" /> Marketplace Purchases
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {student.purchases.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.purchases.map(purchase => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">{purchase.product}</TableCell>
                        <TableCell>Rs. {purchase.amount}</TableCell>
                        <TableCell>
                          <Badge variant={purchase.status === 'Approved' ? 'default' : 'secondary'} className={purchase.status === 'Approved' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                            {purchase.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-slate-500 text-center py-8">No purchases found.</p>
              )}
            </CardContent>
          </Card>

          {/* 13. SUPPORT TICKETS */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-slate-500" /> Support Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {student.tickets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.tickets.map(ticket => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium text-sm truncate max-w-[150px]">{ticket.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ticket.status === 'Resolved' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}>
                            {ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-semibold ${ticket.priority === 'High' ? 'text-red-600' : 'text-slate-600'}`}>
                            {ticket.priority}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-slate-500 text-center py-8">No support tickets found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
