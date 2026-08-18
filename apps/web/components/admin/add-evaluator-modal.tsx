"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, X, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { evaluatorApi, CreateEvaluatorPayload, EvaluatorListItem } from "@/lib/api/evaluators";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (evaluator: EvaluatorListItem) => void;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export function AddEvaluatorModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: undefined, general: undefined }));
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address.";
    if (!form.password) e.password = "Password is required.";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
    if (!form.confirmPassword) e.confirmPassword = "Please confirm the password.";
    else if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const payload: CreateEvaluatorPayload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
      };
      const created = await evaluatorApi.create(payload);
      setSuccess(true);
      setTimeout(() => {
        onCreated(created);
        handleClose();
      }, 1200);
    } catch (err: unknown) {
      const apiErr = err as { errors?: FormErrors; message?: string };
      if (apiErr?.errors) {
        setErrors(apiErr.errors);
      } else {
        setErrors({ general: apiErr?.message ?? "Failed to create evaluator. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setForm({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
    setErrors({});
    setSuccess(false);
    setShowPassword(false);
    setShowConfirm(false);
    onClose();
  };

  const Field = ({
    label,
    id,
    type = "text",
    value,
    onChange,
    error,
    required,
    placeholder,
    children,
  }: {
    label: string;
    id: string;
    type?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    children?: React.ReactNode;
  }) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[12px] font-semibold text-slate-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full px-3 py-2 text-sm border rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
            error
              ? "border-red-300 focus:ring-red-200 bg-red-50/50"
              : "border-slate-200 focus:ring-[#0B2545]/20 focus:border-[#0B2545]/40"
          } ${children ? "pr-10" : ""}`}
        />
        {children}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-[11px] text-red-600">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden rounded-2xl border border-slate-200">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-[#0B2545]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <UserPlus className="h-4 w-4 text-white" />
            </div>
            <DialogTitle className="text-[15px] font-bold text-white">Add New Evaluator</DialogTitle>
          </div>
          <p className="text-[12px] text-white/60 mt-1 ml-11">
            Create a new evaluator account. They will be able to review student submissions.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="px-6 py-5 space-y-4">
            {/* Success state */}
            {success && (
              <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-sm font-medium text-emerald-700">Evaluator created successfully!</p>
              </div>
            )}

            {/* General error */}
            {errors.general && (
              <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <p className="text-sm text-red-700">{errors.general}</p>
              </div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="First Name"
                id="eval-first-name"
                value={form.firstName}
                onChange={update("firstName")}
                error={errors.firstName}
                required
                placeholder="Hari"
              />
              <Field
                label="Last Name"
                id="eval-last-name"
                value={form.lastName}
                onChange={update("lastName")}
                error={errors.lastName}
                placeholder="Bahadur"
              />
            </div>

            {/* Email */}
            <Field
              label="Email Address"
              id="eval-email"
              type="email"
              value={form.email}
              onChange={update("email")}
              error={errors.email}
              required
              placeholder="evaluator@example.com"
            />

            {/* Password */}
            <Field
              label="Password"
              id="eval-password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={update("password")}
              error={errors.password}
              required
              placeholder="Min. 8 characters"
            >
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>

            {/* Confirm Password */}
            <Field
              label="Confirm Password"
              id="eval-confirm-password"
              type={showConfirm ? "text" : "password"}
              value={form.confirmPassword}
              onChange={update("confirmPassword")}
              error={errors.confirmPassword}
              required
              placeholder="Repeat password"
            >
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>
          </div>

          <DialogFooter className="px-6 pb-6 pt-2 gap-2 flex-row justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#0B2545] rounded-lg hover:bg-[#163E6C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Evaluator
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
