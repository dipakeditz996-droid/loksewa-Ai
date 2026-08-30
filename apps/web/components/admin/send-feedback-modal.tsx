"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MessageSquarePlus, AlertCircle, CheckCircle2, PlayCircle, Loader2, Clock } from "lucide-react";
import {
  adminStudentFeedbackApi,
  StudentFeedbackEntry,
} from "@/lib/api/admin-leaderboard";
import { ApiError } from "@/lib/api/client";

interface Props {
  open: boolean;
  onClose: () => void;
  student: { id: number; name: string; email: string } | null;
}

export function SendFeedbackModal({ open, onClose, student }: Props) {
  const [message, setMessage] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [history, setHistory] = useState<StudentFeedbackEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!open || !student) return;
    setHistoryLoading(true);
    adminStudentFeedbackApi
      .list(student.id)
      .then((res) => setHistory(res.results))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [open, student]);

  const handleClose = () => {
    if (sending) return;
    setMessage("");
    setYoutubeUrl("");
    setError(null);
    setSuccess(false);
    setHistory([]);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const trimmedMessage = message.trim();
    const trimmedUrl = youtubeUrl.trim();
    if (!trimmedMessage && !trimmedUrl) {
      setError("Enter feedback text, a YouTube link, or both.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const created = await adminStudentFeedbackApi.send(student.id, {
        message: trimmedMessage || undefined,
        youtube_url: trimmedUrl || undefined,
      });
      setHistory((h) => [created, ...h]);
      setMessage("");
      setYoutubeUrl("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1800);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Failed to send feedback. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden rounded-2xl border border-slate-200 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-[#0B2545] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <MessageSquarePlus className="h-4 w-4 text-white" />
            </div>
            <DialogTitle className="text-[15px] font-bold text-white">
              Feedback for {student.name}
            </DialogTitle>
          </div>
          <p className="text-[12px] text-white/60 mt-1 ml-11">{student.email}</p>
        </DialogHeader>

        <div className="overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-4">
              {success && (
                <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-sm font-medium text-emerald-700">
                    Feedback sent. The student has been notified.
                  </p>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="fb-message" className="block text-[12px] font-semibold text-slate-600">
                  Feedback message
                </label>
                <textarea
                  id="fb-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Great improvement this month, keep focusing on speed in the GK section."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]/40 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="fb-youtube" className="block text-[12px] font-semibold text-slate-600">
                  YouTube video link (optional)
                </label>
                <div className="relative">
                  <PlayCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="fb-youtube"
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtu.be/..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]/40"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 pb-4 pt-2 gap-2 flex-row justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#0B2545] rounded-lg hover:bg-[#163E6C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <MessageSquarePlus className="h-4 w-4" />
                    Send Feedback
                  </>
                )}
              </button>
            </DialogFooter>
          </form>

          <div className="px-6 pb-6 pt-2 border-t border-slate-100">
            <p className="text-[12px] font-semibold text-slate-500 mb-2">Previously sent</p>
            {historyLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-400">No feedback sent to this student yet.</p>
            ) : (
              <ul className="space-y-3 max-h-48 overflow-y-auto">
                {history.map((entry) => (
                  <li key={entry.id} className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3">
                    {entry.message && (
                      <p className="text-slate-700 whitespace-pre-wrap">{entry.message}</p>
                    )}
                    {entry.youtube_url && (
                      <a
                        href={entry.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-red-600 hover:underline"
                      >
                        <PlayCircle className="h-3 w-3" /> Watch video
                      </a>
                    )}
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.created_at).toLocaleString()}
                      {entry.given_by && <span>· {entry.given_by}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
