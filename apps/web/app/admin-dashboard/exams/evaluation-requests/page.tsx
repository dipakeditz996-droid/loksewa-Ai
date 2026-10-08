"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileCheck, Search, Filter, RotateCcw, Check, X, Eye, ExternalLink,
  Clock, CheckCircle2, AlertCircle, RefreshCw, XCircle, FileText, Download,
  Loader2, ArrowUpDown, ChevronRight, Inbox, ShieldAlert, Award
} from "lucide-react";
import { toast } from "sonner";
import {
  adminExamApi,
  SubjectiveCheckingRequest,
} from "@/lib/api/admin-exams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

function getErrorDetail(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null) return fallback;
  const data = "data" in error ? (error as any).data : null;
  if (typeof data === "object" && data !== null && "detail" in data && typeof data.detail === "string") {
    return data.detail;
  }
  if ("message" in error && typeof (error as any).message === "string") return (error as any).message;
  return fallback;
}

export default function SubjectiveEvaluationRequestsPage() {
  const queryClient = useQueryClient();

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ordering, setOrdering] = useState("-created_at");

  // Selection & Dialogs
  const [selectedDetailReq, setSelectedDetailReq] = useState<SubjectiveCheckingRequest | null>(null);
  const [rejectingReq, setRejectingReq] = useState<SubjectiveCheckingRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<number | null>(null);

  // PDF Preview Modal
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfTitle, setPreviewPdfTitle] = useState("");
  const [loadingPdf, setLoadingPdf] = useState(false);

  // 1. Fetch Request Stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["admin-evaluation-requests-stats"],
    queryFn: () => adminExamApi.getSubjectiveCheckingRequestStats(),
  });

  // 2. Fetch Requests List
  const {
    data: requests = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-evaluation-requests", statusFilter, search, ordering],
    queryFn: () =>
      adminExamApi.getSubjectiveCheckingRequests({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search.trim() || undefined,
        ordering,
      }),
  });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-evaluation-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-evaluation-requests-stats"] }),
    ]);
  };

  // Actions
  const handleAccept = async (req: SubjectiveCheckingRequest) => {
    setActionInProgressId(req.id);
    try {
      await adminExamApi.acceptSubjectiveCheckingRequest(req.id);
      toast.success(`Evaluation request for ${req.student_name} accepted!`);
      if (selectedDetailReq?.id === req.id) {
        setSelectedDetailReq((prev) => (prev ? { ...prev, status: "accepted", status_display: "Checking Accepted" } : null));
      }
      await refreshAll();
    } catch (err: unknown) {
      toast.error(getErrorDetail(err, "Could not accept evaluation request."));
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleOpenRejectDialog = (req: SubjectiveCheckingRequest) => {
    setRejectingReq(req);
    setRejectReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectingReq) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setIsRejecting(true);
    try {
      await adminExamApi.rejectSubjectiveCheckingRequest(rejectingReq.id, {
        rejection_reason: trimmed,
      });
      toast.success("Evaluation request rejected. The student has been notified with the reason.");
      if (selectedDetailReq?.id === rejectingReq.id) {
        setSelectedDetailReq((prev) =>
          prev ? { ...prev, status: "rejected", status_display: "Request Rejected", rejection_reason: trimmed } : null
        );
      }
      setRejectingReq(null);
      setRejectReason("");
      await refreshAll();
    } catch (err: unknown) {
      toast.error(getErrorDetail(err, "Failed to reject evaluation request."));
    } finally {
      setIsRejecting(false);
    }
  };

  const handleViewAnswerSheet = async (req: SubjectiveCheckingRequest) => {
    try {
      setLoadingPdf(true);
      const blob = await adminExamApi.getSubjectiveCheckingRequestAnswerSheetBlob(req.id);
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setPreviewPdfTitle(`${req.student_name} - ${req.examination_title}`);
    } catch {
      toast.error("Could not load original answer sheet PDF.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleDownloadAnswerSheet = async (req: SubjectiveCheckingRequest) => {
    try {
      const blob = await adminExamApi.getSubjectiveCheckingRequestAnswerSheetBlob(req.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = req.file_name || `answer_sheet_attempt_${req.attempt_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download answer sheet.");
    }
  };

  const getStatusBadge = (status: SubjectiveCheckingRequest["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700 text-xs font-semibold">Pending Review</Badge>;
      case "accepted":
        return <Badge className="bg-blue-600 text-white text-xs font-semibold">Accepted</Badge>;
      case "in_progress":
        return <Badge className="bg-indigo-600 text-white text-xs font-semibold animate-pulse">Evaluating</Badge>;
      case "completed":
        return <Badge className="bg-emerald-600 text-white text-xs font-semibold">Evaluated</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="text-xs font-semibold">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/admin-dashboard/exams" className="hover:text-primary transition-colors">Exams</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">Evaluation Requests</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2.5">
            <FileCheck className="w-6 h-6 text-[#D4A72C]" />
            Subjective Evaluation Requests
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Review, accept or decline student manual checking requests for submitted subjective examination answer sheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void refreshAll()} className="text-xs gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Link href="/admin-dashboard/exams/submissions">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50">
              <Award className="w-3.5 h-3.5" /> Submissions
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards (Section 21) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 mb-1">Total Requests</p>
          <h3 className="text-2xl font-bold text-[#0B2545]">{stats?.total ?? requests.length}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-amber-50/20">
          <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center justify-between">
            <span>Pending Review</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </p>
          <h3 className="text-2xl font-bold text-amber-600">{stats?.pending ?? 0}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm bg-blue-50/20">
          <p className="text-xs font-semibold text-blue-700 mb-1">Accepted</p>
          <h3 className="text-2xl font-bold text-blue-600">{stats?.accepted ?? 0}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/20">
          <p className="text-xs font-semibold text-emerald-700 mb-1">Evaluated</p>
          <h3 className="text-2xl font-bold text-emerald-600">{stats?.completed ?? 0}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-rose-50/20">
          <p className="text-xs font-semibold text-rose-700 mb-1">Rejected</p>
          <h3 className="text-2xl font-bold text-rose-600">{stats?.rejected ?? 0}</h3>
        </div>
      </div>

      {/* Search and Filters Bar (Section 9) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search student, username, email or exam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="accepted">Accepted</option>
              <option value="in_progress">Evaluating</option>
              <option value="completed">Evaluated</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Sort:</span>
            <select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="-created_at">Newest Request</option>
              <option value="created_at">Oldest Request</option>
              <option value="-submission_date">Newest Submission</option>
              <option value="submission_date">Oldest Submission</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table (Section 8) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs">Loading evaluation requests...</p>
          </div>
        ) : isError ? (
          <div className="py-14 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Failed to load evaluation requests</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()} className="text-xs gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Try Again
            </Button>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-800">No evaluation requests found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {statusFilter !== "all"
                ? `No requests currently match the "${statusFilter}" filter.`
                : "When students take subjective exams and request manual checking, they will appear in this queue."}
            </p>
            {statusFilter !== "all" && (
              <Button size="sm" variant="ghost" onClick={() => setStatusFilter("all")} className="text-xs text-indigo-600">
                Clear status filter
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-slate-600 py-3">Student</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 py-3">Exam & Subject</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 py-3">Submission</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 py-3">Requested At</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 py-3">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Student */}
                    <TableCell className="py-3">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-xs text-slate-900">{req.student_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{req.student_email || `@${req.student_username}`}</div>
                      </div>
                    </TableCell>

                    {/* Exam */}
                    <TableCell className="py-3">
                      <div className="space-y-0.5 max-w-xs">
                        <div className="font-semibold text-xs text-slate-900 truncate" title={req.examination_title}>
                          {req.examination_title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 text-[10px] py-0 px-1.5">
                            Subjective
                          </Badge>
                          <span className="truncate">{req.subject_title || req.course_title || "Standard"}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Submission */}
                    <TableCell className="py-3">
                      <div className="space-y-0.5">
                        <div className="text-xs text-slate-700">
                          {req.submission_date ? new Date(req.submission_date).toLocaleDateString() : "Submitted"}
                        </div>
                        {req.has_answer_pdf ? (
                          <button
                            type="button"
                            onClick={() => handleViewAnswerSheet(req)}
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                          >
                            <Eye className="w-3 h-3" />
                            {req.file_name || "Answer Sheet (PDF)"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">No file</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Requested At */}
                    <TableCell className="py-3">
                      <div className="text-xs text-slate-700">
                        {new Date(req.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </TableCell>

                    {/* Current Evaluation State */}
                    <TableCell className="py-3">
                      <div className="space-y-1">
                        {getStatusBadge(req.status)}
                        {req.rejection_reason && (
                          <div className="text-[10px] text-rose-600 font-medium line-clamp-1 max-w-[180px]" title={req.rejection_reason}>
                            Reason: {req.rejection_reason}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Compact Actions (Section 8) */}
                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDetailReq(req)}
                          className="h-7 text-xs px-2 text-slate-700 hover:text-slate-900"
                        >
                          Review Request
                        </Button>

                        {req.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              disabled={actionInProgressId === req.id}
                              onClick={() => handleAccept(req)}
                              className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 font-semibold gap-1"
                            >
                              {actionInProgressId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionInProgressId === req.id}
                              onClick={() => handleOpenRejectDialog(req)}
                              className="h-7 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs px-2 font-semibold gap-1"
                            >
                              <X className="w-3 h-3" /> Reject
                            </Button>
                          </>
                        )}

                        {(req.status === "accepted" || req.status === "in_progress" || req.status === "completed") && (
                          <Link href={`/admin-dashboard/exams/${req.examination_id}/submissions/${req.attempt_id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs px-2 font-semibold gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Workspace
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detailed Request View Dialog (Section 10 & 11) */}
      <Dialog open={selectedDetailReq !== null} onOpenChange={(open) => !open && setSelectedDetailReq(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg font-bold text-[#0B2545]">
                Evaluation Request Details
              </DialogTitle>
              {selectedDetailReq && getStatusBadge(selectedDetailReq.status)}
            </div>
            <DialogDescription className="text-xs">
              Complete student attempt and manual checking request information.
            </DialogDescription>
          </DialogHeader>

          {selectedDetailReq && (
            <div className="space-y-4 py-2 text-xs">
              {/* Student Information */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Student Profile</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-500 block">Full Name:</span>
                    <span className="font-medium text-slate-900">{selectedDetailReq.student_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Username:</span>
                    <span className="font-medium text-slate-900">@{selectedDetailReq.student_username || selectedDetailReq.student_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Email:</span>
                    <span className="font-medium text-slate-900">{selectedDetailReq.student_email || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Examination Information */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Examination Info</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block">Title:</span>
                    <span className="font-medium text-slate-900">{selectedDetailReq.examination_title}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Exam Type:</span>
                    <span className="font-medium text-slate-900 capitalize">{selectedDetailReq.exam_type || "Subjective"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Subject / Course:</span>
                    <span className="font-medium text-slate-900">{selectedDetailReq.subject_title || selectedDetailReq.course_title || "General"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Duration:</span>
                    <span className="font-medium text-slate-900">{selectedDetailReq.duration_minutes ? `${selectedDetailReq.duration_minutes} mins` : "Standard"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Attempt ID:</span>
                    <span className="font-medium text-slate-900 font-mono">#{selectedDetailReq.attempt_id}</span>
                  </div>
                </div>
              </div>

              {/* Attempt & Submission Timestamps */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Attempt & Submission</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-500 block">Started At:</span>
                    <span className="font-medium text-slate-900">
                      {selectedDetailReq.attempt_started_at ? new Date(selectedDetailReq.attempt_started_at).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Submitted At:</span>
                    <span className="font-medium text-slate-900">
                      {selectedDetailReq.submission_date ? new Date(selectedDetailReq.submission_date).toLocaleString() : "Submitted"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Attempt Status:</span>
                    <span className="font-medium text-slate-900 capitalize">{selectedDetailReq.attempt_status || "Submitted"}</span>
                  </div>
                </div>
              </div>

              {/* Answer Sheet Section */}
              <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-indigo-900 text-xs uppercase tracking-wider">Submitted Answer Sheet</h4>
                  {selectedDetailReq.page_count ? (
                    <span className="text-[11px] text-indigo-700">{selectedDetailReq.page_count} Pages</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-slate-900">{selectedDetailReq.file_name || "Answer Sheet (PDF)"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewAnswerSheet(selectedDetailReq)}
                      className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      <Eye className="w-3 h-3" /> View In Viewer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadAnswerSheet(selectedDetailReq)}
                      className="h-7 text-xs gap-1 border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                      <Download className="w-3 h-3" /> Download
                    </Button>
                  </div>
                </div>
              </div>

              {/* Request Status & Decision History (Section 11) */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Evaluation Request History</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Requested On:</span>
                    <span className="font-medium text-slate-900">{new Date(selectedDetailReq.created_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Current Status:</span>
                    <span className="font-medium text-slate-900">{selectedDetailReq.status_display}</span>
                  </div>
                  {selectedDetailReq.reviewed_by_name && (
                    <div>
                      <span className="text-slate-500 block">Reviewed By:</span>
                      <span className="font-medium text-slate-900">{selectedDetailReq.reviewed_by_name}</span>
                    </div>
                  )}
                  {selectedDetailReq.reviewed_at && (
                    <div>
                      <span className="text-slate-500 block">Decision Timestamp:</span>
                      <span className="font-medium text-slate-900">{new Date(selectedDetailReq.reviewed_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {selectedDetailReq.rejection_reason && (
                  <div className="mt-2 p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                    <span className="font-semibold block uppercase text-[10px] tracking-wider text-rose-700">Official Rejection Reason:</span>
                    <p className="font-medium">{selectedDetailReq.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setSelectedDetailReq(null)} className="text-xs">
              Close
            </Button>

            {selectedDetailReq && (
              <div className="flex items-center gap-2">
                {selectedDetailReq.status === "pending" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const req = selectedDetailReq;
                        setSelectedDetailReq(null);
                        handleOpenRejectDialog(req);
                      }}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                    >
                      Reject Request
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(selectedDetailReq)}
                      disabled={actionInProgressId === selectedDetailReq.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                    >
                      {actionInProgressId === selectedDetailReq.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Accept Evaluation
                    </Button>
                  </>
                ) : (
                  <Link href={`/admin-dashboard/exams/${selectedDetailReq.examination_id}/submissions/${selectedDetailReq.attempt_id}`}>
                    <Button size="sm" className="bg-[#0B2545] hover:bg-[#163E6C] text-white text-xs font-semibold gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" /> Open Evaluation Workspace
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Request Dialog with Mandatory Reason (Section 13) */}
      <Dialog open={rejectingReq !== null} onOpenChange={(open) => !open && setRejectingReq(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" /> Reject Evaluation Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide an official reason for declining this manual evaluation request. The student will be notified and can view this reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Student:</span>
              <span className="font-semibold text-slate-800">{rejectingReq?.student_name}</span>
              <span className="text-slate-500 block mt-1">Examination:</span>
              <span className="font-semibold text-slate-800">{rejectingReq?.examination_title}</span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Uploaded answer sheet pages are blurry or illegible. Please re-scan and submit again."
                rows={3}
                className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
              <strong>Data Safety Guarantee:</strong> Rejecting this evaluation request will <strong>NOT</strong> delete the student&apos;s exam attempt, submitted answer sheet, or answers. Only the manual evaluation request status changes to rejected.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejectingReq(null)} disabled={isRejecting} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmReject}
              disabled={isRejecting || !rejectReason.trim()}
              className="text-xs font-semibold gap-1.5"
            >
              {isRejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embedded Answer Sheet PDF Viewer Dialog */}
      <Dialog open={previewPdfUrl !== null} onOpenChange={(open) => { if (!open) setPreviewPdfUrl(null); }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-4">
          <DialogHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-bold text-slate-900 truncate">
                {previewPdfTitle || "Original Answer Sheet"}
              </DialogTitle>
              {previewPdfUrl && (
                <a href={previewPdfUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="text-xs gap-1 h-7">
                    <ExternalLink className="w-3 h-3" /> Open in New Tab
                  </Button>
                </a>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 mt-2">
            {previewPdfUrl ? (
              <iframe src={previewPdfUrl} className="w-full h-full border-0" title="Answer Sheet Preview" />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading PDF...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
