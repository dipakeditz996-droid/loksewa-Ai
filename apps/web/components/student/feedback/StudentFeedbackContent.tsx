"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MessageSquareHeart,
  Loader2,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  Plus,
  X,
  CheckCircle2,
  Award,
  Sparkles,
} from "lucide-react";
import {
  studentFeedbackApi,
  StudentFeedbackEntry,
  extractYoutubeId,
} from "@/lib/api/student-feedback";
import { ApiError } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

// Client-side cache to make tab switching 0ms instantaneous
let cachedFeedbackData: Record<number, { results: StudentFeedbackEntry[]; totalPages: number; timestamp: number }> = {};

function FeedbackVideo({ url }: { url: string }) {
  const videoId = extractYoutubeId(url);
  if (!videoId) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
        Watch video
      </a>
    );
  }
  return (
    <div className="mt-3 aspect-video w-full max-w-md overflow-hidden rounded-lg border border-border">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title="Feedback video"
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function FeedbackSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <div className="flex items-center gap-2 pt-2">
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function StudentFeedbackContent() {
  const [entries, setEntries] = useState<StudentFeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Send Feedback modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchFeedback = useCallback(async (isBackground = false) => {
    // Check in-memory cache for instant warm rendering
    const cached = cachedFeedbackData[page];
    if (cached && !isBackground) {
      setEntries(cached.results);
      setTotalPages(cached.totalPages);
      setLoading(false);
      // If cached less than 60s ago, skip background refetch
      if (Date.now() - cached.timestamp < 60_000) {
        return;
      }
    }

    if (!cached) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await studentFeedbackApi.list(page);
      setEntries(res.results);
      setTotalPages(res.total_pages);
      cachedFeedbackData[page] = {
        results: res.results,
        totalPages: res.total_pages,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      if (!cached) {
        setError(err instanceof ApiError ? err.message : "Unable to load feedback.");
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleOpenModal = () => {
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!submitting) {
      setModalOpen(false);
      setSubmitError(null);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = feedbackText.trim();
    if (!msg) {
      setSubmitError("Please write your feedback or question.");
      return;
    }
    if (msg.length < 5) {
      setSubmitError("Feedback must be at least 5 characters long.");
      return;
    }
    if (msg.length > 2500) {
      setSubmitError("Feedback cannot exceed 2500 characters.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const newEntry = await studentFeedbackApi.submit(msg);
      toast.success("Feedback submitted to evaluators successfully!");
      setFeedbackText("");
      setModalOpen(false);

      // Prepend to current entries
      setEntries((prev) => [newEntry, ...prev]);

      // Invalidate cache and background refresh
      delete cachedFeedbackData[1];
      fetchFeedback(true);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : (err?.message || "Failed to submit feedback. Please try again.");
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subheader with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquareHeart className="w-6 h-6 text-primary" />
            Teacher Feedback & Communication
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Personal notes, recommendations, and video feedback your evaluators have provided on your submissions.
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90 transition-colors shadow-sm self-start sm:self-auto shrink-0"
        >
          <Send className="w-4 h-4" />
          Send Feedback Note
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          <FeedbackSkeleton />
          <FeedbackSkeleton />
          <FeedbackSkeleton />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
          <p className="font-semibold text-foreground">{error}</p>
          <button
            onClick={() => fetchFeedback()}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border text-foreground hover:bg-muted"
          >
            Retry
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/60 p-12 text-center">
          <MessageSquareHeart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-bold text-foreground text-base">No feedback yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            When an evaluator sends you a note, or when you submit feedback to faculty, it will show up here.
          </p>
          <button
            onClick={handleOpenModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Send Your First Feedback Note
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const isStudent = Boolean(entry.is_from_student);
            return (
              <div
                key={entry.id}
                className={`rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
                  isStudent
                    ? "bg-muted/30 border-primary/20"
                    : "bg-card border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isStudent
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {isStudent ? (
                        <>
                          <Send className="w-3 h-3" /> Sent by You
                        </>
                      ) : (
                        <>
                          <Award className="w-3 h-3" /> Evaluator Feedback
                        </>
                      )}
                    </span>
                    {entry.given_by && !isStudent && (
                      <span className="text-xs font-medium text-foreground">
                        from {entry.given_by}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(entry.created_at).toLocaleString()}
                  </div>
                </div>

                {entry.message && (
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm mt-2">
                    {entry.message}
                  </p>
                )}
                {entry.youtube_url && <FeedbackVideo url={entry.youtube_url} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-1.5 text-sm font-medium border border-border rounded-lg disabled:opacity-40 flex items-center gap-1 text-foreground bg-card hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-xs font-medium text-muted-foreground px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3.5 py-1.5 text-sm font-medium border border-border rounded-lg disabled:opacity-40 flex items-center gap-1 text-foreground bg-card hover:bg-muted transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Send Feedback Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 relative">
            <button
              onClick={handleCloseModal}
              disabled={submitting}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Send className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-foreground">Send Feedback Note</h3>
                <p className="text-xs text-muted-foreground">
                  Send a question, request, or comment directly to your evaluators and faculty.
                </p>
              </div>
            </div>

            {submitError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitFeedback} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Your Message
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share your thoughts on evaluations, ask a question about your score, or request guidance on specific subjects..."
                  rows={5}
                  disabled={submitting}
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                  <span>Minimum 5 characters</span>
                  <span>{feedbackText.length} / 2500</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || feedbackText.trim().length < 5}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Feedback
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
