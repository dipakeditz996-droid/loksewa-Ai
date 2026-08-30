"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, AlertCircle, CheckCircle2, Zap, MessageSquareWarning } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api/admin";

export default function AITutorConfigurationPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminApi.getSettings,
  });

  const [enabled, setEnabled] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(20);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (data?.settings) {
      setEnabled(data.settings.features.enableAiTutor);
      setDailyLimit(data.settings.aiTutor.dailyMessageLimit);
    }
  }, [data]);

  const handleSave = async () => {
    if (dailyLimit < 1) {
      setSaveMessage({ type: "error", text: "Daily message limit must be at least 1." });
      return;
    }
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await adminApi.updateSettings({
        features: { enableAiTutor: enabled },
        aiTutor: { dailyMessageLimit: dailyLimit },
      });
      setSaveMessage({ type: "success", text: "Configuration saved." });
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "ai-tutor"] });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save AI Tutor configuration:", err);
      setSaveMessage({ type: "error", text: "Failed to save configuration." });
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
        <p>Failed to load configuration.</p>
      </div>
    );
  }

  const hasChanges =
    data?.settings &&
    (enabled !== data.settings.features.enableAiTutor ||
      dailyLimit !== data.settings.aiTutor.dailyMessageLimit);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-[#0B2545]">Configuration</h2>
        <p className="text-sm text-slate-500">
          These settings are read and enforced directly by the Django backend on every
          request - not just displayed here.
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded"
          />
          <div>
            <p className="font-medium text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#D4A72C]" />
              Enable AI Tutor
            </p>
            <p className="text-xs text-slate-600 mt-1">
              When turned off, students cannot start new conversations or send messages -
              the backend rejects both with a clear error, this isn&apos;t just a UI toggle.
              This is the same setting shown in the general Settings &rarr; Features page.
            </p>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Daily message limit per student
          </label>
          <Input
            type="number"
            min={1}
            value={dailyLimit}
            onChange={(e) => setDailyLimit(Number(e.target.value))}
            className="max-w-[160px]"
          />
          <p className="text-xs text-slate-500 mt-1.5 flex items-start gap-1.5">
            <MessageSquareWarning className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Maximum AI Tutor messages a single student can send per day. Enforced server-side
            in SendMessageView, not a display-only number.
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
