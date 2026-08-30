"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, AlertCircle, CheckCircle2, FileCode2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { adminApi, AITutorMode } from "@/lib/api/admin";

const MODE_LABELS: Record<AITutorMode, string> = {
  EXPLAIN: "Explain",
  PRACTICE: "Practice",
  REVISION: "Revision",
  EXAM_STRATEGY: "Exam Strategy",
  STUDY_PLAN: "Study Plan",
};

const MODE_ORDER: AITutorMode[] = ["EXPLAIN", "PRACTICE", "REVISION", "EXAM_STRATEGY", "STUDY_PLAN"];

export default function AITutorPromptsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "ai-tutor", "prompts"],
    queryFn: adminApi.getAITutorPrompts,
  });

  const [basePrompt, setBasePrompt] = useState("");
  const [modePrompts, setModePrompts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (data) {
      setBasePrompt(data.basePrompt);
      const modes: Record<string, string> = {};
      for (const mode of MODE_ORDER) {
        modes[mode] = data.modes[mode]?.promptText ?? "";
      }
      setModePrompts(modes);
    }
  }, [data]);

  const hasChanges =
    data &&
    (basePrompt !== data.basePrompt ||
      MODE_ORDER.some((mode) => modePrompts[mode] !== data.modes[mode]?.promptText));

  const handleSave = async () => {
    if (!basePrompt.trim() || MODE_ORDER.some((mode) => !modePrompts[mode]?.trim())) {
      setSaveMessage({ type: "error", text: "No field can be left empty." });
      return;
    }
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await adminApi.updateAITutorPrompts({
        basePrompt,
        modes: modePrompts as Record<AITutorMode, string>,
      });
      setSaveMessage({ type: "success", text: "Prompts saved - live for the next AI Tutor response." });
      queryClient.invalidateQueries({ queryKey: ["admin", "ai-tutor", "prompts"] });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save prompts:", err);
      setSaveMessage({ type: "error", text: "Failed to save prompts." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-6 rounded-xl flex items-center gap-4">
        <AlertCircle className="w-6 h-6" />
        <p>Failed to load prompts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-[#0B2545]">Prompts</h2>
        <p className="text-sm text-slate-500">
          This is the exact text sent to Gemini as the system prompt on every AI Tutor
          request - editing here changes real responses, not just a display value.
        </p>
      </div>

      {saveMessage && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          saveMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}>
          {saveMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {saveMessage.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
          Base prompt (shared prefix for every mode)
        </label>
        <textarea
          value={basePrompt}
          onChange={(e) => setBasePrompt(e.target.value)}
          rows={4}
          className="w-full border border-slate-200 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/40"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-[#D4A72C]" />
          Per-mode instructions (appended after the base prompt)
        </h3>
        {MODE_ORDER.map((mode) => (
          <div key={mode}>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {MODE_LABELS[mode]}
            </label>
            <textarea
              value={modePrompts[mode] ?? ""}
              onChange={(e) => setModePrompts((prev) => ({ ...prev, [mode]: e.target.value }))}
              rows={2}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/40"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
