"use client";

import React, { useEffect, useState, useRef, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  CreditCard,
  Building2,
  Sparkles,
  ExternalLink,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { subscriptionsApi, SubscriptionPayment } from "@/lib/api/subscriptions";
import bgImage from "@/media/signup.png";

type VerificationStage = "LOADING" | "OCR_PROCESSING" | "AUTO_VERIFIED" | "NEEDS_ADMIN_REVIEW" | "REJECTED";

export default function PaymentVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const paymentId = params?.paymentId as string;

  const [payment, setPayment] = useState<SubscriptionPayment | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [accessRefreshed, setAccessRefreshed] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Derive verification stage from authoritative backend data
  const getStage = (p: SubscriptionPayment | null): VerificationStage => {
    if (!p) return "LOADING";

    if (p.status === "APPROVED") {
      return "AUTO_VERIFIED";
    }

    if (p.status === "REJECTED") {
      return "REJECTED";
    }

    const verStatus = p.verification_status;
    const outcome = p.verification_result?.outcome;

    if (verStatus === "VERIFIED_CONFIDENT" || outcome === "AUTO_VERIFIED") {
      return "AUTO_VERIFIED";
    }

    if (
      verStatus === "VERIFIED_UNCERTAIN" ||
      verStatus === "VERIFICATION_FAILED" ||
      outcome === "NEEDS_ADMIN_REVIEW"
    ) {
      return "NEEDS_ADMIN_REVIEW";
    }

    // Still in progress
    return "OCR_PROCESSING";
  };

  const currentStage = getStage(payment);

  // Invalidate queries and refresh access when verified
  useEffect(() => {
    if (currentStage === "AUTO_VERIFIED" && !accessRefreshed) {
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["my-enrollment"] });
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["my-courses"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setAccessRefreshed(true);
    }
  }, [currentStage, accessRefreshed, queryClient]);

  // Elapsed time counter during verification
  useEffect(() => {
    if (currentStage === "OCR_PROCESSING" || currentStage === "LOADING") {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [currentStage]);

  // Fetch payment status
  const fetchStatus = async (isManual = false) => {
    if (!paymentId) return;
    if (isManual) setIsRefreshing(true);

    try {
      const data = await subscriptionsApi.getPayment(paymentId);
      setPayment(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch payment status:", err);
      // Only set error if initial load failed
      if (!payment) {
        setError("Unable to retrieve payment details. Please check your connection.");
      }
    } finally {
      setInitialLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  // Status Polling setup
  useEffect(() => {
    if (!paymentId) return;

    fetchStatus();

    // Poll every 2.5 seconds while verification is in progress
    pollIntervalRef.current = setInterval(() => {
      // Check current stage from latest payment state
      setPayment((latest) => {
        const stage = getStage(latest);
        if (stage === "AUTO_VERIFIED" || stage === "NEEDS_ADMIN_REVIEW" || stage === "REJECTED") {
          // Terminal state reached: stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          return latest;
        }

        // Otherwise fetch fresh data
        subscriptionsApi
          .getPayment(paymentId)
          .then((updated) => {
            setPayment(updated);
            const nextStage = getStage(updated);
            if (nextStage !== "OCR_PROCESSING" && pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          })
          .catch((e) => {
            console.warn("Polling retry error:", e);
          });

        return latest;
      });
    }, 2500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [paymentId]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen relative flex font-sans overflow-hidden bg-[#0A1118] text-white">
      {/* Background with overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-[25%_top] lg:bg-[center_top] bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage.src})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/85 to-[#0A1118] mix-blend-multiply" />

      <div className="container relative z-10 w-full mx-auto px-4 sm:px-6 py-8 flex flex-col min-h-screen items-center justify-center">
        {/* Main Card Container */}
        <div className="w-full max-w-xl bg-black/50 backdrop-blur-[24px] border border-white/10 rounded-[28px] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.6)] flex flex-col">
          {/* Card Top Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#D4A72C] via-[#22c55e] to-[#3b82f6]" />

          {/* Card Body */}
          <div className="p-6 sm:p-10 space-y-8">
            {/* INITIAL LOADING STATE */}
            {initialLoading ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 border-4 border-white/10 border-t-[#D4A72C] rounded-full animate-spin mx-auto" />
                <p className="text-white/70 text-sm font-medium">Loading payment verification status...</p>
              </div>
            ) : error && !payment ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white">Unable to Load Payment</h3>
                <p className="text-sm text-white/60 max-w-md mx-auto">{error}</p>
                <Button
                  onClick={() => fetchStatus(true)}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-xl mt-4"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                </Button>
              </div>
            ) : (
              <>
                {/* ─────────────────────────────────────────────────────────── */}
                {/* STATE 1: OCR PROCESSING / VERIFYING */}
                {/* ─────────────────────────────────────────────────────────── */}
                {currentStage === "OCR_PROCESSING" && (
                  <div className="space-y-6 text-center">
                    {/* Animated Pulse & Indicator */}
                    <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-[#3b82f6]/20 animate-ping opacity-75" />
                      <div className="absolute inset-2 rounded-full border-2 border-dashed border-[#D4A72C]/60 animate-spin" />
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#0f172a] border border-blue-400/40 flex items-center justify-center shadow-lg">
                        <Sparkles className="w-7 h-7 text-[#D4A72C] animate-pulse" />
                      </div>
                    </div>

                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        Live Automated Verification
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        Verifying Your Payment
                      </h2>
                      <p className="text-sm text-white/70 mt-2 max-w-md mx-auto leading-relaxed">
                        Our OCR engine is reading your payment proof and reconciling amount and transaction code.
                      </p>
                    </div>

                    {/* Elapsed Timer Indicator */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/70">
                      <Clock className="w-3.5 h-3.5 text-[#D4A72C]" />
                      <span>Checking details • {formatTimer(elapsedSeconds)}</span>
                    </div>

                    {/* Step-by-Step Progress Visualization */}
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-left space-y-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-white">Payment proof received</p>
                          <p className="text-[11px] text-white/50">Screenshot uploaded and stored safely</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-blue-300">Scanning receipt & OCR verification</p>
                          <p className="text-[11px] text-white/50">Matching transaction code, recipient & date</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 opacity-50">
                        <div className="w-6 h-6 rounded-full bg-white/10 text-white/40 flex items-center justify-center text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-white">Instant package access</p>
                          <p className="text-[11px] text-white/40">Activate subscription automatically</p>
                        </div>
                      </div>
                    </div>

                    {/* Long Wait Reassurance */}
                    {elapsedSeconds > 20 && (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left flex items-start gap-3">
                        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-200/90 leading-relaxed">
                          This is taking a few moments longer than usual. Your submission is safe. You can stay here or navigate to your dashboard — verification will continue in the background.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* STATE 2: AUTO VERIFIED / INSTANT ACCESS GRANTED */}
                {/* ─────────────────────────────────────────────────────────── */}
                {currentStage === "AUTO_VERIFIED" && (
                  <div className="space-y-6 text-center">
                    {/* Animated Success Badge */}
                    <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-400/40 rounded-full flex items-center justify-center mx-auto shadow-[0_0_35px_rgba(34,197,94,0.35)] animate-in zoom-in-50 duration-500">
                      <CheckCircle2 className="w-11 h-11 text-emerald-400" />
                    </div>

                    <div>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-semibold uppercase px-3 py-1 mb-3">
                        Payment Verified & Active
                      </Badge>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        You&apos;re All Set!
                      </h2>
                      <p className="text-sm text-white/70 mt-2 max-w-md mx-auto leading-relaxed">
                        Your payment was verified automatically. Your subscription and course materials have been activated.
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-2">
                      <Button
                        onClick={() => router.push("/student/learning")}
                        className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 text-[15px] flex items-center justify-center gap-2"
                      >
                        Start Learning Now <ArrowRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => router.push("/student")}
                        className="w-full text-white/60 hover:text-white hover:bg-white/5 rounded-xl text-sm"
                      >
                        Go to Student Dashboard
                      </Button>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* STATE 3: NEEDS ADMIN REVIEW */}
                {/* ─────────────────────────────────────────────────────────── */}
                {currentStage === "NEEDS_ADMIN_REVIEW" && (
                  <div className="space-y-6 text-center">
                    {/* Reassuring Amber Badge */}
                    <div className="w-20 h-20 bg-amber-500/15 border-2 border-amber-400/30 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                      <Clock className="w-10 h-10 text-amber-400" />
                    </div>

                    <div>
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs font-semibold uppercase px-3 py-1 mb-3">
                        Under Admin Review
                      </Badge>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        Payment Proof Received
                      </h2>
                      <p className="text-sm text-white/70 mt-2 max-w-md mx-auto leading-relaxed">
                        Our automatic scanner couldn&apos;t confirm every receipt detail with 100% confidence. Your payment has been routed to our Admin Team for quick manual approval.
                      </p>
                    </div>

                    {/* Reassuring Bullet Points */}
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-left space-y-2.5">
                      <div className="flex items-start gap-2.5 text-xs text-white/80">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>No action needed from you.</strong> Please do not submit duplicate payments.</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs text-white/80">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Our team verifies manual submissions promptly during support hours.</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs text-white/80">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>You will receive an in-app notification the moment your course access is unlocked.</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-2">
                      <Button
                        onClick={() => router.push("/student")}
                        className="w-full h-12 bg-white/15 hover:bg-white/20 text-white font-semibold rounded-xl text-sm"
                      >
                        Return to Dashboard
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => router.push("/student/purchases")}
                        className="w-full text-white/60 hover:text-white hover:bg-white/5 rounded-xl text-xs"
                      >
                        View My Purchases &amp; Application Status
                      </Button>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* STATE 4: REJECTED */}
                {/* ─────────────────────────────────────────────────────────── */}
                {currentStage === "REJECTED" && (
                  <div className="space-y-6 text-center">
                    <div className="w-20 h-20 bg-rose-500/20 border-2 border-rose-400/40 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(244,63,94,0.25)]">
                      <XCircle className="w-10 h-10 text-rose-400" />
                    </div>

                    <div>
                      <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-xs font-semibold uppercase px-3 py-1 mb-3">
                        Review Completed
                      </Badge>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        Payment Not Approved
                      </h2>
                      <p className="text-sm text-white/70 mt-2 max-w-md mx-auto leading-relaxed">
                        Unfortunately, we could not approve this payment submission.
                      </p>
                    </div>

                    {/* Rejection Reason from backend */}
                    {(payment?.rejection_reason || payment?.verification_result?.failure_reasons?.[0]) && (
                      <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-left">
                        <p className="text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-1">
                          Reason:
                        </p>
                        <p className="text-xs text-rose-200 leading-relaxed">
                          {payment?.rejection_reason || payment?.verification_result?.failure_reasons?.[0]}
                        </p>
                      </div>
                    )}

                    <div className="space-y-3 pt-2">
                      <Button
                        asChild
                        className="w-full h-12 bg-white/15 hover:bg-white/20 text-white font-semibold rounded-xl text-sm"
                      >
                        <Link href="/student/plans">Explore Packages &amp; Retry</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        asChild
                        className="w-full text-white/60 hover:text-white hover:bg-white/5 rounded-xl text-xs"
                      >
                        <Link href="/student/help-support">Contact Support</Link>
                      </Button>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────── */}
                {/* COMPACT PAYMENT SUMMARY CARD (SHOWN IN ALL STATES) */}
                {/* ─────────────────────────────────────────────────────────── */}
                {payment && (
                  <div className="border-t border-white/10 pt-6 mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">
                        Payment Details
                      </h3>
                      <button
                        onClick={() => fetchStatus(true)}
                        disabled={isRefreshing}
                        className="text-[11px] text-white/50 hover:text-[#D4A72C] flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-[#D4A72C]" : ""}`} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-white/50">Package:</span>
                        <span className="text-white font-medium">{payment.plan_details?.name || "LoksewaAI Package"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/50">Amount:</span>
                        <span className="text-[#D4A72C] font-semibold text-sm">NPR {payment.amount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/50">Payment Method:</span>
                        <span className="text-white font-medium">
                          {payment.payment_method_details?.display_name || "Digital Wallet / Bank"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/50">Transaction ID:</span>
                        <span className="font-mono text-white/90 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {payment.transaction_id}
                        </span>
                      </div>
                      {payment.submitted_at && (
                        <div className="flex justify-between items-center">
                          <span className="text-white/50">Submitted:</span>
                          <span className="text-white/70">
                            {new Date(payment.submitted_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
