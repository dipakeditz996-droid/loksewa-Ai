"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check, Inbox, RotateCcw, X, Eye, FileText, CheckCircle2,
  Clock, AlertCircle, Search, ExternalLink, ArrowRight, Loader2, Sparkles, Filter
} from "lucide-react";
import { toast } from "sonner";
import {
  adminExamApi,
  AdminExaminationRequest,
  SubjectiveCheckingRequest,
} from "@/lib/api/admin-exams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

export default function ExaminationRequestsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"checking" | "access">("checking");

  // Checking Requests State
  const [checkingStatusFilter, setCheckingStatusFilter] = useState<string>("pending");
  const [checkingSearch, setCheckingSearch] = useState<string>("");
  const [selectedRejectReq, setSelectedRejectReq] = useState<SubjectiveCheckingRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [updatingCheckingId, setUpdatingCheckingId] = useState<number | null>(null);

  // Access Requests State
  const [statusFilter, setStatusFilter] = useState<"all" | AdminExaminationRequest["status"]>("pending");
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Query checking requests
  const {
    data: checkingRequests = [],
    isLoading: isLoadingChecking,
    isError: isCheckingError,
    refetch: refetchChecking,
  } = useQuery({
    queryKey: ["admin-checking-requests", checkingStatusFilter, checkingSearch],
    queryFn: () =>
      adminExamApi.getSubjectiveCheckingRequests({
        status: checkingStatusFilter === "all" ? undefined : checkingStatusFilter,
        search: checkingSearch.trim() || undefined,
      }),
  });

  // Query access requests
  const accessStatus = statusFilter === "all" ? undefined : statusFilter;
  const {
    data: requests = [],
    isLoading: isLoadingAccess,
    isError: isAccessError,
    refetch: refetchAccess,
  } = useQuery({
    queryKey: ["admin-exam-requests", statusFilter],
    queryFn: () => adminExamApi.getExamRequests(accessStatus),
    enabled: activeTab === "access",
  });

  const refreshChecking = async () =>
    queryClient.invalidateQueries({ queryKey: ["admin-checking-requests"] });
  const refreshAccess = async () =>
    queryClient.invalidateQueries({ queryKey: ["admin-exam-requests"] });

  // Checking Actions
  const handleAcceptChecking = async (req: SubjectiveCheckingRequest) => {
    setUpdatingCheckingId(req.id);
    try {
      await adminExamApi.acceptSubjectiveCheckingRequest(req.id);
      toast.success(`Checking request for ${req.student_name} accepted!`);
      await refreshChecking();
    } catch (err: unknown) {
      toast.error(getErrorDetail(err, "Could not accept checking request."));
    } finally {
      setUpdatingCheckingId(null);
    }
  };

  const handleOpenRejectDialog = (req: SubjectiveCheckingRequest) => {
    setSelectedRejectReq(req);
    setRejectReason("");
  };

  const handleConfirmReject = async () => {
    if (!selectedRejectReq) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setIsRejecting(true);
    try {
      await adminExamApi.rejectSubjectiveCheckingRequest(selectedRejectReq.id, {
        rejection_reason: trimmed,
      });
      toast.success("Checking request rejected. The student has been notified with the reason.");
      setSelectedRejectReq(null);
      setRejectReason("");
      await refreshChecking();
    } catch (err: unknown) {
      toast.error(getErrorDetail(err, "Failed to reject checking request."));
    } finally {
      setIsRejecting(false);
    }
  };

  const handlePreviewAnswerSheet = async (req: SubjectiveCheckingRequest) => {
    try {
      const blob = await adminExamApi.getSubjectiveCheckingRequestAnswerSheetBlob(req.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: unknown) {
      toast.error("Could not load answer sheet PDF.");
    }
  };

  // Access Request Actions
  const approveAccess = async (requestId: number) => {
    setUpdatingId(requestId);
    try {
      await adminExamApi.approveExamRequest(requestId);
      toast.success("Exam request approved.");
      await refreshAccess();
    } catch (error: unknown) {
      toast.error(getErrorDetail(error, "Could not approve exam request."));
    } finally {
      setUpdatingId(null);
    }
  };

  const rejectAccess = async (requestId: number) => {
    const rejection_reason = (reasons[requestId] || "").trim();
    if (!rejection_reason) return;
    setUpdatingId(requestId);
    try {
      await adminExamApi.rejectExamRequest(requestId, rejection_reason);
      toast.success("Exam request rejected.");
      setReasons((prev) => ({ ...prev, [requestId]: "" }));
      await refreshAccess();
    } catch (error: unknown) {
      toast.error(getErrorDetail(error, "Could not reject exam request."));
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: SubjectiveCheckingRequest["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700 text-xs">Pending Review</Badge>;
      case "accepted":
        return <Badge className="bg-blue-600 text-white text-xs">Accepted</Badge>;
      case "in_progress":
        return <Badge className="bg-indigo-600 text-white text-xs animate-pulse">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-emerald-600 text-white text-xs">Completed &amp; Published</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Inbox className="h-4 w-4" /> Examinations Administration
          </div>
          <h1 className="text-2xl font-bold text-primary dark:text-foreground">Exam Requests Management</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Review subjective manual checking requests and student exam access permissions.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
          <TabsList className="bg-muted">
            <TabsTrigger value="checking" className="text-xs font-semibold">
              Subjective Checking Requests
            </TabsTrigger>
            <TabsTrigger value="access" className="text-xs font-semibold">
              Exam Access Requests
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {/* Tab 1: Subjective Manual Checking Requests */}
      {activeTab === "checking" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student or examination..."
                value={checkingSearch}
                onChange={(e) => setCheckingSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium">Status:</span>
              <select
                value={checkingStatusFilter}
                onChange={(e) => setCheckingStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Statuses</option>
              </select>
            </div>
          </div>

          {isLoadingChecking ? (
            <p className="py-10 text-center text-sm text-muted-foreground" aria-live="polite">
              Loading checking requests...
            </p>
          ) : isCheckingError ? (
            <div className="flex items-center justify-center gap-3 border-y border-destructive/30 py-8 text-sm" role="alert">
              <span>Could not load checking requests.</span>
              <Button variant="outline" size="sm" onClick={() => void refetchChecking()}>
                <RotateCcw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          ) : checkingRequests.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl py-14 text-center space-y-2">
              <Inbox className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">No {checkingStatusFilter === "all" ? "" : checkingStatusFilter} checking requests</p>
              <p className="text-xs text-muted-foreground">
                When students submit subjective answer sheets and request manual checking, they will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border border rounded-xl overflow-hidden bg-card shadow-sm">
              {checkingRequests.map((req) => (
                <article key={req.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                        {req.examination_title}
                      </h3>
                      {getStatusBadge(req.status)}
                      {req.course_title && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {req.course_title}
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span><strong>Student:</strong> {req.student_name} {req.student_email ? `(${req.student_email})` : ""}</span>
                      <span>•</span>
                      <span><strong>Submitted:</strong> {new Date(req.submission_date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span><strong>Requested:</strong> {new Date(req.created_at).toLocaleDateString()}</span>
                      {req.assigned_evaluator_name && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 dark:text-indigo-400"><strong>Evaluator:</strong> {req.assigned_evaluator_name}</span>
                        </>
                      )}
                    </div>

                    {req.rejection_reason && (
                      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 mt-2">
                        <strong>Rejection Reason:</strong> {req.rejection_reason}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {req.has_answer_pdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewAnswerSheet(req)}
                        className="text-xs gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" /> Answer Sheet
                      </Button>
                    )}

                    {req.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          disabled={updatingCheckingId !== null}
                          onClick={() => handleAcceptChecking(req)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                        >
                          {updatingCheckingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updatingCheckingId !== null}
                          onClick={() => handleOpenRejectDialog(req)}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </>
                    )}

                    {(req.status === "accepted" || req.status === "in_progress" || req.status === "completed") && (
                      <Link href={`/admin-dashboard/exams/${req.examination_id}/submissions/${req.attempt_id}`}>
                        <Button size="sm" variant="outline" className="text-xs font-semibold gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                          <ExternalLink className="w-3.5 h-3.5" /> Open Evaluation
                        </Button>
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Exam Access / Generation Requests */}
      {activeTab === "access" && (
        <section className="space-y-4">
          <div className="flex justify-end">
            <label className="flex items-center gap-2 text-xs font-medium">
              Status:
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </select>
            </label>
          </div>

          {isLoadingAccess ? (
            <p className="py-10 text-center text-sm text-muted-foreground" aria-live="polite">Loading requests...</p>
          ) : isAccessError ? (
            <div className="flex items-center justify-center gap-3 border-y border-destructive/30 py-8 text-sm" role="alert">
              <span>Could not load exam requests.</span>
              <Button variant="outline" size="sm" onClick={() => void refetchAccess()}><RotateCcw className="mr-2 h-4 w-4" />Retry</Button>
            </div>
          ) : requests.length === 0 ? (
            <p className="border-y border-border py-12 text-center text-sm text-muted-foreground">No {statusFilter === "all" ? "exam" : statusFilter} requests.</p>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {requests.map((request) => (
                <article key={request.id} className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-primary dark:text-foreground">{request.examination_title}</h2>
                      <Badge variant={request.status === "approved" ? "default" : request.status === "rejected" ? "destructive" : "outline"}>
                        {request.status}
                      </Badge>
                      {request.request_type === "subjective_live" && <Badge variant="secondary">Subjective Live</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{request.student_name} · Requested {new Date(request.created_at).toLocaleString()}</p>
                    {request.request_type === "subjective_live" && (
                      <p className="text-sm text-muted-foreground">
                        {[request.requested_exam_name, request.requested_course_title, request.requested_subject_name, request.requested_topic_name].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {request.rejection_reason && <p className="text-sm text-muted-foreground">Reason: {request.rejection_reason}</p>}
                  </div>
                  {request.status === "pending" && (
                    <div className="flex flex-wrap items-center gap-2">
                      {request.request_type === "subjective_live" && !request.examination ? (
                        <>
                          <Link href={`/admin-dashboard/exams/subjective-generator?request=${request.id}`}>
                            <Button size="sm"><Inbox className="mr-2 h-4 w-4" />Generate Automatically</Button>
                          </Link>
                          <Link href={`/admin-dashboard/exams/new?subjectiveRequest=${request.id}`}>
                            <Button variant="outline" size="sm">Prepare Manually</Button>
                          </Link>
                        </>
                      ) : request.request_type === "subjective_live" && request.examination_status !== "published" ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="max-w-56 text-sm text-muted-foreground">Draft linked. Review and publish it to approve this request.</p>
                          {request.examination && (
                            <Link href={`/admin-dashboard/exams/new?draft=${request.examination}`}>
                              <Button variant="outline" size="sm">Review Draft</Button>
                            </Link>
                          )}
                        </div>
                      ) : (
                        <Button size="sm" disabled={updatingId !== null} onClick={() => void approveAccess(request.id)}>
                          <Check className="mr-2 h-4 w-4" />Approve
                        </Button>
                      )}
                      <Input
                        aria-label={`Rejection reason for ${request.examination_title}`}
                        className="w-full md:w-64 text-xs"
                        placeholder="Reason required to reject"
                        value={reasons[request.id] || ""}
                        onChange={(event) => setReasons((previous) => ({ ...previous, [request.id]: event.target.value }))}
                      />
                      <Button variant="outline" size="sm" disabled={!reasons[request.id]?.trim() || updatingId !== null} onClick={() => void rejectAccess(request.id)}>
                        <X className="mr-2 h-4 w-4" />Reject
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Reject Checking Request Dialog (Mandatory Reason) */}
      <Dialog open={selectedRejectReq !== null} onOpenChange={(open) => !open && setSelectedRejectReq(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Checking Request</DialogTitle>
            <DialogDescription>
              Provide an official reason for declining this manual checking request. The student will be notified and can view this reason.
              The student&apos;s exam attempt and submitted answer sheet will <strong>NOT</strong> be deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              <strong>Student:</strong> {selectedRejectReq?.student_name} • <strong>Exam:</strong> {selectedRejectReq?.examination_title}
            </p>
            <label className="text-xs font-semibold text-foreground block">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Evaluator capacity is currently full for this subject. You can try again later."
              rows={3}
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRejectReq(null)} disabled={isRejecting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={isRejecting || !rejectReason.trim()}
              className="font-semibold text-xs gap-1.5"
            >
              {isRejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}