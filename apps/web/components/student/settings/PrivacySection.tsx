"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentSettingsApi } from "@/lib/api/student-settings";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ToggleCardProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  title: string;
  description: string;
}

function ToggleCard({ checked, onChange, title, description }: ToggleCardProps) {
  return (
    <div className="flex items-start justify-between p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
      <div className="pr-4">
        <p className="text-[14px] font-semibold text-slate-800">{title}</p>
        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 mt-1",
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

const PRIVACY_OPTIONS = [
  {
    key: "show_profile",
    title: "Show Profile to Other Users",
    description: "Allow other LoksewaAI students to see your profile information, including your name and avatar.",
  },
  {
    key: "show_leaderboard",
    title: "Show on Leaderboard",
    description: "Display your name and score on public leaderboards when you take exams or complete challenges.",
  },
  {
    key: "allow_comparisons",
    title: "Allow Performance Comparisons",
    description: "Let the system show how your performance compares to other students in analytics and reports.",
  },
  {
    key: "allow_activity_visibility",
    title: "Show Study Activity",
    description: "Allow other users to see your study streak, practice activity, and recent exam activity.",
  },
];

export function PrivacySection() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["student-profile"],
    queryFn: studentSettingsApi.getProfile,
  });

  const [form, setForm] = useState({
    show_profile: false,
    show_leaderboard: true,
    allow_comparisons: false,
    allow_activity_visibility: false,
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        show_profile: profile.show_profile,
        show_leaderboard: profile.show_leaderboard,
        allow_comparisons: profile.allow_comparisons,
        allow_activity_visibility: profile.allow_activity_visibility,
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (data: any) => studentSettingsApi.updateProfile(data),
    onSuccess: () => {
      toast.success("Privacy settings saved!");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["student-profile"] });
    },
    onError: () => toast.error("Failed to save settings."),
  });

  const handleToggle = (key: string, val: boolean) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[#0B2545]/5 flex items-center justify-center">
            <Eye className="h-5 w-5 text-[#0B2545]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#0B2545]">Privacy Settings</h3>
            <p className="text-xs text-slate-500">Control who can see your information and activity.</p>
          </div>
        </div>

        <div className="space-y-3">
          {PRIVACY_OPTIONS.map((opt) => (
            <ToggleCard
              key={opt.key}
              checked={(form as any)[opt.key]}
              onChange={(val) => handleToggle(opt.key, val)}
              title={opt.title}
              description={opt.description}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending || !dirty}
          className="bg-[#0B2545] hover:bg-[#163E6B] text-white px-6"
        >
          {mutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Save Privacy Settings</>
          )}
        </Button>
      </div>
    </div>
  );
}
