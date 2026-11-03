"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Coins, 
  ArrowRight, 
  CheckCircle2, 
  History, 
  Layers, 
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  walletApi, 
  XPConversionEligibility, 
  XPConversionPreview,
  XPConversionLog,
  PaginatedResult 
} from "@/lib/api/wallet";
import toast from "react-hot-toast";

interface XPConversionCardProps {
  isOpen: boolean;
  onClose: () => void;
  eligibility: XPConversionEligibility | null;
  onSuccess: () => void;
}

export function XPConversionCard({
  isOpen,
  onClose,
  eligibility,
  onSuccess,
}: XPConversionCardProps) {
  const [xpToConvert, setXpToConvert] = useState<number>(100);
  const [preview, setPreview] = useState<XPConversionPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History Tab
  const [activeTab, setActiveTab] = useState<"convert" | "history">("convert");
  const [historyLogs, setHistoryLogs] = useState<XPConversionLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const xpUnit = eligibility?.current_rate?.xp_required || 100;
  const coinsPerUnit = eligibility?.current_rate?.coins_awarded || 10;
  const minXp = eligibility?.minimum_xp || 100;
  const maxXp = eligibility?.maximum_xp || 10000;
  const redeemableXp = eligibility?.redeemable_xp || 0;
  const remainingToday = eligibility?.remaining_today ?? 1000;

  useEffect(() => {
    if (isOpen) {
      const defaultAmount = Math.max(minXp, Math.min(redeemableXp, 500));
      // Round to nearest xpUnit
      const rounded = Math.floor(defaultAmount / xpUnit) * xpUnit;
      const initial = Math.max(xpUnit, rounded);
      setXpToConvert(initial);
      fetchPreview(initial);
      fetchHistory();
    }
  }, [isOpen, redeemableXp, xpUnit, minXp]);

  const fetchPreview = async (amount: number) => {
    if (amount <= 0) {
      setPreview(null);
      return;
    }
    try {
      setIsLoadingPreview(true);
      const res = await walletApi.previewXPConversion(amount);
      setPreview(res);
    } catch {
      // Fallback local preview if preview fails
      const units = Math.floor(amount / xpUnit);
      setPreview({
        xp_requested: amount,
        xp_effective_converted: units * xpUnit,
        coins_awarded: units * coinsPerUnit,
        current_redeemable_xp: redeemableXp,
        projected_redeemable_xp: Math.max(0, redeemableXp - (units * xpUnit)),
        conversion_rate: `${xpUnit} XP = ${coinsPerUnit} Coins`,
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await walletApi.getXPConversionHistory();
      setHistoryLogs(res.results || []);
    } catch {
      // Ignored
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleAmountChange = (val: number) => {
    setXpToConvert(val);
    fetchPreview(val);
  };

  const handleQuickPercent = (pct: number) => {
    const target = Math.floor((redeemableXp * pct) / 100);
    const units = Math.floor(target / xpUnit);
    const safeAmount = Math.max(xpUnit, units * xpUnit);
    handleAmountChange(safeAmount);
  };

  const handleConvertSubmit = async () => {
    if (xpToConvert < minXp) {
      toast.error(`Minimum XP for conversion is ${minXp}.`);
      return;
    }
    if (xpToConvert > redeemableXp) {
      toast.error("You cannot convert more than your available redeemable XP.");
      return;
    }
    if (xpToConvert % xpUnit !== 0) {
      toast.error(`XP amount must be a multiple of ${xpUnit}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const idempotencyKey = `xp_conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const res = await walletApi.submitXPConversion({
        xp_amount: xpToConvert,
        idempotency_key: idempotencyKey,
      });

      toast.success(`Successfully converted ${res.conversion.xp_converted} XP into ${res.conversion.coins_awarded} coins!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "XP conversion failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-[24px] border border-border">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-[#0B2545] p-6 text-white">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FFD700] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                XP Exchange
              </span>
              <div className="flex bg-white/10 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("convert")}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    activeTab === "convert" ? "bg-white text-purple-950 shadow-sm" : "text-white/80 hover:text-white"
                  }`}
                >
                  Convert
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    activeTab === "history" ? "bg-white text-purple-950 shadow-sm" : "text-white/80 hover:text-white"
                  }`}
                >
                  History
                </button>
              </div>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white">
              {activeTab === "convert" ? "Convert Study XP to Coins" : "XP Conversion History"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-purple-200">
              {activeTab === "convert" 
                ? "Redeem your study effort for spendable coins without affecting your lifetime rank."
                : "Record of previous XP redemptions."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {activeTab === "convert" ? (
            <div className="space-y-6">
              {/* Balances Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <div className="text-xs text-muted-foreground">Redeemable XP Available</div>
                  <div className="text-2xl font-black text-purple-700 dark:text-purple-300">
                    {redeemableXp.toLocaleString()} <span className="text-xs font-semibold">XP</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/60 border border-border">
                  <div className="text-xs text-muted-foreground">Lifetime XP (Unchanged)</div>
                  <div className="text-2xl font-black text-primary dark:text-foreground">
                    {(eligibility?.lifetime_xp ?? 0).toLocaleString()} <span className="text-xs font-semibold">XP</span>
                  </div>
                </div>
              </div>

              {/* Conversion Rate Pill */}
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300">
                <span className="font-medium">Current Conversion Rate:</span>
                <span className="font-extrabold">
                  {xpUnit} XP = {coinsPerUnit} Coins (10:1 ratio)
                </span>
              </div>

              {/* Amount Input & Sliders */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="xp-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Amount of XP to Convert
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Step: multiples of {xpUnit} XP
                  </span>
                </div>

                <div className="relative">
                  <Input
                    id="xp-input"
                    type="number"
                    step={xpUnit}
                    min={minXp}
                    max={Math.min(redeemableXp, maxXp)}
                    value={xpToConvert || ""}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    className="h-12 text-lg font-bold rounded-xl pr-14"
                    placeholder={`e.g. ${xpUnit}`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    XP
                  </span>
                </div>

                {/* Quick percentage buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Quick select:</span>
                  <div className="flex gap-1.5 flex-1 justify-end">
                    {[25, 50, 75, 100].map((pct) => (
                      <Button
                        key={pct}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickPercent(pct)}
                        className="h-7 text-xs px-2.5 rounded-lg"
                      >
                        {pct === 100 ? "Max" : `${pct}%`}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              {preview && (
                <div className="rounded-2xl bg-gradient-to-br from-[#D4A72C]/15 via-purple-500/10 to-transparent border border-[#D4A72C]/30 p-5 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#D4A72C] flex items-center gap-1.5">
                    <Coins className="w-4 h-4" />
                    Conversion Preview
                  </span>

                  <div className="grid grid-cols-2 gap-4 text-center pt-2">
                    <div className="p-3 bg-card rounded-xl border border-border">
                      <div className="text-xs text-muted-foreground">Coins You Receive</div>
                      <div className="text-2xl font-black text-[#D4A72C] mt-1">
                        +{preview.coins_awarded} Coins
                      </div>
                    </div>

                    <div className="p-3 bg-card rounded-xl border border-border">
                      <div className="text-xs text-muted-foreground">Remaining Redeemable XP</div>
                      <div className="text-xl font-bold text-primary dark:text-foreground mt-1">
                        {preview.projected_redeemable_xp.toLocaleString()} XP
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center">
                    Note: Lifetime XP, rankings, and tier badges are never reduced by conversion.
                  </p>
                </div>
              )}

              {/* Submission Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={onClose} className="rounded-xl h-11">
                  Cancel
                </Button>
                <Button
                  onClick={handleConvertSubmit}
                  disabled={
                    isSubmitting ||
                    xpToConvert < minXp ||
                    xpToConvert > redeemableXp ||
                    (preview?.coins_awarded ?? 0) <= 0
                  }
                  className="bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold rounded-xl h-11 px-6 gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <span>Confirm Conversion</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* History Tab */
            <div className="space-y-4">
              {isLoadingHistory ? (
                <div className="p-8 text-center text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-xs">Loading conversion history...</p>
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground space-y-2">
                  <History className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-sm font-semibold">No XP conversions yet</p>
                  <p className="text-xs">Earn XP by finishing study notes and exams, then redeem here!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historyLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-sm text-primary dark:text-foreground">
                          Converted {log.xp_converted} XP
                        </div>
                        <div className="text-muted-foreground text-[10px]">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-[#D4A72C] text-sm">
                          +{log.coins_awarded} Coins
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {log.conversion_rate_snapshot}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
