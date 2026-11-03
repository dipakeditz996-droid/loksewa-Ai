"use client";

import React from "react";
import { 
  Users, 
  Search, 
  Filter, 
  Coins, 
  ArrowDownRight, 
  ArrowUpRight, 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  PlusCircle, 
  Lock, 
  Unlock, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw
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
import { StudentWallet, PaginatedResult } from "@/lib/api/wallet";

interface StudentWalletDirectoryProps {
  walletsData: PaginatedResult<StudentWallet> | null;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  isLockedFilter: string;
  onIsLockedFilterChange: (val: string) => void;
  minBalance: string;
  onMinBalanceChange: (val: string) => void;
  maxBalance: string;
  onMaxBalanceChange: (val: string) => void;
  onResetFilters: () => void;
  onInspectWallet: (wallet: StudentWallet) => void;
  onAdjustWallet: (wallet: StudentWallet) => void;
  onLockWallet: (wallet: StudentWallet) => void;
}

export function StudentWalletDirectory({
  walletsData,
  isLoading,
  currentPage,
  onPageChange,
  searchQuery,
  onSearchChange,
  isLockedFilter,
  onIsLockedFilterChange,
  minBalance,
  onMinBalanceChange,
  maxBalance,
  onMaxBalanceChange,
  onResetFilters,
  onInspectWallet,
  onAdjustWallet,
  onLockWallet,
}: StudentWalletDirectoryProps) {
  const wallets = walletsData?.results || [];
  const totalCount = walletsData?.count || 0;
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by student name, username, or email..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-10 rounded-xl text-xs sm:text-sm"
            />
          </div>

          {/* Locked Status Filter */}
          <div>
            <Select value={isLockedFilter} onValueChange={onIsLockedFilterChange}>
              <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                <SelectValue placeholder="Wallet Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="false">Active Only</SelectItem>
                <SelectItem value="true">Locked Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Min Balance Filter */}
          <div>
            <Input
              type="number"
              placeholder="Min Balance"
              value={minBalance}
              onChange={(e) => onMinBalanceChange(e.target.value)}
              className="h-10 rounded-xl text-xs"
            />
          </div>

          {/* Max Balance Filter */}
          <div>
            <Input
              type="number"
              placeholder="Max Balance"
              value={maxBalance}
              onChange={(e) => onMaxBalanceChange(e.target.value)}
              className="h-10 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Filter tags & Reset */}
        {(searchQuery || isLockedFilter !== "ALL" || minBalance || maxBalance) && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Active Filters
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

      {/* Wallets Table */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Student Name</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Username & Email</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Balance</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Total Credited</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Total Debited</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Status</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Last Activity</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse">
                  <TableCell colSpan={8} className="h-12 bg-muted/20" />
                </TableRow>
              ))
            ) : wallets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                    <Users className="w-8 h-8 opacity-40" />
                    <p className="font-semibold text-sm">No student wallets found</p>
                    <p className="text-xs">Adjust your search parameters or filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              wallets.map((w) => {
                const lastTxFormatted = w.last_transaction_at
                  ? new Date(w.last_transaction_at).toLocaleDateString()
                  : "No transactions";

                return (
                  <TableRow
                    key={w.id}
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => onInspectWallet(w)}
                  >
                    <TableCell className="font-bold text-xs sm:text-sm text-primary dark:text-foreground">
                      {w.full_name || w.username}
                    </TableCell>

                    <TableCell className="text-xs">
                      <span className="font-mono font-medium block">@{w.username}</span>
                      <span className="text-muted-foreground text-[11px] truncate block max-w-[180px]">
                        {w.email}
                      </span>
                    </TableCell>

                    <TableCell className="text-right font-black text-sm text-[#D4A72C]">
                      {w.balance.toLocaleString()}
                    </TableCell>

                    <TableCell className="text-right font-medium text-xs text-emerald-600 dark:text-emerald-400">
                      +{w.total_credited.toLocaleString()}
                    </TableCell>

                    <TableCell className="text-right font-medium text-xs text-red-600 dark:text-red-400">
                      -{w.total_debited.toLocaleString()}
                    </TableCell>

                    <TableCell className="text-center">
                      {w.is_locked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-red-600 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">
                          <ShieldAlert className="w-3 h-3" />
                          Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                          <ShieldCheck className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {lastTxFormatted}
                    </TableCell>

                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onInspectWallet(w)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary rounded-lg"
                          title="Inspect Wallet"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAdjustWallet(w)}
                          className="h-8 w-8 p-0 text-[#D4A72C] hover:text-[#C29624] hover:bg-[#D4A72C]/10 rounded-lg"
                          title="Manually Adjust Coins"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onLockWallet(w)}
                          className={`h-8 w-8 p-0 rounded-lg ${
                            w.is_locked
                              ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                              : "text-red-600 hover:text-red-700 hover:bg-red-500/10"
                          }`}
                          title={w.is_locked ? "Unlock Wallet" : "Lock Wallet"}
                        >
                          {w.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </Button>
                      </div>
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
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} student wallets
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
    </div>
  );
}
