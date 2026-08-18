"use client";

import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentSettingsApi } from "@/lib/api/student-settings";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Check, Globe } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const THEMES = [
  { key: "light", label: "Light", icon: Sun, desc: "Classic bright interface" },
  { key: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
  { key: "system", label: "System", icon: Monitor, desc: "Match your device settings" },
] as const;

const LANGUAGES = [
  { key: "en", label: "English", flag: "🇺🇸" },
  { key: "ne", label: "नेपाली (Nepali)", flag: "🇳🇵" },
] as const;

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["student-profile"],
    queryFn: studentSettingsApi.getProfile,
  });

  const langMutation = useMutation({
    mutationFn: (lang: string) => studentSettingsApi.updateProfile({ language: lang } as any),
    onSuccess: () => {
      toast.success("Language preference saved!");
      queryClient.invalidateQueries({ queryKey: ["student-profile"] });
    },
    onError: () => toast.error("Failed to save language."),
  });

  return (
    <div className="space-y-6">
      {/* Theme */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
        <h3 className="text-lg font-semibold text-[#0B2545] mb-2">Theme</h3>
        <p className="text-xs text-slate-500 mb-6">Choose how LoksewaAI looks for you.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={cn(
                  "relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:shadow-md",
                  isActive
                    ? "border-[#D4A72C] bg-[#D4A72C]/5 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                {isActive && (
                  <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-[#D4A72C] flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center",
                  isActive ? "bg-[#D4A72C]/10" : "bg-slate-100"
                )}>
                  <Icon className={cn("h-6 w-6", isActive ? "text-[#D4A72C]" : "text-slate-500")} />
                </div>
                <div className="text-center">
                  <p className={cn("text-sm font-semibold", isActive ? "text-[#0B2545]" : "text-slate-700")}>
                    {t.label}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="h-5 w-5 text-[#0B2545]" />
          <div>
            <h3 className="text-lg font-semibold text-[#0B2545]">Language</h3>
            <p className="text-xs text-slate-500">Choose your preferred language.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          {LANGUAGES.map((lang) => {
            const isActive = profile?.language === lang.key;
            return (
              <button
                key={lang.key}
                onClick={() => langMutation.mutate(lang.key)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                  isActive
                    ? "border-[#D4A72C] bg-[#D4A72C]/5"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className={cn("text-sm font-medium", isActive ? "text-[#0B2545]" : "text-slate-600")}>
                  {lang.label}
                </span>
                {isActive && <Check className="h-4 w-4 text-[#D4A72C] ml-auto" />}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-4">
          Nepali translation is coming soon. This saves your preference for when it's available.
        </p>
      </div>
    </div>
  );
}
