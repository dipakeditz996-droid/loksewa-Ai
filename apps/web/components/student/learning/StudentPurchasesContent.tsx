"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircle2, XCircle, Clock, Eye, AlertCircle, Calendar, 
  ShieldCheck, ArrowRight, Sparkles, CreditCard, Copy, Check, 
  Printer, X, BookOpen
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
    duration: number;
    duration_unit: string;
    price: string;
    features?: string[];
  };
  status: string;
  start_date: string;
  expiry_date: string;
  remaining_days: number;
  computed_status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "CANCELLED";
  authorized_courses?: AuthorizedCourse[];
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

function calculateExactTimeRemaining(expiryDateStr: string): TimeRemaining {
  const expiry = new Date(expiryDateStr).getTime();
  const now = new Date().getTime();
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

  // Live real-time countdown timer ticking every second
  useEffect(() => {
    if (!activeSubscription?.expiry_date) return;

    // Initial calculation
    setTimeRemaining(calculateExactTimeRemaining(activeSubscription.expiry_date));

    const interval = setInterval(() => {
      setTimeRemaining(calculateExactTimeRemaining(activeSubscription.expiry_date));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSubscription?.expiry_date]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subsRes, paymentsRes, dashboard] = await Promise.all([
        apiClient<Subscription[]>("/subscriptions/my-subscriptions/").catch(() => []),
        apiClient<Payment[]>("/subscriptions/payments/").catch(() => []),
        dashboardApi.getStudentDashboard().catch(() => null)
      ]);

      const active = (subsRes || []).find((s: Subscription) => s.status === "ACTIVE");
      if (active) {
        setActiveSubscription(active);
      }

      setPayments(paymentsRes || []);
      setIsAdminGranted(!!dashboard?.package?.isAdminGranted);
    } catch (error) {
      console.error("Failed to load purchases:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Calculate percentage of time passed
  const calculateProgress = () => {
    if (!activeSubscription?.start_date || !activeSubscription?.expiry_date) return 100;
    const start = new Date(activeSubscription.start_date).getTime();
    const expiry = new Date(activeSubscription.expiry_date).getTime();
    const now = new Date().getTime();
    const total = expiry - start;
    const remaining = expiry - now;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
  };

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

        <Button asChild className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold shadow-md">
          <Link href="/student/plans">
            <Sparkles className="w-4 h-4 mr-1.5" /> Buy Another Course
          </Link>
        </Button>
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
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-amber-300">Payment Verification Under Review</span>
                  <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 text-[10px] uppercase font-bold">
                    Pending Admin Verification
                  </Badge>
                </div>
                <p className="text-sm text-amber-200/80 mt-1">
                  Package: <strong className="text-amber-100">{pendingPayment.plan_details?.name || "Selected Package"}</strong> • Amount: <strong className="text-amber-100">Rs. {pendingPayment.amount}</strong>
                </p>
                <div className="text-xs text-amber-200/60 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>Txn ID: <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono">{pendingPayment.transaction_id}</code></span>
                  <span>Submitted: {new Date(pendingPayment.submitted_at).toLocaleString()}</span>
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
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#D4A72C]/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-[#D4A72C]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Current Active Plan</h2>
              <p className="text-xs text-muted-foreground">Authorized access details and live remaining validity</p>
            </div>
          </div>
          {activeSubscription && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping" />
              Active Subscription
            </Badge>
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
                <div className="lg:col-span-6 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-[#D4A72C] text-[#0A1118]">
                      {activeSubscription.plan_details.package_type || "PREMIUM"} PACKAGE
                    </span>
                    <span className="text-xs text-white/70">
                      Duration: {activeSubscription.plan_details.duration} {activeSubscription.plan_details.duration_unit}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                      {activeSubscription.plan_details.name}
                    </h3>
                    <p className="text-sm text-slate-300 mt-1">
                      Price: <span className="font-bold text-white">NPR {activeSubscription.plan_details.price}</span>
                    </p>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/15 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-400 block">Activated On:</span>
                      <span className="font-semibold text-white">
                        {new Date(activeSubscription.start_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Expires On:</span>
                      <span className="font-semibold text-[#D4A72C]">
                        {new Date(activeSubscription.expiry_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right col: EXACT LIVE COUNTDOWN */}
                <div className="lg:col-span-6 flex flex-col items-center lg:items-end justify-center">
                  <div className="w-full max-w-sm bg-black/30 backdrop-blur-md border border-white/15 rounded-2xl p-5 text-center shadow-inner">
                    <div className="text-xs uppercase tracking-widest text-[#D4A72C] font-bold mb-3 flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Exact Remaining Time
                    </div>

                    {timeRemaining && (
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
                    )}

                    {/* Progress bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>Access Remaining</span>
                        <span className="font-bold text-[#D4A72C]">{calculateProgress()}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#D4A72C] h-full transition-all duration-1000 rounded-full"
                          style={{ width: `${calculateProgress()}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Authorized / Purchased Courses Section */}
            <div className="bg-muted/40 rounded-2xl p-5 border border-border">
              <div className="flex items-center justify-between mb-3.5">
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
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm text-foreground line-clamp-1">{course.title}</div>
                        {course.exam && (
                          <div className="text-[11px] text-muted-foreground font-medium">{course.exam}</div>
                        )}
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] shrink-0 ml-2">
                        Authorized
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground flex items-center justify-between">
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
        <div className="p-6 lg:p-8 border-b border-border flex items-center justify-between">
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
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No payment records found.
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
                      Rs. {payment.amount}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(payment.submitted_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
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
                    {new Date(receiptPayment.submitted_at).toLocaleString()}
                  </span>
                </div>

                {receiptPayment.verified_at && (
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Verified On:</span>
                    <span className="text-foreground">
                      {new Date(receiptPayment.verified_at).toLocaleString()}
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
