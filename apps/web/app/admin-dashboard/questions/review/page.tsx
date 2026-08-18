"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Filter, AlertCircle, Clock, CheckCircle2, ChevronRight, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import * as adminQuestionsApi from "@/lib/api/admin-questions";
import { QuestionData } from "@/lib/api/teacher-questions";
import toast from "react-hot-toast";

export default function AdminReviewQueuePage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending_review");

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const params: any = { search };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      
      const response = await adminQuestionsApi.getAdminReviewQueue(params);
      const data = Array.isArray(response) ? response : (response.results || []);
      setQuestions(data);
    } catch (error) {
      toast.error("Failed to load review queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [search, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending_review': return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending Review</Badge>;
      case 'approved': return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Approved</Badge>;
      case 'changes_requested': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Changes Requested</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Question Moderation Queue</h1>
          <p className="text-muted-foreground mt-1">Review and approve questions submitted by teachers.</p>
        </div>
      </div>

      <Card className="shadow-sm border-border/50">
        <div className="p-4 border-b border-border/50 flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/5">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by text or ID..." 
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center px-3 py-1.5 border border-border/50 rounded-md bg-background text-sm">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <select 
              className="bg-transparent border-none outline-none font-medium cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="pending_review">Needs Review</option>
              <option value="changes_requested">Changes Requested</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Submissions</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/20 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase">Question Content</th>
                <th className="px-6 py-4 font-semibold uppercase">Details</th>
                <th className="px-6 py-4 font-semibold uppercase">Submitted</th>
                <th className="px-6 py-4 font-semibold uppercase">Status</th>
                <th className="px-6 py-4 font-semibold uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-64" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-24 rounded-md ml-auto" /></td>
                  </tr>
                ))
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <FileQuestion className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-lg font-medium text-foreground">Queue is empty</p>
                    <p className="text-sm mt-1">No questions match the current filter criteria.</p>
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id} className="hover:bg-muted/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground line-clamp-2">{q.text}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span className="font-mono bg-muted/50 px-1.5 rounded">{q.question_id}</span>
                        {q.tags && <span>• {q.tags}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div>{q.question_type}</div>
                      <div className="text-xs">{q.difficulty} • {q.marks}M</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {q.submitted_at ? new Date(q.submitted_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(q.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button asChild variant="outline" size="sm" className="group-hover:border-primary group-hover:text-primary transition-colors">
                        <Link href={`/admin-dashboard/questions/review/${q.id}`}>
                           Review <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
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
