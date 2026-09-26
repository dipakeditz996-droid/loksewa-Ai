"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FileQuestion,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Download,
  RotateCcw,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import * as teacherQuestionsApi from "@/lib/api/teacher-questions";
import {
  QuestionData,
  TeacherHierarchyCategory,
  TeacherHierarchySubject,
  TeacherHierarchyChapter,
  TeacherHierarchyTopic,
} from "@/lib/api/teacher-questions";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader, StatCard, StatusPill } from "@/components/teacher/portal";
import { ButtonSpinner } from "@/components/ui/loading-states";

export default function TeacherQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");

  const [hierarchy, setHierarchy] = useState<TeacherHierarchyCategory[]>([]);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    drafts: 0,
    pending: 0,
    approved: 0,
    changesRequested: 0,
    rejected: 0,
  });

  // Load teacher authorized hierarchy for filters
  useEffect(() => {
    async function loadHierarchy() {
      try {
        const data = await teacherQuestionsApi.getTeacherImportHierarchy();
        setHierarchy(data);
      } catch {
        // non-blocking
      }
    }
    loadHierarchy();
  }, []);

  // Flattened subjects for filter
  const allSubjects = useMemo(() => {
    const list: TeacherHierarchySubject[] = [];
    const seen = new Set<number>();
    hierarchy.forEach((cat) => {
      cat.positions?.forEach((pos) => {
        pos.papers?.forEach((p) => {
          p.subjects?.forEach((s) => {
            if (!seen.has(s.id)) {
              seen.add(s.id);
              list.push(s);
            }
          });
        });
        pos.children?.forEach((child) => {
          child.papers?.forEach((p) => {
            p.subjects?.forEach((s) => {
              if (!seen.has(s.id)) {
                seen.add(s.id);
                list.push(s);
              }
            });
          });
        });
      });
    });
    return list;
  }, [hierarchy]);

  // Available chapters for selected subject
  const availableChapters = useMemo(() => {
    if (subjectFilter === "all") return [];
    const sub = allSubjects.find((s) => s.id === Number(subjectFilter));
    return sub?.chapters || [];
  }, [allSubjects, subjectFilter]);

  // Available topics for selected chapter
  const availableTopics = useMemo(() => {
    if (chapterFilter === "all") return [];
    const chap = availableChapters.find((c) => c.id === Number(chapterFilter));
    return chap?.topics || [];
  }, [availableChapters, chapterFilter]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);

      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.question_type = typeFilter;
      if (difficultyFilter !== "all") params.difficulty = difficultyFilter;
      if (subjectFilter !== "all") params.subject = subjectFilter;
      if (chapterFilter !== "all") params.chapter = chapterFilter;
      if (topicFilter !== "all") params.topic = topicFilter;

      const response = await teacherQuestionsApi.getQuestions(params);
      const data = Array.isArray(response) ? response : response.results || [];
      setQuestions(data);

      // Calculate stats based on unfiltered base fetch
      if (
        !search &&
        statusFilter === "all" &&
        typeFilter === "all" &&
        difficultyFilter === "all" &&
        subjectFilter === "all"
      ) {
        setStats({
          total: data.length,
          drafts: data.filter((q) => q.status === "draft").length,
          pending: data.filter((q) => q.status === "pending_review").length,
          approved: data.filter((q) => q.status === "approved").length,
          changesRequested: data.filter((q) => q.status === "changes_requested").length,
          rejected: data.filter((q) => q.status === "rejected").length,
        });
      }
    } catch {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [search, statusFilter, typeFilter, difficultyFilter, subjectFilter, chapterFilter, topicFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      await teacherQuestionsApi.downloadTeacherTemplate("mcq");
      toast.success("Excel template downloaded.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download template.");
    } finally {
      setIsDownloadingTemplate(false);
    }
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
      case "mcq":
        return "MCQ";
      case "subjective":
        return "Subjective";
      case "true_false":
        return "True/False";
      case "short_answer":
        return "Short Answer";
      default:
        return type;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-8">
      <PageHeader
        title="Teacher Question Bank"
        description="Create, bulk-upload via Excel, and manage your questions. Approved questions feed Practice, Mock Exams, and Games."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 rounded-[9px] border-border text-foreground hover:bg-muted"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              aria-busy={isDownloadingTemplate}
            >
              {isDownloadingTemplate ? (
                <ButtonSpinner text="Downloading..." />
              ) : (
                <>
                  <Download className="h-4 w-4 text-primary" />
                  Download Template
                </>
              )}
            </Button>
            <Button variant="outline" className="gap-2 rounded-[9px] border-border text-foreground hover:bg-muted" asChild>
              <Link href="/teacher/questions/import">
                <Upload className="h-4 w-4 text-[#0F7A69] dark:text-[#4ADE9C]" /> Upload Excel
              </Link>
            </Button>
            <Button className="gap-2 rounded-[9px] bg-[#0B2545] dark:bg-[#D4A72C] hover:bg-[#163E6C] dark:hover:bg-[#bfa228] text-white dark:text-[#0A1118] font-bold shadow-sm" asChild>
              <Link href="/teacher/questions/new">
                <Plus className="h-4 w-4" /> Add Question
              </Link>
            </Button>
          </div>
        }
      />

      {/* Changes Requested Banner */}
      {stats.changesRequested > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-xs sm:text-sm">
              <strong className="font-bold">Action Required: </strong>
              <span>
                {stats.changesRequested} question(s) have changes requested by Admin. Please check the review feedback
                and resubmit.
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/40 text-xs font-semibold hover:bg-amber-500/20"
            onClick={() => setStatusFilter("changes_requested")}
          >
            View Feedback
          </Button>
        </div>
      )}

      {/* Summary Cards with Donut Chart */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Donut Chart Card */}
        <div className="flex flex-1 items-center gap-6 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:max-w-md">
          <div className="relative flex h-[100px] w-[100px] shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#EEF1F6" strokeWidth="12" />
              {stats.total > 0 && (
                <>
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#159A82"
                    strokeWidth="12"
                    strokeDasharray={`${(stats.approved / stats.total) * 251.2} 251.2`}
                    strokeDashoffset="0"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#D4A72C"
                    strokeWidth="12"
                    strokeDasharray={`${(stats.pending / stats.total) * 251.2} 251.2`}
                    strokeDashoffset={`-${(stats.approved / stats.total) * 251.2}`}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#667085"
                    strokeWidth="12"
                    strokeDasharray={`${(stats.drafts / stats.total) * 251.2} 251.2`}
                    strokeDashoffset={`-${((stats.approved + stats.pending) / stats.total) * 251.2}`}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#DC5A5A"
                    strokeWidth="12"
                    strokeDasharray={`${((stats.changesRequested + stats.rejected) / stats.total) * 251.2} 251.2`}
                    strokeDashoffset={`-${((stats.approved + stats.pending + stats.drafts) / stats.total) * 251.2}`}
                  />
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
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#159A82]" /> Approved ({stats.approved})
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#D4A72C]" /> Pending ({stats.pending})
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#667085]" /> Drafts ({stats.drafts})
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#DC5A5A]" /> Action Req ({stats.changesRequested + stats.rejected})
              </div>
            </div>
          </div>
        </div>

        {/* Key KPI Cards */}
        <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} tone="success" />
          <StatCard icon={Clock} label="Pending Review" value={stats.pending} tone="pending" />
          <StatCard
            icon={AlertCircle}
            label="Needs Action"
            value={stats.changesRequested + stats.rejected}
            tone={stats.changesRequested + stats.rejected > 0 ? "error" : "neutral"}
          />
        </div>
      </div>

      {/* Main Content & Advanced Filter Bar */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="space-y-3 border-b border-border p-4">
          {/* Top Search & Reset Row */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <form onSubmit={handleSearch} className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search questions by text or ID..."
                className="rounded-lg border-border bg-muted/50 pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setDifficultyFilter("all");
                  setSubjectFilter("all");
                  setChapterFilter("all");
                  setTopicFilter("all");
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
              </Button>
            </div>
          </div>

          {/* Cascading Hierarchy & Attribute Filters */}
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 md:grid-cols-6">
            {/* Subject */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject</label>
              <select
                className="w-full rounded-md border border-border bg-muted/40 p-1.5 text-xs text-foreground focus:outline-none"
                value={subjectFilter}
                onChange={(e) => {
                  setSubjectFilter(e.target.value);
                  setChapterFilter("all");
                  setTopicFilter("all");
                }}
              >
                <option value="all">All Subjects</option>
                {allSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chapter</label>
              <select
                className="w-full rounded-md border border-border bg-muted/40 p-1.5 text-xs text-foreground focus:outline-none"
                value={chapterFilter}
                disabled={subjectFilter === "all" || availableChapters.length === 0}
                onChange={(e) => {
                  setChapterFilter(e.target.value);
                  setTopicFilter("all");
                }}
              >
                <option value="all">All Chapters</option>
                {availableChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Topic</label>
              <select
                className="w-full rounded-md border border-border bg-muted/40 p-1.5 text-xs text-foreground focus:outline-none"
                value={topicFilter}
                disabled={chapterFilter === "all" || availableTopics.length === 0}
                onChange={(e) => setTopicFilter(e.target.value)}
              >
                <option value="all">All Topics</option>
                {availableTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Question Type */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</label>
              <select
                className="w-full rounded-md border border-border bg-muted/40 p-1.5 text-xs text-foreground focus:outline-none"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="mcq">MCQ</option>
                <option value="true_false">True / False</option>
                <option value="subjective">Subjective</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>

            {/* Difficulty */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Difficulty</label>
              <select
                className="w-full rounded-md border border-border bg-muted/40 p-1.5 text-xs text-foreground focus:outline-none"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
              <select
                className="w-full rounded-md border border-border bg-muted/40 p-1.5 text-xs text-foreground focus:outline-none"
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

        {/* Questions Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
                <th className="px-5 py-3">Question</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Marks</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last Updated</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="border-b border-border px-5 py-4">
                      <Skeleton className="h-4 w-64" />
                    </td>
                    <td className="border-b border-border px-5 py-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="border-b border-border px-5 py-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="border-b border-border px-5 py-4">
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </td>
                    <td className="border-b border-border px-5 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="border-b border-border px-5 py-4">
                      <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                    </td>
                  </tr>
                ))
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <FileQuestion className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-lg font-medium text-foreground">No questions found</p>
                    <p className="mt-1 text-sm">
                      Upload your first question set via Excel or click "Add Question" to begin.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/teacher/questions/import">
                          <Upload className="mr-1.5 h-3.5 w-3.5" /> Bulk Upload Excel
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="border-b border-border px-5 py-4">
                      <div className="line-clamp-2 max-w-md font-semibold text-foreground">{q.text}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 font-mono text-[11px]">{q.question_id}</span>
                        {q.difficulty && <span className="capitalize">• {q.difficulty}</span>}
                        {q.hint && <span className="text-primary">• Has Hint</span>}
                      </div>
                    </td>
                    <td className="border-b border-border px-5 py-4 font-medium text-foreground">
                      {getTypeLabel(q.question_type)}
                    </td>
                    <td className="border-b border-border px-5 py-4 text-muted-foreground">{q.marks}</td>
                    <td className="border-b border-border px-5 py-4">
                      <StatusPill status={q.status} />
                      {["changes_requested", "rejected"].includes(q.status) && q.reviewer_comment && (
                        <div
                          className="mt-1 max-w-[200px] truncate text-[11px] text-destructive font-medium"
                          title={q.reviewer_comment}
                        >
                          Feedback: "{q.reviewer_comment}"
                        </div>
                      )}
                    </td>
                    <td className="border-b border-border px-5 py-4 text-xs text-muted-foreground">
                      {new Date(q.updated_at).toLocaleDateString()}
                    </td>
                    <td className="border-b border-border px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {/* Only Draft and Changes Requested can be edited */}
                          {["draft", "changes_requested"].includes(q.status) ? (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/teacher/questions/${q.id}/edit`} className="cursor-pointer">
                                  <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Question
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSubmit(q.id)} className="cursor-pointer">
                                <CheckCircle2 className="mr-2 h-4 w-4 text-[#0F7A69] dark:text-[#4ADE9C]" /> Submit for
                                Review
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
                          {/* Can't archive pending review or approved */}
                          {["draft", "changes_requested", "rejected"].includes(q.status) && (
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:bg-destructive/10"
                              onClick={() => handleArchive(q.id)}
                            >
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
