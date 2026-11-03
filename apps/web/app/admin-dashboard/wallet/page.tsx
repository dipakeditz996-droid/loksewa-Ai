"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Coins, 
  Users, 
  Scan, 
  ShieldCheck, 
  ArrowLeftRight, 
  RefreshCw,
  Tag
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  walletApi, 
  AdminWalletStats as StatsType,
  StudentWallet,
  CoinTopUp,
  PaginatedResult 
} from "@/lib/api/wallet";
import { AdminWalletStats } from "@/components/admin/wallet/AdminWalletStats";
import { StudentWalletDirectory } from "@/components/admin/wallet/StudentWalletDirectory";
import { TopUpVerificationMonitoring } from "@/components/admin/wallet/TopUpVerificationMonitoring";
import { ContentMonetizationTab } from "@/components/admin/wallet/ContentMonetizationTab";
import { IndividualWalletModal } from "@/components/admin/wallet/IndividualWalletModal";
import { AdminAdjustmentModal } from "@/components/admin/wallet/AdminAdjustmentModal";
import { AdminWalletLockModal } from "@/components/admin/wallet/AdminWalletLockModal";
import toast from "react-hot-toast";

export default function AdminWalletDashboardPage() {
  const [activeTab, setActiveTab] = useState<"directory" | "topups" | "monetization">("directory");

  // Aggregate Stats State
  const [stats, setStats] = useState<StatsType | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Student Wallets State
  const [walletsData, setWalletsData] = useState<PaginatedResult<StudentWallet>>({
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);
  const [walletPage, setWalletPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLockedFilter, setIsLockedFilter] = useState("ALL");
  const [minBalance, setMinBalance] = useState("");
  const [maxBalance, setMaxBalance] = useState("");

  // Top-Up Monitoring State
  const [topupsData, setTopupsData] = useState<PaginatedResult<CoinTopUp>>({
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
  const [isLoadingTopups, setIsLoadingTopups] = useState(false);
  const [topupPage, setTopupPage] = useState(1);
  const [topupStatusFilter, setTopupStatusFilter] = useState("ALL");
  const [autoVerifiedFilter, setAutoVerifiedFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [topupSearchQuery, setTopupSearchQuery] = useState("");

  // Modals
  const [inspectWalletId, setInspectWalletId] = useState<number | null>(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);

  const [adjustTargetWallet, setAdjustTargetWallet] = useState<StudentWallet | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const [lockTargetWallet, setLockTargetWallet] = useState<StudentWallet | null>(null);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);

  // Load Financial Aggregates
  const loadStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const res = await walletApi.getAdminStats();
      setStats(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load financial aggregates.");
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Load Student Wallets Directory
  const loadWallets = useCallback(async () => {
    try {
      setIsLoadingWallets(true);
      const res = await walletApi.getAdminWallets({
        search: searchQuery,
        is_locked: isLockedFilter === "ALL" ? undefined : isLockedFilter === "true",
        min_balance: minBalance ? Number(minBalance) : undefined,
        max_balance: maxBalance ? Number(maxBalance) : undefined,
        page: walletPage,
      });
      setWalletsData(res);
    } catch {
      // Ignored
    } finally {
      setIsLoadingWallets(false);
    }
  }, [searchQuery, isLockedFilter, minBalance, maxBalance, walletPage]);

  // Load Top-Ups for OCR Monitoring
  const loadTopUps = useCallback(async () => {
    try {
      setIsLoadingTopups(true);
      const res = await walletApi.getAdminTopUps({
        status: topupStatusFilter,
        auto_verified: autoVerifiedFilter === "ALL" ? undefined : autoVerifiedFilter === "true",
        method: methodFilter,
        search: topupSearchQuery,
        page: topupPage,
      });
      setTopupsData(res);
    } catch {
      // Ignored
    } finally {
      setIsLoadingTopups(false);
    }
  }, [topupStatusFilter, autoVerifiedFilter, methodFilter, topupSearchQuery, topupPage]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === "directory") {
      loadWallets();
    }
  }, [activeTab, loadWallets]);

  useEffect(() => {
    if (activeTab === "topups") {
      loadTopUps();
    }
  }, [activeTab, loadTopUps]);

  const handleResetWalletFilters = () => {
    setSearchQuery("");
    setIsLockedFilter("ALL");
    setMinBalance("");
    setMaxBalance("");
    setWalletPage(1);
  };

  const handleResetTopupFilters = () => {
    setTopupStatusFilter("ALL");
    setAutoVerifiedFilter("ALL");
    setMethodFilter("ALL");
    setTopupSearchQuery("");
    setTopupPage(1);
  };

  const handleRefreshAll = () => {
    loadStats();
    loadWallets();
    loadTopUps();
    toast.success("Wallet records refreshed!");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-[#D4A72C]/10 text-[#D4A72C] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              Financial & Wallet Administration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-[800] text-primary dark:text-foreground tracking-tight">
            Coin Wallet Management
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium max-w-2xl">
            Monitor real aggregate balances, audit automated OCR voucher verifications, inspect student ledgers, and execute authorized adjustments.
          </p>
        </div>

        <Button
          onClick={handleRefreshAll}
          variant="outline"
          className="rounded-xl h-10 text-xs font-bold gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-[#D4A72C]" />
          Refresh Platform Data
        </Button>
      </div>

      {/* Aggregate Stats Bar */}
      <AdminWalletStats
        stats={stats}
        isLoading={isLoadingStats}
        onRefresh={loadStats}
      />

      {/* Main Tabs: Student Directory vs Top-Up Monitoring vs Monetization */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "directory" | "topups" | "monetization")}
        className="w-full space-y-4 pt-2"
      >
        <TabsList className="bg-muted/70 p-1 border border-border/60 rounded-xl h-auto flex flex-col sm:flex-row w-full sm:w-auto">
          <TabsTrigger
            value="directory"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-primary dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm w-full sm:w-auto"
          >
            <Users className="w-4 h-4 text-[#D4A72C]" />
            Student Wallet Directory
          </TabsTrigger>
          <TabsTrigger
            value="topups"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-primary dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm w-full sm:w-auto"
          >
            <Scan className="w-4 h-4 text-[#D4A72C]" />
            OCR Verification Monitoring
            {(stats?.awaiting_review_topups ?? 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full font-bold">
                {stats?.awaiting_review_topups} Awaiting Review
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="monetization"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-primary dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm w-full sm:w-auto"
          >
            <Tag className="w-4 h-4 text-[#D4A72C]" />
            Content Monetization & Pricing
          </TabsTrigger>
        </TabsList>

        {/* Directory Tab */}
        <TabsContent value="directory" className="mt-4 focus-visible:outline-none">
          <StudentWalletDirectory
            walletsData={walletsData}
            isLoading={isLoadingWallets}
            currentPage={walletPage}
            onPageChange={(p) => setWalletPage(p)}
            searchQuery={searchQuery}
            onSearchChange={(s) => {
              setSearchQuery(s);
              setWalletPage(1);
            }}
            isLockedFilter={isLockedFilter}
            onIsLockedFilterChange={(l) => {
              setIsLockedFilter(l);
              setWalletPage(1);
            }}
            minBalance={minBalance}
            onMinBalanceChange={(min) => {
              setMinBalance(min);
              setWalletPage(1);
            }}
            maxBalance={maxBalance}
            onMaxBalanceChange={(max) => {
              setMaxBalance(max);
              setWalletPage(1);
            }}
            onResetFilters={handleResetWalletFilters}
            onInspectWallet={(w) => {
              setInspectWalletId(w.id);
              setIsInspectModalOpen(true);
            }}
            onAdjustWallet={(w) => {
              setAdjustTargetWallet(w);
              setIsAdjustModalOpen(true);
            }}
            onLockWallet={(w) => {
              setLockTargetWallet(w);
              setIsLockModalOpen(true);
            }}
          />
        </TabsContent>

        {/* OCR Top-Up Monitoring Tab */}
        <TabsContent value="topups" className="mt-4 focus-visible:outline-none">
          <TopUpVerificationMonitoring
            topupsData={topupsData}
            isLoading={isLoadingTopups}
            currentPage={topupPage}
            onPageChange={(p) => setTopupPage(p)}
            statusFilter={topupStatusFilter}
            onStatusFilterChange={(s) => {
              setTopupStatusFilter(s);
              setTopupPage(1);
            }}
            autoVerifiedFilter={autoVerifiedFilter}
            onAutoVerifiedFilterChange={(a) => {
              setAutoVerifiedFilter(a);
              setTopupPage(1);
            }}
            methodFilter={methodFilter}
            onMethodFilterChange={(m) => {
              setMethodFilter(m);
              setTopupPage(1);
            }}
            searchQuery={topupSearchQuery}
            onSearchChange={(q) => {
              setTopupSearchQuery(q);
              setTopupPage(1);
            }}
            onResetFilters={handleResetTopupFilters}
            onRefresh={() => {
              loadTopUps();
              loadStats();
            }}
          />
        </TabsContent>

        {/* Content Monetization & Pricing Tab */}
        <TabsContent value="monetization" className="mt-4 focus-visible:outline-none">
          <ContentMonetizationTab />
        </TabsContent>
      </Tabs>

      {/* Individual Wallet Inspection Modal */}
      <IndividualWalletModal
        walletId={inspectWalletId}
        isOpen={isInspectModalOpen}
        onClose={() => {
          setIsInspectModalOpen(false);
          setInspectWalletId(null);
        }}
        onOpenAdjust={(w) => {
          setAdjustTargetWallet(w);
          setIsAdjustModalOpen(true);
        }}
        onOpenLock={(w) => {
          setLockTargetWallet(w);
          setIsLockModalOpen(true);
        }}
        onRefreshParent={handleRefreshAll}
      />

      {/* Manual Coin Adjustment Modal */}
      <AdminAdjustmentModal
        wallet={adjustTargetWallet}
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setAdjustTargetWallet(null);
        }}
        onSuccess={handleRefreshAll}
      />

      {/* Wallet Lock / Unlock Modal */}
      <AdminWalletLockModal
        wallet={lockTargetWallet}
        isOpen={isLockModalOpen}
        onClose={() => {
          setIsLockModalOpen(false);
          setLockTargetWallet(null);
        }}
        onSuccess={handleRefreshAll}
      />
    </div>
  );
}
