"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  live: "bg-emerald-50 text-emerald-700 border-emerald-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  pending_review: "bg-blue-50 text-blue-700 border-blue-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  changes_requested: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  archived: "bg-red-50 text-red-700 border-red-200",
};

export function ExamStatusBadge({ status }: { status: string }) {
  const key = String(status ?? "").toLowerCase();
  const style = STATUS_STYLES[key] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <Badge variant="outline" className={cn("capitalize", style)}>
      {String(status ?? "—").replace(/_/g, " ")}
    </Badge>
  );
}
