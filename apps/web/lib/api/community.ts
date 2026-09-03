import { apiClient } from "./client";

export interface CommunityAuthor {
  id: number;
  username: string;
  name: string;
  role: "student" | "teacher" | "admin" | "super-admin";
  avatar: string | null;
}

export interface CommunityTopic {
  id: number;
  name: string;
  subject_name: string;
}

export interface CommunitySourceQuestion {
  id: number;
  question_id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

export interface CommunityPostListItem {
  id: number;
  title: string;
  post_type: "question" | "discussion";
  author: CommunityAuthor;
  topic: CommunityTopic | null;
  status: "published" | "removed";
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  has_best_answer: boolean;
  created_at: string;
}

export interface CommunityPostDetail extends CommunityPostListItem {
  body: string;
  source_question: CommunitySourceQuestion | null;
  is_bookmarked_by_me: boolean;
  updated_at: string;
}

export interface CommunityReply {
  id: number;
  post: number;
  author: CommunityAuthor;
  body: string;
  parent_reply: number | null;
  is_best_answer: boolean;
  status: "published" | "removed";
  helpful_count: number;
  is_helpful_by_me: boolean;
  child_replies: CommunityReply[];
  created_at: string;
  updated_at: string;
}

export interface CommunityReport {
  id: number;
  reporter: CommunityAuthor;
  post: number | null;
  post_title: string | null;
  reply: number | null;
  reply_excerpt: string | null;
  reply_post_id: number | null;
  reason: "spam" | "offensive" | "wrong_info" | "other";
  detail: string;
  status: "open" | "resolved" | "dismissed";
  resolved_by: number | null;
  resolved_at: string | null;
  created_at: string;
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CommunityPostFilters {
  search?: string;
  topic?: number;
  subject?: number;
  post_type?: "question" | "discussion";
  unanswered?: boolean;
  mine?: boolean;
  bookmarked?: boolean;
  ordering?: "most_replies";
  page?: number;
  status?: string;
}

function buildQuery(filters: CommunityPostFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const communityApi = {
  getPosts: (filters?: CommunityPostFilters) =>
    apiClient<Paginated<CommunityPostListItem>>(`/community/posts/${buildQuery(filters)}`),

  getPost: (id: number | string) => apiClient<CommunityPostDetail>(`/community/posts/${id}/`),

  createPost: (data: {
    title: string;
    body: string;
    post_type: "question" | "discussion";
    topic?: number | null;
    source_question?: number | null;
  }) =>
    apiClient<CommunityPostDetail>("/community/posts/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePost: (id: number | string, data: Partial<{ title: string; body: string }>) =>
    apiClient<CommunityPostDetail>(`/community/posts/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deletePost: (id: number | string) =>
    apiClient<void>(`/community/posts/${id}/`, { method: "DELETE" }),

  toggleBookmark: (id: number | string) =>
    apiClient<{ bookmarked: boolean }>(`/community/posts/${id}/toggle_bookmark/`, { method: "POST" }),

  reportPost: (id: number | string, reason: string, detail?: string) =>
    apiClient<CommunityReport>(`/community/posts/${id}/report/`, {
      method: "POST",
      body: JSON.stringify({ reason, detail }),
    }),

  pinPost: (id: number | string) =>
    apiClient<{ is_pinned: boolean }>(`/community/posts/${id}/pin/`, { method: "POST" }),

  lockPost: (id: number | string) =>
    apiClient<{ is_locked: boolean }>(`/community/posts/${id}/lock/`, { method: "POST" }),

  moderateRemovePost: (id: number | string) =>
    apiClient<{ status: string }>(`/community/posts/${id}/moderate_remove/`, { method: "POST" }),

  moderateRestorePost: (id: number | string) =>
    apiClient<{ status: string }>(`/community/posts/${id}/moderate_restore/`, { method: "POST" }),

  getReplies: (postId: number | string) =>
    apiClient<Paginated<CommunityReply> | CommunityReply[]>(`/community/replies/?post=${postId}`),

  createReply: (data: { post: number; body: string; parent_reply?: number | null }) =>
    apiClient<CommunityReply>("/community/replies/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateReply: (id: number | string, body: string) =>
    apiClient<CommunityReply>(`/community/replies/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    }),

  deleteReply: (id: number | string) =>
    apiClient<void>(`/community/replies/${id}/`, { method: "DELETE" }),

  toggleHelpful: (id: number | string) =>
    apiClient<{ is_helpful: boolean; helpful_count: number }>(`/community/replies/${id}/toggle_helpful/`, {
      method: "POST",
    }),

  markBest: (id: number | string) =>
    apiClient<CommunityReply>(`/community/replies/${id}/mark_best/`, { method: "POST" }),

  unmarkBest: (id: number | string) =>
    apiClient<CommunityReply>(`/community/replies/${id}/unmark_best/`, { method: "POST" }),

  reportReply: (id: number | string, reason: string, detail?: string) =>
    apiClient<CommunityReport>(`/community/replies/${id}/report/`, {
      method: "POST",
      body: JSON.stringify({ reason, detail }),
    }),

  moderateRemoveReply: (id: number | string) =>
    apiClient<{ status: string }>(`/community/replies/${id}/moderate_remove/`, { method: "POST" }),

  moderateRestoreReply: (id: number | string) =>
    apiClient<{ status: string }>(`/community/replies/${id}/moderate_restore/`, { method: "POST" }),

  getBookmarks: () => apiClient<Paginated<{ id: number; post: CommunityPostListItem; created_at: string }>>("/community/bookmarks/"),

  getReports: (status: string = "open") =>
    apiClient<Paginated<CommunityReport> | CommunityReport[]>(`/community/reports/?status=${status}`),

  resolveReport: (id: number | string) =>
    apiClient<CommunityReport>(`/community/reports/${id}/resolve/`, { method: "POST" }),

  dismissReport: (id: number | string) =>
    apiClient<CommunityReport>(`/community/reports/${id}/dismiss/`, { method: "POST" }),
};
