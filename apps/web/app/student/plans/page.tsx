"use client";

import { useState, useEffect } from "react";
import { 
  Check, Zap, AlertCircle, GraduationCap, ArrowRight, Layers, RefreshCw, 
  Sparkles, FileText, Bot, HelpCircle, Table as TableIcon, LayoutGrid, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { subscriptionsApi, SubscriptionPlan, AvailablePlansResponse } from "@/lib/api/subscriptions";

export default function StudentPlansPage() {
  const router = useRouter();
  const [data, setData] = useState<AvailablePlansResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await subscriptionsApi.listAvailablePlans();
      setData(res);
    } catch (error) {
      console.error("Error fetching available plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const preparation = data?.preparation;
  const plans = (data?.plans || []).filter((p) => p.status !== "INACTIVE" && p.is_published !== false);

  const formatQuota = (conf?: { enabled?: boolean; attempts?: number }, unlimitedFallback = "Unlimited") => {
    if (!conf || conf.enabled === false) return "Disabled";
    const val = conf.attempts;
    if (val === undefined || val === null || val === -1 || val === 0) return unlimitedFallback;
    return `${val} Attempts`;
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-10">
      {/* Page Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto pt-4">
        <Badge variant="outline" className="bg-[#D4A72C]/10 text-[#D4A72C] border-[#D4A72C]/30 px-3 py-1 font-semibold">
          <Zap className="w-3.5 h-3.5 mr-1" /> Preparation Packages
        </Badge>
        <h1 className="text-3xl lg:text-5xl font-extrabold text-foreground tracking-tight">
          Choose Your Package
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          All packages are entitlement-driven with transparent exam, practice, and AI quotas. Learning access unlocks instantly once verified.
        </p>

        {plans.length > 1 && (
          <div className="pt-2 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
              className="rounded-full border-border/80 bg-card hover:bg-muted text-xs font-semibold gap-2 h-9 shadow-sm"
            >
              {showComparison ? (
                <>
                  <LayoutGrid className="w-3.5 h-3.5 text-[#D4A72C]" /> Show Package Cards
                </>
              ) : (
                <>
                  <TableIcon className="w-3.5 h-3.5 text-[#D4A72C]" /> Compare All Packages Side-by-Side
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* YOUR PREPARATION Card */}
      {preparation?.has_preference && (
        <div className="bg-card border border-border/80 rounded-[20px] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-[14px] bg-[#D4A72C]/10 border border-[#D4A72C]/20 flex items-center justify-center shrink-0 text-[#D4A72C]">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#D4A72C] uppercase tracking-wider">
                Your Registered Preparation
              </span>
              <h3 className="text-lg md:text-xl font-bold text-foreground mt-0.5">
                {preparation.course_title || preparation.exam_name || preparation.category_name}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                {preparation.category_name && (
                  <span className="px-2.5 py-0.5 rounded-full bg-muted font-medium">
                    {preparation.category_name}
                  </span>
                )}
                {preparation.level_name && (
                  <span className="px-2.5 py-0.5 rounded-full bg-muted font-medium">
                    {preparation.level_name}
                  </span>
                )}
                {preparation.service_name && (
                  <span className="px-2.5 py-0.5 rounded-full bg-muted font-medium">
                    {preparation.service_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              asChild
              className="text-xs h-9 rounded-xl border-border hover:bg-muted font-semibold w-full md:w-auto"
            >
              <Link href="/student/onboarding/preparation">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Change Preparation
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[560px] rounded-[24px] bg-muted/80 animate-pulse"></div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/60 rounded-[24px] p-8 max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No Packages Available</h3>
          <p className="text-sm text-muted-foreground">
            No package is currently available for your selected preparation. Please browse other preparations or contact our academic support team.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/student/onboarding/preparation">Browse Other Preparations</Link>
            </Button>
            <Button asChild className="bg-[#D4A72C] text-[#0A1118] hover:bg-[#D4A72C]/90 font-bold rounded-xl">
              <Link href="/student/help-support">Contact Support</Link>
            </Button>
          </div>
        </div>
      ) : showComparison ? (
        /* Side-by-Side Comparison Matrix */
        <div className="bg-card border border-border rounded-[24px] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Package Comparison Matrix</h2>
              <p className="text-xs text-muted-foreground">Side-by-side comparison of entitlements, quotas, and limits</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowComparison(false)}>
              <X className="w-4 h-4 mr-1.5" /> Close Table
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="py-4 px-6 font-bold text-foreground min-w-[200px]">Feature / Entitlement</th>
                  {plans.map((p) => (
                    <th key={p.id} className="py-4 px-6 font-extrabold text-foreground min-w-[200px] text-center">
                      <div className="text-base text-primary dark:text-foreground">{p.name}</div>
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
                {/* Validity */}
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Access Validity</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center">
                      {p.has_expiry !== false ? (
                        <span className="font-semibold">{p.duration} {p.duration_unit}</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500">
                          Lifetime / Quota-only
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Courses */}
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Course Access</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {p.course_access_type === "ALL_ACCESS" 
                        ? "All Courses" 
                        : p.course_access_type === "NONE" 
                        ? "No Course Material" 
                        : `${p.eligible_courses?.length || 1} Selected Courses`}
                    </td>
                  ))}
                </tr>
                {/* Free Mock Tests */}
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Free Mock Tests</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {(p.free_mock_attempts ?? 0) > 0 ? (
                        <span className="text-emerald-500 font-bold">{p.free_mock_attempts} Free Attempts</span>
                      ) : (
                        <span className="text-muted-foreground">Standard access</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Model Mock Exams */}
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Model Mock Exams</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {formatQuota(p.exam_quotas?.MODEL)}
                    </td>
                  ))}
                </tr>
                {/* Topicwise Tests */}
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Topicwise Tests</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {formatQuota(p.exam_quotas?.TOPICWISE)}
                    </td>
                  ))}
                </tr>
                {/* Past Question Papers */}
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Past Question Exams</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {formatQuota(p.exam_quotas?.PAST_QUESTION)}
                    </td>
                  ))}
                </tr>
                {/* Live Exams */}
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Live Exams</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {formatQuota(p.exam_quotas?.LIVE)}
                    </td>
                  ))}
                </tr>
                {/* Notes Access */}
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Study Notes</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {p.notes_access_type === "NONE" ? (
                        <span className="text-muted-foreground">No Notes</span>
                      ) : p.notes_access_type === "ALL" ? (
                        <span>All Platform Notes {p.can_download_notes ? "(+PDF Download)" : ""}</span>
                      ) : (
                        <span>Included Course Notes {p.can_download_notes ? "(+PDF Download)" : ""}</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* AI Tutor */}
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">AI Tutor Assistant</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {p.ai_tutor_enabled !== false ? (
                        <div>
                          <span className="text-purple-600 dark:text-purple-400 font-bold">
                            {(p.ai_credits ?? 0) > 0 ? `${(p.ai_credits ?? 0).toLocaleString()} Credits` : "Unlimited Credits"}
                          </span>
                          {(p.ai_daily_limit ?? 0) > 0 && (
                            <div className="text-[11px] text-muted-foreground">Max {p.ai_daily_limit}/day</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Disabled</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Practice Questions */}
                <tr>
                  <td className="py-3 px-6 font-semibold text-muted-foreground">Practice Bank</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-3 px-6 text-center font-medium">
                      {p.practice_enabled !== false ? (
                        (p.practice_question_limit ?? 0) > 0 ? (
                          `${(p.practice_question_limit ?? 0).toLocaleString()} Questions`
                        ) : (
                          "Unlimited Practice"
                        )
                      ) : (
                        <span className="text-muted-foreground">Disabled</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Action CTA */}
                <tr className="bg-muted/20">
                  <td className="py-4 px-6 font-bold text-foreground">Action</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-4 px-6 text-center">
                      <Button
                        size="sm"
                        onClick={() => router.push(`/student/plans/${p.id}/checkout`)}
                        className="bg-[#D4A72C] text-[#0A1118] hover:bg-[#D4A72C]/90 font-bold rounded-xl px-5"
                      >
                        Choose Plan
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Responsive Package Cards */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((plan: SubscriptionPlan) => {
            const isHighlighted = 
              plan.is_featured ||
              plan.badge === "POPULAR" || 
              plan.badge === "RECOMMENDED" || 
              plan.badge === "BEST_VALUE" ||
              plan.display_badge?.toLowerCase().includes("popular") ||
              plan.display_badge?.toLowerCase().includes("recommended");

            const packageTypeMap: Record<string, string> = {
              SINGLE: "Single Preparation",
              MULTI: `Multi (${plan.allowed_preparation_count} Preparations)`,
              BUNDLE: "Full Bundle",
              ALL_ACCESS: "All Access",
            };
            const packageTypeLabel = packageTypeMap[plan.package_type] || plan.package_type;

            return (
              <div
                key={plan.id}
                className={`relative rounded-[24px] flex flex-col justify-between transition-all duration-300 ${
                  isHighlighted
                    ? "bg-[#0F1822] text-white border-2 border-[#D4A72C] shadow-[0_12px_40px_rgba(212,167,44,0.15)] scale-[1.02]"
                    : "bg-card text-foreground border border-border/80 shadow-md hover:shadow-lg"
                }`}
              >
                {/* Highlight Badge */}
                {(plan.display_badge || (plan.badge && plan.badge !== "NONE")) && (
                  <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                    <span className="px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#B08922] to-[#D4A72C] text-[#0A1118] shadow-md">
                      {plan.display_badge || plan.badge.replace("_", " ")}
                    </span>
                  </div>
                )}

                <div className="p-7 space-y-6 flex-1 flex flex-col">
                  {/* Top: Title & Type */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#D4A72C]/15 text-[#D4A72C] border border-[#D4A72C]/20 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {packageTypeLabel}
                      </span>
                      <span className={`text-xs font-semibold ${isHighlighted ? "text-white/70" : "text-muted-foreground"}`}>
                        {plan.has_expiry !== false ? (
                          `${plan.duration} ${plan.duration_unit}`
                        ) : (
                          <span className="text-emerald-400 font-bold">Lifetime Quota</span>
                        )}
                      </span>
                    </div>
                    <h3 className={`text-2xl font-extrabold tracking-tight ${isHighlighted ? "text-white" : "text-foreground"}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-xs line-clamp-2 ${isHighlighted ? "text-white/60" : "text-muted-foreground"}`}>
                      {plan.description || "Comprehensive Loksewa preparation with dedicated study features."}
                    </p>
                  </div>

                  {/* Price Block */}
                  <div className="py-2 border-y border-white/10">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-black tracking-tight ${isHighlighted ? "text-white" : "text-foreground"}`}>
                        Rs. {plan.price}
                      </span>
                      {plan.original_price && (
                        <span className={`text-sm line-through ${isHighlighted ? "text-white/40" : "text-muted-foreground"}`}>
                          Rs. {plan.original_price}
                        </span>
                      )}
                    </div>
                    {plan.discount && parseFloat(plan.discount) > 0 && (
                      <span className="inline-block mt-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded">
                        Save {plan.discount}%
                      </span>
                    )}
                  </div>

                  {/* Entitlements Checklist */}
                  <div className="space-y-3 pt-2 flex-1">
                    {/* Courses */}
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 rounded-full p-0.5 bg-[#D4A72C]/20 text-[#D4A72C] shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-xs font-medium ${isHighlighted ? "text-white/90" : "text-foreground"}`}>
                        {plan.course_access_type === "ALL_ACCESS" 
                          ? "Full access to all Loksewa courses" 
                          : plan.package_type === "MULTI"
                          ? `Access to any ${plan.allowed_preparation_count} courses`
                          : "Curated syllabus courses included"}
                      </span>
                    </div>

                    {/* Free Mock Tests */}
                    {(plan.free_mock_attempts ?? 0) > 0 && (
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 rounded-full p-0.5 bg-emerald-500/20 text-emerald-400 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-semibold ${isHighlighted ? "text-emerald-300" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {plan.free_mock_attempts} Free Mock Test Attempts Included
                        </span>
                      </div>
                    )}

                    {/* Model Exam Quotas */}
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 rounded-full p-0.5 bg-[#D4A72C]/20 text-[#D4A72C] shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-xs font-medium ${isHighlighted ? "text-white/90" : "text-foreground"}`}>
                        Model Mock Exams: <strong>{formatQuota(plan.exam_quotas?.MODEL)}</strong>
                      </span>
                    </div>

                    {/* Topicwise Tests */}
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 rounded-full p-0.5 bg-[#D4A72C]/20 text-[#D4A72C] shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-xs font-medium ${isHighlighted ? "text-white/90" : "text-foreground"}`}>
                        Topicwise Tests: <strong>{formatQuota(plan.exam_quotas?.TOPICWISE)}</strong>
                      </span>
                    </div>

                    {/* Notes Access */}
                    {plan.notes_access_type !== "NONE" && (
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 rounded-full p-0.5 bg-[#D4A72C]/20 text-[#D4A72C] shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-medium ${isHighlighted ? "text-white/90" : "text-foreground"}`}>
                          Study Notes {plan.can_download_notes ? "(with PDF Download)" : "(In-app reading)"}
                        </span>
                      </div>
                    )}

                    {/* AI Tutor */}
                    {plan.ai_tutor_enabled !== false && (
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 rounded-full p-0.5 bg-purple-500/20 text-purple-400 shrink-0">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-medium ${isHighlighted ? "text-purple-200" : "text-purple-700 dark:text-purple-300"}`}>
                          AI Tutor: {(plan.ai_credits ?? 0) > 0 ? `${(plan.ai_credits ?? 0).toLocaleString()} Credits` : "Unlimited Access"}
                          {(plan.ai_daily_limit ?? 0) > 0 && ` (${plan.ai_daily_limit}/day limit)`}
                        </span>
                      </div>
                    )}

                    {/* Practice */}
                    {plan.practice_enabled !== false && (
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 rounded-full p-0.5 bg-[#D4A72C]/20 text-[#D4A72C] shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-medium ${isHighlighted ? "text-white/90" : "text-foreground"}`}>
                          Practice: {(plan.practice_question_limit ?? 0) > 0 ? `${(plan.practice_question_limit ?? 0).toLocaleString()} questions` : "Unlimited question bank"}
                        </span>
                      </div>
                    )}

                  </div>

                  {/* Action Button */}
                  <div className="pt-4">
                    <Button
                      onClick={() => router.push(`/student/plans/${plan.id}/checkout`)}
                      className={`w-full h-12 text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                        isHighlighted
                          ? "bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-[#0A1118]"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      <span>Select Package</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
