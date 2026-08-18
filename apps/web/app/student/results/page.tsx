"use client";

import React, { useEffect, useState, useCallback } from "react";
import { evaluationService, GetResultsResponse } from "@/lib/api/evaluations";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  AlertCircle,
  Award,
  Calendar,
  Clock,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 12;

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-6 w-3/4 mb-4" />
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

export default function StudentResultsPage() {
  const [resultsData, setResultsData] = useState<GetResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // ONLY fetch Published results for students
      const res = await evaluationService.getResults({ status: "Published", page, pageSize: PAGE_SIZE });
      setResultsData(res);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1200px] mx-auto min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-bold text-[#0B2545] tracking-tight flex items-center gap-2">
          <Award className="h-6 w-6 text-[#D4A72C]" />
          My Results
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          View your finalized and published examination results.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="h-4 w-4" />
          <span>Unable to load your results. Please try again later.</span>
          <button onClick={fetchResults} className="ml-auto underline font-medium text-xs">Try Again</button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : resultsData?.results.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-[15px] font-bold text-slate-600">No Results Yet</p>
            <p className="text-sm text-slate-500 mt-1">You haven't completed any exams with published results.</p>
          </div>
        ) : (
          resultsData?.results.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              {/* Highlight bar */}
              <div className={`absolute top-0 left-0 w-full h-1 ${r.percentage >= 40 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              
              <div className="flex justify-between items-start mb-3 mt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{r.examType}</span>
                <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded ${
                  r.percentage >= 40 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {r.percentage >= 40 ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              
              <h3 className="text-[16px] font-bold text-[#0B2545] leading-tight mb-4 group-hover:text-blue-700 transition-colors">
                {r.examName}
              </h3>
              
              <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 text-[12px] text-slate-500">
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(r.submittedAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {Math.round(r.timeTakenSeconds / 60)} mins</span>
              </div>
              
              <div className="border-t border-slate-100 pt-4 flex justify-between items-end">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Score</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-2xl font-black ${r.percentage >= 40 ? 'text-emerald-600' : 'text-rose-600'}`}>{r.score}</span>
                    <span className="text-sm font-bold text-slate-400">({r.percentage}%)</span>
                  </div>
                </div>
                <button className="flex items-center gap-1 text-[13px] font-bold text-blue-600 hover:text-blue-800">
                  View Detail <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && resultsData && resultsData.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-slate-500 px-4">
            Page {page} of {resultsData.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(resultsData.totalPages, p + 1))}
            disabled={page >= resultsData.totalPages}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
