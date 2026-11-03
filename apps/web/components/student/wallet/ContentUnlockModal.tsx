"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Coins,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  X,
  ShieldAlert,
} from "lucide-react";
import { walletApi, ContentAccessEvaluation, ContentPurchaseResult } from "@/lib/api/wallet";

interface ContentUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: "STUDY_MATERIAL" | "EXAMINATION" | "QUESTION_SET" | string;
  contentId: number;
  contentTitle?: string;
  onUnlocked?: () => void;
  onOpenTopUp?: () => void;
}

export const ContentUnlockModal: React.FC<ContentUnlockModalProps> = ({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentTitle,
  onUnlocked,
  onOpenTopUp,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [accessData, setAccessData] = useState<ContentAccessEvaluation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<ContentPurchaseResult | null>(null);

  const loadAccessData = useCallback(async () => {
    if (!isOpen || !contentId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await walletApi.checkContentAccess(contentType, contentId);
      setAccessData(data);
      if (data.has_access) {
        // Already accessible
        if (onUnlocked) onUnlocked();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to check content pricing and access.");
    } finally {
      setLoading(false);
    }
  }, [isOpen, contentId, contentType, onUnlocked]);

  useEffect(() => {
    if (isOpen) {
      setPurchaseSuccess(null);
      setErrorMsg(null);
      loadAccessData();
    }
  }, [isOpen, loadAccessData]);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    if (!accessData || purchasing) return;
    setPurchasing(true);
    setErrorMsg(null);
    try {
      const idempotencyKey = `coin_unlock_${contentType}_${contentId}_${Date.now()}`;
      const result = await walletApi.purchaseContent(contentType, contentId, idempotencyKey);
      if (result.success || result.already_owned) {
        setPurchaseSuccess(result);
        if (onUnlocked) {
          setTimeout(() => {
            onUnlocked();
          }, 1200);
        }
      } else {
        setErrorMsg(result.message || "Unable to complete purchase.");
      }
    } catch (err: any) {
      if (err.code === "insufficient_coins") {
        setErrorMsg(`Insufficient coins! You need ${err.shortage || "more"} additional coins.`);
      } else if (err.code === "wallet_locked") {
        setErrorMsg("Your wallet is locked by administration. Spending is prohibited.");
      } else {
        setErrorMsg(err.message || "Purchase failed. Please try again.");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const getTypeName = () => {
    switch (contentType) {
      case "STUDY_MATERIAL":
        return "Study Note";
      case "EXAMINATION":
        return "Examination / Mock Exam";
      case "QUESTION_SET":
        return "Question Practice Set";
      default:
        return "Learning Resource";
    }
  };

  const displayTitle =
    accessData?.content?.title || contentTitle || `${getTypeName()} #${contentId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
        {/* Modal Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {getTypeName()} Access
              </span>
              <h2 className="text-lg font-bold line-clamp-1">{displayTitle}</h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Checking content pricing & access...</p>
            </div>
          ) : purchaseSuccess ? (
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  Content Unlocked!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {purchaseSuccess.message}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm">
                <span className="text-slate-500">New Wallet Balance:</span>
                <span className="font-bold flex items-center gap-1.5 text-amber-600">
                  <Coins className="w-4 h-4" />
                  {purchaseSuccess.wallet_balance} Coins
                </span>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
              >
                Start Learning Now
              </button>
            </div>
          ) : accessData?.has_access ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 mx-auto bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                <Unlock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">You Have Access</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {accessData.reason || "This content is unlocked and ready to view."}
              </p>
              <button
                onClick={() => {
                  onClose();
                  if (onUnlocked) onUnlocked();
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors mt-2"
              >
                Open Content
              </button>
            </div>
          ) : accessData?.package_purchase_required ? (
            /* Subscription Package Only view */
            <div className="space-y-4 py-2">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 dark:bg-amber-950/30 dark:border-amber-900/40">
                <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Course Package Required
                  </p>
                  <p className="text-amber-700 dark:text-amber-300/90 mt-0.5">
                    This material is part of a premium preparation course package and is not
                    configured for standalone coin unlock.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/student/subscriptions"
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <span>Explore Course Packages</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <button
                  onClick={onClose}
                  className="w-full py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          ) : accessData?.can_purchase_with_coins && accessData.pricing ? (
            /* Coin Purchase view */
            <div className="space-y-4">
              {/* Pricing & Duration Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 font-medium">Unlock Price</span>
                  <div className="text-xl font-extrabold text-amber-600 flex items-center gap-1.5 mt-0.5">
                    <Coins className="w-5 h-5" />
                    <span>{accessData.pricing.coin_price} Coins</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 font-medium">Access Duration</span>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-1">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>
                      {accessData.pricing.access_duration_days > 0
                        ? `${accessData.pricing.access_duration_days} Days Access`
                        : "Permanent Lifetime"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wallet Balance Balance Breakdown */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-sm">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Your Current Coin Balance:</span>
                  <span className="font-semibold flex items-center gap-1 text-slate-900 dark:text-white">
                    <Coins className="w-4 h-4 text-amber-500" />
                    {accessData.wallet_balance} Coins
                  </span>
                </div>
                {accessData.can_afford ? (
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>Balance After Purchase:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <Coins className="w-4 h-4" />
                      {accessData.remaining_balance_after_purchase} Coins
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-rose-600 pt-1 border-t border-rose-200 dark:border-rose-900/50 font-medium">
                    <span>Coin Shortage:</span>
                    <span className="font-bold">-{accessData.coin_shortage} Coins</span>
                  </div>
                )}
              </div>

              {/* Locked Wallet Warning */}
              {accessData.wallet_locked && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 rounded-xl flex items-start gap-2.5 text-sm">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Wallet Locked:</span> No coin transactions are
                    permitted right now. Please reach out to administrative support.
                  </div>
                </div>
              )}

              {/* Insufficient Coins Warning with Top-Up link */}
              {!accessData.can_afford && !accessData.wallet_locked && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 rounded-xl space-y-2 text-sm">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Insufficient Coins:</span> You need{" "}
                      <span className="font-bold underline">{accessData.coin_shortage} more coins</span>{" "}
                      to unlock this resource.
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    {onOpenTopUp ? (
                      <button
                        onClick={onOpenTopUp}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 dark:text-amber-300 underline flex items-center gap-1"
                      >
                        Buy Coins / Top Up Now <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <Link
                        href="/student/wallet"
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 dark:text-amber-300 underline flex items-center gap-1"
                      >
                        Top Up Wallet or Convert XP <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                {accessData.can_afford && !accessData.wallet_locked ? (
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                  >
                    {purchasing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Debiting Coins & Unlocking...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Confirm Unlock ({accessData.pricing.coin_price} Coins)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    href="/student/wallet"
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Go to Wallet to Add Coins</span>
                  </Link>
                )}

                <button
                  onClick={onClose}
                  disabled={purchasing}
                  className="w-full py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-slate-500">
              <p>Content access evaluation completed.</p>
              <button
                onClick={onClose}
                className="mt-3 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
