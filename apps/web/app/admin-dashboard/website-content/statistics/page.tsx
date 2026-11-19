"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  ArrowUp,
  ArrowDown,
  Monitor,
  Smartphone,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Sliders,
  ChevronRight,
  Database,
  Layers,
  Star,
  Users,
  BookOpen,
  Award,
  Target,
  Brain,
  TrendingUp,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminApi,
  AdminHomepageStatistic,
  AutomaticMetricOption,
} from "@/lib/api/admin";
import { CountUp } from "@/components/ui/count-up";
import toast from "react-hot-toast";

interface StatisticFormData {
  placement: "hero" | "platform";
  label: string;
  description: string;
  source_type: "manual" | "automatic";
  automatic_metric: string;
  value: number;
  raw_value: string;
  prefix: string;
  suffix: string;
  precision: number;
  thousand_separator: boolean;
  animation_enabled: boolean;
  animation_duration: number;
  animation_start_value: number;
  icon: string;
  accent_style: "default" | "gold" | "blue" | "emerald" | "amber";
  display_order: number;
  is_active: boolean;
}

const DEFAULT_FORM: StatisticFormData = {
  placement: "platform",
  label: "",
  description: "",
  source_type: "manual",
  automatic_metric: "enrolled_students",
  value: 100,
  raw_value: "",
  prefix: "",
  suffix: "+",
  precision: 0,
  thousand_separator: true,
  animation_enabled: true,
  animation_duration: 1.5,
  animation_start_value: 0,
  icon: "users",
  accent_style: "default",
  display_order: 0,
  is_active: true,
};

const AVAILABLE_ICONS = [
  { key: "users", label: "Users / Aspirants", icon: Users },
  { key: "star", label: "Rating / Stars", icon: Star },
  { key: "book-open", label: "Questions / Book", icon: BookOpen },
  { key: "layers", label: "Sets / Layers", icon: Layers },
  { key: "check-circle", label: "Verified / Check", icon: CheckCircle2 },
  { key: "award", label: "Award / Trophy", icon: Award },
  { key: "target", label: "Target / Goal", icon: Target },
  { key: "brain", label: "AI / Brain", icon: Brain },
  { key: "trending-up", label: "Growth / Analytics", icon: TrendingUp },
];

const ACCENT_STYLES = [
  { key: "default", label: "Default (White/Slate)" },
  { key: "gold", label: "Gold Gradient" },
  { key: "blue", label: "Electric Blue" },
  { key: "emerald", label: "Emerald Green" },
  { key: "amber", label: "Amber Stars" },
];

export default function AdminHomepageStatisticsPage() {
  const [stats, setStats] = useState<AdminHomepageStatistic[]>([]);
  const [autoMetrics, setAutoMetrics] = useState<AutomaticMetricOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "hero" | "platform">("all");

  // Form Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminHomepageStatistic | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<StatisticFormData>(DEFAULT_FORM);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<AdminHomepageStatistic | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const loadData = async (search?: string) => {
    try {
      setLoading(true);
      const [statsData, metricsData] = await Promise.all([
        adminApi.getHomepageStatistics(search),
        adminApi.getAutomaticMetrics(),
      ]);
      setStats(statsData);
      setAutoMetrics(metricsData);
    } catch {
      toast.error("Failed to load statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(searchTerm);
  }, [searchTerm]);

  const filteredStats = useMemo(() => {
    return stats.filter((s) => {
      const matchesTab = activeTab === "all" || s.placement === activeTab;
      const matchesSearch =
        !searchTerm.trim() ||
        s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.formatted_value.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [stats, activeTab, searchTerm]);

  // Statistics Summary
  const heroCount = stats.filter((s) => s.placement === "hero").length;
  const platformCount = stats.filter((s) => s.placement === "platform").length;
  const activeCount = stats.filter((s) => s.is_active).length;
  const inactiveCount = stats.length - activeCount;

  // Handlers
  const handleOpenAdd = () => {
    const nextOrder = stats.filter((s) => s.placement === (activeTab === "hero" ? "hero" : "platform")).length;
    setEditing(null);
    setFormData({
      ...DEFAULT_FORM,
      placement: activeTab === "hero" ? "hero" : "platform",
      display_order: nextOrder,
      animation_duration: activeTab === "hero" ? 1.5 : 2.0,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (stat: AdminHomepageStatistic) => {
    setEditing(stat);
    setFormData({
      placement: stat.placement,
      label: stat.label,
      description: stat.description || "",
      source_type: stat.source_type,
      automatic_metric: stat.automatic_metric || "enrolled_students",
      value: stat.value,
      raw_value: stat.raw_value || "",
      prefix: stat.prefix || "",
      suffix: stat.suffix || "",
      precision: stat.precision,
      thousand_separator: stat.thousand_separator,
      animation_enabled: stat.animation_enabled,
      animation_duration: stat.animation_duration,
      animation_start_value: stat.animation_start_value,
      icon: stat.icon || "",
      accent_style: stat.accent_style || "default",
      display_order: stat.display_order,
      is_active: stat.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim()) {
      toast.error("Statistic label is required.");
      return;
    }

    try {
      setSubmitting(true);
      if (editing) {
        await adminApi.updateHomepageStatistic(editing.id, formData);
        toast.success("Statistic updated successfully!");
      } else {
        await adminApi.createHomepageStatistic(formData);
        toast.success("Statistic created successfully!");
      }
      setModalOpen(false);
      loadData(searchTerm);
    } catch {
      toast.error("Failed to save statistic.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (stat: AdminHomepageStatistic) => {
    try {
      const res = await adminApi.toggleHomepageStatisticActive(stat.id);
      setStats((prev) =>
        prev.map((s) => (s.id === stat.id ? { ...s, is_active: res.is_active } : s))
      );
      toast.success(`Statistic ${res.is_active ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to toggle status.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await adminApi.deleteHomepageStatistic(deleteTarget.id);
      toast.success("Statistic deleted successfully!");
      setDeleteTarget(null);
      loadData(searchTerm);
    } catch {
      toast.error("Failed to delete statistic.");
    } finally {
      setDeleting(false);
    }
  };

  const handleReorder = async (statId: number, direction: "up" | "down") => {
    const stat = stats.find((s) => s.id === statId);
    if (!stat) return;

    // Filter peers in the same placement sorted by display_order
    const peers = stats
      .filter((s) => s.placement === stat.placement)
      .sort((a, b) => a.display_order - b.display_order);

    const currentIndex = peers.findIndex((s) => s.id === statId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= peers.length) return;

    const currentStat = peers[currentIndex]!;
    const targetStat = peers[targetIndex]!;

    const tempOrder = currentStat.display_order;
    currentStat.display_order = targetStat.display_order;
    targetStat.display_order = tempOrder;

    // Optimistically update
    setStats([...stats]);

    try {
      await adminApi.reorderHomepageStatistics([
        { id: currentStat.id, display_order: currentStat.display_order },
        { id: targetStat.id, display_order: targetStat.display_order },
      ]);
      toast.success("Order updated!");
    } catch {
      toast.error("Failed to reorder.");
      loadData(searchTerm);
    }
  };

  // Preview formatting calculation for the modal
  const previewFormattedValue = useMemo(() => {
    if (formData.raw_value.trim()) {
      return `${formData.prefix}${formData.raw_value.trim()}${formData.suffix}`;
    }

    let val = formData.value;
    if (formData.source_type === "automatic") {
      const match = autoMetrics.find((m) => m.key === formData.automatic_metric);
      if (match && match.current_value !== null) {
        val = match.current_value;
      }
    }

    let numStr: string;
    if (formData.precision > 0) {
      numStr = Number(val).toFixed(formData.precision);
      if (formData.thousand_separator) {
        const parts = numStr.split(".");
        parts[0] = parseInt(parts[0] || "0", 10).toLocaleString("en-US");
        numStr = parts.join(".");
      }
    } else {
      const intVal = Math.round(Number(val));
      numStr = formData.thousand_separator ? intVal.toLocaleString("en-US") : intVal.toString();
    }

    return `${formData.prefix}${numStr}${formData.suffix}`;
  }, [formData, autoMetrics]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Breadcrumb & Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin-dashboard" className="hover:text-slate-800">
              Admin
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/admin-dashboard/website-content" className="hover:text-slate-800">
              Website Content
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-blue-600">Homepage Statistics</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#2563EB]" />
            Homepage Statistics Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage numerical highlights, hero metrics, and platform social proof with animated count-up effects.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            Preview Layout
          </Button>
          <Button
            onClick={handleOpenAdd}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center gap-2 shadow-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Statistic
          </Button>
        </div>
      </div>

      {/* ── Metric Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <Card className="p-4 border-slate-200">
          <div className="text-xs font-medium text-slate-500">Total Statistics</div>
          <div className="text-2xl font-bold text-[#0B2545] mt-1">{stats.length}</div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="text-xs font-medium text-slate-500">Active Live</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="text-xs font-medium text-slate-500">Inactive Hidden</div>
          <div className="text-2xl font-bold text-slate-400 mt-1">{inactiveCount}</div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="text-xs font-medium text-slate-500">Hero Section</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{heroCount}</div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="text-xs font-medium text-slate-500">Platform Proof</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{platformCount}</div>
        </Card>
      </div>

      {/* ── Toolbar & Tabs ──────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Placement Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Statistics ({stats.length})
          </button>
          <button
            onClick={() => setActiveTab("hero")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "hero" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Hero Statistics ({heroCount})
          </button>
          <button
            onClick={() => setActiveTab("platform")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "platform" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Platform Statistics ({platformCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by label, value..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* ── Statistics Table ─────────────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="w-14 text-center">Order</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Display Value</TableHead>
                <TableHead>Label & Description</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Animation</TableHead>
                <TableHead>Style</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    <p className="text-xs text-slate-400 mt-2">Loading homepage statistics...</p>
                  </TableCell>
                </TableRow>
              ) : filteredStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16">
                    <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No statistics found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm ? "Try adjusting your search criteria." : "Click Add Statistic to configure a new metric."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStats.map((stat, idx) => {
                  return (
                    <TableRow key={stat.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Order Controls */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleReorder(stat.id, "up")}
                            disabled={idx === 0}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 disabled:pointer-events-none"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                          <span className="text-xs font-bold text-slate-700 w-4 text-center">
                            {stat.display_order}
                          </span>
                          <button
                            onClick={() => handleReorder(stat.id, "down")}
                            disabled={idx === filteredStats.length - 1}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 disabled:pointer-events-none"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                        </div>
                      </TableCell>

                      {/* Placement */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            stat.placement === "hero"
                              ? "bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold"
                              : "bg-slate-100 text-slate-700 border-slate-200 text-[11px] font-semibold"
                          }
                        >
                          {stat.placement === "hero" ? "Hero Statistics" : "Platform Proof"}
                        </Badge>
                      </TableCell>

                      {/* Display Value */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[16px] text-[#0B2545] tabular-nums font-mono">
                            {stat.formatted_value}
                          </span>
                        </div>
                      </TableCell>

                      {/* Label & Description */}
                      <TableCell>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{stat.label}</div>
                          {stat.description && (
                            <div className="text-xs text-slate-500 mt-0.5">{stat.description}</div>
                          )}
                        </div>
                      </TableCell>

                      {/* Data Source */}
                      <TableCell>
                        {stat.source_type === "automatic" ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 w-fit text-[10px] font-medium">
                              Automatic
                            </Badge>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Database className="w-3 h-3 text-purple-500" />
                              Live: <strong>{stat.live_metric_count ?? stat.resolved_value}</strong>
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-600 text-[10px]">
                            Manual
                          </Badge>
                        )}
                      </TableCell>

                      {/* Animation */}
                      <TableCell>
                        {stat.animation_enabled ? (
                          <span className="text-xs text-slate-600 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                            {stat.animation_duration}s ({stat.animation_start_value} → {stat.formatted_value})
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Disabled</span>
                        )}
                      </TableCell>

                      {/* Style */}
                      <TableCell>
                        <span className="capitalize text-xs text-slate-600 font-medium">
                          {stat.accent_style || "default"}
                        </span>
                      </TableCell>

                      {/* Active Status */}
                      <TableCell className="text-center">
                        <Switch
                          checked={stat.is_active}
                          onCheckedChange={() => handleToggle(stat)}
                          aria-label="Toggle active"
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(stat)}
                            className="h-8 w-8 text-slate-600 hover:text-blue-600"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(stat)}
                            className="h-8 w-8 text-slate-600 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Add / Edit Statistic Dialog ─────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0B2545]">
              {editing ? "Edit Homepage Statistic" : "Configure New Homepage Statistic"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure numerical targets, manual or automatic data sources, and count-up animation parameters.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            {/* Live Formatted Preview Card */}
            <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Live Formatted Output
                </span>
                <div className="text-2xl font-black text-white tabular-nums">
                  {previewFormattedValue}
                </div>
                <div className="text-xs text-slate-300 font-semibold mt-0.5">
                  {formData.label || "Statistic Label"}
                </div>
                {formData.description && (
                  <div className="text-[11px] text-slate-400">{formData.description}</div>
                )}
              </div>
              <div className="text-right">
                <Badge
                  className={
                    formData.placement === "hero"
                      ? "bg-blue-500/20 text-blue-300 border-blue-400/30"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                  }
                >
                  {formData.placement === "hero" ? "Hero Section" : "Platform Section"}
                </Badge>
                {formData.animation_enabled && (
                  <div className="text-[11px] text-blue-300 mt-2 flex items-center justify-end gap-1">
                    <Sparkles className="w-3 h-3" />
                    {formData.animation_duration}s count-up
                  </div>
                )}
              </div>
            </div>

            {/* Placement & Source Type Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Placement *
                </label>
                <select
                  value={formData.placement}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      placement: e.target.value as "hero" | "platform",
                      animation_duration: e.target.value === "hero" ? 1.5 : 2.0,
                    })
                  }
                  className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hero">Hero Statistics (Header Carousel)</option>
                  <option value="platform">Platform Statistics (Social Proof Grid)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hero statistics appear in the hero section; Platform statistics appear in the social proof grid.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Data Source *
                </label>
                <select
                  value={formData.source_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      source_type: e.target.value as "manual" | "automatic",
                    })
                  }
                  className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manual">Manual Mode (Direct Admin Value)</option>
                  <option value="automatic">Automatic Mode (Live Database Metric)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Manual sets an exact configured value; Automatic computes live database counts.
                </p>
              </div>
            </div>

            {/* If Automatic Mode: Show Verified Metric Selection */}
            {formData.source_type === "automatic" && (
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 space-y-2">
                <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-purple-600" />
                  Select Verified Automatic Metric *
                </label>
                <select
                  value={formData.automatic_metric}
                  onChange={(e) =>
                    setFormData({ ...formData, automatic_metric: e.target.value })
                  }
                  className="w-full text-xs h-9 rounded-md border border-purple-300 bg-white px-3 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                >
                  {autoMetrics.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.name} — Current Live: {opt.current_value ?? 0}
                    </option>
                  ))}
                </select>
                {(() => {
                  const selectedMetric = autoMetrics.find((m) => m.key === formData.automatic_metric);
                  if (!selectedMetric) return null;
                  return (
                    <p className="text-[11.5px] text-purple-700 leading-tight">
                      <strong>Aggregation Logic:</strong> {selectedMetric.description} (Evaluated dynamically)
                    </p>
                  );
                })()}
              </div>
            )}

            {/* Labels & Descriptions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Label * (e.g. Aspirants Enrolled)
                </label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g. Aspirants Enrolled"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Description (e.g. Active Learners)
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Active learners"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Target Value & Raw Override (Manual Mode) */}
            {formData.source_type === "manual" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Target Numeric Value * (e.g. 10000, 4.9, 80.8)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="10000"
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Main numeric target for the animated count-up.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Custom Non-Numeric Override (Optional)
                  </label>
                  <Input
                    value={formData.raw_value}
                    onChange={(e) => setFormData({ ...formData, raw_value: e.target.value })}
                    placeholder="e.g. 24/7, A+, Top 1%"
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    If set, displays this exact text without numerical animation.
                  </p>
                </div>
              </div>
            )}

            {/* Formatting Options */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Display Formatting & Notation
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Prefix (e.g. NPR )
                  </label>
                  <Input
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                    placeholder="e.g. NPR "
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Suffix (e.g. +, %, /5)
                  </label>
                  <Input
                    value={formData.suffix}
                    onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                    placeholder="e.g. +"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Decimal Precision
                  </label>
                  <select
                    value={formData.precision}
                    onChange={(e) =>
                      setFormData({ ...formData, precision: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full text-xs h-8 rounded-md border border-slate-300 bg-white px-2 focus:outline-hidden"
                  >
                    <option value={0}>0 (1,000)</option>
                    <option value={1}>1 (4.9 / 80.8)</option>
                    <option value={2}>2 (99.95)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <div className="flex items-center gap-2 h-8">
                    <Switch
                      checked={formData.thousand_separator}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, thousand_separator: checked })
                      }
                      id="thousands-toggle"
                    />
                    <label htmlFor="thousands-toggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                      Thousand Comma (,)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Animation Settings */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Count-Up Animation Controls
                </h4>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.animation_enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, animation_enabled: checked })
                    }
                    id="animation-toggle"
                  />
                  <label htmlFor="animation-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Enable Animation
                  </label>
                </div>
              </div>

              {formData.animation_enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Duration: {formData.animation_duration} seconds
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.1"
                      value={formData.animation_duration}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          animation_duration: parseFloat(e.target.value) || 1.5,
                        })
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>0.5s (Fast)</span>
                      <span>1.5s - 2.0s (Recommended)</span>
                      <span>5.0s (Slow)</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Animation Start Value
                    </label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.animation_start_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          animation_start_value: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      className="h-8 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Usually 0 for integers, or 1.0 for ratings/percentages.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Visual Icon & Accent */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Visual Styling & Tokens
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Icon Symbol
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3 focus:outline-hidden"
                  >
                    <option value="">None (Standard layout)</option>
                    {AVAILABLE_ICONS.map((i) => (
                      <option key={i.key} value={i.key}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Accent Color Style
                  </label>
                  <select
                    value={formData.accent_style}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accent_style: e.target.value as "default" | "gold" | "blue" | "emerald" | "amber",
                      })
                    }
                    className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3 focus:outline-hidden"
                  >
                    {ACCENT_STYLES.map((a) => (
                      <option key={a.key} value={a.key}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Display Order & Active Status */}
            <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-700">Display Order:</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-20 h-8 text-xs font-mono text-center"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  id="active-toggle"
                />
                <label htmlFor="active-toggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Publish to Website (Active)
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editing ? "Save Changes" : "Create Statistic"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Delete Statistic
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Are you sure you want to delete{" "}
              <strong>&ldquo;{deleteTarget?.label}&rdquo;</strong> ({deleteTarget?.formatted_value})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Layout Preview Modal ────────────────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-[#0B2545]">
                  Live Homepage Layout Preview
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Preview how configured statistics render with count-up animations on desktop and mobile.
                </DialogDescription>
              </div>

              {/* Viewport Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`h-7 px-2.5 text-xs font-semibold flex items-center gap-1.5 ${
                    previewDevice === "desktop" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Desktop
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`h-7 px-2.5 text-xs font-semibold flex items-center gap-1.5 ${
                    previewDevice === "mobile" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Mobile (375px)
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* 1. Hero Preview Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Hero Section Preview
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Dark Theme Banner Environment
                </Badge>
              </div>

              <div
                className={`mx-auto bg-slate-950 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl transition-all duration-300 ${
                  previewDevice === "mobile" ? "max-w-[375px]" : "w-full"
                }`}
              >
                <div className="text-[10.5px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                  IOE Entrance & NEC License
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-2 leading-tight">
                  Master IOE Entrance Examinations
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mb-5 max-w-md">
                  Targeted engineering question banks, live mock tests, and smart performance analytics.
                </p>

                {/* Hero Statistics in Preview */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 border-t border-white/20 mt-4">
                  {stats
                    .filter((s) => s.placement === "hero" && s.is_active)
                    .map((stat, idx) => {
                      const isRating =
                        stat.icon === "star" || stat.accent_style === "amber" || stat.suffix.includes("/5");
                      const isUsers =
                        stat.icon === "users" ||
                        stat.label.toLowerCase().includes("aspirant") ||
                        stat.label.toLowerCase().includes("enrolled");

                      return (
                        <React.Fragment key={stat.id}>
                          {idx > 0 && <div className="hidden sm:block w-px h-8 bg-white/25 shrink-0" />}
                          <div className="flex items-center gap-2.5">
                            {isUsers && (
                              <div className="flex -space-x-2 shrink-0">
                                {[
                                  "from-blue-400 to-blue-600",
                                  "from-violet-400 to-violet-600",
                                  "from-emerald-400 to-emerald-600",
                                ].map((g, i) => (
                                  <div
                                    key={i}
                                    className={`w-6 h-6 rounded-full bg-gradient-to-br ${g} ring-1 ring-slate-900 shadow-xs`}
                                  />
                                ))}
                              </div>
                            )}
                            {isRating && (
                              <div className="text-amber-400 text-xs leading-none drop-shadow-sm shrink-0">
                                ★★★★★
                              </div>
                            )}
                            <div>
                              <div className="text-[14px] font-black text-white leading-tight">
                                <CountUp
                                  value={stat.value}
                                  startValue={stat.animation_start_value}
                                  duration={stat.animation_duration}
                                  precision={stat.precision}
                                  thousandSeparator={stat.thousand_separator}
                                  prefix={stat.prefix}
                                  suffix={stat.suffix}
                                  enabled={stat.animation_enabled}
                                />
                              </div>
                              <div className="text-[11px] font-semibold text-slate-300 leading-tight">
                                {stat.label}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* 2. Platform Social Proof Preview Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Platform Statistics Preview
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Social Proof Grid Cards
                </Badge>
              </div>

              <div
                className={`mx-auto bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 border border-slate-200 transition-all duration-300 ${
                  previewDevice === "mobile" ? "max-w-[375px]" : "w-full"
                }`}
              >
                <div className="text-center mb-6">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 inline-block mb-2">
                    Trusted by Aspirants
                  </span>
                  <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    Built for serious <span className="text-gradient-gold">engineering preparation.</span>
                  </h4>
                </div>

                <div
                  className={`grid gap-3 ${
                    previewDevice === "mobile" ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"
                  }`}
                >
                  {stats
                    .filter((s) => s.placement === "platform" && s.is_active)
                    .map((stat, i) => {
                      const accentClass =
                        stat.accent_style === "gold"
                          ? "text-gradient-gold"
                          : stat.accent_style === "blue"
                          ? "text-[#2563EB]"
                          : stat.accent_style === "emerald"
                          ? "text-emerald-600"
                          : stat.accent_style === "amber"
                          ? "text-amber-500"
                          : i === 3
                          ? "text-gradient-gold"
                          : "text-slate-900 dark:text-white";

                      return (
                        <div
                          key={stat.id}
                          className="bg-white dark:bg-[#040B14] border border-slate-200 dark:border-white/10 rounded-xl p-4 text-center shadow-xs"
                        >
                          <div
                            className={`text-2xl sm:text-3xl font-black mb-1 leading-tight tracking-tight tabular-nums ${accentClass}`}
                          >
                            <CountUp
                              value={stat.value}
                              startValue={stat.animation_start_value}
                              duration={stat.animation_duration}
                              precision={stat.precision}
                              thousandSeparator={stat.thousand_separator}
                              prefix={stat.prefix}
                              suffix={stat.suffix}
                              enabled={stat.animation_enabled}
                            />
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {stat.label}
                          </div>
                          {stat.description && (
                            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                              {stat.description}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button onClick={() => setPreviewOpen(false)} className="text-xs">
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
