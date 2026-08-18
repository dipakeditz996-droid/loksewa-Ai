"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { evaluatorApi, EvaluatorDetail } from "@/lib/api/evaluators";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Pencil,
  Power,
  PowerOff,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  BookOpen,
  Award,
  Clock,
  Mail,
  Calendar,
  GraduationCap,
} from "lucide-react";

function StatMiniCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div>
        <p className="text-xl font-bold text-[#0B2545] tabular-nums">{value}</p>
        <p className="text-[11px] text-slate-400 font-medium">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold rounded-full border ${
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-100 text-slate-500 border-slate-200"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function ConfirmModal({
  open, title, message, confirmLabel, confirmClass, onConfirm, onCancel, loading,
}: {
  open: boolean; title: string; message: string; confirmLabel: string;
  confirmClass: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-[380px] mx-4">
        <h3 className="text-[15px] font-bold text-[#0B2545] mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 ${confirmClass}`}>
            {loading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EvaluatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [data, setData] = useState<EvaluatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDetail = useCallback(() => {
    setLoading(true);
    setError(false);
    evaluatorApi
      .detail(id)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { if (id) fetchDetail(); }, [id, fetchDetail]);

  const handleToggleStatus = async () => {
    if (!data) return;
    setToggleLoading(true);
    try {
      const updated = await evaluatorApi.update(id, { isActive: !data.isActive });
      setData((d) => d ? { ...d, isActive: updated.isActive } : d);
      showToast(`Evaluator ${updated.isActive ? "activated" : "deactivated"}.`);
    } catch {
      showToast("Failed to update status.", "error");
    } finally {
      setToggleLoading(false);
      setConfirmOpen(false);
    }
  };

  const initials = data
    ? (() => {
        const parts = data.name.trim().split(" ");
        return parts.length >= 2 ? ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() : (data.name[0] ?? "E").toUpperCase();
      })()
    : "E";

  if (error) {
    return (
      <div className="p-6 max-w-[900px]">
        <Link href="/admin-dashboard/users/evaluators" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0B2545] mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Evaluators
        </Link>
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load evaluator profile.</span>
          <button onClick={fetchDetail} className="ml-auto underline text-xs font-medium">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-6 max-w-[1000px] space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border animate-in slide-in-from-bottom-2 ${
          toast.type === "success" ? "bg-white text-emerald-700 border-emerald-200" : "bg-white text-red-700 border-red-200"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
          {toast.msg}
        </div>
      )}

      {/* Confirm modal */}
      {data && (
        <ConfirmModal
          open={confirmOpen}
          title={data.isActive ? "Deactivate Evaluator?" : "Activate Evaluator?"}
          message={data.isActive
            ? `This will prevent ${data.name} from accessing the platform.`
            : `This will restore ${data.name}'s access to the platform.`}
          confirmLabel={data.isActive ? "Deactivate" : "Activate"}
          confirmClass={data.isActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}
          onConfirm={handleToggleStatus}
          onCancel={() => setConfirmOpen(false)}
          loading={toggleLoading}
        />
      )}

      {/* Back nav */}
      <Link href="/admin-dashboard/users/evaluators" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0B2545] transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Evaluators
      </Link>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navy header bar */}
        <div className="h-20 bg-gradient-to-r from-[#0B2545] to-[#163E6C]" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-8 mb-5">
            <Avatar className="h-16 w-16 border-4 border-white shadow-md shrink-0">
              <AvatarFallback className="bg-[#0B2545] text-[#D4A72C] font-bold text-[18px]">
                {loading ? "…" : initials}
              </AvatarFallback>
            </Avatar>
            {!loading && data && (
              <div className="flex items-center gap-2 pb-1">
                <Link
                  href={`/admin-dashboard/users/evaluators/${id}/edit`}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors ${
                    data.isActive
                      ? "text-red-700 bg-red-50 border border-red-200 hover:bg-red-100"
                      : "text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {data.isActive ? <><PowerOff className="h-3.5 w-3.5" /> Deactivate</> : <><Power className="h-3.5 w-3.5" /> Activate</>}
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : data ? (
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-[20px] font-bold text-[#0B2545]">{data.name}</h1>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold bg-[#D4A72C]/10 text-[#B8860B] rounded-full border border-[#D4A72C]/30">
                  <GraduationCap className="h-3 w-3" /> Evaluator
                </div>
                <StatusBadge active={data.isActive} />
              </div>
              <p className="text-[13px] text-slate-400 mb-3">@{data.username}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-slate-500">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{data.email}</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {new Date(data.dateJoined).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
              {data.assignedSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {data.assignedSubjects.map((s) => (
                    <span key={s} className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-100 flex items-center gap-1">
                      <BookOpen className="h-2.5 w-2.5" />{s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <Skeleton className="h-8 w-12 mb-2" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ))
        ) : data ? (
          <>
            <StatMiniCard label="Total Evaluations" value={data.totalEvaluations} icon={ClipboardList} color="bg-blue-50 text-blue-600" />
            <StatMiniCard label="Completed" value={data.completedEvaluations} icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
            <StatMiniCard label="Pending (Platform)" value={data.pendingEvaluations} icon={Clock} color="bg-amber-50 text-amber-600" />
            <StatMiniCard label="Avg. Score" value={data.avgScore !== null ? data.avgScore.toFixed(1) : "—"} icon={Award} color="bg-purple-50 text-purple-600" />
          </>
        ) : null}
      </div>

      {/* Recent Evaluations */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <h3 className="text-[14px] font-bold text-[#0B2545]">Recent Evaluations</h3>
          <p className="text-[12px] text-slate-400 mt-0.5">Latest 5 submissions evaluated by this evaluator</p>
        </div>
        <div className="px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : !data || data.recentEvaluations.length === 0 ? (
            <div className="text-center py-10">
              <ClipboardList className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No evaluations yet.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {data.recentEvaluations.map((e) => (
                <div key={e.id} className="flex items-start gap-4 py-3 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#0B2545] truncate">{e.student}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{e.question}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-bold text-[#0B2545] tabular-nums">{e.marks} pts</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(e.evaluatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
