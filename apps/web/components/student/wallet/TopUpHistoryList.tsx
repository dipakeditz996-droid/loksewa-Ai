"use client";

import React, { useState } from "react";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Coins, 
  RotateCcw, 
  Eye, 
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CoinTopUp, PaginatedResult } from "@/lib/api/wallet";

interface TopUpHistoryListProps {
  topupsData: PaginatedResult<CoinTopUp> | null;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  onResubmit: (topup: CoinTopUp) => void;
}

export function TopUpHistoryList({
  topupsData,
  isLoading,
  currentPage,
  onPageChange,
  onResubmit,
}: TopUpHistoryListProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const topups = topupsData?.results || [];
  const totalCount = topupsData?.count || 0;
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const getStatusBadge = (status: string, vStatus: string) => {
    if (status === "VERIFIED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Verified & Credited
        </span>
      );
    }
    if (status === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    }
    if (vStatus === "VERIFICATION_IN_PROGRESS") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Verifying
        </span>
      );
    }
    if (status === "SUBMITTED" || vStatus === "VERIFIED_UNCERTAIN") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Clock className="w-3 h-3" />
          Awaiting Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
        <Clock className="w-3 h-3" />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <h4 className="font-bold text-sm text-primary dark:text-foreground">
            Top-up Requests & Vouchers
          </h4>
          <span className="text-xs text-muted-foreground">
            Total {totalCount} requests
          </span>
        </div>

        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-xs animate-pulse">
              Loading top-up records...
            </div>
          ) : topups.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <Coins className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm font-semibold">No top-up requests yet</p>
              <p className="text-xs">Purchase coins via eSewa, Khalti, or bank transfer anytime.</p>
            </div>
          ) : (
            topups.map((topup) => {
              const formattedDate = new Date(topup.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={topup.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs">#{topup.id}</span>
                      {getStatusBadge(topup.status, topup.verification_status)}
                      <span className="text-xs text-muted-foreground">{formattedDate}</span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-extrabold text-[#D4A72C]">
                        {topup.total_coins} Coins
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        (NPR {topup.amount_npr} via {topup.payment_method_display || topup.payment_method_name || "Direct"})
                      </span>
                    </div>

                    {topup.payment_reference && (
                      <div className="text-xs font-mono text-muted-foreground">
                        Ref Code: <span className="font-bold text-primary dark:text-foreground">{topup.payment_reference}</span>
                      </div>
                    )}

                    {topup.rejection_reason && (
                      <div className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-2 rounded-lg mt-1">
                        <span className="font-bold">Rejection Note: </span>
                        {topup.rejection_reason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {topup.receipt_image && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReceipt(topup.receipt_image!)}
                        className="h-8 rounded-lg gap-1.5 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Voucher
                      </Button>
                    )}

                    {topup.status === "REJECTED" && (
                      <Button
                        size="sm"
                        onClick={() => onResubmit(topup)}
                        className="h-8 rounded-lg gap-1.5 text-xs bg-[#D4A72C] text-[#0B2545] font-bold hover:bg-[#C29624]"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Resubmit
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
            <span className="text-xs text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
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

      {/* Lightbox for receipt */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
          <DialogContent className="max-w-2xl p-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                Uploaded Payment Voucher
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-auto rounded-lg bg-black/5 p-2 flex items-center justify-center">
              <img
                src={selectedReceipt}
                alt="Payment Voucher"
                className="max-h-[65vh] w-auto object-contain rounded-md shadow"
              />
            </div>
            <div className="flex justify-between items-center pt-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(selectedReceipt, "_blank")}
              >
                Open Original File
              </Button>
              <Button
                size="sm"
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
