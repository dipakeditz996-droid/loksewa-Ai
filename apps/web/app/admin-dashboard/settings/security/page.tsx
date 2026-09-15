"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import toast from "react-hot-toast";

// Same scoring logic as app/register/page.tsx's signup password meter, kept
// in sync deliberately - one visual language for "how strong is this
// password" across the whole app rather than a second meter with its own
// thresholds.
function getPasswordStrength(password: string) {
  if (password.length === 0) return { score: 0, label: "", color: "bg-slate-200" };
  if (password.length < 6) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (password.length < 8) return { score: 2, label: "Fair", color: "bg-yellow-500" };
  if (password.match(/[A-Z]/) && password.match(/[0-9]/) && password.match(/[^A-Za-z0-9]/))
    return { score: 4, label: "Strong", color: "bg-emerald-500" };
  return { score: 3, label: "Good", color: "bg-[#D4A72C]" };
}

// Field-error priority mirrors ChangePasswordSerializer's own validation
// order (support/serializers.py) so the message shown is the same one a
// human reading the API response would see first.
function firstErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.data && typeof err.data === "object") {
    const data = err.data as Record<string, unknown>;
    for (const key of ["current_password", "new_password", "confirm_password", "non_field_errors", "detail"]) {
      const val = data[key];
      if (Array.isArray(val) && val.length > 0) return String(val[0]);
      if (typeof val === "string") return val;
    }
  }
  return err instanceof Error ? err.message : "Failed to change password. Please try again.";
}

function PasswordField({
  id, label, value, onChange, show, onToggleShow, autoComplete,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggleShow: () => void; autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="pl-9 pr-10"
          required
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function AdminSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(newPassword);
  const canSubmit = currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0 && !saving;

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setSaving(true);
    try {
      await adminApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
      resetForm();
      toast.success("Password changed successfully.");
    } catch (err) {
      setError(firstErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Security</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your own account's password.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-[#D4A72C]" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Change Password</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Changing your password signs you out of every other session. This session stays signed in.
        </p>

        {success && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Password changed successfully.
          </div>
        )}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <PasswordField
            id="currentPassword"
            label="Current Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((s) => !s)}
            autoComplete="current-password"
          />

          <div>
            <PasswordField
              id="newPassword"
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggleShow={() => setShowNew((s) => !s)}
              autoComplete="new-password"
            />
            {newPassword && (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-500">Strength</span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{strength.label}</span>
                </div>
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4].map((lvl) => (
                    <div
                      key={lvl}
                      className={`flex-1 rounded-full transition-colors ${lvl <= strength.score ? strength.color : "bg-slate-200 dark:bg-slate-700"}`}
                    />
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              At least 8 characters, not entirely numeric, not a commonly used password, and not too similar to your username or email.
            </p>
          </div>

          <PasswordField
            id="confirmPassword"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggleShow={() => setShowConfirm((s) => !s)}
            autoComplete="new-password"
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={!canSubmit} className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white">
              {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Changing...</>) : "Change Password"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => { resetForm(); setError(null); setSuccess(false); }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
