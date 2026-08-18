import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface PremiumIconProps {
  icon: LucideIcon;
  color?: "blue" | "emerald" | "amber" | "purple" | "primary" | "slate" | "red";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  glow?: boolean;
}

export function PremiumIcon({
  icon: Icon,
  color = "primary",
  size = "md",
  className,
  glow = true,
}: PremiumIconProps) {
  // Size variants
  const sizeClasses = {
    sm: "w-8 h-8 rounded-lg p-1.5",
    md: "w-10 h-10 rounded-xl p-2",
    lg: "w-12 h-12 rounded-xl p-2.5",
    xl: "w-16 h-16 rounded-2xl p-4",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  };

  // Color variants combining background, border, text and glow
  const colorVariants = {
    blue: {
      base: "bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
      glow: "shadow-[0_0_15px_rgba(59,130,246,0.25)] dark:shadow-[0_0_15px_rgba(59,130,246,0.15)]",
    },
    emerald: {
      base: "bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
      glow: "shadow-[0_0_15px_rgba(16,185,129,0.25)] dark:shadow-[0_0_15px_rgba(16,185,129,0.15)]",
    },
    amber: {
      base: "bg-amber-100 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
      glow: "shadow-[0_0_15px_rgba(245,158,11,0.25)] dark:shadow-[0_0_15px_rgba(245,158,11,0.15)]",
    },
    purple: {
      base: "bg-purple-100 text-purple-600 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
      glow: "shadow-[0_0_15px_rgba(168,85,247,0.25)] dark:shadow-[0_0_15px_rgba(168,85,247,0.15)]",
    },
    red: {
      base: "bg-red-100 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
      glow: "shadow-[0_0_15px_rgba(239,68,68,0.25)] dark:shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    },
    primary: {
      base: "bg-primary/10 text-primary border border-primary/20",
      glow: "shadow-[0_0_15px_rgba(212,167,44,0.25)] dark:shadow-[0_0_15px_rgba(212,167,44,0.15)]",
    },
    slate: {
      base: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
      glow: "shadow-[0_0_15px_rgba(100,116,139,0.15)] dark:shadow-[0_0_15px_rgba(100,116,139,0.05)]",
    },
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 transition-all duration-300",
        sizeClasses[size],
        colorVariants[color].base,
        glow && colorVariants[color].glow,
        className
      )}
    >
      <Icon className={cn(iconSizes[size])} strokeWidth={2} />
    </div>
  );
}
