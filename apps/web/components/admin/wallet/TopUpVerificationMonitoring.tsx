"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Filter, 
  ShieldCheck, 
  FileText, 
  Scan, 
  Building, 
  Smartphone, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Copy,
  Check
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CoinTopUp, PaginatedResult, walletApi } from "@/lib/api/wallet";
import toast from "react-hot-toast";

interface TopUpVerificationMonitoringProps {
  topupsData: PaginatedResult<CoinTopUp> | null;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  autoVerifiedFilter: string;
  onAutoVerifiedFilterChange: (val: string) => void;
  methodFilter: string;
  onMethodFilterChange: (val: string) => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
}

export function TopUpVerificationMonitoring({
  topupsData,
  isLoading,
  currentPage,
  onPageChange,
  statusFilter,
  onStatusFilterChange,
  autoVerifiedFilter,
  onAutoVerifiedFilterChange,
  methodFilter,
  onMethodFilterChange,
  searchQuery,
  onSearchChange,
  onResetFilters,
  onRefresh,
}: TopUpVerificationMonitoringProps) {
  const [inspectTopUp, setInspectTopUp] = useState<CoinTopUp | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "REQUEST_CLEARER_RECEIPT" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const topups = topupsData?.results || [];
  const totalCount = topupsData?.count || 0;
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleExecuteAction = async () => {
    if (!inspectTopUp || !actionType) return;

    if (inspectTopUp.status === "VERIFIED") {
      toast.error("This top-up is already verified and credited. Duplicate credits are prevented.");
      return;
    }

    if ((actionType === "REJECT" || actionType === "REQUEST_CLEARER_RECEIPT") && !actionReason.trim()) {
      toast.error("A mandatory reason is required for rejection or requesting clearer receipt.");
      return;
    }

    try {
      setIsSubmittingAction(true);
      const res = await walletApi.actionAdminTopUp(inspectTopUp.id, {
        action: actionType,
        reason: actionReason.trim(),
        notes: actionNotes.trim(),
      });

      toast.success(res.detail || "Top-up action recorded successfully.");
      setActionType(null);
      setActionReason("");
      setActionNotes("");
      setInspectTopUp(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute top-up action.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const getConfidenceBadge = (confidence?: number | null) => {
    if (confidence === undefined || confidence === null) {
      return <span className="text-[10px] text-muted-foreground font-mono">N/A</span>;
    }
    const pct = Math.round(confidence * 100);
    const color =
      pct >= 85
        ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
        : pct >= 60
        ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
        : "text-red-600 bg-red-500/10 border-red-500/20";

    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${color}`}>
        {pct}%
      </span>
    );
  };

  const getDecisionBadge = (topup: CoinTopUp) => {
    if (topup.status === "VERIFIED") {
      if (topup.verified_by_username) {
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            Manual Approved
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
          <Scan className="w-3 h-3 text-emerald-600" />
          Auto-Verified (OCR)
        </span>
      );
    }

    if (topup.status === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 dark:text-red-300 bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 rounded-full">
          <XCircle className="w-3 h-3 text-red-600" />
          Rejected
        </span>
      );
    }

    if (topup.verification_status === "VERIFICATION_IN_PROGRESS") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
          <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
          OCR Processing
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
        <Clock className="w-3 h-3 text-amber-600" />
        Needs Review
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search reference, student name, username..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-10 rounded-xl text-xs sm:text-sm"
            />
          </div>

          {/* Decision / Status Filter */}
          <div>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                <SelectValue placeholder="Verification Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SUBMITTED">Awaiting Admin Review</SelectItem>
                <SelectItem value="VERIFIED">Verified & Credited</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="PENDING">Pending Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto-Verified Filter */}
          <div>
            <Select value={autoVerifiedFilter} onValueChange={onAutoVerifiedFilterChange}>
              <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                <SelectValue placeholder="Verification Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Verification Types</SelectItem>
                <SelectItem value="true">Automatically Verified (OCR)</SelectItem>
                <SelectItem value="false">Manually Reviewed by Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Method Filter */}
          <div>
            <Select value={methodFilter} onValueChange={onMethodFilterChange}>
              <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Methods</SelectItem>
                <SelectItem value="ESEWA">eSewa</SelectItem>
                <SelectItem value="KHALTI">Khalti</SelectItem>
                <SelectItem value="BANK">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active filter reset */}
        {(statusFilter !== "ALL" || autoVerifiedFilter !== "ALL" || methodFilter !== "ALL" || searchQuery) && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Filtered Verification Records
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-7 text-xs text-[#D4A72C] hover:bg-[#D4A72C]/10 rounded-lg"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* Monitoring Table */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Top-Up ID</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Student Details</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Expected NPR</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Extracted NPR</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Payment Reference</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Extracted Ref</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Provider / Conf.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Verification Decision</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse">
                  <TableCell colSpan={9} className="h-12 bg-muted/20" />
                </TableRow>
              ))
            ) : topups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                    <Scan className="w-8 h-8 opacity-40" />
                    <p className="font-semibold text-sm">No top-up verification records found</p>
                    <p className="text-xs">Incoming student top-up vouchers will be tracked here in real-time.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              topups.map((topup) => {
                const amountMatches = topup.verification_result?.amount_matches;
                const refMatches = topup.verification_result?.transaction_id_matches;

                return (
                  <TableRow
                    key={topup.id}
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => setInspectTopUp(topup)}
                  >
                    <TableCell className="font-mono font-bold text-xs">
                      #{topup.id}
                    </TableCell>

                    <TableCell className="text-xs">
                      <span className="font-bold text-primary dark:text-foreground block truncate max-w-[160px]">
                        {topup.student_details?.full_name || topup.user_username}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono block">
                        @{topup.user_username}
                      </span>
                    </TableCell>

                    <TableCell className="text-right font-black text-xs text-primary dark:text-foreground whitespace-nowrap">
                      NPR {Number(topup.amount_npr).toLocaleString()}
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap">
                      {topup.extracted_amount ? (
                        <span className={`text-xs font-mono font-bold ${
                          amountMatches ? "text-emerald-600" : "text-amber-600"
                        }`}>
                          NPR {topup.extracted_amount}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-mono">--</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs font-mono font-bold max-w-[130px] truncate">
                      {topup.payment_reference || "--"}
                    </TableCell>

                    <TableCell className="text-xs font-mono max-w-[130px] truncate">
                      {topup.extracted_transaction_id ? (
                        <span className={refMatches ? "text-emerald-600 font-bold" : "text-amber-600 font-medium"}>
                          {topup.extracted_transaction_id}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold block">
                          {topup.detected_provider || topup.payment_method_display || "--"}
                        </span>
                        {getConfidenceBadge(topup.ocr_confidence)}
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      {getDecisionBadge(topup)}
                    </TableCell>

                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInspectTopUp(topup)}
                        className="h-8 rounded-lg text-xs gap-1 font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
            <span className="text-xs text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} records
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="h-8 rounded-lg text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </Button>
              <span className="text-xs font-semibold px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                className="h-8 rounded-lg text-xs"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Deep Inspection & Action Modal */}
      {inspectTopUp && (
        <Dialog open={!!inspectTopUp} onOpenChange={(open) => !open && setInspectTopUp(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[24px] border border-border">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0B2545] to-[#133A6B] p-6 text-white">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#FFD700] flex items-center gap-1.5">
                    <Scan className="w-4 h-4" />
                    OCR Evidence & Verification Audit
                  </span>
                  <Badge className="bg-white/20 text-white font-mono">
                    Top-Up #{inspectTopUp.id}
                  </Badge>
                </div>
                <DialogTitle className="text-xl font-extrabold text-white">
                  Verification Audit for {inspectTopUp.student_details?.full_name || inspectTopUp.user_username}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  Authoritative decision log and side-by-side OCR evidence comparison.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Inspection Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
              {/* Important Distinguishability Notice Banner */}
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300 text-xs flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">System Distinction Note: </span>
                  Automated OCR matching performs visual analysis of the student&apos;s submitted payment voucher. Authoritative merchant bank statements remain separate. Inspect detected values carefully before approving.
                </div>
              </div>

              {/* Side-by-side Evidence & Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Original Receipt Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Submitted Payment Voucher
                    </Label>
                    {inspectTopUp.receipt_image && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(inspectTopUp.receipt_image!, "_blank")}
                        className="h-6 text-[10px] gap-1 text-[#D4A72C]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Full Window
                      </Button>
                    )}
                  </div>

                  {inspectTopUp.receipt_image ? (
                    <div 
                      onClick={() => setIsLightboxOpen(true)}
                      className="border border-border rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 p-2 flex items-center justify-center max-h-72 cursor-pointer group relative"
                    >
                      <img
                        src={inspectTopUp.receipt_image}
                        alt="Receipt Voucher"
                        className="max-h-64 object-contain rounded-lg group-hover:scale-[1.02] transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 rounded-2xl">
                        <Eye className="w-4 h-4" />
                        Click to Zoom
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-border rounded-2xl h-48 flex items-center justify-center text-xs text-muted-foreground">
                      No receipt voucher uploaded
                    </div>
                  )}
                </div>

                {/* Right: Side-by-Side Comparison Matrix */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Verification Comparison Matrix
                  </Label>

                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3 text-xs">
                    {/* Amount Check */}
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Amount Comparison</span>
                        <div className="font-semibold text-primary">
                          Expected: NPR {inspectTopUp.amount_npr}
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          OCR Extracted: {inspectTopUp.extracted_amount ? `NPR ${inspectTopUp.extracted_amount}` : "None"}
                        </div>
                      </div>
                      <div>
                        {inspectTopUp.verification_result?.amount_matches ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Amount Match
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 text-[10px]">
                            Discrepancy / Unmatched
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Reference Check */}
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Transaction ID Reference</span>
                        <div className="font-mono font-bold text-primary">
                          Submitted: {inspectTopUp.payment_reference || "None"}
                        </div>
                        <div className="text-muted-foreground font-mono text-[11px]">
                          OCR Extracted: {inspectTopUp.extracted_transaction_id || "None"}
                        </div>
                      </div>
                      <div>
                        {inspectTopUp.verification_result?.transaction_id_matches ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ref Match
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 text-[10px]">
                            Manual Check
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Receiver / Merchant Check */}
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Receiver / Merchant Match</span>
                        <div className="font-semibold text-primary">
                          Method: {inspectTopUp.payment_method_display || inspectTopUp.payment_method_name}
                        </div>
                        {inspectTopUp.provider_verification_result?.detected_recipient && (
                          <div className="text-[11px] text-muted-foreground">
                            Recipient: {inspectTopUp.provider_verification_result.detected_recipient}
                          </div>
                        )}
                      </div>
                      <div>
                        {inspectTopUp.verification_result?.receiver_matches ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Merchant Match
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Unverified Merchant
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Duplicate Detection Check */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Duplicate Protection</span>
                        <span className="text-xs font-semibold">
                          Cross-Workflow Hash & Reference Verification
                        </span>
                      </div>
                      <div>
                        {inspectTopUp.is_duplicate_transaction || inspectTopUp.is_duplicate_image ? (
                          <Badge variant="destructive" className="font-bold text-[10px]">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Duplicate Detected!
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Unique Submission
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Failure Reasons if present */}
                  {inspectTopUp.failure_reasons && inspectTopUp.failure_reasons.length > 0 && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-400 space-y-1">
                      <span className="font-bold block">OCR Failure Diagnostics:</span>
                      <ul className="list-disc list-inside space-y-0.5">
                        {inspectTopUp.failure_reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Decision Controls (Guarded) */}
              <div className="rounded-2xl border border-border bg-muted/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-primary dark:text-foreground">
                    Administrative Action Decision
                  </h4>
                  {inspectTopUp.status === "VERIFIED" && (
                    <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-1">
                      Already Verified & Credited ({inspectTopUp.total_coins} Coins)
                    </Badge>
                  )}
                </div>

                {inspectTopUp.status === "VERIFIED" ? (
                  <p className="text-xs text-muted-foreground">
                    This transaction has already been verified and coins credited. To prevent duplicate disbursements, further approval actions are disabled.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Action Selector Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant={actionType === "APPROVE" ? "default" : "outline"}
                        onClick={() => setActionType("APPROVE")}
                        className={`rounded-xl text-xs font-bold h-10 ${
                          actionType === "APPROVE" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Approve & Credit Coins
                      </Button>

                      <Button
                        type="button"
                        variant={actionType === "REQUEST_CLEARER_RECEIPT" ? "default" : "outline"}
                        onClick={() => setActionType("REQUEST_CLEARER_RECEIPT")}
                        className={`rounded-xl text-xs font-bold h-10 ${
                          actionType === "REQUEST_CLEARER_RECEIPT" ? "bg-amber-600 text-white hover:bg-amber-700" : ""
                        }`}
                      >
                        <HelpCircle className="w-4 h-4 mr-1.5" />
                        Request Clearer Receipt
                      </Button>

                      <Button
                        type="button"
                        variant={actionType === "REJECT" ? "default" : "outline"}
                        onClick={() => setActionType("REJECT")}
                        className={`rounded-xl text-xs font-bold h-10 ${
                          actionType === "REJECT" ? "bg-red-600 text-white hover:bg-red-700" : ""
                        }`}
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Reject Request
                      </Button>
                    </div>

                    {/* Inputs when action is selected */}
                    {actionType && (
                      <div className="space-y-3 pt-2">
                        {(actionType === "REJECT" || actionType === "REQUEST_CLEARER_RECEIPT") && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">
                              Mandatory Reason for Student <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              value={actionReason}
                              onChange={(e) => setActionReason(e.target.value)}
                              placeholder={
                                actionType === "REJECT"
                                  ? "e.g. Transaction reference does not exist on bank statement / Altered receipt"
                                  : "e.g. Amount blurred. Please upload full unaltered voucher screenshot."
                              }
                              className="h-10 text-xs rounded-xl"
                              required
                            />
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-muted-foreground uppercase">
                            Internal Admin Notes (Optional)
                          </Label>
                          <Input
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                            placeholder="e.g. Verified against bank statement at 10:30 AM"
                            className="h-10 text-xs rounded-xl"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActionType(null)}
                            className="rounded-xl text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleExecuteAction}
                            disabled={isSubmittingAction}
                            className={`rounded-xl text-xs font-bold ${
                              actionType === "APPROVE"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : actionType === "REQUEST_CLEARER_RECEIPT"
                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                            }`}
                          >
                            {isSubmittingAction ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                Processing...
                              </>
                            ) : (
                              `Confirm ${actionType.replace(/_/g, " ")}`
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setInspectTopUp(null)} className="rounded-xl text-xs h-9">
                  Close Inspection
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Lightbox for Zoomed Image */}
      {isLightboxOpen && inspectTopUp?.receipt_image && (
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
          <DialogContent className="max-w-4xl p-3 rounded-2xl bg-black/90 text-white">
            <div className="flex items-center justify-between p-2">
              <span className="text-xs font-bold">Voucher Zoom</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLightboxOpen(false)}
                className="text-white hover:bg-white/10 text-xs h-7"
              >
                Close
              </Button>
            </div>
            <div className="max-h-[80vh] overflow-auto flex items-center justify-center p-2">
              <img
                src={inspectTopUp.receipt_image}
                alt="Enlarged Voucher"
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-2xl"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
