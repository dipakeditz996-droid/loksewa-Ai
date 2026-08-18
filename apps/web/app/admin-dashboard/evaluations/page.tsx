"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { evaluationService, GetResultsParams, GetResultsResponse } from "@/lib/api/evaluations";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Download,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Award,
} from "lucide-react";
import { EvaluationOverviewStats, ResultStatus } from "@/lib/mock/evaluations-demo-data";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

function StatCard({ title, value, icon, trend, highlightClass = "" }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
      <div className={cn("p-3 rounded-xl bg-slate-50 text-slate-500", highlightClass)}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="flex items-end gap-2 mt-1">
          <h3 className="text-2xl font-bold text-[#0B2545]">{value}</h3>
          {trend && (
            <span className="text-xs font-medium text-emerald-600 mb-1">
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ResultStatus }) {
  const config: Record<ResultStatus, { label: string; cls: string }> = {
    Published: { label: "Published", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    Evaluated: { label: "Evaluated", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    Processing: { label: "Processing", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    Draft: { label: "Draft", cls: "bg-slate-100 text-slate-500 border-slate-200" },
    Pending: { label: "Pending", cls: "bg-purple-50 text-purple-700 border-purple-200" },
    Unpublished: { label: "Unpublished", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  };
  const c = config[status] || config.Draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${c.cls}`}>
      {c.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-5 py-4"><Skeleton className="h-4 w-6 rounded" /></td>
      <td className="px-5 py-4 flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-32 rounded" />
      </td>
      <td className="px-5 py-4"><Skeleton className="h-4 w-40 rounded" /></td>
      <td className="px-5 py-4"><Skeleton className="h-4 w-12 rounded" /></td>
      <td className="px-5 py-4"><Skeleton className="h-4 w-16 rounded" /></td>
      <td className="px-5 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
      <td className="px-5 py-4"><Skeleton className="h-4 w-24 rounded" /></td>
      <td className="px-5 py-4 text-right"><Skeleton className="h-6 w-6 rounded ml-auto" /></td>
    </tr>
  );
}

export default function EvaluationsDashboard() {
  const [stats, setStats] = useState<EvaluationOverviewStats | null>(null);
  const [resultsData, setResultsData] = useState<GetResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [statsRes, resultsRes] = await Promise.all([
        evaluationService.getDashboardStats(),
        evaluationService.getResults({ search, status: statusFilter, examType: examTypeFilter, page, pageSize: PAGE_SIZE })
      ]);
      setStats(statsRes);
      setResultsData(resultsRes);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, examTypeFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1); // Reset page on new search
      fetchData();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, statusFilter, examTypeFilter]); // Auto-fetch on filter change

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#0B2545] tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-[#D4A72C]" />
            Evaluation & Results
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage exam evaluations, student results, and analytics across the platform.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Attempts" 
          value={stats?.totalAttempts || "-"} 
          icon={<FileText className="h-5 w-5" />} 
          highlightClass="bg-blue-50 text-blue-600"
        />
        <StatCard 
          title="Average Score" 
          value={stats ? `${stats.averageScore}%` : "-"} 
          icon={<TrendingUp className="h-5 w-5" />} 
          highlightClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          title="Pass Rate" 
          value={stats ? `${Math.round((stats.passed / stats.totalAttempts) * 100)}%` : "-"} 
          icon={<CheckCircle2 className="h-5 w-5" />} 
          highlightClass="bg-amber-50 text-amber-600"
        />
        <StatCard 
          title="Pending Evaluations" 
          value="12" // Demo static
          icon={<Clock className="h-5 w-5" />} 
          highlightClass="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Filters & Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or exam..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Evaluated">Evaluated</option>
              <option value="Pending">Pending</option>
            </select>

            <select
              value={examTypeFilter}
              onChange={(e) => setExamTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Types</option>
              <option value="Mock Test">Mock Test</option>
              <option value="Practice Test">Practice Test</option>
              <option value="Full-Length Exam">Full-Length Exam</option>
            </select>
          </div>
          <button 
            onClick={() => { setSearch(""); setStatusFilter(""); setExamTypeFilter(""); }}
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            Reset Filters
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
            <AlertCircle className="h-4 w-4" />
            <span>Unable to load evaluation data.</span>
            <button onClick={fetchData} className="ml-auto underline font-medium text-xs">Try Again</button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Exam Name</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Score</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">%</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Submitted</th>
                <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : resultsData?.results.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <ClipboardCheck className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">No evaluation results found.</p>
                  </td>
                </tr>
              ) : (
                resultsData?.results.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      {r.rank ? (
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                          {r.rank}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                          {r.studentAvatar ? (
                            <img src={r.studentAvatar} alt={r.studentName} className="h-full w-full object-cover" />
                          ) : r.studentName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#0B2545]">{r.studentName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[13px] font-medium text-slate-700">{r.examName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{r.category} • {r.examType}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[13px] font-semibold text-slate-700">{r.score}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[13px] font-bold ${r.percentage >= 40 ? "text-emerald-600" : "text-rose-600"}`}>
                        {r.percentage}%
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-4 text-[12px] text-slate-500 whitespace-nowrap">
                      {new Date(r.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin-dashboard/evaluations/${r.id}`}>
                        <button className="px-3 py-1.5 text-[12px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                          View
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && resultsData && resultsData.total > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-white">
            <p className="text-[12px] text-slate-500">
              Showing <span className="font-semibold">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, resultsData.total)}</span> of{" "}
              <span className="font-semibold">{resultsData.total}</span> results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(resultsData.totalPages, p + 1))}
                disabled={page >= resultsData.totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
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
