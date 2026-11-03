"use client";

import React from "react";
import { 
  Users, 
  Coins, 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { AdminWalletStats as StatsType } from "@/lib/api/wallet";
import { Button } from "@/components/ui/button";

interface AdminWalletStatsProps {
  stats: StatsType | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function AdminWalletStats({ stats, isLoading, onRefresh }: AdminWalletStatsProps) {
  const cards = [
    {
      title: "Total Wallets",
      value: stats ? stats.total_wallets.toLocaleString() : "0",
      subtext: "Registered student wallets",
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Total Coins In Circulation",
      value: stats ? stats.total_coins_held.toLocaleString() : "0",
      subtext: "Current student balance liabilities",
      icon: Coins,
      color: "text-[#D4A72C]",
      bg: "bg-[#D4A72C]/10 border-[#D4A72C]/30",
    },
    {
      title: "Total Coins Credited",
      value: stats ? stats.total_coins_credited.toLocaleString() : "0",
      subtext: "Lifetime coin issuances",
      icon: ArrowDownRight,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Total Coins Debited / Spent",
      value: stats ? stats.total_coins_debited.toLocaleString() : "0",
      subtext: "Spent on study content & mock tests",
      icon: ArrowUpRight,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
    },
    {
      title: "Awaiting Admin Review",
      value: stats ? stats.awaiting_review_topups.toLocaleString() : "0",
      subtext: "Submitted receipts pending verification",
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      highlight: (stats?.awaiting_review_topups || 0) > 0,
    },
    {
      title: "Automatically Verified",
      value: stats ? stats.auto_verified_topups.toLocaleString() : "0",
      subtext: "Auto-approved via OCR engine",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Manual Admin Approvals",
      value: stats ? stats.manual_approved_topups.toLocaleString() : "0",
      subtext: "Approved by administrator review",
      icon: ShieldCheck,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Rejected Top-ups",
      value: stats ? stats.rejected_topups.toLocaleString() : "0",
      subtext: "Invalid / fraudulent / duplicate receipts",
      icon: XCircle,
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-500/10 border-slate-500/20",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Platform Financial Aggregate Summary (Authoritative Backend Source)
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="text-xs gap-1.5 h-7 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Aggregates</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className={`p-4 rounded-2xl border transition-all ${c.bg} ${
                c.highlight ? "ring-2 ring-amber-500/50 shadow-sm" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground truncate">
                  {c.title}
                </span>
                <div className={`p-1.5 rounded-lg bg-card/60 ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-xl sm:text-2xl font-black tracking-tight ${c.color}`}>
                {c.value}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {c.subtext}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
