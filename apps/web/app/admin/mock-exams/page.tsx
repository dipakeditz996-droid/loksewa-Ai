"use client";

import { useState, useEffect } from "react";
import { adminMockExamsApi } from "@/lib/api/admin-mock-exams";
import { MockExam } from "@/lib/api/teacher-mock-exams";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Eye, Filter, CheckCircle, XCircle, Clock, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminMockExamQueue() {
  const [exams, setExams] = useState<MockExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await adminMockExamsApi.getReviewQueue();
      setExams(data);
    } catch (error) {
      toast.error("Failed to fetch moderation queue");
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200">Approved & Published</span>;
      case 'pending_review':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium border border-purple-200 flex items-center gap-1 w-max"><Clock className="w-3 h-3"/> Pending Review</span>;
      case 'changes_requested':
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium border border-orange-200">Changes Requested</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium border border-red-200">Rejected</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mock Exam Moderation</h1>
          <p className="text-slate-500 mt-1">Review, approve, or reject exams created by teachers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Reviews</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {exams.filter(e => e.status === 'pending_review').length}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Approved (Total)</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {exams.filter(e => e.status === 'published').length}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Changes Requested</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {exams.filter(e => e.status === 'changes_requested').length}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl">
                <XCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search by title or author..." 
            className="pl-9 bg-slate-50 border-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] bg-slate-50 border-none">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="published">Approved & Published</SelectItem>
            <SelectItem value="changes_requested">Changes Requested</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 font-medium text-slate-500 text-sm">Exam Details</th>
              <th className="px-6 py-4 font-medium text-slate-500 text-sm">Author</th>
              <th className="px-6 py-4 font-medium text-slate-500 text-sm">Status</th>
              <th className="px-6 py-4 font-medium text-slate-500 text-sm">Submitted At</th>
              <th className="px-6 py-4 font-medium text-slate-500 text-sm text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500">Loading queue...</td>
              </tr>
            ) : filteredExams.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-500">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                  <p className="text-lg font-medium text-slate-700">Moderation queue is empty!</p>
                  <p className="text-sm">No exams require your attention right now.</p>
                </td>
              </tr>
            ) : (
              filteredExams.map(exam => (
                <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{exam.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {exam.exam_type === 'mock' ? 'Mock Test' : 'Model Exam'} • {exam.category_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {(exam as any).created_by_name || 'Unknown Teacher'}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(exam.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {exam.submitted_at ? format(new Date(exam.submitted_at), "MMM d, yyyy h:mm a") : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/mock-exams/${exam.id}/review`}>
                      <Button size="sm" variant={exam.status === 'pending_review' ? 'default' : 'outline'} className={exam.status === 'pending_review' ? 'bg-blue-600 text-white' : ''}>
                        {exam.status === 'pending_review' ? 'Review Now' : 'View Details'}
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
