"use client";

import { useEffect, useState } from "react";
import { MessageSquareHeart, Loader2, AlertCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { studentFeedbackApi, StudentFeedbackEntry, extractYoutubeId } from "@/lib/api/student-feedback";
import { ApiError } from "@/lib/api/client";

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

export default function StudentFeedbackPage() {
  const [entries, setEntries] = useState<StudentFeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    studentFeedbackApi
      .list(page)
      .then((res) => {
        if (cancelled) return;
        setEntries(res.results);
        setTotalPages(res.total_pages);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Unable to load feedback.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <MessageSquareHeart className="w-6 h-6 text-primary" />
          Feedback From Your Evaluators
        </h1>
        <p className="text-muted-foreground mt-1">
          Personal notes and videos your evaluators have sent you.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive mb-3" />
          <p className="font-semibold text-foreground">{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <MessageSquareHeart className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-semibold text-foreground">No feedback yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            When an evaluator sends you a note or video, it will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              {entry.message && (
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{entry.message}</p>
              )}
              {entry.youtube_url && <FeedbackVideo url={entry.youtube_url} />}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {new Date(entry.created_at).toLocaleString()}
                {entry.given_by && <span>· {entry.given_by}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 flex items-center gap-1 text-foreground"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 flex items-center gap-1 text-foreground"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
