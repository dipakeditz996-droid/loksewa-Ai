"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { 
  Sparkles, Bot, FileText, CheckCircle2, AlertCircle, RefreshCw, 
  ArrowUpRight, Clock, HelpCircle, ChevronDown, ChevronUp, Layers, BookOpen, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { subscriptionsApi, EffectiveEntitlements } from "@/lib/api/subscriptions";

export function StudentEntitlementsUsageWidget() {
  const [showHistory, setShowHistory] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<EffectiveEntitlements>({
    queryKey: ["student-entitlements"],
    queryFn: () => subscriptionsApi.getMyEntitlements(),
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-6 w-48 bg-muted rounded"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/60 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span className="text-sm">Unable to load active package quotas.</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  const { plan, subscription, exams, ai_tutor, practice, notes, courses, usage_history } = data;

  if (!data.has_active_package || !plan) {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Free Basic Platform Access
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground mt-1">Upgrade to Unlock Full Quotas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Get dedicated Mock Exam attempts, AI Tutor credits, complete Notes and study materials.
          </p>
        </div>
        <Button asChild className="bg-[#D4A72C] text-[#0A1118] hover:bg-[#D4A72C]/90 font-bold h-10 px-5 rounded-xl shrink-0">
          <Link href="/student/plans">
            View Packages <ArrowUpRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
    );
  }

  const modelQuota = exams?.MODEL;
  const topicwiseQuota = exams?.TOPICWISE;
  const pastQuestionQuota = exams?.PAST_QUESTION;

  const renderQuotaStat = (label: string, quotaObj: any, icon: React.ReactNode) => {
    if (!quotaObj || !quotaObj.enabled) {
      return (
        <div className="p-3.5 bg-muted/40 rounded-xl border border-border/50">
          <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
          <div className="text-sm font-semibold text-muted-foreground mt-1">Not configured</div>
        </div>
      );
    }

    if (quotaObj.is_unlimited) {
      return (
        <div className="p-3.5 bg-muted/40 rounded-xl border border-border/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
            {icon}
          </div>
          <div className="mt-2">
            <div className="text-base font-extrabold text-emerald-500 flex items-center gap-1">
              Unlimited
            </div>
            <div className="text-[10px] text-muted-foreground">{quotaObj.consumed} attempts completed</div>
          </div>
        </div>
      );
    }

    const pct = quotaObj.total_allowed > 0 
      ? Math.min(Math.round((quotaObj.consumed / quotaObj.total_allowed) * 100), 100) 
      : 0;

    return (
      <div className="p-3.5 bg-muted/40 rounded-xl border border-border/50 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-extrabold text-foreground tracking-tight">
              {quotaObj.remaining} <span className="text-xs font-medium text-muted-foreground">left</span>
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {quotaObj.consumed} / {quotaObj.total_allowed}
            </span>
          </div>
          <Progress value={pct} className="h-1.5 bg-muted" indicatorClassName="bg-[#D4A72C]" />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* Top Bar: Plan info & Expiry status */}
      <div className="p-5 md:p-6 bg-gradient-to-r from-card via-muted/20 to-card border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#D4A72C]/10 border border-[#D4A72C]/20 flex items-center justify-center shrink-0 text-[#D4A72C]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                {plan.name}
              </h2>
              {plan.badge && plan.badge !== "NONE" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4A72C]/20 text-[#D4A72C] border border-[#D4A72C]/30">
                  {plan.badge.replace("_", " ")}
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase">
                {subscription?.status || "Active"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              {subscription?.has_expiry ? (
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  Expires: {subscription.expiry_date ? new Date(subscription.expiry_date).toLocaleDateString() : "—"}
                  {subscription.remaining_days !== null && ` (${subscription.remaining_days} days remaining)`}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Lifetime Access (Quota-driven)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 text-xs text-muted-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg">
            <Link href="/student/plans">
              Change Package <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Quota Highlights Grid */}
      <div className="p-5 md:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Effective Entitlements & Remaining Quotas
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            Real-time backend usage tracking
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Model Mock Exams */}
          {renderQuotaStat("Model Mock Exams", modelQuota, <Layers className="w-4 h-4 text-[#D4A72C]" />)}

          {/* Topicwise Tests */}
          {renderQuotaStat("Topicwise Tests", topicwiseQuota, <Layers className="w-4 h-4 text-blue-500" />)}

          {/* AI Tutor */}
          {ai_tutor && ai_tutor.enabled ? (
            ai_tutor.is_unlimited ? (
              <div className="p-3.5 bg-purple-500/5 rounded-xl border border-purple-500/20 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">AI Tutor</span>
                  <Bot className="w-4 h-4 text-purple-500" />
                </div>
                <div className="mt-2">
                  <div className="text-base font-extrabold text-purple-500">Unlimited</div>
                  <div className="text-[10px] text-muted-foreground">
                    {ai_tutor.consumed_credits.toLocaleString()} credits used
                    {ai_tutor.daily_limit ? ` · ${ai_tutor.daily_limit}/day limit` : ""}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-purple-500/5 rounded-xl border border-purple-500/20 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">AI Tutor Credits</span>
                  <Bot className="w-4 h-4 text-purple-500" />
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-extrabold text-foreground">
                      {ai_tutor.remaining_credits.toLocaleString()} <span className="text-xs font-medium text-muted-foreground">credits</span>
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {ai_tutor.consumed_credits.toLocaleString()} / {ai_tutor.total_credits.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={ai_tutor.total_credits > 0 ? (ai_tutor.consumed_credits / ai_tutor.total_credits) * 100 : 0} 
                    className="h-1.5 bg-purple-500/20" 
                    indicatorClassName="bg-purple-500" 
                  />
                  {ai_tutor.daily_limit ? (
                    <div className="text-[10px] text-muted-foreground">Daily cap: {ai_tutor.daily_limit} credits ({ai_tutor.daily_remaining} left today)</div>
                  ) : null}
                </div>
              </div>
            )
          ) : (
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/50">
              <div className="text-[11px] font-medium text-muted-foreground">AI Tutor</div>
              <div className="text-sm font-semibold text-muted-foreground mt-1">Disabled in plan</div>
            </div>
          )}

          {/* Notes & Courses Scope */}
          <div className="p-3.5 bg-muted/40 rounded-xl border border-border/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Notes & Content</span>
              <BookOpen className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 space-y-1">
              <div className="text-sm font-bold text-foreground">
                {notes?.access_type === "ALL" 
                  ? "All Platform Notes" 
                  : notes?.access_type === "NONE" 
                  ? "No Notes Access" 
                  : `${courses?.length || 1} Enrolled Courses`}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {notes?.can_download ? "✓ PDF Download permitted" : "In-app reading only"}
              </div>
            </div>
          </div>
        </div>

        {/* Practice Quota info if configured */}
        {practice && practice.enabled && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 text-xs">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#D4A72C]" />
              <span className="font-semibold text-foreground">Practice Bank Quota:</span>
              <span className="text-muted-foreground">
                {practice.is_unlimited 
                  ? "Unlimited practice question access" 
                  : `${practice.remaining} of ${practice.total_allowed} questions remaining`}
              </span>
            </div>
            <Link href="/practice" className="font-bold text-[#D4A72C] hover:underline flex items-center gap-1">
              Practice Now &rarr;
            </Link>
          </div>
        )}

        {/* Toggle Usage Ledger History */}
        <div className="pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground py-1"
          >
            <span>Recent Quota Activity & Auditable History ({usage_history?.length || 0})</span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="mt-3 rounded-xl border border-border overflow-hidden bg-background">
              {usage_history && usage_history.length > 0 ? (
                <div className="divide-y divide-border text-xs">
                  {usage_history.map((entry: any) => (
                    <div key={entry.id} className="p-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            entry.event_type === "GRANT" ? "bg-emerald-500/10 text-emerald-500" :
                            entry.event_type === "CONSUME" ? "bg-amber-500/10 text-amber-500" :
                            entry.event_type === "RESERVE" ? "bg-blue-500/10 text-blue-500" :
                            "bg-purple-500/10 text-purple-500"
                          }`}>
                            {entry.event_type}
                          </span>
                          <span className="font-semibold text-foreground">{entry.feature}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{entry.reason || "Quota operation"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-bold ${entry.amount > 0 ? "text-emerald-500" : "text-foreground"}`}>
                          {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No quota consumption recorded yet. Start an exam or message the AI tutor to see activity here!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
