"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { studentSettingsApi } from "@/lib/api/student-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2, Eye, EyeOff, Check, Monitor, Smartphone } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" };
  if (score <= 4) return { score, label: "Strong", color: "bg-green-500" };
  return { score, label: "Very Strong", color: "bg-emerald-600" };
}

export function SecuritySection() {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const mutation = useMutation({
    mutationFn: () => studentSettingsApi.changePassword(form),
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    },
    onError: (err: any) => {
      const msg = err?.data?.current_password?.[0]
        || err?.data?.confirm_password?.[0]
        || err?.data?.new_password?.[0]
        || err?.message
        || "Failed to change password.";
      toast.error(msg);
    },
  });

  const strength = getPasswordStrength(form.new_password);
  const passwordsMatch = form.new_password === form.confirm_password;
  const canSubmit =
    form.current_password &&
    form.new_password.length >= 8 &&
    passwordsMatch &&
    !mutation.isPending;

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[#0B2545]/5 flex items-center justify-center">
            <Shield className="h-5 w-5 text-[#0B2545]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#0B2545]">Change Password</h3>
            <p className="text-xs text-slate-500">Update your password regularly for better security.</p>
          </div>
        </div>

        <div className="max-w-md space-y-5">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-700">Current Password</Label>
            <div className="relative">
              <Input
                type={showPasswords.current ? "text" : "password"}
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                className="pr-10 bg-slate-50/50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-700">New Password</Label>
            <div className="relative">
              <Input
                type={showPasswords.new ? "text" : "password"}
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                className="pr-10 bg-slate-50/50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.new_password && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", strength.color)}
                    style={{ width: `${(strength.score / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-slate-500">{strength.label}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-700">Confirm New Password</Label>
            <div className="relative">
              <Input
                type={showPasswords.confirm ? "text" : "password"}
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                className={cn(
                  "pr-10 bg-slate-50/50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20",
                  form.confirm_password && !passwordsMatch && "border-red-300 focus:border-red-400"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.confirm_password && !passwordsMatch && (
              <p className="text-[11px] text-red-500">Passwords do not match.</p>
            )}
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="bg-[#0B2545] hover:bg-[#163E6B] text-white w-full"
          >
            {mutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Changing...</>
            ) : (
              "Change Password"
            )}
          </Button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
        <h3 className="text-lg font-semibold text-[#0B2545] mb-2">Active Sessions</h3>
        <p className="text-xs text-slate-500 mb-6">Manage where you're signed in.</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50/50 border border-green-200/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-[#0B2545]">Current Session</p>
                <p className="text-xs text-slate-500">This device · Active now</p>
              </div>
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2.5 py-1 rounded-full">Active</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-4">
          Session management is limited to JWT-based authentication. Logging out invalidates your current token.
        </p>
      </div>
    </div>
  );
}
