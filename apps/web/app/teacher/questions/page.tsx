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
import { PageHeader, StatCard, StatusPill } from "@/components/teacher/portal";

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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mcq': return 'MCQ';
      case 'subjective': return 'Subjective';
      case 'true_false': return 'True/False';
      case 'short_answer': return 'Short Answer';
      default: return type;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-8">
      <PageHeader
        title="Question Bank"
        description="Every question here feeds Practice, Games, and Mock Exams once approved."
        action={
          <>
            <Button variant="outline" className="gap-2 rounded-[9px] border-border text-foreground" asChild>
              <Link href="/teacher/questions/import">
                <Upload className="h-4 w-4" /> Bulk Import
              </Link>
            </Button>
            <Button className="gap-2 rounded-[9px] bg-[#0B2545] shadow-sm hover:bg-[#163E6C]" asChild>
              <Link href="/teacher/questions/new">
                <Plus className="h-4 w-4" /> New Question
              </Link>
            </Button>
          </>
        }
      />

      {/* Summary Cards with Donut Chart */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Donut Chart Card */}
        <div className="flex flex-1 items-center gap-6 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:max-w-md">
          <div className="relative flex h-[100px] w-[100px] shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#EEF1F6" strokeWidth="12" />
              {/* Segments: total = stats.total. Approved (green), Pending (yellow), Drafts (gray), Changes/Rejected (red) */}
              {stats.total > 0 && (
                <>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#159A82" strokeWidth="12" strokeDasharray={`${(stats.approved / stats.total) * 251.2} 251.2`} strokeDashoffset="0" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#D4A72C" strokeWidth="12" strokeDasharray={`${(stats.pending / stats.total) * 251.2} 251.2`} strokeDashoffset={`-${(stats.approved / stats.total) * 251.2}`} />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#667085" strokeWidth="12" strokeDasharray={`${(stats.drafts / stats.total) * 251.2} 251.2`} strokeDashoffset={`-${((stats.approved + stats.pending) / stats.total) * 251.2}`} />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#DC5A5A" strokeWidth="12" strokeDasharray={`${((stats.changesRequested + stats.rejected) / stats.total) * 251.2} 251.2`} strokeDashoffset={`-${((stats.approved + stats.pending + stats.drafts) / stats.total) * 251.2}`} />
                </>
              )}
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="font-heading text-xl font-extrabold text-foreground">{stats.total}</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.05em] text-muted-foreground">Total</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="text-[13.5px] font-bold text-foreground">Question Status</div>
            <div className="grid grid-cols-2 gap-y-1.5 text-[12px] font-medium text-muted-foreground">
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#159A82]" /> Approved ({stats.approved})</div>
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#D4A72C]" /> Pending ({stats.pending})</div>
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#667085]" /> Drafts ({stats.drafts})</div>
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#DC5A5A]" /> Action Req ({stats.changesRequested + stats.rejected})</div>
            </div>
          </div>
        </div>

        {/* Key KPI Cards */}
        <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} tone="success" />
          <StatCard icon={Clock} label="Pending Review" value={stats.pending} tone="pending" />
          <StatCard icon={AlertCircle} label="Needs Action" value={stats.changesRequested + stats.rejected} tone={stats.changesRequested + stats.rejected > 0 ? "error" : "neutral"} />
        </div>
      </div>

      {/* Main Content */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-border p-4 md:flex-row">
          <form onSubmit={handleSearch} className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search questions by text or ID..."
              className="rounded-lg border-border bg-muted pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <div className="flex w-full items-center gap-2 md:w-auto">
            <div className="flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <select
                className="cursor-pointer border-none bg-transparent font-medium text-foreground outline-none"
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
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">Question</th>
                <th className="border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">Type</th>
                <th className="border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">Marks</th>
                <th className="border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">Status</th>
                <th className="border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">Last Updated</th>
                <th className="border-b border-border px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="border-b border-[#F2F4F8] px-5 py-4"><Skeleton className="h-4 w-64" /></td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4"><Skeleton className="ml-auto h-8 w-8 rounded-md" /></td>
                  </tr>
                ))
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <FileQuestion className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-lg font-medium text-foreground">No questions found</p>
                    <p className="mt-1 text-sm">Try adjusting your filters or create a new question.</p>
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id} className="group hover:bg-muted">
                    <td className="border-b border-[#F2F4F8] px-5 py-4">
                      <div className="line-clamp-2 max-w-md font-semibold text-foreground">{q.text}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded bg-[#EEF1F6] px-1.5 font-mono">{q.question_id}</span>
                        {q.difficulty && (
                          <span className="capitalize">• {q.difficulty}</span>
                        )}
                      </div>
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4 font-medium text-foreground">
                      {getTypeLabel(q.question_type)}
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4 text-muted-foreground">
                      {q.marks}
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4">
                      <StatusPill status={q.status} />
                      {q.status === 'changes_requested' && (
                        <div className="mt-1 max-w-[150px] truncate text-[10px] text-destructive" title={q.reviewer_comment}>
                          {q.reviewer_comment}
                        </div>
                      )}
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4 text-xs text-muted-foreground">
                      {new Date(q.updated_at).toLocaleDateString()}
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground opacity-50 transition-opacity group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {/* Only Draft and Changes Requested can be edited */}
                          {['draft', 'changes_requested'].includes(q.status) ? (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/teacher/questions/${q.id}/edit`} className="cursor-pointer">
                                  <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Question
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSubmit(q.id)} className="cursor-pointer">
                                <CheckCircle2 className="mr-2 h-4 w-4 text-[#0F7A69] dark:text-[#4ADE9C]" /> Submit for Review
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem asChild>
                              <Link href={`/teacher/questions/${q.id}/edit`} className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4 text-muted-foreground" /> View Question
                              </Link>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          {/* Can't delete/archive pending or approved */}
                          {['draft', 'changes_requested', 'rejected'].includes(q.status) && (
                            <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10" onClick={() => handleArchive(q.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Archive
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
      </div>
    </div>
  );
}
