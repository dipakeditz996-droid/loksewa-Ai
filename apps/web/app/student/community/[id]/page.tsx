"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Eye, Pin, Lock, CheckCircle2, ThumbsUp, Bookmark, Flag,
  Trash2, ShieldAlert, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { communityApi, CommunityPostDetail, CommunityReply } from "@/lib/api/community";

const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "offensive", label: "Offensive / Inappropriate" },
  { value: "wrong_info", label: "Incorrect Information" },
  { value: "other", label: "Other" },
];

function RoleBadge({ role }: { role: string }) {
  if (role === "teacher") {
    return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold">Teacher</Badge>;
  }
  if (role === "admin" || role === "super-admin") {
    return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold">Admin</Badge>;
  }
  return null;
}

function ReplyCard({
  reply, postAuthorId, isAdmin, currentUserId, onMarkBest, onHelpful, onReport, onRemove, depth = 0,
}: {
  reply: CommunityReply;
  postAuthorId: number;
  isAdmin: boolean;
  currentUserId: number | undefined;
  onMarkBest: (id: number) => void;
  onHelpful: (id: number) => void;
  onReport: (id: number) => void;
  onRemove: (id: number) => void;
  depth?: number;
}) {
  const canMarkBest = currentUserId === postAuthorId || isAdmin;
  return (
    <div className={depth > 0 ? "ml-8 mt-3 border-l-2 border-border pl-4" : ""}>
      <div className={`rounded-xl p-4 border ${reply.is_best_answer ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800" : "bg-card border-border"}`}>
        {reply.is_best_answer && (
          <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400 text-xs font-bold mb-2">
            <CheckCircle2 className="w-4 h-4" /> Best Answer
          </div>
        )}
        <p className="text-foreground whitespace-pre-wrap text-sm">{reply.body}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{reply.author.name}</span>
            <RoleBadge role={reply.author.role} />
            <span>·</span>
            <span>{new Date(reply.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onHelpful(reply.id)}
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
                reply.is_helpful_by_me ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> {reply.helpful_count > 0 ? reply.helpful_count : "Helpful"}
            </button>
            {!reply.is_best_answer && canMarkBest && (
              <button onClick={() => onMarkBest(reply.id)} className="text-xs font-semibold text-muted-foreground hover:text-green-600">
                Mark Best
              </button>
            )}
            <button onClick={() => onReport(reply.id)} className="text-muted-foreground hover:text-red-500" title="Report">
              <Flag className="w-3.5 h-3.5" />
            </button>
            {isAdmin && (
              <button onClick={() => onRemove(reply.id)} className="text-muted-foreground hover:text-red-500" title="Remove (moderator)">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
      {reply.child_replies?.map((child) => (
        <ReplyCard
          key={child.id} reply={child} postAuthorId={postAuthorId} isAdmin={isAdmin}
          currentUserId={currentUserId} onMarkBest={onMarkBest} onHelpful={onHelpful}
          onReport={onReport} onRemove={onRemove} depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super-admin";

  const [post, setPost] = useState<CommunityPostDetail | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "post" | "reply"; id: number } | null>(null);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetail, setReportDetail] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [postData, repliesData] = await Promise.all([
        communityApi.getPost(id),
        communityApi.getReplies(id),
      ]);
      setPost(postData);
      setReplies(Array.isArray(repliesData) ? repliesData : repliesData.results);
    } catch (err: any) {
      setError(err.message || "This discussion could not be found.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (replyBody.trim().length < 2) return;
    setSubmitting(true);
    try {
      await communityApi.createReply({ post: Number(id), body: replyBody.trim() });
      setReplyBody("");
      toast.success("Reply posted!");
      load();
    } catch (err: any) {
      toast.error(err.message || err.detail || "Failed to post reply.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkBest = async (replyId: number) => {
    try {
      await communityApi.markBest(replyId);
      toast.success("Marked as best answer!");
      load();
    } catch (err: any) {
      toast.error(err.message || err.detail || "Failed to mark best answer.");
    }
  };

  const handleHelpful = async (replyId: number) => {
    try {
      await communityApi.toggleHelpful(replyId);
      load();
    } catch {
      toast.error("Failed to update.");
    }
  };

  const handleReportReply = (replyId: number) => {
    setReportReason("spam");
    setReportDetail("");
    setReportTarget({ type: "reply", id: replyId });
  };

  const handleSubmitReport = async () => {
    if (!reportTarget) return;
    setReportSubmitting(true);
    try {
      if (reportTarget.type === "post") {
        await communityApi.reportPost(reportTarget.id, reportReason, reportDetail.trim());
      } else {
        await communityApi.reportReply(reportTarget.id, reportReason, reportDetail.trim());
      }
      toast.success("Reported. A moderator will review it.");
      setReportTarget(null);
    } catch {
      toast.error("Failed to submit report.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleRemoveReply = async (replyId: number) => {
    if (!confirm("Remove this reply?")) return;
    try {
      await communityApi.moderateRemoveReply(replyId);
      toast.success("Reply removed.");
      load();
    } catch {
      toast.error("Failed to remove reply.");
    }
  };

  const handleBookmark = async () => {
    if (!post) return;
    try {
      const res = await communityApi.toggleBookmark(post.id);
      setPost({ ...post, is_bookmarked_by_me: res.bookmarked });
      toast.success(res.bookmarked ? "Bookmarked" : "Bookmark removed");
    } catch {
      toast.error("Failed to update bookmark.");
    }
  };

  const handleReportPost = () => {
    if (!post) return;
    setReportReason("spam");
    setReportDetail("");
    setReportTarget({ type: "post", id: post.id });
  };

  const handlePin = async () => {
    if (!post) return;
    const res = await communityApi.pinPost(post.id);
    setPost({ ...post, is_pinned: res.is_pinned });
  };

  const handleLock = async () => {
    if (!post) return;
    const res = await communityApi.lockPost(post.id);
    setPost({ ...post, is_locked: res.is_locked });
  };

  const handleRemovePost = async () => {
    if (!post || !confirm("Remove this post?")) return;
    await communityApi.moderateRemovePost(post.id);
    toast.success("Post removed.");
    router.push("/student/community");
  };

  if (loading) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>;
  }
  if (error || !post) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-16">
        <p className="text-foreground font-semibold">{error || "Discussion not found."}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/student/community")}>
          Back to Community
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push("/student/community")}>
        <ArrowLeft className="w-4 h-4" /> Back to Community
      </Button>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {post.is_pinned && <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><Pin className="w-3.5 h-3.5" /> Pinned</span>}
          {post.is_locked && <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Lock className="w-3.5 h-3.5" /> Locked</span>}
          <Badge variant="outline" className="text-[10px] uppercase">{post.post_type}</Badge>
          {post.topic && <span className="text-[11px] text-muted-foreground">{post.topic.subject_name} · {post.topic.name}</span>}
        </div>

        <h1 className="text-xl font-bold text-foreground">{post.title}</h1>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span className="font-medium">{post.author.name}</span>
          <RoleBadge role={post.author.role} />
          <span>·</span>
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.view_count} views</span>
        </div>

        {post.source_question && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border text-sm">
            <p className="text-[11px] font-bold uppercase text-muted-foreground mb-1">Original Exam Question</p>
            <p className="text-foreground">{post.source_question.text}</p>
          </div>
        )}

        <p className="mt-4 text-foreground whitespace-pre-wrap">{post.body}</p>

        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border flex-wrap">
          <Button
            variant={post.is_bookmarked_by_me ? "default" : "outline"}
            size="sm"
            onClick={handleBookmark}
            className="gap-1.5"
          >
            <Bookmark className="w-3.5 h-3.5" /> {post.is_bookmarked_by_me ? "Bookmarked" : "Bookmark"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReportPost} className="gap-1.5">
            <Flag className="w-3.5 h-3.5" /> Report
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={handlePin} className="gap-1.5">
                <Pin className="w-3.5 h-3.5" /> {post.is_pinned ? "Unpin" : "Pin"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleLock} className="gap-1.5">
                <Lock className="w-3.5 h-3.5" /> {post.is_locked ? "Unlock" : "Lock"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRemovePost} className="gap-1.5 text-red-600">
                <ShieldAlert className="w-3.5 h-3.5" /> Remove
              </Button>
            </>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">
          {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
        </h2>
        {replies.length === 0 ? (
          <div className="text-center py-10 bg-card border border-border rounded-xl text-muted-foreground text-sm">
            No replies yet. Be the first to help!
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => (
              <ReplyCard
                key={reply.id} reply={reply} postAuthorId={post.author.id} isAdmin={isAdmin}
                currentUserId={user ? Number(user.id) : undefined}
                onMarkBest={handleMarkBest} onHelpful={handleHelpful}
                onReport={handleReportReply} onRemove={handleRemoveReply}
              />
            ))}
          </div>
        )}
      </div>

      {post.is_locked && !isAdmin ? (
        <div className="text-center py-4 text-sm text-muted-foreground bg-muted/50 rounded-xl border border-border">
          This discussion is locked. No new replies can be added.
        </div>
      ) : (
        <form onSubmit={handleReply} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <Textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a helpful reply..."
            className="min-h-[100px] bg-background"
          />
          <Button type="submit" disabled={submitting || replyBody.trim().length < 2} className="gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Post Reply
          </Button>
        </form>
      )}

      <Dialog open={!!reportTarget} onOpenChange={(open) => !open && setReportTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {reportTarget?.type === "post" ? "this post" : "this reply"}</DialogTitle>
            <DialogDescription>
              Let a moderator know what's wrong. They'll review it and take action if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Reason</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReportReason(r.value)}
                    className={`text-sm px-3 py-2 rounded-lg border text-left transition-colors ${
                      reportReason === r.value
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Details (optional)</label>
              <Textarea
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value)}
                placeholder="Add any extra context for the moderator..."
                className="min-h-[80px] bg-background mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportTarget(null)} disabled={reportSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReport} disabled={reportSubmitting} className="gap-2">
              {reportSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
