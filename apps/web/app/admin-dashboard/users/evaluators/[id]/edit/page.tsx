"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { evaluatorApi, EvaluatorDetail } from "@/lib/api/evaluators";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from "lucide-react";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}

interface FormErrors {
  firstName?: string;
  email?: string;
  general?: string;
}

export default function EvaluatorEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [original, setOriginal] = useState<EvaluatorDetail | null>(null);
  const [form, setForm] = useState<FormState>({ firstName: "", lastName: "", email: "", isActive: true });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchDetail = useCallback(() => {
    setLoadingData(true);
    setLoadError(false);
    evaluatorApi
      .detail(id)
      .then((d) => {
        setOriginal(d);
        setForm({
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email,
          isActive: d.isActive,
        });
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoadingData(false));
  }, [id]);

  useEffect(() => { if (id) fetchDetail(); }, [id, fetchDetail]);

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = field === "isActive" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((err) => ({ ...err, [field]: undefined, general: undefined }));
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    setErrors({});
    try {
      await evaluatorApi.update(id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        isActive: form.isActive,
      });
      setSaved(true);
      setTimeout(() => router.push(`/admin-dashboard/users/evaluators/${id}`), 1200);
    } catch (err: unknown) {
      const apiErr = err as { errors?: FormErrors; message?: string };
      if (apiErr?.errors) {
        setErrors(apiErr.errors);
      } else {
        setErrors({ general: apiErr?.message ?? "Failed to save changes." });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="p-6 max-w-[600px]">
        <Link href="/admin-dashboard/users/evaluators" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0B2545] mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load evaluator.</span>
          <button onClick={fetchDetail} className="ml-auto underline text-xs font-medium">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-6 max-w-[600px] space-y-6">

      {/* Back nav */}
      <Link
        href={`/admin-dashboard/users/evaluators/${id}`}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0B2545] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Profile
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-[#0B2545] tracking-tight">Edit Evaluator</h1>
        {loadingData ? (
          <Skeleton className="h-4 w-48 mt-1" />
        ) : (
          <p className="text-sm text-slate-400 mt-0.5">Editing profile for <span className="font-semibold text-slate-600">{original?.name}</span></p>
        )}
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
          <h3 className="text-[13px] font-bold text-[#0B2545]">Profile Information</h3>
        </div>

        {loadingData ? (
          <div className="px-6 py-6 space-y-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
            {/* Success */}
            {saved && (
              <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-sm font-medium text-emerald-700">Changes saved! Redirecting…</p>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="e-first-name" className="block text-[12px] font-semibold text-slate-600">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="e-first-name"
                  type="text"
                  value={form.firstName}
                  onChange={update("firstName")}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition ${errors.firstName ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-[#0B2545]/20 focus:border-[#0B2545]/40"}`}
                />
                {errors.firstName && <p className="text-[11px] text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.firstName}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="e-last-name" className="block text-[12px] font-semibold text-slate-600">Last Name</label>
                <input
                  id="e-last-name"
                  type="text"
                  value={form.lastName}
                  onChange={update("lastName")}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]/40 transition"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="e-email" className="block text-[12px] font-semibold text-slate-600">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="e-email"
                type="email"
                value={form.email}
                onChange={update("email")}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition ${errors.email ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-[#0B2545]/20 focus:border-[#0B2545]/40"}`}
              />
              {errors.email && <p className="text-[11px] text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email}</p>}
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-[13px] font-semibold text-slate-700">Account Status</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {form.isActive ? "Evaluator can log in and review submissions." : "Evaluator is deactivated and cannot log in."}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="e-is-active"
                  checked={form.isActive}
                  onChange={update("isActive")}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-[#0B2545]/20 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B2545]" />
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href={`/admin-dashboard/users/evaluators/${id}`}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || saved}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#0B2545] rounded-lg hover:bg-[#163E6C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                ) : (
                  <><Save className="h-4 w-4" /> Save Changes</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
