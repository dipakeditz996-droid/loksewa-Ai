"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  studentSettingsApi,
  NotificationPreferences,
  StudentTaxonomyCategory,
} from "@/lib/api/student-settings";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Mail,
  ShieldCheck,
  Loader2,
  Save,
  CheckCircle2,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ChannelToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  channelName: string;
}

function ChannelToggle({ checked, onChange, disabled, channelName }: ChannelToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${channelName} notification toggle`}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
        disabled ? "opacity-75 cursor-not-allowed bg-emerald-600" : checked ? "bg-[#D4A72C]" : "bg-slate-200 dark:bg-slate-700"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform",
          checked || disabled ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

// Fallback taxonomy if API taxonomy response is pending
const FALLBACK_CATEGORIES: StudentTaxonomyCategory[] = [
  {
    id: "learning_exams",
    title: "Learning & Exams",
    icon: "📝",
    description: "Updates regarding your exam schedules, mock tests, results, and study materials",
    events: [
      { key: "exam_announcements", label: "New Exam / Mock Test Announcements", description: "Alerts when new mock exams or PSC test series are announced", mandatory: false, in_app: true, email: true },
      { key: "study_material_updates", label: "New Syllabus & Study Materials", description: "Notifications when new notes, question sets, or syllabus revisions are added", mandatory: false, in_app: true, email: true },
      { key: "exam_reminders", label: "Exam Reminders & Deadlines", description: "Reminders for scheduled exams and approaching application deadlines", mandatory: false, in_app: true, email: true },
      { key: "result_published", label: "Results & Performance Updates", description: "Instant updates when exam results, scorecards, or rankings are published", mandatory: false, in_app: true, email: true },
      { key: "learning_resources", label: "New Learning Resources", description: "Suggestions and announcements for practice sets and daily learning tasks", mandatory: false, in_app: true, email: true },
    ],
  },
  {
    id: "subscription_payments",
    title: "Subscription & Payments",
    icon: "💳",
    description: "Billing, plan expirations, payment verifications, and special package offers",
    events: [
      { key: "subscription_expiry", label: "Subscription Expiry Reminders", description: "Advance notices when your package or preparation plan is approaching expiry", mandatory: false, in_app: true, email: true },
      { key: "payment_submission", label: "Payment Submission Confirmations", description: "Confirmation when your manual payment proof or deposit is received", mandatory: false, in_app: true, email: true },
      { key: "payment_status", label: "Payment Verification Status", description: "Notifications when your payment is approved or requires changes", mandatory: false, in_app: true, email: true },
      { key: "subscription_status", label: "Subscription Status Updates", description: "Activation, upgrade, or renewal updates for course packages", mandatory: false, in_app: true, email: true },
      { key: "plan_offers", label: "Relevant Plan & Offer Announcements", description: "Early access to discounts, renewal offers, and exam package bundles", mandatory: false, in_app: true, email: true },
    ],
  },
  {
    id: "marketplace",
    title: "Marketplace & Books",
    icon: "🛒",
    description: "Physical books, study kit orders, shipping tracking, and COD updates",
    events: [
      { key: "order_confirmation", label: "Order Confirmation", description: "Receipts and confirmations when a book or study kit order is placed", mandatory: false, in_app: true, email: true },
      { key: "order_payment_status", label: "Payment & COD Advance Status", description: "Updates on cash-on-delivery advance verifications and order payments", mandatory: false, in_app: true, email: true },
      { key: "order_delivery_updates", label: "Order Processing & Delivery Updates", description: "Tracking notices when your package is packaged, dispatched, and delivered", mandatory: false, in_app: true, email: true },
      { key: "order_cancellation", label: "Order Cancellation & Refund Status", description: "Notices regarding order cancellations, returns, and refund resolutions", mandatory: false, in_app: true, email: true },
    ],
  },
  {
    id: "account_platform",
    title: "Account & Platform",
    icon: "🛡️",
    description: "Account security, platform notices, system updates, and maintenance",
    events: [
      { key: "security_alerts", label: "Account Security Alerts", description: "Critical login notifications, password modifications, and security events (Mandatory)", mandatory: true, in_app: true, email: true },
      { key: "platform_announcements", label: "Platform Announcements", description: "General updates and notices from the LoksewaAI administration", mandatory: false, in_app: true, email: true },
      { key: "feature_announcements", label: "New Feature Announcements", description: "Notices about new platform features, AI tools, and test formats", mandatory: false, in_app: true, email: true },
      { key: "maintenance_alerts", label: "Planned Maintenance Notifications", description: "Advance notifications before scheduled system updates and downtime", mandatory: false, in_app: true, email: true },
    ],
  },
];

export function NotificationsSection() {
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: studentSettingsApi.getNotifications,
  });

  const [form, setForm] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (prefs) {
      setForm(prefs);
    }
  }, [prefs]);

  const mutation = useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) =>
      studentSettingsApi.updateNotifications(data),
    onSuccess: (updated) => {
      toast.success("Notification preferences updated successfully!");
      setDirty(false);
      if (updated) {
        setForm(updated);
      }
      queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
    },
    onError: () => toast.error("Failed to save notification preferences."),
  });

  const handleToggle = (fieldKey: string, val: boolean) => {
    setForm((prev) => ({ ...prev, [fieldKey]: val }));
    setDirty(true);
  };

  const handleBulkChannelToggle = (category: StudentTaxonomyCategory, channel: "inapp" | "email", targetVal: boolean) => {
    const updates: Record<string, any> = {};
    category.events.forEach((ev) => {
      if (!ev.mandatory) {
        updates[`${ev.key}_${channel}`] = targetVal;
      }
    });
    setForm((prev) => ({ ...prev, ...updates }));
    setDirty(true);
  };

  const categories = prefs?.taxonomy || FALLBACK_CATEGORIES;

  if (isLoading || !prefs) {
    return (
      <div className="bg-card rounded-2xl border border-border/80 shadow-sm p-8 space-y-6">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-border/60 rounded-xl p-5 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Channel Overview */}
      <div className="bg-card rounded-2xl border border-border/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              Dual-Channel Notification Preferences
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Configure which updates you receive on your dashboard and directly in your email. Channels are completely independent.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground bg-muted/40 px-3.5 py-2 rounded-xl border border-border/50 shrink-0">
            <span className="flex items-center gap-1.5 text-foreground font-semibold">
              <Bell className="w-4 h-4 text-primary" /> In-App
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5 text-foreground font-semibold">
              <Mail className="w-4 h-4 text-primary" /> Email
            </span>
          </div>
        </div>
      </div>

      {/* Category Cards */}
      {categories.map((cat) => (
        <div key={cat.id} className="bg-card rounded-2xl border border-border/80 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">{cat.icon}</span>
              <div>
                <h3 className="text-sm sm:text-[15px] font-semibold text-foreground flex items-center gap-2">
                  {cat.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2 text-xs self-end sm:self-auto pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => handleBulkChannelToggle(cat, "inapp", true)}
                className="text-xs text-primary hover:underline font-medium px-2 py-1 rounded hover:bg-primary/5"
              >
                All In-App
              </button>
              <span className="text-muted-foreground">•</span>
              <button
                type="button"
                onClick={() => handleBulkChannelToggle(cat, "email", true)}
                className="text-xs text-primary hover:underline font-medium px-2 py-1 rounded hover:bg-primary/5"
              >
                All Email
              </button>
            </div>
          </div>

          {/* Event Items Table */}
          <div className="divide-y divide-border/50">
            {cat.events.map((ev) => {
              const inAppKey = `${ev.key}_inapp`;
              const emailKey = `${ev.key}_email`;

              const isInAppEnabled = ev.mandatory ? true : form[inAppKey] !== undefined ? Boolean(form[inAppKey]) : ev.in_app;
              const isEmailEnabled = ev.mandatory ? true : form[emailKey] !== undefined ? Boolean(form[emailKey]) : ev.email;

              return (
                <div
                  key={ev.key}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                >
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-foreground">{ev.label}</p>
                      {ev.mandatory && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300/60">
                          <ShieldCheck className="w-3 h-3" /> Mandatory
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{ev.description}</p>
                  </div>

                  {/* Channel Toggles */}
                  <div className="flex items-center gap-6 shrink-0 self-end sm:self-center">
                    {/* In-App Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">In-App</span>
                      </span>
                      <ChannelToggle
                        checked={isInAppEnabled}
                        disabled={ev.mandatory}
                        channelName={`${ev.label} In-App`}
                        onChange={(val) => handleToggle(inAppKey, val)}
                      />
                    </div>

                    {/* Email Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">Email</span>
                      </span>
                      <ChannelToggle
                        checked={isEmailEnabled}
                        disabled={ev.mandatory}
                        channelName={`${ev.label} Email`}
                        onChange={(val) => handleToggle(emailKey, val)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Mandatory Notice */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200">
        <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <p>
          Mandatory security alerts, login verifications, and essential transaction receipts are always delivered to your registered email to safeguard your account. All other categories can be customized freely.
        </p>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          {dirty ? "You have unsaved changes." : "All notification preferences are up to date."}
        </p>
        <Button
          onClick={() => form && mutation.mutate(form)}
          disabled={mutation.isPending || !dirty}
          className="bg-primary text-primary-foreground hover:bg-[#163E6B] text-white px-6 gap-2"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
