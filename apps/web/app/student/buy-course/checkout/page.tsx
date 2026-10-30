"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  UploadCloud,
  AlertTriangle,
  Loader2,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Bot,
  GraduationCap,
  Clock,
  QrCode,
  Layers,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { subscriptionsApi, SubscriptionPlan } from "@/lib/api/subscriptions";
import { marketplaceApi, PaymentMethod } from "@/lib/api/marketplace";
import { buildMediaUrl } from "@/lib/api/client";
import { RetryImage } from "@/components/ui/retry-image";
import Link from "next/link";
import bgImage from "@/media/signup.webp";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EligibleCourse {
  id: number;
  title: string;
  exam?: string | null;
  level?: string | null;
  category?: string | null;
  hierarchy_path?: string | null;
  status?: string;
  is_coming_soon?: boolean;
}

// ─── Step Progress ─────────────────────────────────────────────────────────────

function StepProgress({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Preparation" },
    { n: 2, label: "Choose Plan" },
    { n: 3, label: "Checkout" },
  ];
  return (
    <div className="hidden sm:flex items-center gap-0">
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  done
                    ? "bg-[#D4A72C] border-[#D4A72C] text-[#0A1118]"
                    : active
                    ? "bg-transparent border-[#D4A72C] text-[#D4A72C]"
                    : "bg-transparent border-white/20 text-white/30"
                }`}
              >
                {done ? "✓" : s.n}
              </div>
              <span className={`text-[9px] font-semibold ${active ? "text-white" : done ? "text-[#D4A72C]" : "text-white/30"}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-0.5 ${done ? "bg-[#D4A72C]" : "bg-white/10"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── MULTI Course Selector ────────────────────────────────────────────────────

function MultiCourseSelector({
  plan,
  selectedIds,
  onToggle,
}: {
  plan: SubscriptionPlan;
  selectedIds: number[];
  onToggle: (courseId: number) => void;
}) {
  const eligible: EligibleCourse[] = plan.eligible_courses_details ?? [];
  const max = plan.allowed_preparation_count;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider">
          Select Courses ({selectedIds.length}/{max})
        </h4>
        {selectedIds.length >= max && (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
            Max {max} reached
          </span>
        )}
      </div>

      {eligible.length === 0 ? (
        <p className="text-xs text-white/40 italic">
          No specific courses defined — all eligible courses will be included.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {eligible.map((course) => {
            const isSelected = selectedIds.includes(course.id);
            const isDisabled = !isSelected && selectedIds.length >= max;

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => !isDisabled && onToggle(course.id)}
                disabled={isDisabled}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? "border-[#D4A72C] bg-[#D4A72C]/10 text-white"
                    : isDisabled
                    ? "border-white/5 bg-white/[0.02] text-white/30 cursor-not-allowed"
                    : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "border-[#D4A72C] bg-[#D4A72C]" : "border-white/20 bg-transparent"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#0A1118]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block truncate">{course.title}</span>
                    {(course.exam || course.category) && (
                      <span className="text-[10px] text-white/40 truncate block">
                        {[course.exam, course.category].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main inner component ─────────────────────────────────────────────────────

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const planId = searchParams.get("plan_id");
  const examId = searchParams.get("exam_id");
  const examName = searchParams.get("exam_name") ?? "Your Preparation";
  const courseIdParam = searchParams.get("course_id");
  const courseName = searchParams.get("course_name");

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activatingFree, setActivatingFree] = useState(false);
  const [freeSuccess, setFreeSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MULTI course selection
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);

  // Payment form
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!planId) {
      router.replace("/student/buy-course");
      return;
    }

    const loadData = async () => {
      try {
        const [planData, methodsData] = await Promise.all([
          subscriptionsApi.getPlan(planId),
          marketplaceApi.getPaymentMethods().catch(() => [] as PaymentMethod[]),
        ]);

        setPlan(planData);
        const active = (methodsData || []).filter((m: any) => m.is_active !== false);
        setPaymentMethods(active);
        if (active.length > 0 && active[0]) setSelectedMethodId(active[0].id);

        // Pre-select course for SINGLE type if course_id param given
        if (planData.package_type === "SINGLE" && courseIdParam) {
          setSelectedCourseIds([parseInt(courseIdParam, 10)]);
        }
        // For BUNDLE, select all eligible courses automatically (display-only)
        if (planData.package_type === "BUNDLE") {
          const bundleIds = (planData.eligible_courses_details ?? []).map((c) => c.id);
          setSelectedCourseIds(bundleIds);
        }
      } catch {
        setError("Failed to load package details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [planId, courseIdParam, router]);

  const isFreePlan = Boolean(plan && (plan.is_default_free || plan.is_free || Number(plan.price) === 0));

  const handleToggleCourse = useCallback((courseId: number) => {
    if (!plan) return;
    const max = plan.allowed_preparation_count;
    setSelectedCourseIds((prev) => {
      if (prev.includes(courseId)) return prev.filter((id) => id !== courseId);
      if (prev.length >= max) return prev;
      return [...prev, courseId];
    });
  }, [plan]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Screenshot must be less than 5MB.");
      return;
    }
    setScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleActivateFree = async () => {
    if (!plan) return;
    setActivatingFree(true);
    setError(null);
    try {
      const payload = selectedCourseIds.length > 0 ? { course_ids: selectedCourseIds } : undefined;
      await subscriptionsApi.activateFreePlan(plan.id, payload);
      setFreeSuccess(true);
    } catch (err: any) {
      setError(err.detail || err.error || err.message || "Failed to activate free plan.");
    } finally {
      setActivatingFree(false);
    }
  };

  const handleSubmitPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    if (isFreePlan) return handleActivateFree();

    if (!selectedMethodId) {
      setError("Please select a payment method.");
      return;
    }
    if (!transactionId.trim()) {
      setError("Please enter the transaction reference ID.");
      return;
    }
    if (!screenshot) {
      setError("Please upload your payment receipt.");
      return;
    }

    // MULTI validation
    if (plan.package_type === "MULTI") {
      const eligible = plan.eligible_courses_details ?? [];
      if (eligible.length > 0 && selectedCourseIds.length === 0) {
        setError("Please select at least one course for this package.");
        return;
      }
      if (selectedCourseIds.length > plan.allowed_preparation_count) {
        setError(`This plan allows up to ${plan.allowed_preparation_count} course(s).`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("plan", plan.id.toString());
      formData.append("payment_method", selectedMethodId.toString());
      formData.append("amount", plan.price);
      formData.append("transaction_id", transactionId.trim());
      formData.append("screenshot", screenshot);
      if (note.trim()) formData.append("note", note.trim());

      // Append course selections (backend validates)
      if (plan.package_type === "MULTI") {
        selectedCourseIds.forEach((id) => formData.append("course_ids", id.toString()));
      } else if (plan.package_type === "SINGLE") {
        // Single: use the explicitly selected course if present
        const singleId =
          courseIdParam ||
          plan.eligible_courses_details?.[0]?.id?.toString() ||
          plan.eligible_courses?.[0]?.toString();
        if (singleId) formData.append("course_ids", singleId.toString());
      }
      // BUNDLE: backend handles all eligible courses automatically

      const res = await subscriptionsApi.submitPayment(formData);
      router.push(`/student/payment/verification/${res.id}`);
    } catch (err: any) {
      setError(err.detail || err.error || err.message || "Payment submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId);
  const backUrl = examId
    ? `/student/buy-course/plans?exam_id=${examId}&exam_name=${encodeURIComponent(examName)}${courseIdParam ? `&course_id=${courseIdParam}&course_name=${encodeURIComponent(courseName ?? "")}` : ""}`
    : "/student/buy-course/plans";

  // ── Free Success Screen ───────────────────────────────────────────────────────

  if (freeSuccess) {
    return (
      <div className="min-h-screen relative flex font-sans overflow-hidden bg-[#0A1118] text-white">
        <div className="absolute inset-0 z-0 bg-cover bg-[25%_top] lg:bg-[center_top] bg-no-repeat" style={{ backgroundImage: `url(${bgImage.src})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/80 to-black/95 mix-blend-multiply" />
        <div className="container relative z-10 w-full mx-auto px-6 flex flex-col min-h-screen items-center justify-center">
          <div className="w-full max-w-md bg-black/60 backdrop-blur-[24px] border border-emerald-500/30 rounded-[28px] p-8 text-center shadow-[0_20px_60px_rgba(16,185,129,0.15)] space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                Free Plan Activated
              </span>
              <h2 className="text-2xl font-extrabold text-white">You're all set!</h2>
              <p className="text-sm text-white/70">Your free plan has been activated. Start learning now.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button asChild className="h-12 bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-[#0A1118] font-bold rounded-xl">
                <Link href="/student/learning">Go to My Learning</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl">
                <Link href="/student">Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Checkout ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen relative flex font-sans overflow-hidden bg-[#0A1118] text-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-[25%_top] lg:bg-[center_top] bg-no-repeat" style={{ backgroundImage: `url(${bgImage.src})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/95 lg:bg-gradient-to-r lg:from-black/50 lg:via-black/20 lg:to-black/80 mix-blend-multiply" />
      </div>

      <div className="container relative z-10 w-full mx-auto px-4 md:px-8 py-8 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex justify-between items-center w-full mb-6">
          <button
            onClick={() => router.push(backUrl)}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-semibold text-sm">Back to Plans</span>
          </button>
          <StepProgress current={3} />
        </div>

        <div className="w-full flex justify-center flex-1 py-2 pb-12">
          <div className="w-full max-w-5xl bg-black/50 backdrop-blur-[24px] border border-white/10 rounded-[26px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#D4A72C]/20 text-[#D4A72C] border-[#D4A72C]/30 text-[11px] font-bold uppercase">
                    {isFreePlan ? "Free Plan Activation" : "Payment Checkout"}
                  </Badge>
                  <span className="text-xs text-white/50">Step 3 of 3</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
                  {isFreePlan ? "Confirm Free Plan" : "Review & Complete Payment"}
                </h2>
                {/* Preparation context */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#D4A72C]" />
                  <span className="text-xs text-white/60">
                    {courseName ?? examName}
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex gap-1.5">
                <div className="h-2 w-8 bg-[#D4A72C] rounded-full" />
                <div className="h-2 w-8 bg-[#D4A72C] rounded-full" />
                <div className="h-2 w-8 bg-[#D4A72C] rounded-full" />
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-24">
                <Loader2 className="w-9 h-9 text-[#D4A72C] animate-spin" />
              </div>
            ) : !plan ? (
              <div className="p-12 text-center space-y-4">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">Package Not Found</h3>
                <p className="text-xs text-white/60">Please select a plan first.</p>
                <Button asChild className="rounded-xl">
                  <Link href="/student/buy-course">Browse Preparations</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row flex-1">
                {/* ── Left: Order Summary ── */}
                <div className="w-full md:w-5/12 bg-white/[0.03] p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/10 space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-4">
                      Package Summary
                    </h3>
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold text-[#D4A72C] uppercase tracking-wider block">
                            {plan.package_type} PACKAGE
                          </span>
                          <h4 className="text-xl font-bold text-white mt-0.5">{plan.name}</h4>
                        </div>
                        <Badge className={`${isFreePlan ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-[#D4A72C]/20 text-[#D4A72C] border-[#D4A72C]/30"} text-[10px] font-extrabold uppercase`}>
                          {isFreePlan ? "FREE" : "PREMIUM"}
                        </Badge>
                      </div>

                      {plan.description && (
                        <p className="text-xs text-white/70 line-clamp-2">{plan.description}</p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <Clock className="w-3.5 h-3.5 text-[#D4A72C]" />
                        {plan.has_expiry !== false
                          ? `Valid for ${plan.duration} ${plan.duration_unit}`
                          : "Lifetime access"}
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-baseline justify-between">
                        <span className="text-xs text-white/60">Total</span>
                        <span className={`text-2xl font-black ${isFreePlan ? "text-emerald-400" : "text-[#D4A72C]"}`}>
                          {isFreePlan ? "FREE" : `Rs. ${plan.price}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Course selection display for BUNDLE */}
                  {plan.package_type === "BUNDLE" && (plan.eligible_courses_details?.length ?? 0) > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">
                        Included Courses ({plan.eligible_courses_details?.length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {plan.eligible_courses_details?.map((course) => (
                          <div key={course.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="w-7 h-7 rounded-lg bg-[#D4A72C]/10 border border-[#D4A72C]/20 flex items-center justify-center shrink-0 text-[#D4A72C]">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-white truncate">{course.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SINGLE course shown */}
                  {plan.package_type === "SINGLE" && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">Course</h4>
                      <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="w-7 h-7 rounded-lg bg-[#D4A72C]/10 border border-[#D4A72C]/20 flex items-center justify-center shrink-0 text-[#D4A72C]">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-white truncate">
                          {courseName ?? plan.course_details?.title ?? plan.eligible_courses_details?.[0]?.title ?? "Preparation Course"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* MULTI: selected courses summary */}
                  {plan.package_type === "MULTI" && selectedCourseIds.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">
                        Selected ({selectedCourseIds.length}/{plan.allowed_preparation_count})
                      </h4>
                      <div className="space-y-1.5">
                        {selectedCourseIds.map((id) => {
                          const c = plan.eligible_courses_details?.find((ec) => ec.id === id);
                          return (
                            <div key={id} className="flex items-center gap-2 text-xs text-white/80">
                              <Check className="w-3 h-3 text-[#D4A72C]" />
                              <span className="truncate">{c?.title ?? `Course #${id}`}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Trust badge */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 text-xs text-white/60">
                    <ShieldCheck className="w-4 h-4 text-[#D4A72C] shrink-0 mt-0.5" />
                    <span>
                      {isFreePlan
                        ? "Instant server-side activation. Upgrade anytime."
                        : "Payments are manually reviewed and verified against our official accounts."}
                    </span>
                  </div>
                </div>

                {/* ── Right: Form ── */}
                <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col justify-between">
                  {error && (
                    <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-red-200">{error}</div>
                    </div>
                  )}

                  {/* MULTI course selector — shown before payment form */}
                  {plan.package_type === "MULTI" && (
                    <div className="mb-6">
                      <MultiCourseSelector
                        plan={plan}
                        selectedIds={selectedCourseIds}
                        onToggle={handleToggleCourse}
                      />
                      <div className="mt-4 border-t border-white/10" />
                    </div>
                  )}

                  {isFreePlan ? (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                              Instant Activation
                            </span>
                            <h3 className="text-lg font-bold text-white">No Payment Required</h3>
                          </div>
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed">
                          This free plan provides immediate access to study materials, AI Tutor trial queries, and curated practice sets.
                        </p>
                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-white block">Activation Fee</span>
                            <span className="text-[11px] text-white/50">Zero charge · No card required</span>
                          </div>
                          <span className="text-lg font-black text-emerald-400">FREE</span>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-white/10 space-y-2">
                        <Button
                          type="button"
                          onClick={handleActivateFree}
                          disabled={activatingFree}
                          className="w-full h-12 text-sm font-bold bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-[#0A1118] rounded-xl shadow-lg flex items-center justify-center gap-2"
                        >
                          {activatingFree ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Activating...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Activate Free Plan</span>
                            </>
                          )}
                        </Button>
                        <p className="text-[11px] text-center text-white/50">
                          By activating, you gain immediate access to preparation tools.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitPaid} className="space-y-5 flex-1 flex flex-col">
                      {/* Payment Method */}
                      <div>
                        <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2.5">
                          1. Select Payment Method
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {paymentMethods.map((method) => {
                            const isSelected = selectedMethodId === method.id;
                            return (
                              <button
                                key={method.id}
                                type="button"
                                onClick={() => setSelectedMethodId(method.id)}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? "border-[#D4A72C] bg-[#D4A72C]/10 text-white"
                                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                                }`}
                              >
                                <span className="font-bold text-xs block">{method.display_name}</span>
                                <span className="text-[10px] text-white/50">{method.method_type}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Instructions & QR */}
                      {selectedMethod && (
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                            {selectedMethod.qr_image ? (
                              <RetryImage
                                src={buildMediaUrl(selectedMethod.qr_image)}
                                alt={`${selectedMethod.display_name} QR`}
                                className="w-28 h-28 rounded-xl bg-white object-contain p-2 shrink-0 shadow-sm"
                              />
                            ) : (
                              <div className="w-28 h-28 rounded-xl bg-white/10 border border-white/20 flex flex-col items-center justify-center shrink-0 text-white/40">
                                <QrCode className="w-8 h-8 mb-1" />
                                <span className="text-[10px]">Bank Transfer</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-1 text-xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4A72C]">
                                Transfer exactly Rs. {plan.price}
                              </span>
                              {selectedMethod.account_name && (
                                <div className="text-white">
                                  <span className="text-white/40">A/C Name: </span>
                                  <strong className="font-mono">{selectedMethod.account_name}</strong>
                                </div>
                              )}
                              {selectedMethod.account_number && (
                                <div className="text-white">
                                  <span className="text-white/40">A/C Number: </span>
                                  <strong className="font-mono text-[#D4A72C]">{selectedMethod.account_number}</strong>
                                </div>
                              )}
                              {selectedMethod.bank_name && (
                                <div className="text-white">
                                  <span className="text-white/40">Bank: </span>
                                  {selectedMethod.bank_name}
                                </div>
                              )}
                              {selectedMethod.instructions && (
                                <p className="text-[11px] text-white/70 bg-black/20 p-2 rounded-lg border border-white/5 mt-1">
                                  {selectedMethod.instructions}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Proof Inputs */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider">
                          2. Upload Payment Proof
                        </h4>
                        <div>
                          <label className="block text-xs text-white/70 font-semibold mb-1">
                            Transaction Reference ID *
                          </label>
                          <Input
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="e.g. 9841234567 or Bank Ref 12345678"
                            className="bg-black/30 border-white/10 text-white focus:border-[#D4A72C] h-10 text-xs font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-white/70 font-semibold mb-1">
                            Payment Screenshot / Receipt *
                          </label>
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                              screenshot
                                ? "border-emerald-500/50 bg-emerald-500/5"
                                : "border-white/20 hover:border-[#D4A72C]/50 bg-black/20"
                            }`}
                          >
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileChange}
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              className="hidden"
                            />
                            {screenshotPreview ? (
                              <div className="flex items-center justify-center gap-3">
                                <img src={screenshotPreview} alt="Receipt" className="h-12 w-12 object-cover rounded-lg border border-white/20" />
                                <div className="text-left">
                                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Proof attached
                                  </span>
                                  <span className="text-[11px] text-white/50 truncate max-w-[180px] block">
                                    {screenshot?.name}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2 text-xs text-white/60">
                                <UploadCloud className="w-5 h-5 text-[#D4A72C]" />
                                <span>Click to upload receipt (JPG, PNG, PDF · max 5MB)</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-white/70 font-semibold mb-1">
                            Additional Note (Optional)
                          </label>
                          <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Optional remark or registered mobile number..."
                            className="bg-black/30 border-white/10 text-white focus:border-[#D4A72C] text-xs min-h-[56px]"
                          />
                        </div>
                      </div>

                      {/* Submit */}
                      <div className="pt-4 mt-auto border-t border-white/10 space-y-2">
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="w-full h-12 bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-[#0A1118] font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Submitting Payment...</span>
                            </>
                          ) : (
                            <span>Submit Payment for Verification</span>
                          )}
                        </Button>
                        <p className="text-[11px] text-center text-white/50">
                          Your receipt will be reviewed by our team. Access is granted after approval.
                        </p>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page wrapper ──────────────────────────────────────────────────────────────

export default function BuyCourseCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A1118] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#D4A72C] animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

