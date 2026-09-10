"use client";

import { useState, useEffect } from "react";
import { Check, Zap, AlertCircle, GraduationCap, ArrowRight, Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { subscriptionsApi, SubscriptionPlan, AvailablePlansResponse } from "@/lib/api/subscriptions";

const FEATURE_LABELS: Record<string, string> = {
  "*": "Full Platform Access",
  ai_tutor: "AI Tutor Access",
  premium_materials: "Premium Study Materials",
  advanced_mock_exam: "Advanced Mock Exams",
  analytics: "Advanced Performance Analytics",
};

export default function StudentPlansPage() {
  const router = useRouter();
  const [data, setData] = useState<AvailablePlansResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const getFeatureList = (plan: SubscriptionPlan) => {
    const features = Array.isArray(plan.features) ? plan.features : [];
    if (features.length === 0) {
      return [{ text: "Full platform access", included: true }];
    }
    return features.map((key) => ({
      text: FEATURE_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      included: true,
    }));
  };

  const preparation = data?.preparation;
  const plans = data?.plans || [];

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
          Select a package that matches your preparation goals. Learning access is unlocked as soon as your payment is verified.
        </p>
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

      {/* Available Plans Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[520px] rounded-[24px] bg-muted/80 animate-pulse"></div>
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
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((plan: SubscriptionPlan) => {
            const isHighlighted = plan.badge === "POPULAR" || plan.badge === "RECOMMENDED" || plan.badge === "BEST_VALUE";

            const packageTypeMap: Record<string, string> = {
              SINGLE: "Single Course",
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
                {plan.badge !== "NONE" && (
                  <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                    <span className="px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#B08922] to-[#D4A72C] text-[#0A1118] shadow-md">
                      {plan.badge.replace("_", " ")}
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
                        {plan.duration} {plan.duration_unit}
                      </span>
                    </div>
                    <h3 className={`text-2xl font-extrabold tracking-tight ${isHighlighted ? "text-white" : "text-foreground"}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-xs line-clamp-2 ${isHighlighted ? "text-white/60" : "text-muted-foreground"}`}>
                      {plan.description}
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

                  {/* Eligible Preparations Preview */}
                  {plan.package_type === "MULTI" && (
                    <div className={`p-3 rounded-xl text-xs space-y-1 ${isHighlighted ? "bg-white/5 border border-white/10" : "bg-muted/60 border border-border/60"}`}>
                      <span className="font-bold text-[#D4A72C]">
                        Custom Preparation Choice:
                      </span>
                      <p className={isHighlighted ? "text-white/80" : "text-foreground"}>
                        Pick any <strong>{plan.allowed_preparation_count}</strong> preparations from {plan.eligible_courses_details?.length || plan.eligible_courses?.length || "available"} options.
                      </p>
                    </div>
                  )}

                  {plan.package_type === "BUNDLE" && (
                    <div className={`p-3 rounded-xl text-xs space-y-1 ${isHighlighted ? "bg-white/5 border border-white/10" : "bg-muted/60 border border-border/60"}`}>
                      <span className="font-bold text-emerald-400">
                        Bundle Includes All:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {plan.eligible_courses_details?.map((c: any) => (
                          <span key={c.id} className="px-2 py-0.5 rounded bg-white/10 text-[11px] font-medium">
                            ✓ {c.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feature Checklist */}
                  <div className="space-y-3 pt-2 flex-1">
                    {getFeatureList(plan).map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div className="mt-0.5 rounded-full p-0.5 bg-[#D4A72C]/20 text-[#D4A72C] shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-medium ${isHighlighted ? "text-white/90" : "text-foreground"}`}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
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
