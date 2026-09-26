"use client";

import React from "react";
import { Loader2, AlertCircle, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ==========================================
// 1. BUTTON SPINNER
// ==========================================
interface ButtonSpinnerProps {
  className?: string;
  text?: string;
}

export function ButtonSpinner({ className, text }: ButtonSpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2
        className={cn("h-4 w-4 animate-spin shrink-0", className)}
        aria-hidden="true"
      />
      {text && <span>{text}</span>}
    </span>
  );
}

// ==========================================
// 2. INLINE LOADER
// ==========================================
interface InlineLoaderProps {
  text?: string;
  className?: string;
  size?: "sm" | "md";
}

export function InlineLoader({
  text = "Loading...",
  className,
  size = "sm",
}: InlineLoaderProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 text-muted-foreground",
        textSize,
        className
      )}
    >
      <Loader2 className={cn("animate-spin shrink-0", iconSize)} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

// ==========================================
// 3. TABLE SKELETON
// ==========================================
interface TableSkeletonProps {
  rows?: number;
  columns?: number | string[];
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  const colCount = typeof columns === "number" ? columns : columns.length;
  const colWidths = Array.isArray(columns) ? columns : null;

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading table data"
      className={cn(
        "w-full rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm",
        className
      )}
    >
      {showHeader && (
        <div className="border-b border-border/70 bg-muted/40 px-4 py-3.5 flex items-center gap-4">
          {Array.from({ length: colCount }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn(
                "h-4",
                colWidths ? colWidths[c] : c === 0 ? "w-24" : c === 1 ? "flex-[2]" : "flex-1"
              )}
            />
          ))}
        </div>
      )}
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-4 flex items-center gap-4">
            {Array.from({ length: colCount }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn(
                  "h-4",
                  colWidths
                    ? colWidths[c]
                    : c === 0
                    ? "w-20"
                    : c === 1
                    ? "flex-[2]"
                    : "flex-1"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 4. CARD SKELETON
// ==========================================
interface CardSkeletonProps {
  count?: number;
  className?: string;
  gridClassName?: string;
  hasFooter?: boolean;
}

export function CardSkeleton({
  count = 3,
  className,
  gridClassName = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
  hasFooter = true,
}: CardSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading cards"
      className={gridClassName}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl border border-border/70 bg-card p-5 space-y-4 shadow-sm",
            className
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          {hasFooter && (
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ==========================================
// 5. SECTION SKELETON
// ==========================================
interface SectionSkeletonProps {
  className?: string;
  rows?: number;
}

export function SectionSkeleton({ className, rows = 3 }: SectionSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading section"
      className={cn(
        "rounded-xl border border-border/70 bg-card p-6 space-y-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <div className="space-y-3 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-4", i === rows - 1 ? "w-3/5" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 6. PAGE SKELETON
// ==========================================
interface PageSkeletonProps {
  layout?: "grid" | "table" | "detail";
  className?: string;
}

export function PageSkeleton({ layout = "grid", className }: PageSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading page content"
      className={cn("w-full space-y-6 p-4 md:p-6 lg:p-8 animate-in fade-in-50 duration-200", className)}
    >
      {/* Header bar skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 md:w-72" />
          <Skeleton className="h-4 w-40 md:w-56" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Filter / metric bar skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>

      {/* Main body based on layout */}
      {layout === "table" ? (
        <TableSkeleton rows={6} columns={5} />
      ) : layout === "detail" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <SectionSkeleton rows={5} />
            <SectionSkeleton rows={3} />
          </div>
          <div className="space-y-4">
            <SectionSkeleton rows={4} />
          </div>
        </div>
      ) : (
        <CardSkeleton count={6} />
      )}
    </div>
  );
}

// ==========================================
// 7. PROCESSING STATE
// ==========================================
interface ProcessingStateProps {
  title?: string;
  message?: string;
  reassurance?: string;
  className?: string;
}

export function ProcessingState({
  title = "Processing...",
  message = "Please wait while we complete this action.",
  reassurance = "Please do not refresh or close this window.",
  className,
}: ProcessingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-border/80 bg-card shadow-lg max-w-md mx-auto my-6 space-y-4",
        className
      )}
    >
      <div className="relative flex items-center justify-center w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
        <Loader2 className="w-10 h-10 animate-spin text-primary shrink-0" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-foreground tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {reassurance && (
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
          {reassurance}
        </p>
      )}
    </div>
  );
}

// ==========================================
// 8. EMPTY STATE
// ==========================================
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-border/80 bg-card/40 my-4",
        className
      )}
    >
      <div className="text-muted-foreground/80 mb-3 text-3xl">
        {icon || <FileText className="w-8 h-8 opacity-60" />}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
