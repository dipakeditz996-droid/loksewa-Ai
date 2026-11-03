"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Coins,
  TrendingUp,
  Tag,
  BookOpen,
  FileQuestion,
  GraduationCap,
  Search,
  Edit,
  Layers,
  CheckCircle,
  Clock,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  walletApi,
  ContentCoinPricingItem,
  MonetizationAnalytics,
  PaginatedResult,
} from "@/lib/api/wallet";
import toast from "react-hot-toast";

export function ContentMonetizationTab() {
  const [analytics, setAnalytics] = useState<MonetizationAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  // Pricing Table State
  const [pricingData, setPricingData] = useState<PaginatedResult<ContentCoinPricingItem>>({
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");

  // Edit Modal State
  const [selectedItem, setSelectedItem] = useState<ContentCoinPricingItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPrice, setEditPrice] = useState("");
  const [editMode, setEditMode] = useState<"FREE" | "PACKAGE_ONLY" | "COIN_PURCHASE" | "PACKAGE_OR_COINS">("PACKAGE_OR_COINS");
  const [editDurationPreset, setEditDurationPreset] = useState("0");
  const [editCustomDays, setEditCustomDays] = useState("30");
  const [editIsEnabled, setEditIsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Bulk Edit Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkContentType, setBulkContentType] = useState("STUDY_MATERIAL");
  const [bulkPrice, setBulkPrice] = useState("50");
  const [bulkMode, setBulkMode] = useState<"PACKAGE_OR_COINS" | "COIN_PURCHASE" | "PACKAGE_ONLY" | "FREE">("PACKAGE_OR_COINS");
  const [bulkDuration, setBulkDuration] = useState("0");
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoadingAnalytics(true);
      const data = await walletApi.getAdminMonetizationAnalytics();
      setAnalytics(data);
    } catch {
      toast.error("Failed to load monetization analytics.");
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  const loadPricing = useCallback(async () => {
    try {
      setIsLoadingPricing(true);
      const data = await walletApi.getAdminContentPricing({
        content_type: contentTypeFilter === "ALL" ? undefined : contentTypeFilter,
        monetization_mode: modeFilter === "ALL" ? undefined : modeFilter,
        search: search || undefined,
        page,
      });
      setPricingData(data);
    } catch {
      toast.error("Failed to load pricing table.");
    } finally {
      setIsLoadingPricing(false);
    }
  }, [contentTypeFilter, modeFilter, search, page]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  const handleOpenEdit = (item: ContentCoinPricingItem) => {
    setSelectedItem(item);
    setEditPrice(item.coin_price.toString());
    setEditMode(item.monetization_mode);
    setEditIsEnabled(item.is_enabled);

    if (item.access_duration_days === 0) {
      setEditDurationPreset("0");
    } else if (item.access_duration_days === 7) {
      setEditDurationPreset("7");
    } else if (item.access_duration_days === 30) {
      setEditDurationPreset("30");
    } else {
      setEditDurationPreset("custom");
      setEditCustomDays(item.access_duration_days.toString());
    }

    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    const priceNum = parseInt(editPrice, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid coin price (0 or higher).");
      return;
    }

    let durationDays = 0;
    if (editDurationPreset === "custom") {
      durationDays = parseInt(editCustomDays, 10) || 0;
    } else {
      durationDays = parseInt(editDurationPreset, 10);
    }

    try {
      setIsSaving(true);
      await walletApi.saveAdminContentPricing({
        content_type: selectedItem.content_type,
        content_id: selectedItem.content_id,
        coin_price: priceNum,
        monetization_mode: editMode,
        access_duration_days: durationDays,
        is_enabled: editIsEnabled,
      });
      toast.success("Content pricing updated successfully!");
      setIsEditModalOpen(false);
      loadPricing();
      loadAnalytics();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update pricing.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyBulk = async () => {
    const priceNum = parseInt(bulkPrice, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid coin price.");
      return;
    }

    try {
      setIsBulkSaving(true);
      const res = await walletApi.bulkUpdateAdminContentPricing({
        content_type: bulkContentType,
        coin_price: priceNum,
        monetization_mode: bulkMode,
        access_duration_days: parseInt(bulkDuration, 10),
        is_enabled: true,
      });

      toast.success(res.detail || "Bulk pricing applied!");
      setIsBulkModalOpen(false);
      loadPricing();
      loadAnalytics();
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply bulk pricing.");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case "FREE":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">Free</Badge>;
      case "PACKAGE_ONLY":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Package Only</Badge>;
      case "COIN_PURCHASE":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-bold">Coins Only</Badge>;
      case "PACKAGE_OR_COINS":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 font-bold">Package or Coins</Badge>;
      default:
        return <Badge variant="outline">{mode}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "STUDY_MATERIAL":
        return <BookOpen className="w-4 h-4 text-emerald-600" />;
      case "EXAMINATION":
        return <GraduationCap className="w-4 h-4 text-blue-600" />;
      case "QUESTION_SET":
        return <FileQuestion className="w-4 h-4 text-purple-600" />;
      default:
        return <Tag className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Total Coin Revenue</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-primary dark:text-foreground">
            {isLoadingAnalytics ? "..." : (analytics?.total_coins_earned ?? 0).toLocaleString()}
            <span className="text-xs font-bold text-muted-foreground ml-1.5">Coins</span>
          </div>
          <p className="text-[11px] text-muted-foreground">From content unlocks</p>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Total Content Purchases</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-primary dark:text-foreground">
            {isLoadingAnalytics ? "..." : (analytics?.total_purchases ?? 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground">All-time unlock events</p>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Active Entitlements</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-primary dark:text-foreground">
            {isLoadingAnalytics ? "..." : (analytics?.active_entitlements ?? 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground">Currently valid student unlocks</p>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Top Performing Category</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-primary dark:text-foreground line-clamp-1 pt-1">
            {isLoadingAnalytics
              ? "..."
              : analytics?.by_type?.[0]
              ? `${analytics.by_type[0].content_type.replace("_", " ")} (${analytics.by_type[0].total_coins.toLocaleString()} Coins)`
              : "No purchases yet"}
          </div>
          <p className="text-[11px] text-muted-foreground">Highest revenue stream</p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/60 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search content by title..."
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <Select
            value={contentTypeFilter}
            onValueChange={(val) => {
              setContentTypeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-[160px] text-xs rounded-xl">
              <SelectValue placeholder="Content Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="STUDY_MATERIAL">Study Notes</SelectItem>
              <SelectItem value="EXAMINATION">Exams</SelectItem>
              <SelectItem value="QUESTION_SET">Question Sets</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={modeFilter}
            onValueChange={(val) => {
              setModeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-[170px] text-xs rounded-xl">
              <SelectValue placeholder="Monetization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Modes</SelectItem>
              <SelectItem value="PACKAGE_OR_COINS">Package or Coins</SelectItem>
              <SelectItem value="COIN_PURCHASE">Coin Purchase Only</SelectItem>
              <SelectItem value="PACKAGE_ONLY">Package Only</SelectItem>
              <SelectItem value="FREE">Free</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsBulkModalOpen(true)}
            variant="outline"
            className="h-9 text-xs font-bold gap-1.5 rounded-xl border-[#D4A72C]/40 hover:bg-[#D4A72C]/10"
          >
            <Layers className="w-3.5 h-3.5 text-[#D4A72C]" />
            Bulk Pricing Update
          </Button>

          <Button
            onClick={() => {
              loadPricing();
              loadAnalytics();
            }}
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Content Pricing Table */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Content</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Monetization Mode</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 text-center">Purchases</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoadingPricing ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#D4A72C]" />
                    Loading content monetization list...
                  </td>
                </tr>
              ) : pricingData.results.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    No content items found matching the selected filters.
                  </td>
                </tr>
              ) : (
                pricingData.results.map((item) => (
                  <tr key={`${item.content_type}-${item.content_id}`} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-primary dark:text-foreground max-w-xs truncate">
                      {item.content_title || `Item #${item.content_id}`}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                        {getTypeIcon(item.content_type)}
                        <span>{item.content_type.replace("_", " ")}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getModeBadge(item.monetization_mode)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-amber-600">
                      {item.coin_price > 0 ? `${item.coin_price} 🪙` : "0 (Free)"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {item.access_duration_days === 0
                            ? "Permanent"
                            : `${item.access_duration_days} Days`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {item.total_purchases}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-600">
                      {item.total_coins_earned.toLocaleString()} 🪙
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.is_enabled ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Active" />
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-rose-500" title="Inactive" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        onClick={() => handleOpenEdit(item)}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs font-semibold gap-1.5 hover:text-primary hover:bg-muted/80 rounded-lg"
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-600" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pricingData.count > 20 && (
          <div className="flex items-center justify-between p-4 border-t border-border/60 text-xs text-muted-foreground">
            <div>
              Showing page {page} of {Math.ceil(pricingData.count / 20)} ({pricingData.count} items total)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 rounded-lg"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pricingData.next}
                className="h-8 rounded-lg"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Content Pricing Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Coins className="w-5 h-5 text-[#D4A72C]" />
              Edit Content Monetization
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure monetization mode, coin pricing, and unlock duration for this item.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 p-3 rounded-xl border border-border/60">
                <p className="text-xs font-bold text-primary dark:text-foreground truncate">
                  {selectedItem.content_title || `Item #${selectedItem.content_id}`}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span>Type: {selectedItem.content_type.replace("_", " ")}</span>
                  <span>•</span>
                  <span>ID: {selectedItem.content_id}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Monetization Mode</Label>
                <Select
                  value={editMode}
                  onValueChange={(val: any) => setEditMode(val)}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PACKAGE_OR_COINS">
                      Package or Coins (Subscribers free, non-subscribers pay coins)
                    </SelectItem>
                    <SelectItem value="COIN_PURCHASE">
                      Coin Purchase Only (Everyone must pay coins)
                    </SelectItem>
                    <SelectItem value="PACKAGE_ONLY">
                      Package Only (Requires active course subscription)
                    </SelectItem>
                    <SelectItem value="FREE">
                      Free (Accessible to all registered students)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Coin Price (🪙)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="e.g. 50"
                  className="h-9 text-xs rounded-xl font-bold"
                />
                <p className="text-[11px] text-muted-foreground">
                  Number of coins deducted when a student unlocks this item.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Access Duration</Label>
                <Select
                  value={editDurationPreset}
                  onValueChange={(val) => setEditDurationPreset(val)}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Permanent (Never expires)</SelectItem>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="custom">Custom Duration...</SelectItem>
                  </SelectContent>
                </Select>

                {editDurationPreset === "custom" && (
                  <div className="pt-2">
                    <Input
                      type="number"
                      min="1"
                      value={editCustomDays}
                      onChange={(e) => setEditCustomDays(e.target.value)}
                      placeholder="Enter days"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Enable for Coin Purchase</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Toggling off hides the coin unlock button for students.
                  </p>
                </div>
                <Switch
                  checked={editIsEnabled}
                  onCheckedChange={setEditIsEnabled}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSaving}
              className="text-xs h-9 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="bg-[#D4A72C] hover:bg-[#C29624] text-[#0B2545] font-bold text-xs h-9 rounded-xl"
            >
              {isSaving ? "Saving..." : "Save Pricing Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Pricing Modal */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Layers className="w-5 h-5 text-[#D4A72C]" />
              Bulk Pricing Update
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apply uniform monetization mode and coin price across an entire content category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Content Type</Label>
              <Select
                value={bulkContentType}
                onValueChange={(val) => setBulkContentType(val)}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Content (Notes, Exams & Question Sets)</SelectItem>
                  <SelectItem value="STUDY_MATERIAL">All Study Materials / Notes</SelectItem>
                  <SelectItem value="EXAMINATION">All Practice & Model Exams</SelectItem>
                  <SelectItem value="QUESTION_SET">All Question Sets</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Monetization Mode</Label>
              <Select
                value={bulkMode}
                onValueChange={(val: any) => setBulkMode(val)}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PACKAGE_OR_COINS">Package or Coins</SelectItem>
                  <SelectItem value="COIN_PURCHASE">Coin Purchase Only</SelectItem>
                  <SelectItem value="PACKAGE_ONLY">Package Only</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Coin Price (🪙)</Label>
              <Input
                type="number"
                min="0"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                placeholder="e.g. 50"
                className="h-9 text-xs rounded-xl font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Access Duration</Label>
              <Select
                value={bulkDuration}
                onValueChange={(val) => setBulkDuration(val)}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Permanent (Never expires)</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsBulkModalOpen(false)}
              disabled={isBulkSaving}
              className="text-xs h-9 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyBulk}
              disabled={isBulkSaving}
              className="bg-[#D4A72C] hover:bg-[#C29624] text-[#0B2545] font-bold text-xs h-9 rounded-xl"
            >
              {isBulkSaving ? "Applying..." : "Apply Bulk Pricing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
