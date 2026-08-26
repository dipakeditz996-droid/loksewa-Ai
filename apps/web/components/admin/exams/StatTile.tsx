"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  /** Optional supporting line, e.g. "of 128 completed". */
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Compact metric tile used across the admin examination reporting pages.
 * Deliberately low-key: dense type, no gradients, no oversized numbers.
 */
export function StatTile({ label, value, hint, icon, className }: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white px-4 py-3 flex flex-col justify-between min-w-0",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 truncate">
          {label}
        </p>
        {icon && <span className="text-slate-300 shrink-0">{icon}</span>}
      </div>
      <p className="text-xl font-semibold text-[#0B2545] mt-1.5 tabular-nums truncate">{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{hint}</p>}
    </div>
  );
}
