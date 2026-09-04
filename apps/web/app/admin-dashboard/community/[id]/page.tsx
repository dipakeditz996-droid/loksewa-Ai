"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, ArrowLeft, MessageSquare, Pin, Lock,
  Trash2, Eye, EyeOff, ShieldAlert, Check, MoreVertical, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "react-hot-toast";
import { communityApi, CommunityPostDetail, CommunityReply } from "@/lib/api/community";

export default function AdminDiscussionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<CommunityPostDetail | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [loading, setLoading] = useState(true);
  // Guards against firing the error toast + redirect more than once - React's
  // dev-mode Strict Mode double-invokes this effect, which would otherwise
  // fire two independent failed loadData() calls and stack two toasts.
  const hasFailedRef = useRef(false);

  const fetchOnce = useCallback(
    () => Promise.all([communityApi.getPost(postId), communityApi.getReplies(postId)]),
    [postId]
  );

  const giveUp = useCallback((err: unknown) => {
    console.error("Failed to load discussion", err);
    if (!hasFailedRef.current) {
      hasFailedRef.current = true;
      toast.error("Failed to load discussion.");
      router.push("/admin-dashboard/community");
    }
    setLoading(false);
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [postData, repliesData] = await fetchOnce();
      hasFailedRef.current = false;
      setPost(postData);
      setReplies(Array.isArray(repliesData) ? repliesData : repliesData.results);
      setLoading(false);
    } catch (err: any) {
      // A 404 is a real "this post is gone" - anything else (network drop,
      // 401/500 from the dev backend mid-autoreload) is worth one retry
      // before giving up, since those are transient in this dev environment.
      if (err?.status === 404) {
        giveUp(err);
        return;
      }
      await new Promise((r) => setTimeout(r, 800));
      try {
        const [postData, repliesData] = await fetchOnce();
        hasFailedRef.current = false;
        setPost(postData);
        setReplies(Array.isArray(repliesData) ? repliesData : repliesData.results);
        setLoading(false);
      } catch (retryErr) {
        giveUp(retryErr);
      }
    }
  }, [fetchOnce, giveUp]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTogglePin = async () => {
    try {
      await communityApi.pinPost(postId);
      toast.success(post?.is_pinned ? "Post unpinned." : "Post pinned.");
      loadData();
    } catch {
      toast.error("Failed to pin/unpin post.");
    }
  };

  const handleToggleLock = async () => {
    try {
      await communityApi.lockPost(postId);
      toast.success(post?.is_locked ? "Discussion unlocked." : "Discussion locked.");
      loadData();
    } catch {
      toast.error("Failed to lock/unlock discussion.");
    }
  };

  const handleToggleRemovePost = async () => {
    try {
      if (post?.status === "published") {
        await communityApi.moderateRemovePost(postId);
        toast.success("Post removed.");
      } else {
        await communityApi.moderateRestorePost(postId);
        toast.success("Post restored.");
      }
      loadData();
    } catch {
      toast.error("Failed to change post status.");
    }
  };

  const handleToggleRemoveReply = async (replyId: number, currentStatus: string) => {
    try {
      if (currentStatus === "published") {
        await communityApi.moderateRemoveReply(replyId);
        toast.success("Reply removed.");
      } else {
        await communityApi.moderateRestoreReply(replyId);
        toast.success("Reply restored.");
      }
      loadData();
    } catch {
      toast.error("Failed to change reply status.");
    }
  };

  const handleToggleBestAnswer = async (replyId: number, isCurrentlyBest: boolean) => {
    try {
      if (isCurrentlyBest) {
        await communityApi.unmarkBest(replyId);
        toast.success("Best answer removed.");
      } else {
        await communityApi.markBest(replyId);
        toast.success("Marked as best answer.");
      }
      loadData();
    } catch {
      toast.error("Failed to update best answer.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4A72C]" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      <Link 
        href="/admin-dashboard/community" 
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#0B2545] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Community
      </Link>

      {/* Post Header Card */}
      <div className={`bg-white rounded-xl border ${post.status === 'removed' ? 'border-red-200 bg-red-50/30' : 'border-slate-200'} p-6 shadow-sm`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {post.status === "removed" && (
                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-none">
                  <EyeOff className="w-3 h-3 mr-1" /> Removed
                </Badge>
              )}
              {post.is_pinned && (
                <Badge variant="secondary" className="bg-[#FFF8E7] text-[#D4A72C] hover:bg-[#FFF3D4] border-[#D4A72C]/20">
                  <Pin className="w-3 h-3 mr-1" /> Pinned
                </Badge>
              )}
              {post.is_locked && (
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200">
                  <Lock className="w-3 h-3 mr-1" /> Locked
                </Badge>
              )}
              <Badge variant="outline" className="border-slate-200 text-slate-500 uppercase tracking-wider bg-slate-50">
                {post.post_type}
              </Badge>
              {post.topic && (
                <Badge variant="outline" className="border-blue-100 text-blue-600 bg-blue-50/50">
                  {post.topic.name}
                </Badge>
              )}
            </div>
            <h1 className={`text-2xl font-bold ${post.status === "removed" ? "text-slate-400 line-through" : "text-[#0B2545]"}`}>
              {post.title}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
              <span className="font-medium text-slate-700">{post.author.name}</span>
              <Badge variant="outline" className="text-[9px] uppercase tracking-wider h-4 px-1">{post.author.role}</Badge>
              <span>•</span>
              <span>{new Date(post.created_at).toLocaleString()}</span>
            </div>
          </div>
          
          <div className="shrink-0 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTogglePin}
              className={post.is_pinned ? "bg-[#FFF8E7] border-[#D4A72C]/50 text-[#D4A72C]" : ""}
            >
              <Pin className="w-4 h-4 mr-1.5" />
              {post.is_pinned ? "Unpin" : "Pin"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleToggleLock}
              className={post.is_locked ? "bg-slate-100 border-slate-300 text-slate-700" : ""}
            >
              <Lock className="w-4 h-4 mr-1.5" />
              {post.is_locked ? "Unlock" : "Lock"}
            </Button>
            <Button 
              variant={post.status === "published" ? "destructive" : "default"} 
              size="sm" 
              onClick={handleToggleRemovePost}
              className={post.status === "removed" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {post.status === "published" ? (
                <><EyeOff className="w-4 h-4 mr-1.5" /> Hide</>
              ) : (
                <><Eye className="w-4 h-4 mr-1.5" /> Restore</>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-6 prose prose-slate max-w-none text-slate-700 text-sm">
          {post.body}
        </div>

        {post.source_question && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Linked Question Context
            </p>
            <p className="text-sm font-medium text-slate-800">{post.source_question.text}</p>
          </div>
        )}
      </div>

      {/* Replies Section */}
      <div>
        <h3 className="text-lg font-bold text-[#0B2545] mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" /> Replies ({replies.length})
        </h3>
        
        {replies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm">No replies yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...replies]
              .sort((a, b) => Number(b.is_best_answer) - Number(a.is_best_answer))
              .map(reply => (
              <div 
                key={reply.id} 
                className={`bg-white rounded-xl border ${reply.is_best_answer ? 'border-emerald-200 ring-1 ring-emerald-200' : 'border-slate-200'} ${reply.status === 'removed' ? 'opacity-70 bg-slate-50' : ''} p-5`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-semibold text-sm text-slate-900">{reply.author.name}</span>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-wider h-4 px-1">{reply.author.role}</Badge>
                    <span className="text-xs text-slate-400 mx-1">•</span>
                    <span className="text-xs text-slate-400">{new Date(reply.created_at).toLocaleString()}</span>
                    
                    {reply.is_best_answer && (
                      <Badge className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">
                        <Check className="w-3 h-3 mr-1" /> Best Answer
                      </Badge>
                    )}
                    {reply.status === 'removed' && (
                      <Badge variant="destructive" className="ml-2 bg-red-100 text-red-700 border-none">
                        Removed
                      </Badge>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {reply.is_best_answer ? (
                        <DropdownMenuItem onClick={() => handleToggleBestAnswer(reply.id, true)} className="text-slate-600 font-medium">
                          <Award className="w-4 h-4 mr-2" /> Unmark Best Answer
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleToggleBestAnswer(reply.id, false)} className="text-emerald-600 font-medium">
                          <Award className="w-4 h-4 mr-2" /> Mark as Best Answer
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {reply.status === 'published' ? (
                        <DropdownMenuItem onClick={() => handleToggleRemoveReply(reply.id, reply.status)} className="text-red-600 font-medium">
                          <EyeOff className="w-4 h-4 mr-2" /> Hide Reply
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleToggleRemoveReply(reply.id, reply.status)} className="text-emerald-600 font-medium">
                          <Eye className="w-4 h-4 mr-2" /> Restore Reply
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className={`text-sm ${reply.status === 'removed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {reply.body}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
