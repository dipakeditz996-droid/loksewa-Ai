"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Star, PenLine, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { testimonialsApi, MyTestimonial } from "@/lib/api/testimonials";
import toast from "react-hot-toast";

export function WriteReviewDialog() {
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<MyTestimonial | null>(null);

  const [roleTitle, setRoleTitle] = useState("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);

  // Already logged in → open straight into the form, using the session the
  // student already has. Only a logged-out visitor sees a login link instead.
  const openDialog = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const mine = await testimonialsApi.getMine();
      setExisting(mine);
      if (mine) {
        setRoleTitle(mine.role_title || "");
        setQuote(mine.quote || "");
        setRating(mine.rating || 5);
      } else {
        setRoleTitle("");
        setQuote("");
        setRating(5);
      }
    } catch (err) {
      console.error("Failed to load your review", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!quote.trim()) {
      toast.error("Please write your review first.");
      return;
    }
    setSubmitting(true);
    try {
      const saved = await testimonialsApi.submit({
        role_title: roleTitle.trim(),
        quote: quote.trim(),
        rating,
      });
      setExisting(saved);
      toast.success(existing ? "Review updated — awaiting admin approval." : "Thanks! Your review is awaiting admin approval.");
    } catch (err) {
      console.error("Failed to submit review", err);
      toast.error("Couldn't submit your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <Link href="/login">
        <Button
          variant="outline"
          className="border-slate-300 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 bg-transparent h-[44px] px-6 rounded-[10px] font-[600] text-[14px] flex items-center gap-2"
        >
          <PenLine className="w-4 h-4" />
          Write a Review
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={openDialog}
        className="border-slate-300 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 bg-transparent h-[44px] px-6 rounded-[10px] font-[600] text-[14px] flex items-center gap-2"
      >
        <PenLine className="w-4 h-4" />
        {existing ? "Edit Your Review" : "Write a Review"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{existing ? "Edit Your Review" : "Share Your Experience"}</DialogTitle>
            <DialogDescription>
              Your review is shown on the homepage only after an admin approves it.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {existing && (
                <div
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                    existing.is_published
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                  }`}
                >
                  {existing.is_published ? (
                    <><CheckCircle2 className="w-4 h-4" /> Live on the homepage</>
                  ) : (
                    <><Clock className="w-4 h-4" /> Awaiting admin approval</>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block">Your Role / Result (optional)</label>
                <Input
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Section Officer (Recommended)"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Your Review</label>
                <Textarea
                  rows={4}
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  placeholder="Tell other aspirants about your experience..."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      className="p-0.5"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          n <= rating ? "fill-[#D4A72C] text-[#D4A72C]" : "text-slate-300 dark:text-slate-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Close
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || loading}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {existing ? "Save Changes" : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
