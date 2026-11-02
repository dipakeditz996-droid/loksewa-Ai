"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Check, X, Zap, Shield, Sparkles, BookOpen, Clock, 
  HelpCircle, Bot, Award, FileText, ChevronRight, Layers,
  ExternalLink, Info, AlertTriangle, ArrowRight, CheckCircle2,
  Lock, Flame, Target
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubscriptionPlan, PackageExamAccessConfig } from "@/lib/api/subscriptions";

interface Props {
  plan: SubscriptionPlan;
  isPreview?: boolean;
  onSelect?: () => void;
  onClose?: () => void;
}

export function StudentPackageDetailView({ plan, isPreview = false, onSelect, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "exams" | "materials" | "ai" | "features">("overview");

  const isHighlighted = 
    plan.is_featured ||
    plan.badge === "POPULAR" || 
    plan.badge === "RECOMMENDED" || 
    plan.badge === "BEST_VALUE" ||
    plan.display_badge?.toLowerCase().includes("popular") ||
    plan.display_badge?.toLowerCase().includes("recommended");

  const packageTypeLabels: Record<string, string> = {
    SINGLE: "Single Preparation",
    MULTI: `Multi Preparation (${plan.allowed_preparation_count || 1} Courses)`,
    BUNDLE: "Course Bundle",
    ALL_ACCESS: "All Access Preparation",
  };

  const examConfigs: PackageExamAccessConfig[] = plan.exam_access_configs || [];

  // Categorize what is included vs not included for Summary
  const includedItems: string[] = [];
  const notIncludedItems: string[] = [];

  // Course Access
  if (plan.course_access_type === "ALL_ACCESS") {
    includedItems.push("Full access to all Loksewa PSC preparation courses");
  } else if (plan.package_type === "MULTI") {
    includedItems.push(`Access to any ${plan.allowed_preparation_count || 1} eligible syllabus courses`);
  } else if (plan.course_details?.title) {
    includedItems.push(`Complete access to "${plan.course_details.title}"`);
  } else if (plan.eligible_courses_details && plan.eligible_courses_details.length > 0) {
    includedItems.push(`Access to ${plan.eligible_courses_details.length} enrolled syllabus course(s)`);
  } else if (plan.course_access_type === "NONE") {
    notIncludedItems.push("Live video classes or syllabus course lectures");
  } else {
    includedItems.push("Standard course syllabus materials");
  }

  // Exam Access Breakdown
  examConfigs.forEach((cfg) => {
    if (!cfg.is_enabled) {
      notIncludedItems.push(`${cfg.exam_type_label} access`);
    } else {
      const quotaStr = cfg.total_attempts === -1 ? "Unlimited" : `${cfg.total_attempts} attempts`;
      if (cfg.access_mode === "SPECIFIC") {
        const count = cfg.selected_exams_count ?? cfg.selected_exams?.length ?? 0;
        const perExam = cfg.attempts_per_exam ? ` (${cfg.attempts_per_exam} attempts/exam)` : "";
        includedItems.push(`${cfg.exam_type_label}: ${count} designated exam(s) with ${quotaStr}${perExam}`);
      } else {
        includedItems.push(`${cfg.exam_type_label}: Any published test (${quotaStr})`);
      }
    }
  });

  // Notes Access
  if (plan.notes_access_type === "ALL") {
    includedItems.push(`All platform study notes ${plan.can_download_notes ? "(with PDF download)" : "(in-app viewing)"}`);
  } else if (plan.notes_access_type === "COURSE_NOTES") {
    includedItems.push(`Course study notes ${plan.can_download_notes ? "(with PDF download)" : "(in-app viewing)"}`);
  } else {
    notIncludedItems.push("Study notes and downloadable PDFs");
  }

  // AI Tutor
  if (plan.ai_tutor_enabled !== false) {
    const cred = (plan.ai_credits ?? 0) === -1 || (plan.ai_credits ?? 0) === 0 ? "Unlimited" : `${(plan.ai_credits ?? 0).toLocaleString()} tokens`;
    includedItems.push(`AI Tutor personal study assistant (${cred})`);
  } else {
    notIncludedItems.push("AI Tutor conversational study assistant");
  }

  // Practice
  if (plan.practice_enabled !== false) {
    const pQ = (plan.practice_question_limit ?? -1) === -1 ? "Unlimited" : `${(plan.practice_question_limit ?? 0).toLocaleString()}`;
    includedItems.push(`Practice question engine (${pQ} questions)`);
  } else {
    notIncludedItems.push("Interactive practice question bank");
  }

  return (
    <div className="bg-card text-foreground rounded-[24px] border border-border shadow-xl overflow-hidden flex flex-col max-w-4xl mx-auto">
      {/* Top Banner / Status Alert for Preview */}
      {isPreview && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-amber-900 dark:text-amber-200 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Admin Package Preview — Reflecting live form values before saving</span>
          </div>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="h-7 text-xs hover:bg-amber-500/20">
              Close Preview
            </Button>
          )}
        </div>
      )}

      {/* Package Header Card */}
      <div className={`p-6 sm:p-8 border-b border-border transition-colors ${
        isHighlighted 
          ? "bg-gradient-to-br from-[#0F1822] via-[#14202D] to-[#0A1118] text-white" 
          : "bg-muted/30"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#D4A72C]/20 text-[#D4A72C] border-[#D4A72C]/30 text-[11px] font-bold uppercase tracking-wider">
                <Layers className="w-3 h-3 mr-1" />
                {packageTypeLabels[plan.package_type] || plan.package_type}
              </Badge>
              {plan.display_badge && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[11px] font-bold">
                  {plan.display_badge}
                </Badge>
              )}
              {plan.is_default_free && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[11px] font-bold">
                  Default Free Tier
                </Badge>
              )}
            </div>

            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isHighlighted ? "text-white" : "text-foreground"}`}>
              {plan.name || "Untitled Package"}
            </h1>

            <p className={`text-sm leading-relaxed max-w-2xl ${isHighlighted ? "text-white/70" : "text-muted-foreground"}`}>
              {plan.description || "Comprehensive examination preparation package designed for Loksewa PSC candidates."}
            </p>
          </div>

          {/* Pricing & CTA Card */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between shrink-0 min-w-[200px] text-right sm:text-left ${
            isHighlighted 
              ? "bg-white/5 border-white/10" 
              : "bg-card border-border shadow-sm"
          }`}>
            <div>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isHighlighted ? "text-white/60" : "text-muted-foreground"}`}>
                Package Price
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className={`text-3xl font-black tracking-tight ${isHighlighted ? "text-white" : "text-foreground"}`}>
                  Rs. {plan.price}
                </span>
                {plan.original_price && Number(plan.original_price) > Number(plan.price) && (
                  <span className={`text-xs line-through ${isHighlighted ? "text-white/40" : "text-muted-foreground"}`}>
                    Rs. {plan.original_price}
                  </span>
                )}
              </div>
              {plan.discount && parseFloat(plan.discount) > 0 && (
                <span className="inline-block mt-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                  Save {plan.discount}%
                </span>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-xs">
              <span className={`flex items-center gap-1.5 font-semibold ${isHighlighted ? "text-white/80" : "text-foreground"}`}>
                <Clock className="w-3.5 h-3.5 text-[#D4A72C]" />
                {plan.has_expiry !== false && plan.duration ? (
                  `${plan.duration} ${plan.duration_unit || "DAYS"} Validity`
                ) : (
                  <span className="text-emerald-400 font-bold">Lifetime Quota Access</span>
                )}
              </span>
            </div>

            {!isPreview && (
              <div className="mt-4">
                <Button 
                  onClick={onSelect}
                  asChild={!onSelect}
                  className="w-full bg-[#D4A72C] text-[#0A1118] hover:bg-[#D4A72C]/90 font-bold rounded-xl h-10 shadow-sm"
                >
                  {onSelect ? (
                    <span>Enroll Now</span>
                  ) : (
                    <Link href={`/student/plans/${plan.id}/checkout`}>
                      <span>Enroll in Package</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Link>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Course / Level Access Breadcrumbs */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-3 text-xs">
          <span className={`font-semibold uppercase tracking-wider text-[10px] ${isHighlighted ? "text-white/60" : "text-muted-foreground"}`}>
            Target Preparation:
          </span>
          {plan.course_details ? (
            <span className="px-3 py-1 rounded-full bg-[#D4A72C]/15 text-[#D4A72C] font-semibold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {plan.course_details.hierarchy_path || plan.course_details.title}
            </span>
          ) : plan.eligible_courses_details && plan.eligible_courses_details.length > 0 ? (
            plan.eligible_courses_details.slice(0, 3).map((c) => (
              <span key={c.id} className="px-3 py-1 rounded-full bg-muted font-medium">
                {c.title}
              </span>
            ))
          ) : (
            <span className="px-3 py-1 rounded-full bg-muted font-medium">
              All Eligible Loksewa PSC Preparations
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border bg-muted/20 px-6 flex gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: "overview", label: "Overview & Summary" },
          { id: "exams", label: `Exams & Tests (${examConfigs.length})` },
          { id: "materials", label: "Notes & Materials" },
          { id: "ai", label: "AI Tutor" },
          { id: "features", label: "Feature Limits" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`py-3 px-3.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? "border-[#D4A72C] text-[#D4A72C] font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* TAB 1: OVERVIEW & SUMMARY */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Quick Feature Pillars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#D4A72C]" /> Duration
                </span>
                <p className="text-base font-bold text-foreground">
                  {plan.has_expiry !== false && plan.duration ? `${plan.duration} ${plan.duration_unit}` : "Lifetime"}
                </p>
                <p className="text-[11px] text-muted-foreground">Access active upon payment approval</p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Syllabus Notes
                </span>
                <p className="text-base font-bold text-foreground">
                  {plan.notes_access_type === "ALL" ? "All Notes" : plan.notes_access_type === "NONE" ? "None" : "Course Notes"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {plan.can_download_notes ? "PDF Download Allowed" : "In-App Viewing Only"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5 text-purple-500" /> AI Tutor
                </span>
                <p className="text-base font-bold text-foreground">
                  {plan.ai_tutor_enabled !== false ? (
                    (plan.ai_credits ?? 0) > 0 ? `${(plan.ai_credits ?? 0).toLocaleString()} Tokens` : "Unlimited"
                  ) : "Disabled"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {(plan.ai_daily_limit ?? 0) > 0 ? `Max ${plan.ai_daily_limit} reqs/day` : "No daily throttles"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-emerald-500" /> Practice
                </span>
                <p className="text-base font-bold text-foreground">
                  {plan.practice_enabled !== false ? (
                    (plan.practice_question_limit ?? -1) > 0 ? `${plan.practice_question_limit} Questions` : "Unlimited"
                  ) : "Disabled"}
                </p>
                <p className="text-[11px] text-muted-foreground">Interactive topic drill engine</p>
              </div>
            </div>

            {/* Student-Friendly Summary Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* WHAT IS INCLUDED */}
              <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">What is Included</h3>
                    <p className="text-[11px] text-muted-foreground">Unlocked entitlements under this package</p>
                  </div>
                </div>

                <ul className="space-y-2.5 pt-1 text-xs">
                  {includedItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-foreground/90">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* WHAT IS NOT INCLUDED */}
              <div className="p-6 rounded-2xl border border-border bg-muted/20 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">What is Not Included</h3>
                    <p className="text-[11px] text-muted-foreground">Features requiring separate upgrades or packages</p>
                  </div>
                </div>

                {notIncludedItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pt-2">
                    All standard preparation features are unlocked in this comprehensive package.
                  </p>
                ) : (
                  <ul className="space-y-2.5 pt-1 text-xs">
                    {notIncludedItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Terms and Policies */}
            {plan.terms && (
              <div className="p-4 rounded-xl border border-border bg-card space-y-1.5 text-xs">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#D4A72C]" /> Package Terms & Usage Policy
                </h4>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{plan.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: UNIVERSAL EXAM ACCESS */}
        {activeTab === "exams" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Examination Entitlements</h3>
                <p className="text-xs text-muted-foreground">
                  Individual rules, attempt allowances, and specific exam restrictions per examination category.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                {examConfigs.filter((c) => c.is_enabled).length} of {examConfigs.length} Categories Enabled
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {examConfigs.map((cfg) => {
                const isSpecific = cfg.access_mode === "SPECIFIC";
                const selectedCount = cfg.selected_exams_count ?? cfg.selected_exams?.length ?? 0;

                return (
                  <div
                    key={cfg.exam_type}
                    className={`p-5 rounded-2xl border transition-all ${
                      !cfg.is_enabled
                        ? "border-border/60 bg-muted/10 opacity-70"
                        : "border-border bg-card shadow-sm hover:border-[#D4A72C]/40"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-foreground">{cfg.exam_type_label}</h4>
                          {!cfg.is_enabled ? (
                            <Badge variant="outline" className="text-rose-500 border-rose-500/30 bg-rose-500/10 text-[10px]">
                              Disabled
                            </Badge>
                          ) : isSpecific ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 text-[10px] font-bold">
                              Specific Selected Exams
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold">
                              Any Available Exams
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{cfg.description}</p>
                      </div>

                      <div className="text-right sm:text-right shrink-0">
                        {cfg.is_enabled ? (
                          <div className="space-y-0.5">
                            <span className="text-sm font-black text-foreground">
                              {cfg.total_attempts === -1 ? (
                                <span className="text-emerald-500 font-bold">Unlimited Attempts</span>
                              ) : (
                                `${cfg.total_attempts} Total Attempts`
                              )}
                            </span>
                            {cfg.attempts_per_exam && cfg.attempts_per_exam > 0 && (
                              <div className="text-[11px] text-muted-foreground">
                                Limit {cfg.attempts_per_exam} attempts/exam
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No attempts granted</span>
                        )}
                      </div>
                    </div>

                    {/* Mode Explanation */}
                    {cfg.is_enabled && (
                      <div className="mt-4 pt-3 border-t border-border/60 text-xs">
                        {!isSpecific ? (
                          <div className="flex items-start gap-2 text-muted-foreground bg-muted/20 p-3 rounded-xl">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>
                              You can attempt <strong>any published, eligible exam</strong> in this category up to the package attempt quota.
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-start gap-2 text-muted-foreground bg-amber-500/10 p-3 rounded-xl text-amber-900 dark:text-amber-200">
                              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <span>
                                Only the <strong>{selectedCount} specific exam(s)</strong> selected below are accessible through this package.
                              </span>
                            </div>

                            {/* Selected Exams List */}
                            {cfg.selected_exams && cfg.selected_exams.length > 0 ? (
                              <div className="space-y-2">
                                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block">
                                  Included Examinations ({cfg.selected_exams.length}):
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {cfg.selected_exams.map((ex) => (
                                    <div
                                      key={ex.id}
                                      className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between text-xs hover:border-[#D4A72C]/40 transition-colors"
                                    >
                                      <div className="min-w-0 pr-2">
                                        <h5 className="font-semibold text-foreground truncate">{ex.title}</h5>
                                        <span className="text-[11px] text-muted-foreground">
                                          {ex.total_questions ? `${ex.total_questions} Questions • ` : ""}{ex.total_marks ? `${ex.total_marks} Marks` : ""}
                                        </span>
                                      </div>
                                      {!isPreview ? (
                                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2 shrink-0">
                                          <Link href={`/exams/${ex.id}`}>
                                            <span>View</span>
                                            <ExternalLink className="w-3 h-3 ml-1" />
                                          </Link>
                                        </Button>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px]">Included</Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic block">
                                No specific examinations currently assigned to this list.
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: NOTES & STUDY MATERIALS */}
        {activeTab === "materials" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Study Notes & Reference Materials</h3>
                  <p className="text-xs text-muted-foreground">
                    Access to digital Loksewa summaries, subject syllabus notes, and official resources.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Access Scope</span>
                  <p className="text-sm font-bold text-foreground">
                    {plan.notes_access_type === "ALL" 
                      ? "All Platform Notes & Summaries" 
                      : plan.notes_access_type === "COURSE_NOTES" 
                      ? "Enrolled Course Notes Only" 
                      : "No Notes Included"}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Download Permissions</span>
                  <p className="text-sm font-bold text-foreground">
                    {plan.can_download_notes ? (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <Check className="w-4 h-4" /> PDF Download Allowed
                      </span>
                    ) : (
                      <span className="text-muted-foreground">In-App Digital Reading Only</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AI TUTOR */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">LoksewaAI Intelligent Tutor</h3>
                  <p className="text-xs text-muted-foreground">
                    Instant 24/7 personalized explanations, syllabus guidance, and past paper clarifications.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">AI Availability</span>
                  <p className="text-sm font-bold text-foreground">
                    {plan.ai_tutor_enabled !== false ? (
                      <span className="text-emerald-500">Enabled</span>
                    ) : (
                      <span className="text-muted-foreground">Disabled</span>
                    )}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Token / Message Allowance</span>
                  <p className="text-sm font-bold text-foreground">
                    {(plan.ai_credits ?? 0) > 0 ? `${(plan.ai_credits ?? 0).toLocaleString()} Credits` : "Unlimited Tokens"}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Daily Message Limit</span>
                  <p className="text-sm font-bold text-foreground">
                    {(plan.ai_daily_limit ?? 0) > 0 ? `${plan.ai_daily_limit} messages/day` : "No Daily Limit"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PLATFORM FEATURE LIMITS */}
        {activeTab === "features" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Platform Features & Allowances</h3>
                <p className="text-xs text-muted-foreground">
                  Complete breakdown of practice banks, competitive games, and subjective evaluation quotas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-[#D4A72C]" /> Practice Question Bank
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {plan.practice_enabled !== false ? (
                      (plan.practice_question_limit ?? -1) > 0 ? `${plan.practice_question_limit} Questions` : "Unlimited"
                    ) : "Disabled"}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" /> Subjective Paper Evaluation
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {plan.feature_limits?.["evaluation:subjective"]?.quota !== undefined
                      ? (plan.feature_limits["evaluation:subjective"].quota === -1 ? "Unlimited Evaluations" : `${plan.feature_limits["evaluation:subjective"].quota} Submissions`)
                      : "Standard Evaluation Included"}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500" /> Competitive 1v1 Battle Quiz
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {plan.feature_limits?.["game:1v1"]?.quota !== undefined
                      ? (plan.feature_limits["game:1v1"].quota === -1 ? "Unlimited" : `${plan.feature_limits["game:1v1"].quota} Matches`)
                      : "10 Matches"}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-500" /> Weekly Contest & Drills
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {plan.feature_limits?.["game:weekly_quiz"]?.quota !== undefined
                      ? (plan.feature_limits["game:weekly_quiz"].quota === -1 ? "Unlimited" : `${plan.feature_limits["game:weekly_quiz"].quota} Contests`)
                      : "Included"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-border bg-muted/10 flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          LoksewaAI Universal Package Entitlement • Authoritative Server-Enforced Limits
        </span>

        {isPreview ? (
          <Button onClick={onClose} variant="outline" className="rounded-xl h-10 px-5 text-xs font-semibold">
            Close Preview
          </Button>
        ) : (
          <Button
            onClick={onSelect}
            asChild={!onSelect}
            className="bg-[#D4A72C] text-[#0A1118] hover:bg-[#D4A72C]/90 font-bold rounded-xl h-10 px-6 shadow-sm"
          >
            {onSelect ? (
              <span>Enroll in This Package</span>
            ) : (
              <Link href={`/student/plans/${plan.id}/checkout`}>
                <span>Enroll in Package</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

