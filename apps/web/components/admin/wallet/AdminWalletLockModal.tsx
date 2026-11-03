"use client";

import React, { useState } from "react";
import { ShieldAlert, ShieldCheck, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { walletApi, StudentWallet } from "@/lib/api/wallet";
import toast from "react-hot-toast";

interface AdminWalletLockModalProps {
  wallet: StudentWallet | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminWalletLockModal({
  wallet,
  isOpen,
  onClose,
  onSuccess,
}: AdminWalletLockModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!wallet) return null;

  const willLock = !wallet.is_locked;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (willLock && !reason.trim()) {
      toast.error("A mandatory reason must be provided when locking a wallet.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await walletApi.lockAdminWallet(wallet.id, {
        is_locked: willLock,
        reason: reason.trim(),
      });

      toast.success(res.detail || `Wallet successfully ${willLock ? "locked" : "unlocked"}.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update wallet lock status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            {willLock ? (
              <ShieldAlert className="w-5 h-5 text-red-600" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            )}
            <DialogTitle className="text-lg font-bold">
              {willLock ? "Lock Student Wallet" : "Unlock Student Wallet"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Student: <span className="font-semibold text-primary">{wallet.username}</span> ({wallet.email})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {willLock ? (
            <div className="space-y-2">
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-3 rounded-xl">
                Locking this wallet will reject any further coin credits, debits, content purchases, or XP conversions.
              </p>
              <Label htmlFor="lock-reason" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mandatory Reason for Lock <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="lock-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Under investigation for suspicious payment reference reuse..."
                rows={3}
                className="rounded-xl text-xs sm:text-sm"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-3 rounded-xl">
                Unlocking this wallet will restore the student&apos;s ability to top-up, spend coins on notes and exams, and convert XP.
              </p>
              {wallet.lock_reason && (
                <div className="text-xs text-muted-foreground p-2 rounded-lg bg-muted">
                  <span className="font-semibold">Current Lock Reason: </span>
                  {wallet.lock_reason}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (willLock && !reason.trim())}
              className={`rounded-xl text-xs h-9 font-bold gap-1.5 ${
                willLock
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Updating...
                </>
              ) : willLock ? (
                "Confirm & Lock Wallet"
              ) : (
                "Confirm & Unlock Wallet"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
