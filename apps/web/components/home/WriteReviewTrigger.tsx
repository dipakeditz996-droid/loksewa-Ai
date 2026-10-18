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
        className="rounded-full border-slate-300 dark:border-white/10 hover:border-[#D4A72C]/40 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-white/[0.03] backdrop-blur-sm px-4 h-9 gap-1.5 shadow-sm"
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
