"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { RecentActivity } from "@/lib/api/admin";
import {
  UserPlus,
  FileText,
  ShoppingBag,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  registration: { icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-50" },
  exam_attempt: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  order: { icon: ShoppingBag, color: "text-amber-600", bg: "bg-amber-50" },
  ai_session: { icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50" },
  content: { icon: BookOpen, color: "text-slate-600", bg: "bg-slate-100" },
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  success: { icon: CheckCircle2, color: "text-emerald-500", label: "Success" },
  submitted: { icon: CheckCircle2, color: "text-blue-500", label: "Submitted" },
  "in-progress": { icon: Clock, color: "text-amber-500", label: "In Progress" },
  pending: { icon: Clock, color: "text-amber-500", label: "Pending" },
  accepted: { icon: CheckCircle2, color: "text-emerald-500", label: "Accepted" },
  completed: { icon: CheckCircle2, color: "text-emerald-500", label: "Completed" },
  rejected: { icon: XCircle, color: "text-red-500", label: "Rejected" },
  cancelled: { icon: XCircle, color: "text-red-400", label: "Cancelled" },
};

interface ActivityFeedProps {
  activities: RecentActivity[];
  loading?: boolean;
  maxItems?: number;
  className?: string;
}

export function ActivityFeed({ activities, loading = false, maxItems = 8, className }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-3.5 w-3/4 mb-1.5" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-3 w-14 shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <AlertCircle className="h-10 w-10 text-slate-200 mb-3" />
        <p className="text-sm text-slate-400 font-medium">No recent activity</p>
        <p className="text-xs text-slate-300 mt-1">Activity will appear here as users interact with the platform.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-0.5", className)}>
      {activities.slice(0, maxItems).map((activity) => {
        const rawTypeConfig = TYPE_CONFIG[activity.type];
        const rawStatusConfig = STATUS_CONFIG[activity.status.toLowerCase()];
        const typeConfig = rawTypeConfig ?? TYPE_CONFIG.content!;
        const statusConfig = rawStatusConfig ?? STATUS_CONFIG.pending!;
        const TypeIcon = typeConfig.icon;
        const StatusIcon = statusConfig.icon;

        return (
          <div
            key={activity.id}
            className="flex items-center gap-3 px-1 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <div className={cn("p-2 rounded-lg shrink-0 transition-colors", typeConfig.bg)}>
              <TypeIcon className={cn("h-3.5 w-3.5", typeConfig.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-slate-700 font-medium truncate leading-snug">
                {activity.description}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <StatusIcon className={cn("h-3 w-3", statusConfig.color)} />
                <span className="text-[11px] text-slate-400">{statusConfig.label}</span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0 font-medium">{activity.time}</span>
          </div>
        );
      })}
    </div>
  );
}
