"use client";

import { useState, useEffect } from "react";
import { teacherMockExamsApi, MockExam } from "@/lib/api/teacher-mock-exams";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, FileText, CheckCircle, Clock, AlertCircle, MoreVertical, Edit, Copy, BarChart, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { PageHeader, StatCard, StatusPill } from "@/components/teacher/portal";

export default function MockExamsDashboard() {
  const [exams, setExams] = useState<MockExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [taxonomy, setTaxonomy] = useState<any[]>([]);

  useEffect(() => {
    fetchExams();
    fetchTaxonomy();
  }, []);

  const fetchTaxonomy = async () => {
    try {
      const data = await teacherMockExamsApi.getTaxonomy();
      setTaxonomy(data);
    } catch (error) {
      console.error("Failed to fetch taxonomy:", error);
    }
  };

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
    const matchesCategory = categoryFilter === "all" || exam.category.toString() === categoryFilter;
    const matchesSubject = subjectFilter === "all" || (exam.subject && exam.subject.toString() === subjectFilter);
    return matchesSearch && matchesStatus && matchesCategory && matchesSubject;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-8">

      <PageHeader
        title="Mock Exams"
        description="Create, manage and monitor timed examinations for your students."
        action={
          <div className="flex gap-2">
            <Button disabled variant="outline" className="gap-2 rounded-[9px] border-border bg-muted text-muted-foreground cursor-not-allowed">
              <PlusCircle className="h-4 w-4" />
              Auto-generate (Coming Soon)
            </Button>
            <Link href="/teacher/mock-exams/new">
              <Button className="gap-2 rounded-[9px] bg-[#0B2545] shadow-sm hover:bg-[#163E6C] text-white">
                <PlusCircle className="h-4 w-4" />
                New Mock Exam
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Total Exams" value={exams.length} />
        <StatCard icon={CheckCircle} label="Published" value={exams.filter(e => e.status === 'published').length} tone="success" />
        <StatCard icon={Clock} label="Pending Review" value={exams.filter(e => e.status === 'pending_review').length} tone="pending" />
        <StatCard
          icon={AlertCircle}
          label="Drafts & Needs Work"
          value={exams.filter(e => ['draft', 'changes_requested', 'rejected'].includes(e.status)).length}
          tone={exams.some(e => ['changes_requested', 'rejected'].includes(e.status)) ? "error" : "neutral"}
        />
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:flex-row">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search exams..."
            className="rounded-lg border-border bg-muted pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex w-full items-center gap-3 md:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] rounded-lg border-border bg-muted">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {taxonomy.map(cat => (
                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[160px] rounded-lg border-border bg-muted">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {taxonomy.flatMap(cat => cat.exams).flatMap(ex => ex.subjects).map(sub => (
                <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] rounded-lg border-border bg-muted">
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
        <div className="py-12 text-center text-muted-foreground">Loading exams...</div>
      ) : filteredExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-10 w-10 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-foreground">Your examination workspace is ready.</h3>
          <p className="mx-auto mb-6 max-w-md text-[13px] text-muted-foreground">
            Create your first model exam and build a realistic Loksewa examination experience for your students.
          </p>
          <Link href="/teacher/mock-exams/new">
            <Button className="rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C] text-white">Create Mock Exam</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <div key={exam.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-md">
              <div className="mb-3.5 flex items-center justify-between">
                <StatusPill status={exam.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href={`/teacher/mock-exams/${exam.id}/edit`}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Edit className="mr-2 h-4 w-4" /> Edit Exam
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleDuplicate(exam.id)}>
                      <Copy className="mr-2 h-4 w-4" /> Duplicate
                    </DropdownMenuItem>

                    {(exam.status === 'draft' || exam.status === 'changes_requested' || exam.status === 'rejected') && (
                      <DropdownMenuItem className="cursor-pointer text-primary" onClick={() => handleSubmitReview(exam.id)}>
                        <Send className="mr-2 h-4 w-4" /> Submit for Review
                      </DropdownMenuItem>
                    )}

                    {exam.status === 'published' && (
                      <Link href={`/teacher/mock-exams/${exam.id}/analytics`}>
                        <DropdownMenuItem className="cursor-pointer text-[#0F7A69] dark:text-[#4ADE9C]">
                          <BarChart className="mr-2 h-4 w-4" /> View Analytics
                        </DropdownMenuItem>
                      </Link>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => handleDelete(exam.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h3 className="text-[15px] font-bold text-foreground">{exam.title}</h3>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-[#EEF1F6] px-1.5 py-0.5 text-muted-foreground">{exam.exam_type === 'mock' ? 'Mock Test' : 'Model Exam'}</span>
                <span>{exam.category_name}</span>
              </div>
              <div className="mt-2.5 text-[12px] text-muted-foreground">
                {exam.total_questions} Questions &middot; {exam.time_limit} min &middot; {exam.total_marks} Marks
              </div>

              {exam.status === 'rejected' && exam.reviewer_comment && (
                <p className="mt-2 max-w-[220px] truncate text-xs text-destructive" title={exam.reviewer_comment}>
                  {exam.reviewer_comment}
                </p>
              )}

              <div className="mt-4 border-t border-[#F2F4F8] pt-3.5 text-[11.5px] text-muted-foreground">
                Updated {format(new Date(exam.updated_at), 'MMM d, yyyy')}
              </div>
            </div>
          ))}

          <Link
            href="/teacher/mock-exams/new"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-border p-5 text-center transition-colors hover:border-[#0B2545]/40 hover:bg-muted"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
              <PlusCircle className="h-[18px] w-[18px]" />
            </div>
            <span className="text-[13px] font-semibold text-muted-foreground">Start a new mock exam</span>
          </Link>
        </div>
      )}
    </div>
  );
}
