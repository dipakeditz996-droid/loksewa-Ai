"use client";

import React from "react";
import { 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  PlusCircle, 
  RefreshCw,
  Clock,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StudentWalletSummary, XPConversionEligibility } from "@/lib/api/wallet";

interface WalletOverviewCardProps {
  summary: StudentWalletSummary | null;
  xpEligibility: XPConversionEligibility | null;
  isLoading: boolean;
  onOpenTopUp: () => void;
  onOpenXPConvert: () => void;
  onRefresh: () => void;
}

export function WalletOverviewCard({
  summary,
  xpEligibility,
  isLoading,
  onOpenTopUp,
  onOpenXPConvert,
  onRefresh,
}: WalletOverviewCardProps) {
  const wallet = summary?.wallet;
  const gamification = summary?.gamification;

  return (
    <div className="space-y-4">
      {/* Wallet Locked Banner if applicable */}
      {wallet?.is_locked && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-700 dark:text-red-400 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <div className="text-sm">
            <span className="font-bold">Wallet Locked: </span>
            <span>
              {wallet.lock_reason || "Your wallet has been temporarily locked by administration for security verification."}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              Coin spending, credits, and XP conversions are currently paused. Please reach out to student support for review.
            </p>
          </div>
        </div>
      )}

      {/* Pending top-up notification banner */}
      {(summary?.pending_topups_count ?? 0) > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
            <span>
              You have <span className="font-bold">{summary?.pending_topups_count}</span> pending top-up verification in progress.
            </span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/20 rounded-full">
            Under Verification
          </span>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Available Balance Card (Gold Gradient / Primary) */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0B2545] via-[#133A6B] to-[#0B2545] text-white p-6 sm:p-8 shadow-xl border border-white/10">
          {/* Subtle Decorative Ambient Rings */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#D4A72C]/15 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#D4A72C]/25 text-[#FFD700] border border-[#D4A72C]/40">
                    <Coins className="w-3.5 h-3.5" />
                    LoksewaAI Coins
                  </span>
                  {wallet?.is_locked ? (
                    <Badge variant="destructive" className="text-xs px-2.5 py-0.5">
                      Locked
                    </Badge>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-medium text-slate-300 uppercase tracking-wider pt-2">
                  Available Coin Balance
                </h3>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl gap-1.5 text-xs h-8"
                title="Refresh Balance"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
            </div>

            {/* Huge Balance Number */}
            <div className="flex items-baseline gap-3">
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span className="text-[#FFD700] drop-shadow-sm font-black">
                  {wallet ? wallet.balance.toLocaleString() : "0"}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-slate-300">Coins</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={onOpenTopUp}
                disabled={wallet?.is_locked}
                className="bg-gradient-to-r from-[#D4A72C] to-[#E5B83E] hover:from-[#C29624] hover:to-[#D4A72C] text-[#0B2545] font-bold shadow-lg shadow-[#D4A72C]/25 gap-2 rounded-xl px-5 h-11"
              >
                <PlusCircle className="w-4 h-4" />
                Add Funds / Buy Coins
              </Button>

              {xpEligibility?.enabled && (
                <Button
                  onClick={onOpenXPConvert}
                  disabled={wallet?.is_locked || !xpEligibility.is_eligible}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold gap-2 rounded-xl px-4 h-11"
                >
                  <Sparkles className="w-4 h-4 text-[#FFD700]" />
                  Convert XP to Coins
                </Button>
              )}
            </div>

            {/* Credited / Debited mini bar */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Total Credited</div>
                  <div className="font-bold text-white">
                    +{wallet ? wallet.total_credited.toLocaleString() : "0"} Coins
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/20 text-red-300">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Total Spent</div>
                  <div className="font-bold text-white">
                    -{wallet ? wallet.total_debited.toLocaleString() : "0"} Coins
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gamification & XP Conversion Info Card */}
        <div className="rounded-[24px] bg-card border border-border p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-primary dark:text-foreground">XP Rewards</h4>
                  <p className="text-xs text-muted-foreground">Study & earn conversion</p>
                </div>
              </div>
              <Badge variant="outline" className="font-semibold text-xs">
                Level {gamification?.level ?? 1}
              </Badge>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Redeemable XP:</span>
                <span className="font-bold text-primary dark:text-foreground">
                  {(gamification?.redeemable_xp ?? 0).toLocaleString()} XP
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Lifetime XP (Permanent):</span>
                <span className="font-medium text-slate-500">
                  {(gamification?.lifetime_xp ?? 0).toLocaleString()} XP
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Conversion Rate:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {xpEligibility ? `${xpEligibility.current_rate.xp_required} XP = ${xpEligibility.current_rate.coins_awarded} Coins` : "100 XP = 10 Coins"}
                </span>
              </div>
            </div>

            {xpEligibility?.enabled ? (
              <div className="rounded-xl bg-muted/60 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Daily limit remaining:</span>
                  <span className="font-semibold text-primary dark:text-foreground">
                    {xpEligibility.remaining_today > 9999 ? "Unlimited" : `${xpEligibility.remaining_today} XP`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Minimum to convert:</span>
                  <span className="font-semibold text-primary dark:text-foreground">
                    {xpEligibility.minimum_xp} XP
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                XP conversion is currently paused by administration.
              </p>
            )}
          </div>

          <Button
            variant="outline"
            onClick={onOpenXPConvert}
            disabled={wallet?.is_locked || !xpEligibility?.is_eligible}
            className="w-full rounded-xl border-[#D4A72C]/40 text-[#D4A72C] hover:bg-[#D4A72C]/10 hover:text-[#D4A72C] font-semibold text-xs h-10 gap-2"
          >
            <Layers className="w-3.5 h-3.5" />
            Open XP Exchange
          </Button>
        </div>
      </div>
    </div>
  );
}
