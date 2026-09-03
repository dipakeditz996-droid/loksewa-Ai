"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Flag, CheckCircle2, XCircle, ExternalLink, Search, Filter, MessageSquare, Pin, Lock, Eye, Check, AlertTriangle, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import { communityApi, CommunityReport, CommunityPostListItem } from "@/lib/api/community";
import { Input } from "@/components/ui/input";

const REPORT_TABS = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];

function ReportsTab() {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("open");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await communityApi.getReports(tab);
      setReports(Array.isArray(data) ? data : data.results);
    } catch {
      toast.error("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResolve = async (id: number) => {
    try {
      await communityApi.resolveReport(id);
      toast.success("Report resolved.");
      load();
    } catch {
      toast.error("Failed to resolve.");
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await communityApi.dismissReport(id);
      toast.success("Report dismissed.");
      load();
    } catch {
      toast.error("Failed to dismiss.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200">
        {REPORT_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.key ? "border-[#D4A72C] text-[#0B2545]" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
          <p className="text-slate-700 font-semibold">No {tab !== "all" ? tab : ""} reports</p>
          <p className="text-slate-400 text-sm mt-1">The community moderation queue is clear.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {reports.map((r) => (
            <div key={r.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase">{r.reason.replace("_", " ")}</Badge>
                  <Badge className={r.status === "open" ? "bg-red-100 text-red-700" : r.status === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                    {r.status}
                  </Badge>
                  <Link
                    href={`/admin-dashboard/community/${r.post ?? r.reply_post_id}`}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    View {r.post ? "Post" : "Reply"} <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-sm font-medium text-slate-800">{r.post_title || `Reply: "${r.reply_excerpt}..."`}</p>
                {r.detail && <p className="text-xs text-slate-500 mt-1">"{r.detail}"</p>}
                <p className="text-xs text-slate-400 mt-1">Reported by {r.reporter.name} · {new Date(r.created_at).toLocaleString()}</p>
              </div>
              {r.status === "open" && (
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleDismiss(r.id)} className="gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Dismiss
                  </Button>
                  <Button size="sm" onClick={() => handleResolve(r.id)} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiscussionsTab() {
  const [posts, setPosts] = useState<CommunityPostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await communityApi.getPosts({
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        post_type: typeFilter !== "all" ? (typeFilter as "question" | "discussion") : undefined,
      });
      setPosts((data as any).results || data);
    } catch {
      toast.error("Failed to load discussions.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search discussions..." 
            className="pl-9 bg-white"
          />
        </form>
        <div className="flex gap-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="removed">Removed</option>
          </select>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
          >
            <option value="all">All Types</option>
            <option value="question">Question</option>
            <option value="discussion">Discussion</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <MessageCircle className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No discussions found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {posts.map((post) => (
            <Link key={post.id} href={`/admin-dashboard/community/${post.id}`} className="block hover:bg-slate-50 transition-colors">
              <div className="p-4 sm:p-5 flex gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {post.status === "removed" && (
                      <Badge variant="destructive" className="text-[10px] h-5 bg-red-100 text-red-700 hover:bg-red-200 border-none">Removed</Badge>
                    )}
                    {post.is_pinned && (
                      <Badge variant="secondary" className="text-[10px] h-5 bg-[#FFF8E7] text-[#D4A72C] hover:bg-[#FFF3D4] border-[#D4A72C]/20 gap-1">
                        <Pin className="w-3 h-3" /> Pinned
                      </Badge>
                    )}
                    {post.is_locked && (
                      <Badge variant="secondary" className="text-[10px] h-5 bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200 gap-1">
                        <Lock className="w-3 h-3" /> Locked
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] h-5 border-slate-200 text-slate-500 uppercase tracking-wider bg-slate-50">
                      {post.post_type}
                    </Badge>
                    {post.topic && (
                      <Badge variant="outline" className="text-[10px] h-5 border-blue-100 text-blue-600 bg-blue-50/50">
                        {post.topic.name}
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className={`text-[15px] font-semibold mb-1 ${post.status === "removed" ? "text-slate-400 line-through" : "text-slate-900"}`}>
                    {post.title}
                  </h3>
                  
                  <div className="flex items-center gap-3 text-[12px] text-slate-500">
                    <span className="font-medium text-slate-700">{post.author.name}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-3 sm:gap-6 pt-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Eye className="w-4 h-4" />
                    <span className="text-xs font-medium">{post.view_count}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${post.has_best_answer ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {post.has_best_answer ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                    <span className="text-xs font-medium">{post.reply_count}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminCommunityPageInner() {
  // Report notifications link here with ?tab=reports (see
  // NotificationService's community-report action_url) - there's no separate
  // /community/reports route, so this query param is what actually lands the
  // admin on the right tab instead of falling through to the [id] route.
  //
  // The tab is derived straight from the URL rather than mirrored into
  // useState: clicking a notification while this page is already mounted is
  // a same-route, query-param-only navigation, which Next.js handles by
  // re-rendering the existing component instance rather than remounting it -
  // a useState initializer wouldn't re-run and the tab would stay stale.
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab: "discussions" | "reports" = searchParams.get("tab") === "reports" ? "reports" : "discussions";
  const setActiveTab = (tab: "discussions" | "reports") => {
    router.push(tab === "reports" ? "/admin-dashboard/community?tab=reports" : "/admin-dashboard/community");
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <MessageSquare className="w-6 h-6" /> Community Moderation
          </h1>
          <p className="text-slate-500 mt-1">Manage discussions, replies, and reports from the Loksewa Community.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("discussions")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "discussions" ? "text-[#0B2545]" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Discussions
          {activeTab === "discussions" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4A72C] rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "reports" ? "text-[#0B2545]" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Reports
          {activeTab === "reports" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4A72C] rounded-t-full" />
          )}
        </button>
      </div>

      <div>
        {activeTab === "discussions" ? <DiscussionsTab /> : <ReportsTab />}
      </div>
    </div>
  );
}

export default function AdminCommunityPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <AdminCommunityPageInner />
    </Suspense>
  );
}
