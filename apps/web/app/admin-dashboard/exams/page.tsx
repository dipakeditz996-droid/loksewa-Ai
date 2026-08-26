"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, Filter, PlusCircle, FileText, ChevronRight, MoreHorizontal,
  Clock, DownloadCloud, Lock, Unlock, Eye, HelpCircle, Archive, Trash2, Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { adminExamApi, Examination } from "@/lib/api/admin-exams";
import { toast } from "sonner";

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    live: "bg-emerald-50 text-emerald-700 border-emerald-200",
    published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    archived: "bg-red-50 text-red-700 border-red-200",
    scheduled: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-amber-50 text-amber-700 border-amber-200"
  };
  const normalizedStatus = status.toLowerCase();
  const appliedStyle = styles[normalizedStatus] || "bg-slate-100 text-slate-700 border-slate-200";
  return <Badge variant="outline" className={`capitalize ${appliedStyle}`}>{status}</Badge>;
};

export default function ExamsOverviewPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [exams, setExams] = useState<Examination[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewData, examsData] = await Promise.all([
        adminExamApi.getOverview(),
        adminExamApi.getExams({ page } as any) // Assuming pagination is supported, if not it will ignore
      ]);
      setStats(overviewData);
      
      if (examsData && Array.isArray(examsData.results)) {
        setExams(examsData.results);
        setTotalCount(examsData.count);
        setTotalPages(Math.ceil(examsData.count / 10)); // Assuming 10 per page
      } else {
        // Fallback if not paginated
        setExams(examsData as any);
        setTotalCount((examsData as any).length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Failed to fetch exams data:", error);
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.category_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Actions & Analytics Cards */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-3/4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-slate-500 mb-1">Total Exams</p>
            <h3 className="text-2xl font-bold text-[#0B2545]">{stats?.totalExams || 0}</h3>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-slate-500 mb-1">Active / Published</p>
            <h3 className="text-2xl font-bold text-emerald-600">{stats?.activeExams || 0}</h3>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-slate-500 mb-1">Total Attempts</p>
            <h3 className="text-2xl font-bold text-blue-600">{stats?.totalAttempts || 0}</h3>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-slate-500 mb-1">Drafts</p>
            <h3 className="text-2xl font-bold text-amber-600">{stats?.draftModelExams || 0}</h3>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="w-1/2 md:w-auto">
            <DownloadCloud className="w-4 h-4 mr-2" /> Import Exam
          </Button>
          <Link href="/admin-dashboard/exams/new" className="w-1/2 md:w-auto">
            <Button className="w-full bg-[#0B2545] text-white hover:bg-[#163E6C]">
              <PlusCircle className="w-4 h-4 mr-2" /> Create Exam
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-end lg:items-center justify-between">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search exams, categories..." 
            className="pl-9 bg-slate-50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <Button variant="outline" size="sm" className="bg-slate-50 text-slate-600 border-slate-200">
            <Filter className="w-4 h-4 mr-2" /> Category: All
          </Button>
          <Button variant="outline" size="sm" className="bg-slate-50 text-slate-600 border-slate-200">
            <Filter className="w-4 h-4 mr-2" /> Status: All
          </Button>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
            Clear
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Exam Name</TableHead>
                <TableHead>Category / Position</TableHead>
                <TableHead>Specs</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-10 bg-slate-100 rounded w-48 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-8 bg-slate-100 rounded w-32 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-8 bg-slate-100 rounded w-24 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-8 bg-slate-100 rounded w-24 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-5 bg-slate-100 rounded-full w-20 animate-pulse"></div></TableCell>
                    <TableCell className="text-right"><div className="h-8 w-8 bg-slate-100 rounded ml-auto animate-pulse"></div></TableCell>
                  </TableRow>
                ))
              ) : filteredExams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    No exams found. <button onClick={() => setSearchQuery("")} className="text-blue-600 underline">Clear filters</button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExams.map((exam) => (
                  <TableRow key={exam.id} className="hover:bg-slate-50/50">
                    
                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#0B2545] hover:text-blue-600 cursor-pointer">{exam.title}</span>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          {/* Assuming exams don't have premium/free yet, defaulting to logic or omitting */}
                          <span className="text-emerald-600 font-medium flex items-center gap-1"><Unlock className="w-3 h-3" /> Free</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 capitalize">{exam.exam_type}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex flex-col max-w-[200px]">
                        <span className="text-sm font-semibold text-slate-800 truncate" title={exam.category_name || 'N/A'}>{exam.category_name || 'N/A'}</span>
                        <span className="text-xs text-slate-500 truncate mt-0.5" title={exam.exam_name || 'N/A'}>For: {exam.exam_name || 'N/A'}</span>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1"><HelpCircle className="w-3 h-3 text-slate-400" /> {exam.total_questions} Qs / {exam.total_marks} Marks</div>
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> {exam.time_limit ? `${exam.time_limit} mins` : 'Unlimited'}</div>
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      {exam.attempts_count > 0 ? (
                        <div className="flex flex-col gap-1 text-xs text-slate-600">
                          <div><span className="font-semibold text-slate-800">{exam.attempts_count.toLocaleString()}</span> Attempts</div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No attempts yet</span>
                      )}
                    </TableCell>

                    <TableCell className="align-top">
                      <StatusBadge status={exam.status} />
                      <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(exam.updated_at).toLocaleDateString()}
                      </div>
                    </TableCell>

                    <TableCell className="align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin-dashboard/exams/${exam.id}`}>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8">
                            View <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit Details</DropdownMenuItem>
                            <DropdownMenuItem>Manage Questions</DropdownMenuItem>
                            <DropdownMenuItem>Preview as Student</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Duplicate Exam</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {exam.status === "live" || (exam as any).status === "published" ? (
                              <DropdownMenuItem className="text-amber-600">Close Exam</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-emerald-600">Publish Exam</DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-red-600">Archive</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        <div className="border-t border-slate-200 p-4 flex items-center justify-between text-sm text-slate-500 bg-slate-50">
          <span>Showing {filteredExams.length} of {totalCount} exams</span>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === 1} 
              className="h-8"
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="px-3 py-1 text-sm font-medium">{page} / {totalPages}</span>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page >= totalPages} 
              className="h-8"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
