"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";

// Client-only dynamic import so heavy modal deps (Radix Dialog, toast) stay out of critical path
const WriteReviewDialog = dynamic(
  () => import("./WriteReviewDialog").then((m) => m.WriteReviewDialog),
  {
    ssr: false,
    loading: () => (
      <Button
        variant="outline"
        className="rounded-full border-slate-300 dark:border-white/15 hover:border-[#D4A72C]/50 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-[#D4A72C] bg-white/50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/10 backdrop-blur-sm px-4 h-9 gap-1.5 shadow-sm transition-all"
      >
        <MessageSquarePlus className="w-3.5 h-3.5 text-[#D4A72C]" />
        Write a Review
      </Button>
    ),
  }
);

export function WriteReviewTrigger() {
  return <WriteReviewDialog />;
}
