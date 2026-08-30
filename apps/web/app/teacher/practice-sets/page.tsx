"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy, Plus, Search, Filter,
  MoreVertical, Edit, Copy, Trash2,
  CheckCircle2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { teacherPracticeSetsApi, PracticeSet } from "@/lib/api/teacher-practice-sets";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader, StatCard, StatusPill } from "@/components/teacher/portal";

export default function PracticeSetsPage() {
  const router = useRouter();
  const [sets, setSets] = useState<PracticeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchSets = async () => {
    try {
      setLoading(true);
      const data = await teacherPracticeSetsApi.getPracticeSets({
        search: search,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setSets(data);
    } catch (error) {
      toast.error("Failed to load practice sets");
    } finally {
      setLoading(false);
    }
  };

  const getKPIs = () => {
    return {
      total: sets.length,
      published: sets.filter(s => s.status === 'published').length,
      drafts: sets.filter(s => s.status === 'draft').length,
      pending: sets.filter(s => s.status === 'pending_review').length,
    }
  }
  const kpis = getKPIs();

  useEffect(() => {
    fetchSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSets();
  };

  const handleDuplicate = async (id: number) => {
    try {
      await teacherPracticeSetsApi.duplicatePracticeSet(id);
      toast.success("Practice set duplicated successfully");
      fetchSets();
    } catch (error) {
      toast.error("Failed to duplicate practice set");
    }
  };

  const handleArchive = async (id: number) => {
    if (!window.confirm("Are you sure you want to archive this practice set?")) return;
    try {
      await teacherPracticeSetsApi.deletePracticeSet(id);
      toast.success("Practice set archived successfully");
      fetchSets();
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to archive practice set");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-8">
      <PageHeader
        title="Practice Sets"
        description="Build and manage question collections for student practice."
        action={
          <Button onClick={() => router.push("/teacher/practice-sets/new")} className="rounded-[9px] bg-[#0B2545] shadow-sm hover:bg-[#163E6C] text-white">
            <Plus className="mr-2 h-4 w-4" /> Create Practice Set
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Trophy} label="Total Sets" value={loading ? "-" : kpis.total} />
        <StatCard icon={CheckCircle2} label="Published" value={loading ? "-" : kpis.published} tone="success" />
        <StatCard icon={Edit} label="In Draft" value={loading ? "-" : kpis.drafts} />
        <StatCard icon={Clock} label="Pending Review" value={loading ? "-" : kpis.pending} tone="pending" />
      </div>

      {/* Toolbar */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col gap-4 border-b border-border bg-muted p-4 sm:flex-row">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search practice sets by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border-border bg-card pl-9"
            />
          </form>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="shrink-0 rounded-[9px] border-border text-foreground">
                <Filter className="mr-2 h-4 w-4" />
                {statusFilter ? `Status: ${statusFilter.replace("_", " ")}` : "Filters"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("")}>All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("draft")}>Draft</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("pending_review")}>Pending Review</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("changes_requested")}>Changes Requested</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("published")}>Published</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("rejected")}>Rejected</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Practice Sets List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card p-5">
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trophy className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-foreground">No practice sets yet</h3>
          <p className="mb-6 max-w-sm text-[13px] text-muted-foreground">
            Create a practice set by grouping questions from your Question Bank to share with your students.
          </p>
          <Button onClick={() => router.push("/teacher/practice-sets/new")} className="rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C] text-white">
            Create Your First Practice Set
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sets.map((set) => (
            <div key={set.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-md">
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex items-center justify-between">
                  <StatusPill status={set.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8 rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push(`/teacher/practice-sets/${set.id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => set.id && handleDuplicate(set.id)}>
                        <Copy className="mr-2 h-4 w-4" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => set.id && handleArchive(set.id)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="mb-1 line-clamp-2 text-[15px] font-bold leading-tight text-foreground">
                  {set.name}
                </h3>
                <p className="mb-4 line-clamp-2 text-[12.5px] text-muted-foreground">
                  {set.description || "No description provided."}
                </p>

                <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4 text-[12.5px]">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center">
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      {set.total_questions} Questions
                    </span>
                    <span className="flex items-center">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                      {set.time_limit} mins
                    </span>
                  </div>
                  <div className="mt-1 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Type:</span> {set.set_type.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
