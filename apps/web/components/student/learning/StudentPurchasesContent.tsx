"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle2, XCircle, Clock, Eye, AlertCircle, 
  ShieldCheck, ArrowRight, Sparkles, CreditCard, Copy, Check, 
  Printer, X, BookOpen, Infinity as InfinityIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";
import { dashboardApi } from "@/lib/api/dashboard";
import Link from "next/link";

interface AuthorizedCourse {
  id: number;
  title: string;
  exam?: string | null;
}

interface Subscription {
  id: number;
  plan_details: {
    id?: number;
    name: string;
    package_type?: string;
    duration?: number | null;
    duration_unit?: string | null;
    price: string;
    features?: string[];
  };
  status: string;
  source?: string;
  start_date: string | null;
  expiry_date: string | null;
  has_expiry?: boolean;
  remaining_days: number | null;
  computed_status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "CANCELLED";
  authorized_courses?: AuthorizedCourse[];
  granted_by_username?: string | null;
  access_source?: string;
}

interface Payment {
  id: number;
  transaction_id: string;
  plan: number;
  plan_details?: {
    name: string;
    package_type?: string;
  };
  payment_method_details?: {
    display_name: string;
    method_type: string;
  };
  selected_courses?: AuthorizedCourse[];
  amount: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submitted_at: string;
  verified_at?: string | null;
  rejection_reason?: string | null;
  screenshot?: string | null;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

/**
 * Validates that a date string is not null/empty, not NaN, and not the Unix epoch (1970).
 */
function isValidDate(dateStr: string | null | undefined): boolean {
  if (!dateStr || dateStr === "null" || dateStr === "undefined" || dateStr.trim() === "") {
    return false;
  }
  const d = new Date(dateStr);
  const time = d.getTime();
  if (isNaN(time)) return false;
  // Guard against Unix epoch (1970) or timestamps prior to year 2000
  if (d.getUTCFullYear() < 2000) return false;
  return true;
}

function formatSubscriptionDate(dateStr: string | null | undefined, fallback: string = "—"): string {
  if (!isValidDate(dateStr)) return fallback;
  return new Date(dateStr!).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatSubscriptionDateTime(dateStr: string | null | undefined, fallback: string = "—"): string {
  if (!isValidDate(dateStr)) return fallback;
  return new Date(dateStr!).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function calculateExactTimeRemaining(expiryDateStr: string | null | undefined): TimeRemaining | null {
  if (!isValidDate(expiryDateStr)) return null;
  const expiry = new Date(expiryDateStr!).getTime();
  const now = Date.now();
  const diff = expiry - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, totalSeconds: Math.floor(diff / 1000), isExpired: false };
}

export function StudentPurchasesContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isAdminGranted, setIsAdminGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedTxnId, setCopiedTxnId] = useState<string | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subsRes, paymentsRes, dashboard] = await Promise.all([
        apiClient<Subscription[]>("/subscriptions/my-subscriptions/").catch(() => []),
        apiClient<Payment[]>("/subscriptions/payments/").catch(() => []),
        dashboardApi.getStudentDashboard().catch(() => null)
      ]);

      const allSubs = Array.isArray(subsRes) ? subsRes : [];
      const now = new Date();

      // Check whether a subscription is active according to backend rules
      const isSubActive = (s: Subscription) => {
        if (s.status !== "ACTIVE" || s.computed_status === "EXPIRED") return false;
        if (s.expiry_date && isValidDate(s.expiry_date)) {
          return new Date(s.expiry_date) > now;
        }
        return true;
      };

      // Priority matches backend get_active_subscription:
      // 1. Paid active subscription
      // 2. Free active subscription
      // 3. Fallback: latest expired subscription if student has no active one
      const paidActive = allSubs.find((s) => isSubActive(s) && Number(s.plan_details?.price || 0) > 0);
      const freeActive = allSubs.find((s) => isSubActive(s));
      const latestExpired = allSubs.find((s) => s.status === "EXPIRED" || s.computed_status === "EXPIRED");

      if (paidActive) {
        setActiveSubscription(paidActive);
      } else if (freeActive) {
        setActiveSubscription(freeActive);
      } else if (latestExpired) {
        setActiveSubscription(latestExpired);
      } else {
        setActiveSubscription(null);
      }

      setPayments(Array.isArray(paymentsRes) ? paymentsRes : []);
      setIsAdminGranted(!!dashboard?.package?.isAdminGranted);
    } catch (error) {
      console.error("Failed to load purchases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Expiry state calculation
  const expiryInfo = useMemo(() => {
    if (!activeSubscription) {
      return { hasExpiry: false, isExpired: false, label: "No Expiry", daysRemaining: null };
    }

    const hasExpiryConfigured = Boolean(
      activeSubscription.has_expiry &&
      activeSubscription.expiry_date &&
      isValidDate(activeSubscription.expiry_date)
    );

    if (!hasExpiryConfigured) {
      return {
        hasExpiry: false,
        isExpired: false,
        label: "No Expiry",
        daysRemaining: null
      };
    }

    const expiryTime = new Date(activeSubscription.expiry_date!).getTime();
    const isPast = expiryTime <= Date.now() || activeSubscription.status === "EXPIRED" || activeSubscription.computed_status === "EXPIRED";
    const formatted = formatSubscriptionDate(activeSubscription.expiry_date);

    if (isPast) {
      return {
        hasExpiry: true,
        isExpired: true,
        label: `Expired (${formatted})`,
        daysRemaining: 0
      };
    }

    const diffDays = Math.max(0, Math.ceil((expiryTime - Date.now()) / (1000 * 60 * 60 * 24)));
    return {
      hasExpiry: true,
      isExpired: false,
      label: formatted,
      daysRemaining: diffDays
    };
  }, [activeSubscription]);

  // Live countdown timer ONLY for subscriptions with genuine future expiry
  useEffect(() => {
    if (!expiryInfo.hasExpiry || expiryInfo.isExpired || !activeSubscription?.expiry_date) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      setTimeRemaining(calculateExactTimeRemaining(activeSubscription.expiry_date));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiryInfo.hasExpiry, expiryInfo.isExpired, activeSubscription?.expiry_date]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxnId(text);
    setTimeout(() => setCopiedTxnId(null), 2500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100 border-none font-semibold">
            <Clock className="w-3.5 h-3.5 mr-1 animate-pulse" /> Pending Verification
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 border-none font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 hover:bg-red-100 border-none font-semibold">
            <XCircle className="w-3.5 h-3.5 mr-1" /> Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Find latest pending payment if any
  const pendingPayment = payments.find((p) => p.status === "PENDING");

  // Determine if package type is meaningful (not generic SINGLE or STANDARD)
  const pkgType = activeSubscription?.plan_details?.package_type;
  const isMeaningfulType = Boolean(
    pkgType && !["STANDARD", "SINGLE"].includes(pkgType.toUpperCase())
  );

  return (
    <div className="space-y-8">
      {/* Action banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Subscriptions & Orders
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Overview of your active package, authorized courses, and payment verification records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild variant="outline" className="font-semibold text-xs h-9">
            <Link href="/student/courses">
              <BookOpen className="w-4 h-4 mr-1.5" /> My Courses
            </Link>
          </Button>
          <Button asChild className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold shadow-md text-xs h-9">
            <Link href="/student/plans">
              <Sparkles className="w-4 h-4 mr-1.5" /> Browse Packages
            </Link>
          </Button>
        </div>
      </div>

      {success && (
        <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <AlertTitle className="text-emerald-400 font-semibold text-base">Payment Submitted Successfully!</AlertTitle>
          <AlertDescription className="text-emerald-300 text-sm mt-1">
            Your payment proof has been submitted for admin verification. Your learning access will activate as soon as it is verified.
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Payment Notice (if any) */}
      {pendingPayment && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 lg:p-6 text-amber-200 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 bg-amber-500/20 rounded-xl mt-0.5">
                <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-amber-300">Payment Verification Under Review</span>
                  <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 text-[10px] uppercase font-bold">
                    Pending Admin Verification
                  </Badge>
                </div>
                <p className="text-sm text-amber-200/80 mt-1">
                  Package: <strong className="text-amber-100">{pendingPayment.plan_details?.name || "Selected Package"}</strong> • Amount: <strong className="text-amber-100">NPR {pendingPayment.amount}</strong>
                </p>
                <div className="text-xs text-amber-200/60 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>Txn ID: <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono">{pendingPayment.transaction_id}</code></span>
                  <span>Submitted: {formatSubscriptionDateTime(pendingPayment.submitted_at)}</span>
                  {pendingPayment.payment_method_details?.display_name && (
                    <span>Method: {pendingPayment.payment_method_details.display_name}</span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="border-amber-400/40 text-amber-300 hover:bg-amber-400/20 bg-transparent shrink-0"
            >
              Refresh Status
            </Button>
          </div>
        </div>
      )}

      {/* ── Active Subscription Details ───────────────────────── */}
      <div className="bg-card rounded-3xl border border-border shadow-sm p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#D4A72C]/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-[#D4A72C]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Current Active Plan</h2>
              <p className="text-xs text-muted-foreground">Authorized package access details and validity status</p>
            </div>
          </div>
          {activeSubscription && (
            <div>
              {expiryInfo.isExpired ? (
                <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-3 py-1 font-bold uppercase">
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Subscription Expired
                </Badge>
              ) : activeSubscription.computed_status === "EXPIRING_SOON" ? (
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-3 py-1 font-bold uppercase">
                  <Clock className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
                  Expiring Soon
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 font-bold uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping" />
                  Active Subscription
                </Badge>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="h-44 bg-muted/60 animate-pulse rounded-2xl"></div>
        ) : activeSubscription ? (
          <div className="space-y-6">
            {/* Hero Card */}
            <div className="bg-gradient-to-br from-[#0B2545] via-[#0F355E] to-[#163E6B] text-white p-6 lg:p-8 rounded-2xl shadow-xl relative overflow-hidden border border-[#1E4E80]">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4A72C]/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left col: Plan info */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isMeaningfulType && (
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-[#D4A72C] text-[#0A1118]">
                        {pkgType!.replace(/_/g, " ")} PACKAGE
                      </span>
                    )}
                    {activeSubscription.plan_details.duration ? (
                      <span className="text-xs text-white/70">
                        Duration: {activeSubscription.plan_details.duration} {activeSubscription.plan_details.duration_unit?.toLowerCase()}
                      </span>
                    ) : (
                      <span className="text-xs text-white/70 flex items-center gap-1">
                        <InfinityIcon className="w-3.5 h-3.5 text-[#D4A72C]" /> Duration: Ongoing Access
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                      {activeSubscription.plan_details.name}
                    </h3>
                    <p className="text-sm text-slate-300 mt-1">
                      Price:{" "}
                      <span className="font-bold text-white">
                        {Number(activeSubscription.plan_details.price || 0) <= 0
                          ? "NPR 0.00 (Free)"
                          : `NPR ${activeSubscription.plan_details.price}`}
                      </span>
                    </p>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/15 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Activated On:</span>
                      <span className="font-semibold text-white">
                        {formatSubscriptionDate(activeSubscription.start_date, "Active")}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Expires On:</span>
                      {expiryInfo.hasExpiry ? (
                        expiryInfo.isExpired ? (
                          <span className="font-semibold text-red-300">
                            {expiryInfo.label}
                          </span>
                        ) : (
                          <span className="font-semibold text-[#D4A72C]">
                            {expiryInfo.label}
                          </span>
                        )
                      ) : (
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> No Expiry
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right col: Conditional validity panel */}
                <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center">
                  {expiryInfo.hasExpiry && !expiryInfo.isExpired ? (
                    /* Valid Future Expiry: Countdown timer */
                    <div className="w-full max-w-sm bg-black/30 backdrop-blur-md border border-white/15 rounded-2xl p-5 text-center shadow-inner">
                      <div className="text-xs uppercase tracking-widest text-[#D4A72C] font-bold mb-3 flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Remaining Time
                      </div>

                      {timeRemaining ? (
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="bg-white/10 rounded-xl p-2.5">
                            <span className="text-2xl sm:text-3xl font-black text-white block">
                              {timeRemaining.days}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">Days</span>
                          </div>
                          <div className="bg-white/10 rounded-xl p-2.5">
                            <span className="text-2xl sm:text-3xl font-black text-white block">
                              {String(timeRemaining.hours).padStart(2, "0")}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">Hours</span>
                          </div>
                          <div className="bg-white/10 rounded-xl p-2.5">
                            <span className="text-2xl sm:text-3xl font-black text-white block">
                              {String(timeRemaining.minutes).padStart(2, "0")}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">Mins</span>
                          </div>
                          <div className="bg-white/10 rounded-xl p-2.5">
                            <span className="text-2xl sm:text-3xl font-black text-[#D4A72C] block">
                              {String(timeRemaining.seconds).padStart(2, "0")}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">Secs</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-200 font-medium py-3">
                          {expiryInfo.daysRemaining !== null ? `${expiryInfo.daysRemaining} days remaining` : "Active"}
                        </div>
                      )}

                      <div className="mt-3 text-[11px] text-slate-300">
                        Valid until {expiryInfo.label}
                      </div>
                    </div>
                  ) : expiryInfo.isExpired ? (
                    /* Expired status box */
                    <div className="w-full max-w-sm bg-red-950/40 backdrop-blur-md border border-red-500/30 rounded-2xl p-5 text-center shadow-inner space-y-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-300 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Subscription Expired</div>
                        <p className="text-xs text-red-200/80 mt-1">
                          This plan expired on {formatSubscriptionDate(activeSubscription.expiry_date)}.
                        </p>
                      </div>
                      <Button asChild size="sm" className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold text-xs w-full">
                        <Link href="/student/plans">Renew / Upgrade Plan</Link>
                      </Button>
                    </div>
                  ) : (
                    /* Non-expiring tier (e.g. Free Tier): clean, reassuring panel without false timers */
                    <div className="w-full max-w-sm bg-white/5 backdrop-blur-md border border-white/15 rounded-2xl p-5 text-center shadow-inner space-y-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Non-Expiring Tier</div>
                        <p className="text-xs text-slate-300 mt-1">
                          This package does not have an expiration date. You have ongoing access to its authorized materials and quotas.
                        </p>
                      </div>
                      <div className="pt-1 flex items-center justify-center gap-2">
                        <Button asChild variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 text-xs bg-transparent">
                          <Link href="/student/courses">Go to Courses</Link>
                        </Button>
                        <Button asChild size="sm" className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold text-xs">
                          <Link href="/student/plans">Explore More Plans</Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Authorized / Purchased Courses Section */}
            <div className="bg-muted/40 rounded-2xl p-5 border border-border">
              <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#D4A72C]" />
                  <h4 className="font-bold text-sm text-foreground uppercase tracking-wide">
                    Authorized Preparation(s) in this Package
                  </h4>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-xs text-[#D4A72C] hover:text-[#D4A72C]/80 p-0 h-auto font-semibold">
                  <Link href="/student/courses">
                    View in My Courses <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>

              {activeSubscription.authorized_courses && activeSubscription.authorized_courses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeSubscription.authorized_courses.map((course) => (
                    <div
                      key={course.id}
                      className="bg-card border border-border rounded-xl p-3.5 flex items-center justify-between hover:border-[#D4A72C]/50 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="font-bold text-sm text-foreground truncate">{course.title}</div>
                        {course.exam && (
                          <div className="text-[11px] text-muted-foreground font-medium truncate">{course.exam}</div>
                        )}
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] shrink-0">
                        Authorized
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground flex items-center justify-between flex-wrap gap-3">
                  <span>Course enrollment active under this subscription plan.</span>
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs font-semibold">
                    <Link href="/student/courses">Open My Courses</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : isAdminGranted ? (
          <div className="bg-gradient-to-r from-emerald-900/40 via-emerald-800/30 to-emerald-950/40 border border-emerald-500/30 p-6 rounded-2xl text-emerald-100 flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-lg text-white">Full Admin-Granted Access</span>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">VIP Access</Badge>
              </div>
              <p className="text-sm text-emerald-200/80">
                Your learning access has been activated directly by the system administrator.
              </p>
            </div>
            <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs h-9">
              <Link href="/student/courses">Go to My Courses</Link>
            </Button>
          </div>
        ) : (
          <div className="bg-muted/30 border-2 border-dashed border-border rounded-2xl p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#D4A72C]/10 text-[#D4A72C] flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-foreground">No Active Package</h3>
              <p className="text-muted-foreground text-sm mt-1">
                You do not have an active package subscription right now. Choose a package to unlock full learning access, mock exams, and syllabus content.
              </p>
            </div>
            <Button asChild className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold">
              <Link href="/student/plans">Browse Available Packages</Link>
            </Button>
          </div>
        )}
      </div>

      {/* ── Payment & Purchase History ───────────────────────── */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 lg:p-8 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-foreground">Payment & Order History</h2>
            <p className="text-xs text-muted-foreground">Complete log of all submitted payments and verification receipts</p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            Total Orders: {payments.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                <th className="px-6 py-3.5">Invoice / Package</th>
                <th className="px-6 py-3.5">Transaction ID</th>
                <th className="px-6 py-3.5">Payment Method</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Date Submitted</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    Loading your purchase history...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-foreground text-base">No Payment Records Found</h3>
                      <p className="text-xs text-muted-foreground">
                        You have not submitted any payment orders yet. Once you purchase a package, your payment evidence and verification receipts will be logged here.
                      </p>
                      <Button asChild size="sm" className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold text-xs mt-1">
                        <Link href="/student/plans">Browse Available Packages</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/40 transition-colors">
                    {/* Plan */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">
                        {payment.plan_details?.name || `Package #${payment.plan}`}
                      </div>
                      {payment.selected_courses && payment.selected_courses.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {payment.selected_courses.map((c) => c.title).join(", ")}
                        </div>
                      )}
                    </td>

                    {/* Txn ID */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded border border-border">
                          {payment.transaction_id}
                        </code>
                        <button
                          onClick={() => copyToClipboard(payment.transaction_id)}
                          className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                          title="Copy Transaction ID"
                        >
                          {copiedTxnId === payment.transaction_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Method */}
                    <td className="px-6 py-4 text-muted-foreground font-medium">
                      {payment.payment_method_details?.display_name || "Online QR"}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 font-bold text-foreground">
                      NPR {payment.amount}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {formatSubscriptionDate(payment.submitted_at)}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.status)}
                      {payment.status === "REJECTED" && payment.rejection_reason && (
                        <div className="text-[11px] text-red-400 mt-1 max-w-[200px] line-clamp-2">
                          Reason: {payment.rejection_reason}
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      {payment.status === "APPROVED" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReceiptPayment(payment)}
                          className="text-[#D4A72C] hover:text-[#D4A72C]/80 hover:bg-[#D4A72C]/10 font-bold text-xs h-8"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Receipt
                        </Button>
                      ) : payment.status === "REJECTED" ? (
                        <Button asChild size="sm" variant="outline" className="text-xs h-8 border-red-500/30 text-red-400 hover:bg-red-500/10">
                          <Link href="/student/plans">Resubmit</Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">In Review</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Official Receipt Modal ─────────────────────────────── */}
      {receiptPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            {/* Close button */}
            <button
              onClick={() => setReceiptPayment(null)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Content */}
            <div id="receipt-print-area" className="space-y-6">
              {/* Header */}
              <div className="text-center border-b border-border pb-5">
                <div className="inline-flex items-center justify-center p-3 bg-[#D4A72C]/10 rounded-2xl mb-2 text-[#D4A72C]">
                  <CreditCard className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-foreground">LoksewaAI</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                  Official Payment Receipt
                </p>
                <div className="mt-3 inline-block">
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-0.5 font-bold">
                    VERIFIED & APPROVED
                  </Badge>
                </div>
              </div>

              {/* Receipt Details Grid */}
              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Receipt / Order No:</span>
                  <span className="font-mono font-bold text-foreground">#PAY-{receiptPayment.id}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Package Purchased:</span>
                  <span className="font-bold text-foreground text-right">
                    {receiptPayment.plan_details?.name || `Plan #${receiptPayment.plan}`}
                  </span>
                </div>

                {receiptPayment.selected_courses && receiptPayment.selected_courses.length > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Authorized Courses:</span>
                    <span className="font-semibold text-foreground text-right max-w-[240px]">
                      {receiptPayment.selected_courses.map((c) => c.title).join(", ")}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Transaction / Ref ID:</span>
                  <span className="font-mono text-foreground font-medium">
                    {receiptPayment.transaction_id}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Payment Provider:</span>
                  <span className="font-medium text-foreground">
                    {receiptPayment.payment_method_details?.display_name || "Online QR"}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Payment Date:</span>
                  <span className="text-foreground">
                    {formatSubscriptionDateTime(receiptPayment.submitted_at)}
                  </span>
                </div>

                {receiptPayment.verified_at && (
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Verified On:</span>
                    <span className="text-foreground">
                      {formatSubscriptionDateTime(receiptPayment.verified_at)}
                    </span>
                  </div>
                )}

                {/* Total Paid Highlight */}
                <div className="bg-muted/60 p-4 rounded-2xl flex justify-between items-center mt-4">
                  <span className="font-bold text-base text-foreground">Total Paid:</span>
                  <span className="text-2xl font-black text-[#D4A72C]">
                    NPR {receiptPayment.amount}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-border mt-6">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex-1 font-bold text-xs h-11"
              >
                <Printer className="w-4 h-4 mr-2" /> Print Receipt
              </Button>
              <Button
                onClick={() => setReceiptPayment(null)}
                className="flex-1 bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold text-xs h-11"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
