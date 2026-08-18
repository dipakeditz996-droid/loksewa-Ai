"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  evaluatorApi,
  EvaluatorListItem,
} from "@/lib/api/evaluators";
import { AddEvaluatorModal } from "@/components/admin/add-evaluator-modal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap,
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Pencil,
  Power,
  PowerOff,
  CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const PAGE_SIZE = 20;

// ===== Sub-components =====

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-100 text-slate-500 border-slate-200"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function SubjectTags({ subjects }: { subjects: string[] }) {
  if (subjects.length === 0) {
    return <span className="text-[11px] text-slate-300 italic">None yet</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {subjects.slice(0, 2).map((s) => (
        <span key={s} className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded border border-blue-100">
          {s}
        </span>
      ))}
      {subjects.length > 2 && (
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded">
          +{subjects.length - 2}
        </span>
      )}
    </div>
  );
}

function getInitials(name: string, username: string) {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return (name[0] ?? username[0] ?? "E").toUpperCase();
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[180, 140, 120, 70, 70, 70, 80, 100, 40].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton className={`h-3.5 rounded`} style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// Confirmation modal for dangerous actions
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-[380px] mx-4">
        <h3 className="text-[15px] font-bold text-[#0B2545] mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 transition-colors ${confirmClass}`}
          >
            {loading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function EvaluatorsPage() {
  const router = useRouter();

  const [evaluators, setEvaluators] = useState<EvaluatorListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);

  // Confirm modal state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    evaluatorId: number;
    nextActive: boolean;
    name: string;
    loading: boolean;
  }>({ open: false, evaluatorId: 0, nextActive: false, name: "", loading: false });

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEvaluators = useCallback(() => {
    setLoading(true);
    setError(false);
    evaluatorApi
      .list({ search, status: statusFilter, page, pageSize: PAGE_SIZE })
      .then((res) => {
        setEvaluators(res.evaluators);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [search, statusFilter, page]);

  useEffect(() => { fetchEvaluators(); }, [fetchEvaluators]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleCreated = (ev: EvaluatorListItem) => {
    showToast(`${ev.name} added as evaluator.`);
    fetchEvaluators();
  };

  const openConfirm = (ev: EvaluatorListItem) => {
    setConfirmState({
      open: true,
      evaluatorId: ev.id,
      nextActive: !ev.isActive,
      name: ev.name,
      loading: false,
    });
  };

  const handleToggleStatus = async () => {
    setConfirmState((s) => ({ ...s, loading: true }));
    try {
      await evaluatorApi.update(confirmState.evaluatorId, {
        isActive: confirmState.nextActive,
      });
      setEvaluators((list) =>
        list.map((e) =>
          e.id === confirmState.evaluatorId
            ? { ...e, isActive: confirmState.nextActive }
            : e
        )
      );
      showToast(
        `${confirmState.name} ${confirmState.nextActive ? "activated" : "deactivated"} successfully.`
      );
    } catch {
      showToast("Failed to update evaluator status.", "error");
    } finally {
      setConfirmState((s) => ({ ...s, open: false, loading: false }));
    }
  };

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-[1400px]">

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border animate-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "bg-white text-emerald-700 border-emerald-200"
              : "bg-white text-red-700 border-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Confirm modal */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.nextActive ? "Activate Evaluator?" : "Deactivate Evaluator?"}
        message={
          confirmState.nextActive
            ? `This will restore ${confirmState.name}'s access to the platform.`
            : `This will prevent ${confirmState.name} from logging in and evaluating answers.`
        }
        confirmLabel={confirmState.nextActive ? "Activate" : "Deactivate"}
        confirmClass={confirmState.nextActive ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
        loading={confirmState.loading}
      />

      {/* Add Evaluator Modal */}
      <AddEvaluatorModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={handleCreated}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#0B2545] tracking-tight flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[#D4A72C]" />
            Evaluator Management
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage evaluators who review student subjective submissions.{" "}
            <span className="font-semibold text-slate-500">{total} evaluator{total !== 1 ? "s" : ""}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEvaluators}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0B2545] rounded-lg hover:bg-[#163E6C] shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Evaluator
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                statusFilter === tab.value
                  ? "bg-white text-[#0B2545] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or email…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]/30 shadow-sm transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold text-white bg-[#0B2545] rounded-lg hover:bg-[#163E6C] transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setSearchInput(""); }}
              className="px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load evaluators.</span>
          <button onClick={fetchEvaluators} className="ml-auto text-red-600 underline text-xs font-medium">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["Evaluator", "Email", "Subjects", "Total", "Completed", "Avg. Score", "Status", "Joined", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : evaluators.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <GraduationCap className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">No evaluators found</p>
                    {search && (
                      <p className="text-xs text-slate-300 mt-1">Try adjusting your search or filters.</p>
                    )}
                    {!search && !statusFilter && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="mt-3 px-4 py-2 text-sm font-semibold text-white bg-[#0B2545] rounded-lg hover:bg-[#163E6C]"
                      >
                        Add First Evaluator
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                evaluators.map((ev) => {
                  const initials = getInitials(ev.name, ev.username);
                  const joined = new Date(ev.dateJoined).toLocaleDateString("en-US", {
                    year: "numeric", month: "short", day: "numeric",
                  });
                  return (
                    <tr
                      key={ev.id}
                      className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Evaluator */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-slate-200 shrink-0">
                            <AvatarFallback className="bg-[#0B2545] text-[#D4A72C] font-bold text-[11px]">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link
                              href={`/admin-dashboard/users/evaluators/${ev.id}`}
                              className="text-[13px] font-semibold text-[#0B2545] hover:text-[#D4A72C] hover:underline truncate block transition-colors"
                            >
                              {ev.name}
                            </Link>
                            <p className="text-[11px] text-slate-400">@{ev.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-slate-600">{ev.email}</td>
                      <td className="px-4 py-3.5"><SubjectTags subjects={ev.assignedSubjects} /></td>
                      <td className="px-4 py-3.5 text-[13px] font-bold text-[#0B2545] tabular-nums">{ev.totalEvaluations}</td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-700 tabular-nums">{ev.completedEvaluations}</td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-700 tabular-nums">
                        {ev.avgScore !== null ? ev.avgScore.toFixed(1) : <span className="text-slate-300 text-[11px]">N/A</span>}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge active={ev.isActive} /></td>
                      <td className="px-4 py-3.5 text-[12px] text-slate-500 whitespace-nowrap">{joined}</td>
                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin-dashboard/users/evaluators/${ev.id}`)}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Eye className="h-3.5 w-3.5" /> View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin-dashboard/users/evaluators/${ev.id}/edit`)}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openConfirm(ev)}
                              className={`flex items-center gap-2 text-sm ${ev.isActive ? "text-red-600 focus:text-red-600 focus:bg-red-50" : "text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"}`}
                            >
                              {ev.isActive
                                ? <><PowerOff className="h-3.5 w-3.5" /> Deactivate</>
                                : <><Power className="h-3.5 w-3.5" /> Activate</>
                              }
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && evaluators.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50">
            <p className="text-[12px] text-slate-500">
              Showing{" "}
              <span className="font-semibold">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)}</span>{" "}
              of <span className="font-semibold">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span className="text-[12px] text-slate-500 px-1">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
