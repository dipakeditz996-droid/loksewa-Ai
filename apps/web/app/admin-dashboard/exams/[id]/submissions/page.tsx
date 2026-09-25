"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Search, Filter, Loader2, CheckCircle2, Clock, AlertCircle,
  Eye, Award, ArrowRight, UserCheck, ExternalLink, RefreshCw, FileCheck
} from "lucide-react";
import { adminExamApi, AdminSubjectiveSubmission } from "@/lib/api/admin-exams";
import toast from "react-hot-toast";

export default function ExamSubmissionsPage() {
  const params = useParams<{ id: string }>();
  const examId = Number(params?.id);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const {
    data: submissions = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["admin", "exam", examId, "submissions"],
    queryFn: () => adminExamApi.getExamSubmissions(examId),
    enabled: Number.isFinite(examId) && examId > 0,
    refetchInterval: 15000, // Auto-refresh every 15s to pick up student uploads
  });

  const stats = useMemo(() => {
    const total = submissions.length;
    const pending = submissions.filter(s => !s.is_published && s.status !== "evaluated").length;
    const evaluated = submissions.filter(s => s.status === "evaluated" && !s.is_published).length;
    const published = submissions.filter(s => s.is_published).length;
    return { total, pending, evaluated, published };
  }, [submissions]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      // Status filter
      if (statusFilter === "pending" && (s.is_published || s.status === "evaluated")) return false;
      if (statusFilter === "evaluated" && (s.status !== "evaluated" || s.is_published)) return false;
      if (statusFilter === "published" && !s.is_published) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const nameMatch = s.student_name?.toLowerCase().includes(q);
        const emailMatch = s.student_email?.toLowerCase().includes(q);
        const userMatch = s.student_username?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !userMatch) return false;
      }
      return true;
    });
  }, [submissions, statusFilter, searchTerm]);

  const handleDownloadPdf = async (e: React.MouseEvent, submissionId: number, studentName: string) => {
    e.stopPropagation();
    try {
      const blob = await adminExamApi.getAnswerSheetBlob(submissionId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast.error("Could not load answer sheet PDF.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Submissions</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-[#0B2545] mt-1.5">{stats.total}</p>
          <span className="text-xs text-slate-400 mt-1 block">Answer sheets uploaded</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Awaiting Evaluation</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-1.5">{stats.pending}</p>
          <span className="text-xs text-slate-400 mt-1 block">Needs examiner review</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Evaluated (Draft)</span>
            <Award className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-indigo-700 mt-1.5">{stats.evaluated}</p>
          <span className="text-xs text-slate-400 mt-1 block">Ready to publish</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1.5">{stats.published}</p>
          <span className="text-xs text-slate-400 mt-1 block">Visible to candidates</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Refresh button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="p-2 text-slate-600 hover:text-[#0B2545] hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin text-indigo-600" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          {[
            { id: "all", label: "All Submissions", count: stats.total },
            { id: "pending", label: "Awaiting Grading", count: stats.pending },
            { id: "evaluated", label: "Evaluated (Unpublished)", count: stats.evaluated },
            { id: "published", label: "Published Results", count: stats.published },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  active
                    ? "bg-[#0B2545] text-white"
                    : "text-slate-600 hover:bg-slate-100 bg-slate-50"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submissions List / Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
            <p className="text-sm text-slate-500">Loading student submissions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-800 text-base">No submissions found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "all"
                ? "No student submissions matched your current filter criteria."
                : "No students have submitted handwritten answer sheets for this subjective exam yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Answer Sheet</th>
                  <th className="py-3 px-4">Evaluation Status</th>
                  <th className="py-3 px-4">Marks / Score</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filtered.map((sub) => {
                  const hasPdf = sub.has_answer_pdf;
                  const isEval = sub.status === "evaluated";
                  const isPub = sub.is_published;

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => {
                        window.location.href = `/admin-dashboard/exams/${examId}/submissions/${sub.attempt_id}`;
                      }}
                    >
                      {/* Candidate */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {sub.student_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {sub.student_email || `@${sub.student_username}`} · Attempt #{sub.attempt_id}
                        </div>
                      </td>

                      {/* Submitted At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                        {sub.submitted_at ? (
                          <>
                            <div className="font-medium text-slate-700">
                              {new Date(sub.submitted_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              {new Date(sub.submitted_at).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </>
                        ) : (
                          <span className="text-amber-600 font-medium">In Progress</span>
                        )}
                      </td>

                      {/* Answer Sheet */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasPdf ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                              {sub.page_count} {sub.page_count === 1 ? "Page" : "Pages"}
                            </span>
                            {sub.file_size_bytes > 0 && (
                              <span className="text-[11px] text-slate-400">
                                {(sub.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDownloadPdf(e, sub.id, sub.student_name)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="View PDF"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No PDF compiled</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPub ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Published
                          </span>
                        ) : isEval ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <UserCheck className="w-3 h-3" /> Evaluated (Unpublished)
                          </span>
                        ) : sub.status === "upload_pending" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 animate-spin" /> Uploading Photos
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Awaiting Grading
                          </span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isEval || isPub ? (
                          <div>
                            <span className="font-bold text-slate-900 text-sm">
                              {sub.score}
                            </span>
                            <span className="text-xs text-slate-400"> / {sub.total_marks}</span>
                            <span className="ml-2 text-xs font-medium text-slate-500">
                              ({sub.percentage}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not evaluated</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/admin-dashboard/exams/${examId}/submissions/${sub.attempt_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isPub
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              : isEval
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                              : "bg-[#0B2545] hover:bg-[#163E6C] text-white shadow-sm"
                          }`}
                        >
                          {isPub ? "Review Published" : isEval ? "Edit & Publish" : "Grade Submission"}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
