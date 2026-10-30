"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Layers,
  AlertCircle,
  GraduationCap,
  BookOpen,
  Bot,
  FileText,
  Zap,
  Table as TableIcon,
  LayoutGrid,
  X,
  Infinity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { subscriptionsApi, SubscriptionPlan, AvailablePlansResponse } from "@/lib/api/subscriptions";
import Link from "next/link";

// ─── Step Progress ─────────────────────────────────────────────────────────────

function StepProgress({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Preparation" },
    { n: 2, label: "Choose Plan" },
    { n: 3, label: "Checkout" },
  ];
  return (
    <div className="flex items-center gap-0 w-full max-w-md">
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  done
                    ? "bg-[#D4A72C] border-[#D4A72C] text-[#0A1118]"
                    : active
                    ? "bg-transparent border-[#D4A72C] text-[#D4A72C]"
                    : "bg-transparent border-border text-muted-foreground"
                }`}
              >
                {done ? "✓" : s.n}
              </div>
              <span
                className={`text-[10px] font-semibold hidden sm:block ${
                  active ? "text-foreground" : done ? "text-[#D4A72C]" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 transition-colors ${done ? "bg-[#D4A72C]" : "bg-border"}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function formatQuota(
  conf?: { enabled?: boolean; attempts?: number },
  unlimitedFallback = "Unlimited"
) {
  if (!conf || conf.enabled === false) return "Disabled";
  const val = conf.attempts;
  if (val === undefined || val === null || val === -1 || val === 0) return unlimitedFallback;
  return `${val} Attempts`;
}

function PackageSkeleton() {
  return (
    <div className="bg-card border border-border rounded-[24px] p-7 animate-pulse space-y-5">
      <div className="h-5 bg-muted rounded w-2/3" />
      <div className="h-10 bg-muted rounded w-1/2" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 bg-muted rounded" />
        ))}
      </div>
      <div className="h-10 bg-muted rounded-xl" />
    </div>
  );
}

// ─── Inner component (uses useSearchParams) ────────────────────────────────────

function PlansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const examId = searchParams.get("exam_id");
  const examName = searchParams.get("exam_name") ?? "Your Preparation";
  const courseId = searchParams.get("course_id");
  const courseName = searchParams.get("course_name");

  const [data, setData] = useState<AvailablePlansResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (!examId) {
      router.replace("/student/buy-course");
      return;
    }

    setIsLoading(true);
    setError(null);

    const params: { exam_id?: string; course_id?: string } = {};
    if (courseId) params.course_id = courseId;
    else if (examId) params.exam_id = examId;

    subscriptionsApi
      .listAvailablePlans(params)
      .then((res) => {
        setData(res);
        setIsLoading(false);
      })
      .catch(() => {
        setError("Failed to load plans. Please try again.");
        setIsLoading(false);
      });
  }, [examId, courseId, router]);

  const plans = (data?.plans ?? []).filter(
    (p) => p.status !== "INACTIVE" && p.is_published !== false
  );

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    // Build checkout URL preserving preparation context
    const params = new URLSearchParams();
    params.set("plan_id", plan.id.toString());
    if (examId) params.set("exam_id", examId);
    if (examName) params.set("exam_name", examName);
    if (courseId) params.set("course_id", courseId);
    if (courseName) params.set("course_name", courseName);
    router.push(`/student/buy-course/checkout?${params.toString()}`);
  };

  const backUrl = "/student/buy-course";

  const packageTypeMap: Record<string, string> = {
    SINGLE: "Single",
    MULTI: "Multi-Course",
    BUNDLE: "Bundle",
    ALL_ACCESS: "All Access",
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Preparations
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#D4A72C]/10 text-[#D4A72C] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Step 2 of 3
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary dark:text-foreground tracking-tight">
              Available Plans
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Packages available for{" "}
              <span className="font-semibold text-foreground">
                {courseName ?? examName}
              </span>
            </p>
          </div>

          <StepProgress current={2} />
        </div>

        {/* Active preparation chip */}
        <div className="inline-flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2">
          <div className="w-7 h-7 bg-[#D4A72C]/10 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-[#D4A72C]" />
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Preparation: </span>
            <span className="font-semibold text-foreground">
              {courseName ?? examName}
            </span>
          </div>
          <Link
            href="/student/buy-course"
            className="ml-1 text-[11px] font-bold text-[#D4A72C] hover:underline"
          >
            Change
          </Link>
        </div>

        {/* Compare toggle */}
        {plans.length > 1 && (
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
              className="rounded-full border-border bg-card hover:bg-muted text-xs font-semibold gap-2 h-9 shadow-sm"
            >
              {showComparison ? (
                <>
                  <LayoutGrid className="w-3.5 h-3.5 text-[#D4A72C]" /> Show Package Cards
                </>
              ) : (
                <>
                  <TableIcon className="w-3.5 h-3.5 text-[#D4A72C]" /> Compare All Side-by-Side
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">{error}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <PackageSkeleton key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && plans.length === 0 && (
        <div className="bg-card border border-border rounded-[24px] p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No Plans Available</h3>
          <p className="text-sm text-muted-foreground">
            No subscription packages are currently configured for{" "}
            <strong>{courseName ?? examName}</strong>. Try a different preparation or contact support.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/student/buy-course">Browse Other Preparations</Link>
            </Button>
            <Button asChild className="bg-[#D4A72C] text-[#0A1118] hover:bg-[#D4A72C]/90 font-bold rounded-xl">
              <Link href="/student/help-support">Contact Support</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {!isLoading && !error && plans.length > 0 && showComparison && (
        <div className="bg-card border border-border rounded-[24px] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Package Comparison</h2>
              <p className="text-xs text-muted-foreground">Side-by-side comparison for {examName}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowComparison(false)}>
              <X className="w-4 h-4 mr-1.5" /> Close Table
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="py-4 px-6 font-bold text-foreground min-w-[200px]">Feature</th>
                  {plans.map((p) => (
                    <th key={p.id} className="py-4 px-6 font-extrabold text-foreground min-w-[200px] text-center">
                      <div className="text-base">{p.name}</div>
                      <div className="text-lg font-black text-[#D4A72C] mt-1">Rs. {p.price}</div>
                      {p.display_badge && (
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4A72C]/20 text-[#D4A72C]">
                          {p.display_badge}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Package Type</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {packageTypeMap[p.package_type] ?? p.package_type}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Access Validity</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center">
                      {p.has_expiry !== false ? (
                        <span className="font-semibold">{p.duration} {p.duration_unit}</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500">
                          Lifetime
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Courses Included</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {p.package_type === "ALL_ACCESS"
                        ? "All Courses"
                        : p.package_type === "BUNDLE"
                        ? `${p.eligible_courses?.length ?? "All"} Courses`
                        : p.package_type === "MULTI"
                        ? `Choose up to ${p.allowed_preparation_count}`
                        : "1 Course"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">AI Tutor</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {p.ai_tutor_enabled !== false ? (
                        <span className="text-purple-500 font-bold">
                          {(p.ai_credits ?? 0) > 0 ? `${p.ai_credits?.toLocaleString()} Credits` : "Unlimited"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Disabled</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Practice Bank</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {p.practice_enabled !== false
                        ? (p.practice_question_limit ?? 0) > 0
                          ? `${p.practice_question_limit?.toLocaleString()} Questions`
                          : "Unlimited"
                        : <span className="text-muted-foreground">Disabled</span>}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Free Mock Tests</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {(p.free_mock_attempts ?? 0) > 0
                        ? <span className="text-emerald-500 font-bold">{p.free_mock_attempts} Attempts</span>
                        : <span className="text-muted-foreground">Standard</span>}
                    </td>
                  ))}
                </tr>
                <tr className="bg-muted/20">
                  <td className="py-4 px-6 font-bold text-foreground">Select</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-4 px-6 text-center">
                      <Button
                        size="sm"
                        onClick={() => handleSelectPlan(p)}
                        className="bg-[#D4A72C] text-[#0A1118] hover:bg-[#D4A72C]/90 font-bold rounded-xl px-5"
                      >
                        Choose
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cards */}
      {!isLoading && !error && plans.length > 0 && !showComparison && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isHighlighted =
              plan.is_featured ||
              plan.badge === "POPULAR" ||
              plan.badge === "RECOMMENDED" ||
              plan.badge === "BEST_VALUE";

            const pkgLabel =
              plan.package_type === "MULTI"
                ? `Multi (${plan.allowed_preparation_count} Courses)`
                : packageTypeMap[plan.package_type] ?? plan.package_type;

            const eligibleCount = plan.eligible_courses_details?.length ?? plan.eligible_courses?.length ?? 0;

            return (
              <div
                key={plan.id}
                className={`relative rounded-[24px] flex flex-col transition-all duration-300 ${
                  isHighlighted
                    ? "bg-[#0F1822] text-white border-2 border-[#D4A72C] shadow-[0_12px_40px_rgba(212,167,44,0.15)] scale-[1.02]"
                    : "bg-card text-foreground border border-border/80 shadow-sm hover:shadow-lg"
                }`}
              >
                {/* Badge */}
                {(plan.display_badge || (plan.badge && plan.badge !== "NONE")) && (
                  <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                    <span className="px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#B08922] to-[#D4A72C] text-[#0A1118] shadow-md">
                      {plan.display_badge || plan.badge.replace("_", " ")}
                    </span>
                  </div>
                )}

                <div className="p-7 space-y-5 flex-1 flex flex-col">
                  {/* Title + Type */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#D4A72C]/15 text-[#D4A72C] border border-[#D4A72C]/20 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {pkgLabel}
                      </span>
                      <span className={`text-xs font-semibold ${isHighlighted ? "text-white/70" : "text-muted-foreground"}`}>
                        {plan.has_expiry !== false
                          ? `${plan.duration} ${plan.duration_unit}`
                          : "Lifetime"}
                      </span>
                    </div>
                    <h2 className={`text-xl font-extrabold tracking-tight ${isHighlighted ? "text-white" : "text-foreground"}`}>
                      {plan.name}
                    </h2>
                    {plan.description && (
                      <p className={`text-sm leading-relaxed ${isHighlighted ? "text-white/60" : "text-muted-foreground"}`}>
                        {plan.description}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-black ${isHighlighted ? "text-white" : "text-foreground"}`}>
                        Rs. {plan.price}
                      </span>
                    </div>
                    {plan.original_price && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-sm line-through ${isHighlighted ? "text-white/40" : "text-muted-foreground"}`}>
                          Rs. {plan.original_price}
                        </span>
                        {plan.discount && Number(plan.discount) > 0 && (
                          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                            {plan.discount}% off
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Course Info by type */}
                  <div className={`rounded-xl p-3 text-sm space-y-1 ${isHighlighted ? "bg-white/5 border border-white/10" : "bg-muted/50 border border-border"}`}>
                    {plan.package_type === "BUNDLE" && (
                      <div className="flex items-center gap-2">
                        <BookOpen className={`w-4 h-4 ${isHighlighted ? "text-[#D4A72C]" : "text-[#D4A72C]"}`} />
                        <span className={isHighlighted ? "text-white/80" : "text-foreground"}>
                          Includes all {eligibleCount} eligible courses
                        </span>
                      </div>
                    )}
                    {plan.package_type === "MULTI" && (
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#D4A72C]" />
                        <span className={isHighlighted ? "text-white/80" : "text-foreground"}>
                          Choose up to {plan.allowed_preparation_count} courses
                          {eligibleCount > 0 ? ` from ${eligibleCount} available` : ""}
                        </span>
                      </div>
                    )}
                    {plan.package_type === "SINGLE" && (
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#D4A72C]" />
                        <span className={isHighlighted ? "text-white/80" : "text-foreground"}>
                          {plan.course_details?.title ??
                            plan.eligible_courses_details?.[0]?.title ??
                            "1 preparation course"}
                        </span>
                      </div>
                    )}
                    {plan.package_type === "ALL_ACCESS" && (
                      <div className="flex items-center gap-2">
                        <Infinity className="w-4 h-4 text-[#D4A72C]" />
                        <span className={isHighlighted ? "text-white/80" : "text-foreground"}>
                          Access to all available courses
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  {plan.features.length > 0 && (
                    <div className="space-y-2 flex-1">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-[#D4A72C] shrink-0 mt-0.5" />
                          <span className={`text-sm ${isHighlighted ? "text-white/80" : "text-foreground/80"}`}>
                            {feat}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI + Practice quick summary */}
                  <div className={`rounded-xl p-3 text-xs space-y-1.5 ${isHighlighted ? "bg-white/5 border border-white/10" : "bg-muted/30 border border-border"}`}>
                    {plan.ai_tutor_enabled !== false && (
                      <div className="flex items-center gap-2">
                        <Bot className="w-3.5 h-3.5 text-purple-500" />
                        <span className={isHighlighted ? "text-white/70" : "text-muted-foreground"}>
                          AI Tutor:{" "}
                          <span className="font-semibold">
                            {(plan.ai_credits ?? 0) > 0 ? `${plan.ai_credits?.toLocaleString()} Credits` : "Unlimited"}
                          </span>
                        </span>
                      </div>
                    )}
                    {plan.practice_enabled !== false && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <span className={isHighlighted ? "text-white/70" : "text-muted-foreground"}>
                          Practice:{" "}
                          <span className="font-semibold">
                            {(plan.practice_question_limit ?? 0) > 0
                              ? `${plan.practice_question_limit?.toLocaleString()} Questions`
                              : "Unlimited"}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full h-12 font-bold rounded-[14px] text-[15px] mt-auto transition-all ${
                      isHighlighted
                        ? "bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-90 text-[#0A1118] shadow-[0_4px_20px_rgba(212,167,44,0.3)]"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    }`}
                  >
                    Select Plan <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page wrapper ──────────────────────────────────────────────────────────────

export default function BuyCoursePlansPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <PackageSkeleton key={i} />)}
          </div>
        </div>
      }
    >
      <PlansContent />
    </Suspense>
  );
}

