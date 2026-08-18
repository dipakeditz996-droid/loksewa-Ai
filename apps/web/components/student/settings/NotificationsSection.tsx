"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentSettingsApi, NotificationPreferences } from "@/lib/api/student-settings";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
}

function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-[13px] font-medium text-slate-800">{label}</p>
        {description && <p className="text-[11px] text-slate-400">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked ? "bg-[#D4A72C]" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

const CATEGORIES = [
  {
    title: "Exam Notifications",
    icon: "📝",
    fields: [
      { key: "exam_reminders", label: "Exam Reminders", desc: "Get notified about upcoming exams" },
      { key: "exam_starting_soon", label: "Exam Starting Soon", desc: "Alert when an exam is about to start" },
      { key: "exam_deadline", label: "Exam Deadline", desc: "Remind before exam registration closes" },
      { key: "result_published", label: "Result Published", desc: "Notify when results are available" },
    ],
  },
  {
    title: "Study Notifications",
    icon: "📚",
    fields: [
      { key: "study_plan_reminders", label: "Study Plan Reminders", desc: "Daily study plan notifications" },
      { key: "practice_reminders", label: "Practice Reminders", desc: "Encourage daily practice sessions" },
      { key: "daily_progress", label: "Daily Progress", desc: "Summary of your daily progress" },
    ],
  },
  {
    title: "AI Tutor",
    icon: "🤖",
    fields: [
      { key: "ai_tutor_updates", label: "AI Tutor Updates", desc: "New AI features and improvements" },
      { key: "study_recommendations", label: "Study Recommendations", desc: "Personalized study suggestions" },
    ],
  },
  {
    title: "Marketplace",
    icon: "🛒",
    fields: [
      { key: "order_updates", label: "Order Updates", desc: "Track your marketplace orders" },
      { key: "marketplace_notifications", label: "Important Updates", desc: "Marketplace announcements" },
    ],
  },
  {
    title: "System",
    icon: "⚙️",
    fields: [
      { key: "security_alerts", label: "Security Alerts", desc: "Login attempts and security events" },
      { key: "account_notifications", label: "Account Notifications", desc: "Important account updates" },
    ],
  },
];

export function NotificationsSection() {
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: studentSettingsApi.getNotifications,
  });

  const [form, setForm] = useState<NotificationPreferences | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (prefs) setForm(prefs);
  }, [prefs]);

  const mutation = useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) =>
      studentSettingsApi.updateNotifications(data),
    onSuccess: () => {
      toast.success("Notification preferences saved!");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
    },
    onError: () => toast.error("Failed to save preferences."),
  });

  const handleToggle = (key: string, val: boolean) => {
    if (!form) return;
    setForm({ ...form, [key]: val });
    setDirty(true);
  };

  if (isLoading || !form) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 space-y-4">
        <Skeleton className="h-6 w-48" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {CATEGORIES.map((cat) => (
        <div key={cat.title} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">{cat.icon}</span>
            <h3 className="text-[15px] font-semibold text-[#0B2545]">{cat.title}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {cat.fields.map((field) => (
              <Toggle
                key={field.key}
                checked={(form as any)[field.key]}
                onChange={(val) => handleToggle(field.key, val)}
                label={field.label}
                description={field.desc}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <Button
          onClick={() => form && mutation.mutate(form)}
          disabled={mutation.isPending || !dirty}
          className="bg-[#0B2545] hover:bg-[#163E6B] text-white px-6"
        >
          {mutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Save Preferences</>
          )}
        </Button>
      </div>
    </div>
  );
}
