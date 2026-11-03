"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Coins, 
  PlusCircle, 
  Sparkles, 
  History, 
  Receipt, 
  ArrowLeftRight,
  ShieldAlert
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  walletApi, 
  StudentWalletSummary, 
  XPConversionEligibility, 
  WalletTransaction, 
  CoinTopUp,
  PaginatedResult 
} from "@/lib/api/wallet";
import { WalletOverviewCard } from "@/components/student/wallet/WalletOverviewCard";
import { TopUpWorkflow } from "@/components/student/wallet/TopUpWorkflow";
import { TransactionHistoryTable } from "@/components/student/wallet/TransactionHistoryTable";
import { XPConversionCard } from "@/components/student/wallet/XPConversionCard";
import { TopUpHistoryList } from "@/components/student/wallet/TopUpHistoryList";
import { PurchasedContentList } from "@/components/student/wallet/PurchasedContentList";
import toast from "react-hot-toast";

export default function StudentWalletPage() {
  const [activeTab, setActiveTab] = useState<"transactions" | "topups" | "purchases">("transactions");
  const [summary, setSummary] = useState<StudentWalletSummary | null>(null);
  const [xpEligibility, setXpEligibility] = useState<XPConversionEligibility | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // Transactions State
  const [transactionsData, setTransactionsData] = useState<PaginatedResult<WalletTransaction>>({
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTypeFilter, setTxTypeFilter] = useState("ALL");
  const [txRefFilter, setTxRefFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Top-ups State
  const [topupsData, setTopupsData] = useState<PaginatedResult<CoinTopUp>>({
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
  const [isLoadingTopups, setIsLoadingTopups] = useState(false);
  const [topupPage, setTopupPage] = useState(1);

  // Modals
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isXPOpen, setIsXPOpen] = useState(false);
  const [resubmitTopUp, setResubmitTopUp] = useState<CoinTopUp | null>(null);

  // Load summary and XP eligibility
  const loadSummaryData = useCallback(async () => {
    try {
      setIsLoadingSummary(true);
      const [sumRes, xpRes] = await Promise.all([
        walletApi.getSummary(),
        walletApi.getXPEligibility(),
      ]);
      setSummary(sumRes);
      setXpEligibility(xpRes);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load wallet data.");
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // Load Transactions
  const loadTransactions = useCallback(async () => {
    try {
      setIsLoadingTransactions(true);
      const res = await walletApi.getTransactions({
        type: txTypeFilter,
        reference_type: txRefFilter,
        search: searchQuery,
        start_date: startDate,
        end_date: endDate,
        page: txPage,
      });
      setTransactionsData(res);
    } catch {
      // Ignored
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [txPage, txTypeFilter, txRefFilter, searchQuery, startDate, endDate]);

  // Load Top-ups
  const loadTopUps = useCallback(async () => {
    try {
      setIsLoadingTopups(true);
      const res = await walletApi.getStudentTopUps({ page: topupPage });
      setTopupsData(res);
    } catch {
      // Ignored
    } finally {
      setIsLoadingTopups(false);
    }
  }, [topupPage]);

  useEffect(() => {
    loadSummaryData();
  }, [loadSummaryData]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    if (activeTab === "topups") {
      loadTopUps();
    }
  }, [activeTab, loadTopUps]);

  const handleResetFilters = () => {
    setTxTypeFilter("ALL");
    setTxRefFilter("ALL");
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setTxPage(1);
  };

  const handleResubmit = (topup: CoinTopUp) => {
    setResubmitTopUp(topup);
    setIsTopUpOpen(true);
  };

  const handleWorkflowSuccess = () => {
    loadSummaryData();
    loadTransactions();
    loadTopUps();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-[#D4A72C]/10 text-[#D4A72C] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              Coin Wallet
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-[800] text-primary dark:text-foreground tracking-tight">
            My Coin Wallet
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium max-w-2xl">
            Deposit NPR to purchase platform coins, exchange your earned study XP, and track authoritative transactions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => {
              setResubmitTopUp(null);
              setIsTopUpOpen(true);
            }}
            disabled={summary?.wallet?.is_locked}
            className="bg-gradient-to-r from-[#D4A72C] to-[#E5B83E] hover:from-[#C29624] hover:to-[#D4A72C] text-[#0B2545] font-black shadow-md rounded-xl h-10 px-4 text-xs sm:text-sm gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Add Funds
          </Button>

          {xpEligibility?.enabled && (
            <Button
              onClick={() => setIsXPOpen(true)}
              disabled={summary?.wallet?.is_locked || !xpEligibility.is_eligible}
              variant="outline"
              className="rounded-xl h-10 text-xs sm:text-sm font-bold gap-2"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              XP Exchange
            </Button>
          )}
        </div>
      </div>

      {/* Wallet Overview & Stats Card */}
      <WalletOverviewCard
        summary={summary}
        xpEligibility={xpEligibility}
        isLoading={isLoadingSummary}
        onOpenTopUp={() => {
          setResubmitTopUp(null);
          setIsTopUpOpen(true);
        }}
        onOpenXPConvert={() => setIsXPOpen(true)}
        onRefresh={() => {
          loadSummaryData();
          loadTransactions();
          loadTopUps();
          toast.success("Wallet balance refreshed!");
        }}
      />

      {/* Tabs: Transactions History, Top-Up Requests & Purchased Items */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "transactions" | "topups" | "purchases")}
        className="w-full space-y-4 pt-2"
      >
        <TabsList className="bg-muted/70 p-1 border border-border/60 rounded-xl h-auto flex flex-col sm:flex-row w-full sm:w-auto">
          <TabsTrigger
            value="transactions"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-primary dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm w-full sm:w-auto"
          >
            <ArrowLeftRight className="w-4 h-4 text-[#D4A72C]" />
            Transaction Ledger
          </TabsTrigger>
          <TabsTrigger
            value="topups"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-primary dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm w-full sm:w-auto"
          >
            <Receipt className="w-4 h-4 text-[#D4A72C]" />
            Top-Up Requests & Vouchers
            {(summary?.pending_topups_count ?? 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full font-bold">
                {summary?.pending_topups_count}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="purchases"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-primary dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm w-full sm:w-auto"
          >
            <Coins className="w-4 h-4 text-[#D4A72C]" />
            Purchased Items
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4 focus-visible:outline-none">
          <TransactionHistoryTable
            transactionsData={transactionsData}
            isLoading={isLoadingTransactions}
            currentPage={txPage}
            onPageChange={(p) => setTxPage(p)}
            typeFilter={txTypeFilter}
            onTypeFilterChange={(t) => {
              setTxTypeFilter(t);
              setTxPage(1);
            }}
            refTypeFilter={txRefFilter}
            onRefTypeFilterChange={(r) => {
              setTxRefFilter(r);
              setTxPage(1);
            }}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setTxPage(1);
            }}
            startDate={startDate}
            onStartDateChange={(d) => {
              setStartDate(d);
              setTxPage(1);
            }}
            endDate={endDate}
            onEndDateChange={(d) => {
              setEndDate(d);
              setTxPage(1);
            }}
            onResetFilters={handleResetFilters}
          />
        </TabsContent>

        <TabsContent value="topups" className="mt-4 focus-visible:outline-none">
          <TopUpHistoryList
            topupsData={topupsData}
            isLoading={isLoadingTopups}
            currentPage={topupPage}
            onPageChange={(p) => setTopupPage(p)}
            onResubmit={handleResubmit}
          />
        </TabsContent>

        <TabsContent value="purchases" className="mt-4 focus-visible:outline-none">
          <PurchasedContentList />
        </TabsContent>
      </Tabs>

      {/* TopUp Workflow Modal */}
      <TopUpWorkflow
        isOpen={isTopUpOpen}
        onClose={() => {
          setIsTopUpOpen(false);
          setResubmitTopUp(null);
        }}
        onSuccess={handleWorkflowSuccess}
        existingTopUpToResubmit={resubmitTopUp}
      />

      {/* XP Conversion Modal */}
      <XPConversionCard
        isOpen={isXPOpen}
        onClose={() => setIsXPOpen(false)}
        eligibility={xpEligibility}
        onSuccess={handleWorkflowSuccess}
      />
    </div>
  );
}
