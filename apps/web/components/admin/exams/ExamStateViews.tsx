"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, FileText, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";

/**
 * Maps an error thrown by the shared API client onto an admin-facing message.
 * Raw backend payloads / stack traces are never surfaced.
 */
export function describeApiError(
  error: unknown,
  resourceLabel: string
): { title: string; message: string; status?: number; recoverable: boolean } {
  const status = error instanceof ApiError ? error.status : undefined;

  switch (status) {
    case 401:
      return {
        status,
        title: "Session expired",
        message: "Your session is no longer valid. Please sign in again to continue.",
        recoverable: false,
      };
    case 403:
      return {
        status,
        title: "Permission denied",
        message: `You don't have permission to view ${resourceLabel}.`,
        recoverable: false,
      };
    case 404:
      return {
        status,
        title: "Examination not found",
        message: "This examination does not exist or has been removed.",
        recoverable: false,
      };
    default:
      return {
        status,
        title: "Something went wrong",
        message: `Unable to load ${resourceLabel}. Please try again.`,
        recoverable: true,
      };
  }
}

interface ApiErrorStateProps {
  error: unknown;
  /** e.g. "examination analytics" — used verbatim inside the message. */
  resourceLabel: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ApiErrorState({
  error,
  resourceLabel,
  onRetry,
  isRetrying,
}: ApiErrorStateProps) {
  const { title, message, status, recoverable } = describeApiError(error, resourceLabel);

  const Icon = status === 403 || status === 401 ? Lock : status === 404 ? FileText : AlertCircle;
  const tone =
    status === 403 || status === 401
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : status === 404
        ? "text-slate-600 bg-slate-50 border-slate-200"
        : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className={`rounded-xl border p-6 flex flex-col sm:flex-row sm:items-center gap-4 ${tone}`}>
      <div className="shrink-0">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-sm opacity-90 mt-0.5">{message}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {recoverable && onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying} className="bg-white">
            <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
            Retry
          </Button>
        )}
        {status === 401 && (
          <Link href="/admin-login">
            <Button size="sm" variant="outline" className="bg-white">
              Sign in
            </Button>
          </Link>
        )}
        {status === 404 && (
          <Link href="/admin-dashboard/exams">
            <Button size="sm" variant="outline" className="bg-white">
              Back to exams
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-10 px-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 ${className}`}
    >
      <div className="text-slate-400 mb-3">{icon ?? <FileText className="w-6 h-6" />}</div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>}
    </div>
  );
}

/** Card-grid skeleton used while the analytics summary is loading. */
export function StatGridSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-14 mt-3" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className={`w-full mt-4 ${height}`} />
    </div>
  );
}

export function TableSkeleton({ rows = 8, columns = 8 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className={`h-3 ${c === 1 ? "flex-[2]" : "flex-1"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
