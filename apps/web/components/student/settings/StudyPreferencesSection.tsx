"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentSettingsApi } from "@/lib/api/student-settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { FocusModeToggle } from "@/components/student/focus/FocusModeToggle";

const STUDY_TIMES = [
  { key: "morning", label: "Morning", sub: "6AM - 12PM", emoji: "🌅" },
  { key: "afternoon", label: "Afternoon", sub: "12PM - 5PM", emoji: "☀️" },
  { key: "evening", label: "Evening", sub: "5PM - 9PM", emoji: "🌆" },
  { key: "night", label: "Night", sub: "9PM - 12AM", emoji: "🌙" },
  { key: "flexible", label: "Flexible", sub: "Anytime", emoji: "🔄" },
];

const DIFFICULTIES = [
  { key: "easy", label: "Easy", color: "bg-green-100 text-green-700 border-green-200" },
  { key: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { key: "hard", label: "Hard", color: "bg-red-100 text-red-700 border-red-200" },
  { key: "mixed", label: "Mixed", color: "bg-purple-100 text-purple-700 border-purple-200" },
];

const STUDY_MODES = [
  { key: "practice", label: "Practice", desc: "Focus on solving questions", emoji: "🎯" },
  { key: "revision", label: "Revision", desc: "Review completed topics", emoji: "📖" },
  { key: "mock_exams", label: "Mock Exams", desc: "Simulate real exams", emoji: "📝" },
  { key: "balanced", label: "Balanced", desc: "Mix of all modes", emoji: "⚖️" },
];

export function StudyPreferencesSection() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["student-profile"],
    queryFn: studentSettingsApi.getProfile,
  });

  const [form, setForm] = useState({
    preferred_study_time: "flexible",
    daily_study_goal_minutes: 120,
    difficulty_preference: "mixed",
    study_mode: "balanced",
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        preferred_study_time: profile.preferred_study_time || "flexible",
        daily_study_goal_minutes: profile.daily_study_goal_minutes || 120,
        difficulty_preference: profile.difficulty_preference || "mixed",
        study_mode: profile.study_mode || "balanced",
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (data: any) => studentSettingsApi.updateProfile(data),
    onSuccess: () => {
      toast.success("Study preferences saved!");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["student-profile"] });
    },
    onError: () => toast.error("Failed to save preferences."),
  });

  const handleChange = (key: string, val: string | number) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Focus Mode - same control as the header, same stored preference */}
      <FocusModeToggle variant="card" />

      {/* Preferred Study Time */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-5 w-5 text-[#0B2545]" />
          <div>
            <h3 className="text-lg font-semibold text-[#0B2545]">Study Preferences</h3>
            <p className="text-xs text-slate-500">Customize your learning experience.</p>
          </div>
        </div>

        {/* Study Time */}
        <div className="mb-8">
          <Label className="text-[12px] font-semibold text-slate-700 mb-3 block">
            Preferred Study Time
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {STUDY_TIMES.map((t) => (
              <button
                key={t.key}
                onClick={() => handleChange("preferred_study_time", t.key)}
                className={cn(
                  "flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center",
                  form.preferred_study_time === t.key
                    ? "border-[#D4A72C] bg-[#D4A72C]/5"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <span className="text-xl mb-1">{t.emoji}</span>
                <span className="text-xs font-semibold text-slate-800">{t.label}</span>
                <span className="text-[10px] text-slate-400">{t.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Daily Goal */}
        <div className="mb-8">
          <Label className="text-[12px] font-semibold text-slate-700 mb-3 block">
            Daily Study Goal
          </Label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={30}
              max={480}
              step={30}
              value={form.daily_study_goal_minutes}
              onChange={(e) => handleChange("daily_study_goal_minutes", Number(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-full appearance-none accent-[#D4A72C]"
            />
            <div className="bg-[#0B2545] text-white px-4 py-2 rounded-lg text-sm font-bold min-w-[80px] text-center">
              {Math.floor(form.daily_study_goal_minutes / 60)}h {form.daily_study_goal_minutes % 60 ? `${form.daily_study_goal_minutes % 60}m` : ""}
            </div>
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-8">
          <Label className="text-[12px] font-semibold text-slate-700 mb-3 block">
            Difficulty Preference
          </Label>
          <div className="flex flex-wrap gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.key}
                onClick={() => handleChange("difficulty_preference", d.key)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium border-2 transition-all",
                  form.difficulty_preference === d.key
                    ? `${d.color} ring-2 ring-offset-1 ring-slate-300`
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Study Mode */}
        <div className="mb-6">
          <Label className="text-[12px] font-semibold text-slate-700 mb-3 block">
            Preferred Study Mode
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STUDY_MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => handleChange("study_mode", m.key)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all",
                  form.study_mode === m.key
                    ? "border-[#D4A72C] bg-[#D4A72C]/5"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <span className="text-2xl">{m.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{m.label}</p>
                  <p className="text-[11px] text-slate-400">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
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
            <><Save className="h-4 w-4 mr-2" /> Save Preferences</>
          )}
        </Button>
      </div>
    </div>
  );
}
