"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  iconColor?: string;
  iconBg?: string;
  trend?: number; // positive = up, negative = down, 0 = neutral
  trendLabel?: string;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-[#0B2545]",
  iconBg = "bg-slate-100",
  trend,
  trendLabel,
  loading = false,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn("bg-white rounded-xl border border-slate-200 p-5 shadow-sm", className)}>
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  const TrendIcon = trend === undefined ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend === undefined ? "" : trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-500" : "text-slate-400";
  const trendBg = trend === undefined ? "" : trend > 0 ? "bg-emerald-50" : trend < 0 ? "bg-red-50" : "bg-slate-50";

  return (
    <div className={cn(
      "bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-200",
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <div className={cn("p-2.5 rounded-lg", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={2} />
        </div>
      </div>
      <p className="text-3xl font-bold text-[#0B2545] mb-1.5 tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <div className="flex items-center gap-2">
        {subtitle && <p className="text-[12px] text-slate-400">{subtitle}</p>}
        {TrendIcon && trend !== undefined && (
          <span className={cn("flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full", trendColor, trendBg)}>
            <TrendIcon className="h-3 w-3" />
            {trendLabel ?? `${Math.abs(trend)}%`}
          </span>
        )}
      </div>
    </div>
  );
}
