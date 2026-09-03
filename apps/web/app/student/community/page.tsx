"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, MessageSquare, Eye, Pin, Lock, CheckCircle2, Loader2, Users, Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { communityApi, CommunityPostListItem } from "@/lib/api/community";

function RoleBadge({ role }: { role: string }) {
  if (role === "teacher") {
    return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold">Teacher</Badge>;
  }
  if (role === "admin" || role === "super-admin") {
    return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold">Admin</Badge>;
  }
  return null;
}

const FILTERS = [
  { key: "all", label: "All Discussions" },
  { key: "unanswered", label: "Unanswered" },
  { key: "mine", label: "My Posts" },
  { key: "bookmarked", label: "Bookmarked" },
];

export default function CommunityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityPostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const filters: Record<string, any> = {};
      if (search.trim()) filters.search = search.trim();
      if (activeFilter === "unanswered") filters.unanswered = true;
      if (activeFilter === "mine") filters.mine = true;
      if (activeFilter === "bookmarked") filters.bookmarked = true;
      const data = await communityApi.getPosts(filters);
      setPosts(data.results);
    } catch (err: any) {
      setError(err.message || "Failed to load community posts.");
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchPosts, 300);
    return () => clearTimeout(timer);
  }, [fetchPosts]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-primary dark:text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6" /> Community
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Ask questions, discuss tricky concepts, and learn from teachers and fellow aspirants.
          </p>
        </div>
        <Button onClick={() => router.push("/student/community/ask")} className="gap-2">
          <Plus className="w-4 h-4" /> Ask Question
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search discussions by title or content..."
          className="pl-10 h-11 bg-card border-border"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border ${
              activeFilter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-400 text-sm text-center">
          {error}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-foreground font-semibold">No discussions found</p>
          <p className="text-muted-foreground text-sm mt-1">Be the first to ask a question or start a discussion.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/student/community/${post.id}`}
              className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {post.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                    {post.is_locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    <Badge variant="outline" className="text-[10px] uppercase">{post.post_type}</Badge>
                    {post.topic && (
                      <span className="text-[11px] text-muted-foreground">{post.topic.subject_name} · {post.topic.name}</span>
                    )}
                    {post.has_best_answer && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Answered
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground truncate">{post.title}</h3>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="font-medium">{post.author.name}</span>
                    <RoleBadge role={post.author.role} />
                    <span>·</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 text-muted-foreground text-xs">
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {post.reply_count}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {post.view_count}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
