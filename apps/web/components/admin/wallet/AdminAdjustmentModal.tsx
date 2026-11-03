"use client";

import React, { useState } from "react";
import { 
  Coins, 
  ArrowDownRight, 
  ArrowUpRight, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw,
  CheckCircle2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { walletApi, StudentWallet } from "@/lib/api/wallet";
import toast from "react-hot-toast";

interface AdminAdjustmentModalProps {
  wallet: StudentWallet | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminAdjustmentModal({
  wallet,
  isOpen,
  onClose,
  onSuccess,
}: AdminAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amount, setAmount] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!wallet) return null;

  const currentBalance = wallet.balance;
  const numAmount = typeof amount === "number" ? amount : 0;
  const projectedBalance =
    adjustmentType === "CREDIT"
      ? currentBalance + numAmount
      : currentBalance - numAmount;

  const isInvalidDebit = adjustmentType === "DEBIT" && numAmount > currentBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!numAmount || numAmount <= 0) {
      toast.error("Adjustment amount must be strictly greater than 0.");
      return;
    }

    if (adjustmentType === "DEBIT" && numAmount > currentBalance) {
      toast.error(`Cannot debit ${numAmount} coins. Student only has ${currentBalance} coins.`);
      return;
    }

    const cleanReason = reason.trim();
    if (cleanReason.length < 5) {
      toast.error("Please enter a specific administrative reason (at least 5 characters).");
      return;
    }

    if (!isConfirmed) {
      setIsConfirmed(true);
      return;
    }

    try {
      setIsSubmitting(true);
      const idempotencyKey = `admin_adj_${wallet.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      const res = await walletApi.adjustAdminWallet(wallet.id, {
        amount: numAmount,
        adjustment_type: adjustmentType,
        reason: cleanReason,
        idempotency_key: idempotencyKey,
      });

      toast.success(
        `Successfully ${adjustmentType === "CREDIT" ? "credited" : "debited"} ${numAmount} coins! New balance: ${res.wallet.balance}`
      );
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || "Manual adjustment failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setReason("");
    setIsConfirmed(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-[24px] border border-border">
        {/* Header */}
        <div className={`p-6 text-white ${
          adjustmentType === "CREDIT"
            ? "bg-gradient-to-r from-emerald-900 via-teal-900 to-[#0B2545]"
            : "bg-gradient-to-r from-red-950 via-rose-900 to-[#0B2545]"
        }`}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FFD700] flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                Administrative Coin Adjustment
              </span>
              <Badge className="bg-white/20 text-white font-mono text-xs">
                Wallet #{wallet.id}
              </Badge>
            </div>
            <DialogTitle className="text-xl font-extrabold text-white">
              {adjustmentType === "CREDIT" ? "Credit Coins to Student" : "Deduct / Debit Coins from Student"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-200">
              For: <span className="font-bold text-white">{wallet.full_name || wallet.username}</span> ({wallet.email})
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Adjustment Type Switcher */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Adjustment Type
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType("CREDIT");
                  setIsConfirmed(false);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                  adjustmentType === "CREDIT"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "border-border hover:bg-muted"
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                Credit (Add Coins)
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdjustmentType("DEBIT");
                  setIsConfirmed(false);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                  adjustmentType === "DEBIT"
                    ? "bg-red-500/15 border-red-500 text-red-700 dark:text-red-400 shadow-sm"
                    : "border-border hover:bg-muted"
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-red-600" />
                Debit (Deduct Coins)
              </button>
            </div>
          </div>

          {/* Amount input & Balance Projection */}
          <div className="space-y-2">
            <Label htmlFor="adj-amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Coin Amount <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Coins className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="adj-amount"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 0));
                  setIsConfirmed(false);
                }}
                className="pl-10 h-11 text-base font-bold rounded-xl"
                placeholder="Enter coin amount (e.g. 100)"
                required
              />
            </div>

            {/* Live Balance Impact Preview */}
            <div className="p-3.5 rounded-xl bg-muted/60 border border-border flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground block">Current Balance:</span>
                <span className="font-mono font-bold text-sm">{currentBalance.toLocaleString()} Coins</span>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground block">Adjustment:</span>
                <span className={`font-mono font-extrabold text-sm ${
                  adjustmentType === "CREDIT" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {adjustmentType === "CREDIT" ? `+${numAmount}` : `-${numAmount}`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block">Projected Balance:</span>
                <span className={`font-mono font-black text-sm ${
                  isInvalidDebit ? "text-red-600" : "text-primary dark:text-foreground"
                }`}>
                  {projectedBalance.toLocaleString()} Coins
                </span>
              </div>
            </div>

            {isInvalidDebit && (
              <p className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5 mt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Negative balances are strictly prohibited. Maximum deductible amount is {currentBalance} coins.
              </p>
            )}
          </div>

          {/* Mandatory Reason */}
          <div className="space-y-2">
            <Label htmlFor="adj-reason" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Mandatory Administrative Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="adj-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setIsConfirmed(false);
              }}
              rows={3}
              placeholder="e.g. Compensation for platform service downtime on Oct 28 / Goodwill credit"
              className="rounded-xl text-xs sm:text-sm"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              This reason is immutably logged into the financial ledger along with your administrator ID.
            </p>
          </div>

          {/* Confirmation Warning if confirmed clicked */}
          {isConfirmed && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300 text-xs space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Please Confirm Manual Ledger Adjustment
              </div>
              <p>
                Are you sure you want to {adjustmentType === "CREDIT" ? "credit" : "debit"}{" "}
                <span className="font-bold">{numAmount} coins</span> to/from{" "}
                <span className="font-bold">{wallet.username}</span>? This will create a permanent immutable ledger entry.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-xl h-10 text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || !numAmount || numAmount <= 0 || isInvalidDebit || reason.trim().length < 5}
              className={`rounded-xl h-10 text-xs font-bold gap-2 ${
                adjustmentType === "CREDIT"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Recording Adjustment...
                </>
              ) : isConfirmed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Yes, Apply {adjustmentType}
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Proceed to Confirm
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
