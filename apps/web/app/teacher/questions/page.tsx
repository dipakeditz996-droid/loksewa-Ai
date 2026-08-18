"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FileQuestion, Plus, Search, Filter,
  MoreVertical, Edit, Upload, Trash2,
  CheckCircle2, AlertCircle, Clock, FileEdit, Archive, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import * as teacherQuestionsApi from "@/lib/api/teacher-questions";
import { QuestionData } from "@/lib/api/teacher-questions";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TeacherQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [stats, setStats] = useState({
    total: 0,
    drafts: 0,
    pending: 0,
    approved: 0,
    changesRequested: 0,
    rejected: 0
  });

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      
      const params: any = {
        search: search
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      
      const response = await teacherQuestionsApi.getQuestions(params);
      
      // If we don't have pagination, it might just return the array. Handling both:
      const data = Array.isArray(response) ? response : (response.results || []);
      setQuestions(data);
      
      // For a real app with large data, we would want an aggregation endpoint for stats.
      // Here we will do a rough calculation if we have all data, but typically we'd fetch stats separately.
      if (!search && statusFilter === "all") {
        setStats({
          total: data.length,
          drafts: data.filter(q => q.status === 'draft').length,
          pending: data.filter(q => q.status === 'pending_review').length,
          approved: data.filter(q => q.status === 'approved').length,
          changesRequested: data.filter(q => q.status === 'changes_requested').length,
          rejected: data.filter(q => q.status === 'rejected').length
        });
      }
      
    } catch (error) {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [search, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleArchive = async (id: number) => {
    if (!window.confirm("Are you sure you want to archive this question?")) return;
    try {
      await teacherQuestionsApi.deleteQuestion(id);
      toast.success("Question archived successfully");
      fetchQuestions();
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to archive question");
    }
  };

  const handleSubmit = async (id: number) => {
    try {
      await teacherQuestionsApi.submitQuestion(id);
      toast.success("Question submitted for review!");
      fetchQuestions();
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to submit question");
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'draft': return <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Draft</Badge>;
      case 'pending_review': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300">Pending Review</Badge>;
      case 'approved': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300">Approved</Badge>;
      case 'changes_requested': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">Changes Requested</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200 dark:bg-red-900/30 dark:text-red-300">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'mcq': return 'MCQ';
      case 'subjective': return 'Subjective';
      case 'true_false': return 'True/False';
      case 'short_answer': return 'Short Answer';
      default: return type;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Question Bank
          </h1>
          <p className="text-muted-foreground mt-1">
            Create, manage and submit high-quality questions for review.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/teacher/questions/import">
              <Upload className="w-4 h-4" /> Bulk Import
            </Link>
          </Button>
          <Link href="/teacher/questions/new">
            <Button className="bg-[#1e293b] hover:bg-[#0f172a] text-white gap-2 shadow-sm border-none">
              <Plus className="w-4 h-4" /> Create Question
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="shadow-sm hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-2 bg-muted rounded-md"><FileQuestion className="w-4 h-4 text-muted-foreground" /></div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm hover:border-gray-400 transition-colors">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drafts</p>
                <p className="text-2xl font-bold">{stats.drafts}</p>
              </div>
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md"><FileEdit className="w-4 h-4 text-gray-600 dark:text-gray-400" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:border-amber-400 transition-colors">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-500 uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-md"><Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:border-emerald-400 transition-colors">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-500 uppercase tracking-wider">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-md"><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:border-blue-400 transition-colors">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-500 uppercase tracking-wider">Changes</p>
                <p className="text-2xl font-bold">{stats.changesRequested}</p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md"><AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:border-red-400 transition-colors">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-700 dark:text-red-500 uppercase tracking-wider">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-md"><Archive className="w-4 h-4 text-red-600 dark:text-red-400" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="shadow-sm border-border/50">
        <div className="p-4 border-b border-border/50 flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/5">
          <form onSubmit={handleSearch} className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search questions by text or ID..." 
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center px-3 py-1.5 border border-border/50 rounded-md bg-background text-sm">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <select 
                className="bg-transparent border-none outline-none font-medium cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Drafts</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="changes_requested">Changes Requested</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/20 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase">Question</th>
                <th className="px-6 py-4 font-semibold uppercase">Type</th>
                <th className="px-6 py-4 font-semibold uppercase">Marks</th>
                <th className="px-6 py-4 font-semibold uppercase">Status</th>
                <th className="px-6 py-4 font-semibold uppercase">Last Updated</th>
                <th className="px-6 py-4 font-semibold uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-64" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></td>
                  </tr>
                ))
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <FileQuestion className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-lg font-medium text-foreground">No questions found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or create a new question.</p>
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id} className="hover:bg-muted/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground line-clamp-2">{q.text}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span className="font-mono bg-muted/50 px-1.5 rounded">{q.question_id}</span>
                        {q.difficulty && (
                           <span className="capitalize text-slate-500">• {q.difficulty}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {getTypeLabel(q.question_type)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {q.marks}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(q.status)}
                      {q.status === 'changes_requested' && (
                        <div className="text-[10px] text-blue-600 mt-1 max-w-[150px] truncate" title={q.reviewer_comment}>
                          {q.reviewer_comment}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(q.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 opacity-50 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {/* Only Draft and Changes Requested can be edited */}
                          {['draft', 'changes_requested'].includes(q.status) ? (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/teacher/questions/${q.id}/edit`} className="cursor-pointer">
                                  <Edit className="w-4 h-4 mr-2 text-primary" /> Edit Question
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSubmit(q.id)} className="cursor-pointer">
                                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Submit for Review
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem asChild>
                                <Link href={`/teacher/questions/${q.id}/edit`} className="cursor-pointer">
                                  <Eye className="w-4 h-4 mr-2 text-slate-500" /> View Question
                                </Link>
                              </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          {/* Can't delete/archive pending or approved */}
                          {['draft', 'changes_requested', 'rejected'].includes(q.status) && (
                             <DropdownMenuItem className="text-red-600 cursor-pointer focus:bg-red-50 dark:focus:bg-red-950" onClick={() => handleArchive(q.id)}>
                               <Trash2 className="w-4 h-4 mr-2" /> Archive
                             </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
