"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy, Users, Search, TrendingUp, Award, Flame, AlertCircle,
  ChevronLeft, ChevronRight, RefreshCw, Loader2,
} from "lucide-react";

import {
  adminLeaderboardApi, LeaderboardCategory, LeaderboardPeriod, LeaderboardResponse,
} from "@/lib/api/admin-leaderboard";
import { ApiError } from "@/lib/api/client";

const CATEGORIES: { value: LeaderboardCategory; label: string; hint: string }[] = [
  { value: "overall", label: "Overall XP", hint: "Ranked by gamification XP" },
  { value: "exam", label: "Exam Performance", hint: "Ranked by average exam score" },
  { value: "streak", label: "Study Streak", hint: "Ranked by current streak" },
];

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "monthly", label: "Last 30 days" },
  { value: "weekly", label: "Last 7 days" },
];

const RANK_TONE = (rank: number) =>
  rank === 1 ? "bg-[#D4A72C] text-white"
    : rank === 2 ? "bg-slate-300 text-slate-800"
    : rank === 3 ? "bg-amber-700 text-white"
    : "bg-slate-100 text-slate-600";

export default function AdminRankingsPage() {
  const router = useRouter();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<LeaderboardCategory>("overall");
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Guards against a slow earlier request overwriting a newer one.
  const requestId = useRef(0);

  useEffect(() => {
    const id = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await adminLeaderboardApi.list({
        category,
        // A streak has no historical window, so the backend rejects a period here.
        period: category === "streak" ? "all" : period,
        search: debouncedSearch || undefined,
        page,
        page_size: 20,
      });
      if (id !== requestId.current) return;
      setData(res);
    } catch (err: unknown) {
      if (id !== requestId.current) return;
      if (err instanceof ApiError) {
        setError(
          err.status === 403
            ? "You don't have permission to view the leaderboard."
            : err.data?.error || "Unable to load the leaderboard."
        );
      } else {
        setError("Connection failed. Please try again.");
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [category, period, debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary;
  const stats = [
    { label: "Ranked Students", value: summary?.total_students ?? 0, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Highest XP", value: summary?.top_xp ?? 0, icon: Trophy, color: "text-[#D4A72C]", bg: "bg-[#D4A72C]/10" },
    { label: "Average XP", value: summary?.average_xp ?? 0, icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
    { label: "Active Students", value: summary?.active_students ?? 0, icon: Award, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2545]">Rankings &amp; Leaderboards</h1>
          <p className="text-slate-500 mt-1">
            Student rankings computed from live platform activity.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Summary — aggregated across the whole filtered set, not this page */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-[#0B2545] leading-none mb-1">
                {loading && !data ? "—" : stat.value.toLocaleString()}
              </p>
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Ranking basis — states the real tie-break chain the backend applies */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <div className="p-2 bg-blue-100 text-blue-700 rounded-full shrink-0">
          <Trophy className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-900">
            Ranking basis — {CATEGORIES.find(c => c.value === category)?.hint}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 text-xs text-blue-700">
            {category === "exam" ? (
              <>
                <span><strong>1.</strong> Average score</span>
                <span><strong>2.</strong> Exams completed</span>
                <span><strong>3.</strong> XP</span>
              </>
            ) : category === "streak" ? (
              <>
                <span><strong>1.</strong> Current streak</span>
                <span><strong>2.</strong> XP</span>
                <span><strong>3.</strong> Average score</span>
              </>
            ) : (
              <>
                <span><strong>1.</strong> XP</span>
                <span><strong>2.</strong> Average score</span>
                <span><strong>3.</strong> Exams completed</span>
              </>
            )}
            <span><strong>Final:</strong> Student ID (stable)</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search by name, username or email..."
              className="w-full pl-9 pr-3 h-10 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value as LeaderboardCategory); setPage(1); }}
              className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm"
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select
              value={category === "streak" ? "all" : period}
              onChange={(e) => { setPeriod(e.target.value as LeaderboardPeriod); setPage(1); }}
              disabled={category === "streak"}
              title={category === "streak" ? "A streak is a current value, so it has no time window." : undefined}
              className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            >
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4 text-center">XP</th>
                <th className="px-6 py-4 text-center">Level</th>
                <th className="px-6 py-4 text-center">Streak</th>
                <th className="px-6 py-4 text-center">Exams</th>
                <th className="px-6 py-4 text-center">Avg Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0B2545]" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <AlertCircle className="w-8 h-8 mx-auto text-red-400 mb-3" />
                    <p className="font-semibold text-slate-800">{error}</p>
                    <button
                      onClick={load}
                      className="mt-4 px-4 py-2 bg-[#0B2545] hover:bg-[#163E6B] text-white rounded-lg text-sm font-medium"
                    >
                      Try again
                    </button>
                  </td>
                </tr>
              ) : !data || data.results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Trophy className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-700">
                      {debouncedSearch
                        ? `No students match “${debouncedSearch}”.`
                        : "No leaderboard data available yet."}
                    </p>
                    {!debouncedSearch && (
                      <p className="text-sm text-slate-500 mt-1">
                        Rankings appear once students earn XP or complete exams.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                data.results.map((row) => (
                  <tr
                    key={row.student.id}
                    onClick={() => router.push(`/admin-dashboard/students/${row.student.id}`)}
                    className="hover:bg-slate-50/60 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span className={`w-8 h-8 rounded-full inline-flex items-center justify-center text-xs font-bold ${RANK_TONE(row.rank)}`}>
                        {row.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {row.student.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.student.avatar} alt=""
                            className="w-9 h-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <span className="w-9 h-9 rounded-full bg-[#0B2545] text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {(row.student.name || row.student.username).slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0B2545] truncate">{row.student.name}</p>
                          <p className="text-xs text-slate-500 truncate">{row.student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-slate-800">
                      {row.xp.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">{row.level}</td>
                    <td className="px-6 py-4 text-center">
                      {row.streak > 0 ? (
                        <span className="inline-flex items-center gap-1 text-orange-600 font-medium">
                          <Flame className="w-3.5 h-3.5" /> {row.streak}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">{row.exams_completed}</td>
                    <td className="px-6 py-4 text-center">
                      {row.exams_completed > 0 ? (
                        <span className="font-medium text-slate-800">{row.average_score}%</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.total_pages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {data.results.length} of {data.count.toLocaleString()} students
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!data.has_previous || loading}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-xs text-slate-500">
                Page {data.page} of {data.total_pages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!data.has_next || loading}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
