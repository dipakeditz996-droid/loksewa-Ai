"use client";

import React, { useState } from "react";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Info, 
  Coins, 
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Clock
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WalletTransaction, PaginatedResult } from "@/lib/api/wallet";

interface TransactionHistoryTableProps {
  transactionsData: PaginatedResult<WalletTransaction> | null;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  refTypeFilter: string;
  onRefTypeFilterChange: (refType: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onResetFilters: () => void;
}

export function TransactionHistoryTable({
  transactionsData,
  isLoading,
  currentPage,
  onPageChange,
  typeFilter,
  onTypeFilterChange,
  refTypeFilter,
  onRefTypeFilterChange,
  searchQuery,
  onSearchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onResetFilters,
}: TransactionHistoryTableProps) {
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);

  const transactions = transactionsData?.results || [];
  const totalCount = transactionsData?.count || 0;
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "CREDIT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ArrowDownRight className="w-3 h-3" />
            Credit
          </span>
        );
      case "DEBIT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <ArrowUpRight className="w-3 h-3" />
            Debit
          </span>
        );
      case "ADMIN_ADJUSTMENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ShieldCheck className="w-3 h-3" />
            Admin Adjustment
          </span>
        );
      case "REFUND":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <RotateCcw className="w-3 h-3" />
            Refund
          </span>
        );
      case "REVERSAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <RotateCcw className="w-3 h-3" />
            Reversal
          </span>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getReferenceBadge = (refType: string) => {
    switch (refType) {
      case "TOPUP":
        return <Badge variant="secondary" className="text-[10px] font-semibold">Coin Top-Up</Badge>;
      case "XP_CONVERSION":
        return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-semibold border-purple-500/20">XP Exchange</Badge>;
      case "REWARD":
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border-amber-500/20">Activity Reward</Badge>;
      case "CONTENT_PURCHASE":
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border-blue-500/20">Content Purchase</Badge>;
      case "ADMIN_ADJUSTMENT":
        return <Badge variant="outline" className="text-[10px] font-semibold">Admin Adjustment</Badge>;
      case "LEGACY_MIGRATION":
        return <Badge variant="outline" className="text-[10px] font-semibold">Opening Balance</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-semibold">{refType}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search description, reference ID..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-10 rounded-xl text-xs sm:text-sm"
            />
          </div>

          {/* Type Filter */}
          <div>
            <Select value={typeFilter} onValueChange={onTypeFilterChange}>
              <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="CREDIT">Credits (+)</SelectItem>
                <SelectItem value="DEBIT">Debits (-)</SelectItem>
                <SelectItem value="ADMIN_ADJUSTMENT">Admin Adjustments</SelectItem>
                <SelectItem value="REFUND">Refunds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference Type Filter */}
          <div>
            <Select value={refTypeFilter} onValueChange={onRefTypeFilterChange}>
              <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="TOPUP">Top-Ups</SelectItem>
                <SelectItem value="XP_CONVERSION">XP Exchange</SelectItem>
                <SelectItem value="CONTENT_PURCHASE">Content Purchases</SelectItem>
                <SelectItem value="REWARD">Activity Rewards</SelectItem>
                <SelectItem value="ADMIN_ADJUSTMENT">Admin Adjustments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="h-10 rounded-xl text-xs"
              title="Start Date"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="h-10 rounded-xl text-xs"
              title="End Date"
            />
          </div>
        </div>

        {/* Active Filter Tags */}
        {(typeFilter !== "ALL" || refTypeFilter !== "ALL" || searchQuery || startDate || endDate) && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters active</span>
            </div>
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

      {/* Table Container */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Date & Time</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Type</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Category</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Description</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Amount</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Balance After</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse">
                  <TableCell colSpan={7} className="h-12 bg-muted/20" />
                </TableRow>
              ))
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                    <Coins className="w-8 h-8 opacity-40" />
                    <p className="font-semibold text-sm">No transaction records found</p>
                    <p className="text-xs">Any top-ups, content purchases, or reward activities will appear here.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => {
                const isCredit = tx.transaction_type === "CREDIT" || (tx.transaction_type === "ADMIN_ADJUSTMENT" && tx.balance_after > tx.balance_before);
                const formattedDate = new Date(tx.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <TableRow key={tx.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formattedDate}
                    </TableCell>

                    <TableCell>
                      {getTypeBadge(tx.transaction_type)}
                    </TableCell>

                    <TableCell>
                      {getReferenceBadge(tx.reference_type)}
                    </TableCell>

                    <TableCell className="max-w-xs truncate text-xs font-medium">
                      <span>{tx.description}</span>
                      {tx.reference_id && (
                        <span className="block text-[10px] text-muted-foreground font-mono">
                          Ref: #{tx.reference_id}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className={`text-right font-black text-sm whitespace-nowrap ${
                      isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {isCredit ? `+${tx.amount.toLocaleString()}` : `-${tx.amount.toLocaleString()}`}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-bold text-primary dark:text-foreground">
                      {tx.balance_after.toLocaleString()} Coins
                    </TableCell>

                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTx(tx)}
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-primary"
                        title="View Ledger Details"
                      >
                        <Info className="w-4 h-4" />
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
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} transactions
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="h-8 rounded-lg gap-1 text-xs"
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
                className="h-8 rounded-lg gap-1 text-xs"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Detail Dialog */}
      {selectedTx && (
        <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
          <DialogContent className="max-w-md p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#D4A72C]" />
                Transaction #{selectedTx.id} Details
              </DialogTitle>
              <DialogDescription className="text-xs">
                Authoritative immutable ledger entry.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Timestamp:</span>
                <span className="font-medium">{new Date(selectedTx.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Transaction Type:</span>
                <div>{getTypeBadge(selectedTx.transaction_type)}</div>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Reference Category:</span>
                <div>{getReferenceBadge(selectedTx.reference_type)}</div>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-extrabold text-sm">{selectedTx.amount} Coins</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Balance Before:</span>
                <span className="font-mono">{selectedTx.balance_before} Coins</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Balance After:</span>
                <span className="font-mono font-bold">{selectedTx.balance_after} Coins</span>
              </div>
              {selectedTx.reference_id && (
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Reference ID:</span>
                  <span className="font-mono">{selectedTx.reference_id}</span>
                </div>
              )}
              {selectedTx.idempotency_key && (
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Idempotency Key:</span>
                  <span className="font-mono truncate max-w-[200px]">{selectedTx.idempotency_key}</span>
                </div>
              )}
              <div className="py-1">
                <span className="text-muted-foreground block mb-1">Description:</span>
                <p className="p-2.5 rounded-lg bg-muted font-medium">{selectedTx.description}</p>
              </div>

              {selectedTx.metadata && Object.keys(selectedTx.metadata).length > 0 && (
                <div className="py-1">
                  <span className="text-muted-foreground block mb-1">Metadata:</span>
                  <pre className="p-2.5 rounded-lg bg-muted text-[10px] overflow-x-auto font-mono">
                    {JSON.stringify(selectedTx.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={() => setSelectedTx(null)} className="rounded-xl text-xs h-9">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
