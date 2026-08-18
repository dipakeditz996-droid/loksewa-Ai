"use client";

import { useState, useEffect } from "react";
import { teacherMockExamsApi, MockExam } from "@/lib/api/teacher-mock-exams";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, FileText, CheckCircle, Clock, AlertCircle, TrendingUp, MoreVertical, Edit, Copy, Eye, BarChart, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

export default function MockExamsDashboard() {
  const [exams, setExams] = useState<MockExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await teacherMockExamsApi.getAll();
      setExams(data);
    } catch (error) {
      console.error("Failed to fetch exams:", error);
      toast.error("Failed to load mock exams");
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await teacherMockExamsApi.duplicate(id);
      toast.success("Exam duplicated successfully");
      fetchExams();
    } catch (error) {
      toast.error("Failed to duplicate exam");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this exam?")) return;
    try {
      await teacherMockExamsApi.delete(id);
      toast.success("Exam deleted successfully");
      fetchExams();
    } catch (error) {
      toast.error("Failed to delete exam");
    }
  };

  const handleSubmitReview = async (id: number) => {
    try {
      await teacherMockExamsApi.submitReview(id);
      toast.success("Exam submitted for review");
      fetchExams();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to submit exam for review");
    }
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || exam.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200">Published</span>;
      case 'draft':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200">Draft</span>;
      case 'pending_review':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium border border-purple-200 flex items-center gap-1"><Clock className="w-3 h-3"/> Pending Review</span>;
      case 'changes_requested':
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium border border-orange-200">Changes Requested</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium border border-red-200">Rejected</span>;
      case 'archived':
        return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium border border-slate-200">Archived</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mock Exams</h1>
          <p className="text-slate-500 mt-1">Create, manage and monitor timed examinations for your students.</p>
        </div>
        <Link href="/teacher/mock-exams/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all gap-2">
            <PlusCircle className="w-4 h-4" />
            Create Mock Exam
          </Button>
        </Link>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Exams</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{exams.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Published</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {exams.filter(e => e.status === 'published').length}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Review</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {exams.filter(e => e.status === 'pending_review').length}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Drafts & Needs Work</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {exams.filter(e => ['draft', 'changes_requested', 'rejected'].includes(e.status)).length}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search exams..." 
            className="pl-9 bg-slate-50 border-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-slate-50 border-none">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="changes_requested">Changes Requested</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading exams...</div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Your examination workspace is ready.</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Create your first model exam and build a realistic Loksewa examination experience for your students.
          </p>
          <div className="flex gap-4">
            <Link href="/teacher/mock-exams/new">
              <Button className="bg-blue-600 hover:bg-blue-700">Create Mock Exam</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 font-medium text-slate-500 text-sm">Exam Details</th>
                <th className="px-6 py-4 font-medium text-slate-500 text-sm">Config</th>
                <th className="px-6 py-4 font-medium text-slate-500 text-sm">Status</th>
                <th className="px-6 py-4 font-medium text-slate-500 text-sm">Date</th>
                <th className="px-6 py-4 font-medium text-slate-500 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExams.map((exam) => (
                <tr key={exam.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 mb-1">{exam.title}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{exam.exam_type === 'mock' ? 'Mock Test' : 'Model Exam'}</span>
                      <span>•</span>
                      <span>{exam.category_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700 font-medium">{exam.total_questions} Questions</div>
                    <div className="text-xs text-slate-500 mt-1">{exam.total_marks} Marks • {exam.time_limit} mins</div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(exam.status)}
                    {exam.status === 'rejected' && exam.reviewer_comment && (
                      <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={exam.reviewer_comment}>
                        {exam.reviewer_comment}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700">{format(new Date(exam.created_at), 'MMM d, yyyy')}</div>
                    <div className="text-xs text-slate-500 mt-1">Updated {format(new Date(exam.updated_at), 'MMM d')}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-slate-600">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href={`/teacher/mock-exams/${exam.id}/edit`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" /> Edit Exam
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => handleDuplicate(exam.id)}>
                          <Copy className="w-4 h-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        
                        {(exam.status === 'draft' || exam.status === 'changes_requested' || exam.status === 'rejected') && (
                          <DropdownMenuItem className="cursor-pointer text-blue-600 focus:text-blue-700" onClick={() => handleSubmitReview(exam.id)}>
                            <Send className="w-4 h-4 mr-2" /> Submit for Review
                          </DropdownMenuItem>
                        )}
                        
                        {exam.status === 'published' && (
                          <Link href={`/teacher/mock-exams/${exam.id}/analytics`}>
                            <DropdownMenuItem className="cursor-pointer text-green-600 focus:text-green-700">
                              <BarChart className="w-4 h-4 mr-2" /> View Analytics
                            </DropdownMenuItem>
                          </Link>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-700" onClick={() => handleDelete(exam.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
