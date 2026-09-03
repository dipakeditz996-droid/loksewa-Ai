"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Hourglass, Loader2, Mail, Phone, MapPin, GraduationCap, RefreshCw, KeyRound, Copy, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/api/client";

interface PendingStudent {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  permanent_district: string;
  permanent_local_level: string;
  preferred_exam_category: string | null;
  preferred_exam_level: string | null;
  preferred_exam_service: string | null;
  registered_at: string;
  status: string;
}

export default function PendingVerificationPage() {
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [recoveryTarget, setRecoveryTarget] = useState<PendingStudent | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<{ results: PendingStudent[]; count: number }>("/admin/users/pending-verifications/");
      setStudents(data.results);
    } catch {
      toast.error("Failed to load pending registrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleResendOtp = async (student: PendingStudent) => {
    setActioningId(student.id);
    try {
      await apiClient(`/admin/users/${student.id}/resend-otp/`, { method: "POST" });
      toast.success(`Verification code resent to ${student.email}.`);
    } catch (err: any) {
      toast.error(err.message || err.error || "Failed to resend code.");
    } finally {
      setActioningId(null);
    }
  };

  const openRecoveryDialog = (student: PendingStudent) => {
    setRecoveryTarget(student);
    setRecoveryCode(null);
    setCopied(false);
  };

  const handleGenerateRecoveryCode = async () => {
    if (!recoveryTarget) return;
    setActioningId(recoveryTarget.id);
    try {
      const res = await apiClient<{ code: string; expires_in_minutes: number }>(
        `/admin/users/${recoveryTarget.id}/generate-recovery-code/`,
        { method: "POST" }
      );
      setRecoveryCode(res.code);
    } catch (err: any) {
      toast.error(err.message || err.error || "Failed to generate recovery code.");
      setRecoveryTarget(null);
    } finally {
      setActioningId(null);
    }
  };

  const handleCopyCode = () => {
    if (!recoveryCode) return;
    navigator.clipboard.writeText(recoveryCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const examPreference = (s: PendingStudent) =>
    [s.preferred_exam_category, s.preferred_exam_level, s.preferred_exam_service].filter(Boolean).join(" → ") || "—";

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-6">
      <Link href="/admin-dashboard/students" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#0B2545] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Students
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
          <Hourglass className="w-6 h-6" /> Pending Email Verification
        </h1>
        <p className="text-slate-500 mt-1">
          Students who registered but haven't confirmed their email yet. Resend their code, or generate a
          recovery code if they can't receive email at all.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Check className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
          <p className="text-slate-700 font-semibold">No pending registrations</p>
          <p className="text-slate-400 text-sm mt-1">Every registered student has verified their email.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {students.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-[15px] font-bold text-slate-900">{s.name}</h3>
                    <span className="text-xs text-slate-400">@{s.username}</span>
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[10px]">{s.status}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {s.email}</div>
                    <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {s.phone || "—"}</div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {[s.permanent_local_level, s.permanent_district].filter(Boolean).join(" → ") || "—"}
                    </div>
                    <div className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-slate-400" /> {examPreference(s)}</div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Registered {new Date(s.registered_at).toLocaleString()}</p>
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <Button
                    variant="outline" size="sm" className="gap-1.5"
                    disabled={actioningId === s.id}
                    onClick={() => handleResendOtp(s)}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
                  </Button>
                  <Button
                    size="sm" className="gap-1.5 bg-[#0B2545] hover:bg-[#0B2545]/90"
                    disabled={actioningId === s.id}
                    onClick={() => openRecoveryDialog(s)}
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Generate Recovery Code
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!recoveryTarget} onOpenChange={(open) => !open && setRecoveryTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recovery code for {recoveryTarget?.name}</DialogTitle>
            <DialogDescription>
              {recoveryCode
                ? "Share this code with the student through a secure support channel (phone, in-person, verified chat). It will not be shown again and expires in 10 minutes."
                : "This generates a one-time code the student can use to verify their account without email. Only use this when they genuinely can't receive the OTP email."}
            </DialogDescription>
          </DialogHeader>

          {recoveryCode ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 text-center text-2xl font-bold tracking-[0.3em] py-3 rounded-lg bg-slate-50 border border-slate-200 text-[#0B2545]">
                {recoveryCode}
              </div>
              <Button variant="outline" size="icon" onClick={handleCopyCode} title="Copy code">
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          ) : null}

          <DialogFooter>
            {recoveryCode ? (
              <Button onClick={() => setRecoveryTarget(null)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setRecoveryTarget(null)}>Cancel</Button>
                <Button onClick={handleGenerateRecoveryCode} disabled={actioningId === recoveryTarget?.id} className="gap-2">
                  {actioningId === recoveryTarget?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Generate Code
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
