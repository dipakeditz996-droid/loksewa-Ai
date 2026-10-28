"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import {
  FileText, Shield, Settings, UploadCloud, RefreshCw, CheckCircle2,
  AlertCircle, XCircle, Trash2, Eye, Filter, Search, ChevronRight,
  Layers, Sliders, Check, AlertTriangle, ArrowRight, Play, Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import {
  adminPdfBrandingApi,
  PdfBrandingSettings,
  PdfBrandingSummary,
  PdfBrandingRecordItem,
  BulkPreviewResponse,
  BatchJobItem,
} from "@/lib/api/admin-pdf-branding";

const CATEGORIES = [
  { value: "syllabus", label: "Syllabus" },
  { value: "subjective_topicwise", label: "Subjective Topicwise Notes" },
  { value: "objective_topicwise", label: "Objective Topicwise Notes" },
  { value: "revision_notes", label: "Revision Notes" },
];

export default function PdfBrandingSettingsPage() {
  const [activeTab, setActiveTab] = useState<"settings" | "inventory">("settings");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<PdfBrandingSettings | null>(null);
  const [summary, setSummary] = useState<PdfBrandingSummary | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [watermarkImgFile, setWatermarkImgFile] = useState<File | null>(null);
  const [watermarkImgPreview, setWatermarkImgPreview] = useState<string | null>(null);

  // Inventory state
  const [documents, setDocuments] = useState<PdfBrandingRecordItem[]>([]);
  const [docTotal, setDocTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [docsLoading, setDocsLoading] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Bulk operation & Modal state
  const [bulkAction, setBulkAction] = useState<string>("all_eligible");
  const [previewData, setPreviewData] = useState<BulkPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeJob, setActiveJob] = useState<BatchJobItem | null>(null);
  const [jobPolling, setJobPolling] = useState(false);

  // Fetch settings & summary
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminPdfBrandingApi.getSettings();
      setSettings(res.settings);
      setSummary(res.summary);
      if (res.settings.logo_url) {
        setLogoPreview(res.settings.logo_url);
      }
      if (res.settings.watermark_image_url) {
        setWatermarkImgPreview(res.settings.watermark_image_url);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load PDF branding settings");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch document inventory
  const loadDocuments = useCallback(async () => {
    try {
      setDocsLoading(true);
      const res = await adminPdfBrandingApi.getDocuments({
        page,
        page_size: pageSize,
        status: statusFilter,
        category: categoryFilter,
        search,
      });
      setDocuments(res.results);
      setDocTotal(res.count);
      setSummary(res.summary);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load document inventory");
    } finally {
      setDocsLoading(false);
    }
  }, [page, pageSize, statusFilter, categoryFilter, search]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (activeTab === "inventory") {
      loadDocuments();
    }
  }, [activeTab, loadDocuments]);

  // Handle Logo Upload / Replacement
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);

    try {
      const res = await adminPdfBrandingApi.uploadLogo(file);
      setSettings(res.settings);
      toast.success("Logo uploaded successfully");
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Failed to upload logo");
      setLogoPreview(settings?.logo_url || null);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const res = await adminPdfBrandingApi.deleteLogo();
      setSettings(res.settings);
      setLogoFile(null);
      setLogoPreview(null);
      toast.success("Logo removed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove logo");
    }
  };

  // Handle Watermark Image
  const handleWatermarkImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWatermarkImgFile(file);
    const objectUrl = URL.createObjectURL(file);
    setWatermarkImgPreview(objectUrl);

    try {
      const res = await adminPdfBrandingApi.uploadWatermarkImage(file);
      setSettings(res.settings);
      toast.success("Watermark image uploaded successfully");
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Failed to upload watermark image");
      setWatermarkImgPreview(settings?.watermark_image_url || null);
    }
  };

  const handleRemoveWatermarkImage = async () => {
    try {
      const res = await adminPdfBrandingApi.deleteWatermarkImage();
      setSettings(res.settings);
      setWatermarkImgFile(null);
      setWatermarkImgPreview(null);
      toast.success("Watermark image removed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove watermark image");
    }
  };

  // Save Settings Changes
  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const res = await adminPdfBrandingApi.updateSettings({
        logo_enabled: settings.logo_enabled,
        logo_placement: settings.logo_placement,
        logo_size: settings.logo_size,
        logo_opacity: settings.logo_opacity,
        logo_margin: settings.logo_margin,
        watermark_enabled: settings.watermark_enabled,
        watermark_type: settings.watermark_type,
        watermark_text: settings.watermark_text,
        watermark_placement: settings.watermark_placement,
        watermark_opacity: settings.watermark_opacity,
        watermark_rotation: settings.watermark_rotation,
        watermark_size: settings.watermark_size,
        watermark_color: settings.watermark_color,
        apply_by_default_on_upload: settings.apply_by_default_on_upload,
        include_in_bulk_by_default: settings.include_in_bulk_by_default,
        eligible_categories: settings.eligible_categories,
      });
      setSettings(res.settings);
      toast.success("Branding settings saved successfully! Version is now v" + res.settings.version);
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Single document actions
  const handleApplySingle = async (materialId: number) => {
    try {
      const res = await adminPdfBrandingApi.applyDocumentBranding(materialId);
      toast.success(res.message);
      loadDocuments();
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Could not apply branding");
    }
  };

  const handleReprocessSingle = async (materialId: number) => {
    try {
      const res = await adminPdfBrandingApi.reprocessDocument(materialId);
      toast.success(res.message);
      loadDocuments();
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Could not reprocess document");
    }
  };

  const handleRestoreSingle = async (materialId: number) => {
    try {
      const res = await adminPdfBrandingApi.restoreDocumentOriginal(materialId);
      toast.success(res.message);
      loadDocuments();
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Could not restore original");
    }
  };

  const handleDecisionChange = async (materialId: number, decision: "default" | "apply" | "skip") => {
    try {
      await adminPdfBrandingApi.updateDocumentDecision(materialId, decision);
      toast.success("Document branding preference updated");
      loadDocuments();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update preference");
    }
  };

  // Bulk Preview & Confirmation
  const handleTriggerBulkPreview = async (action: string) => {
    try {
      setPreviewLoading(true);
      setBulkAction(action);
      const ids = action === "selected" ? selectedIds : undefined;
      const res = await adminPdfBrandingApi.previewBulk({
        action: action === "selected" ? "all_eligible" : action,
        material_ids: ids,
      });
      setPreviewData(res);
      setShowConfirmModal(true);
    } catch (err: any) {
      toast.error(err?.message || "Could not generate bulk preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Execute Bulk Job
  const handleConfirmBulkApply = async () => {
    if (!previewData) return;
    try {
      setShowConfirmModal(false);
      const ids = bulkAction === "selected" ? selectedIds : undefined;
      const res = await adminPdfBrandingApi.applyBulk({
        action: bulkAction === "selected" ? "bulk_apply" : bulkAction,
        material_ids: ids,
        confirmed: true,
      });
      setActiveJob(res.job);
      toast.success(res.message);

      // Start polling if in progress
      if (res.job.status === "in_progress" || res.job.status === "pending") {
        pollJobProgress(res.job.id);
      } else {
        loadDocuments();
      }
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Failed to start bulk job");
    }
  };

  // Poll Job Progress
  const pollJobProgress = (jobId: number) => {
    setJobPolling(true);
    const interval = setInterval(async () => {
      try {
        const job = await adminPdfBrandingApi.getJob(jobId);
        setActiveJob(job);
        if (job.status === "completed" || job.status === "failed") {
          clearInterval(interval);
          setJobPolling(false);
          loadDocuments();
          if (job.status === "completed") {
            toast.success(`Bulk job completed: ${job.success_count} branded, ${job.failed_count} failed.`);
          } else {
            toast.error("Bulk branding job encountered errors.");
          }
        }
      } catch (err) {
        clearInterval(interval);
        setJobPolling(false);
      }
    }, 2000);
  };

  // Toggle Category Eligibility in Settings
  const toggleCategoryEligibility = (catValue: string) => {
    if (!settings) return;
    const current = settings.eligible_categories || [];
    const updated = current.includes(catValue)
      ? current.filter(c => c !== catValue)
      : [...current, catValue];
    setSettings({ ...settings, eligible_categories: updated });
  };

  if (loading || !settings) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
        <p className="text-sm text-slate-500">Loading PDF branding configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545]">PDF Branding & Watermark Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Centrally manage the official LoksewaAI logo, watermark overlays, eligibility rules, and batch processing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "settings" && (
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-[#0B2545] hover:bg-[#163E6C] text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Configuration
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "settings"
              ? "border-[#0B2545] text-[#0B2545]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Global Branding Configuration
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full ml-1 font-mono">
            v{settings.version}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "inventory"
              ? "border-[#0B2545] text-[#0B2545]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers className="w-4 h-4" />
          Document Inventory & Bulk Application
          {summary && (
            <span className="text-xs bg-blue-100 text-[#0B2545] px-2 py-0.5 rounded-full ml-1">
              {summary.total}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: GLOBAL BRANDING SETTINGS */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logo Settings Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0B2545]" />
                <h2 className="text-lg font-bold text-[#0B2545]">Official Platform Logo</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.logo_enabled}
                  onChange={(e) => setSettings({ ...settings, logo_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#0B2545] focus:ring-[#0B2545]"
                />
                <span className="text-sm font-semibold text-slate-700">Logo Enabled</span>
              </label>
            </div>

            {/* Logo Upload & Preview */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Logo Asset</label>
              {logoPreview ? (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      className="h-14 max-w-[180px] object-contain border border-slate-200 bg-white p-1 rounded-lg"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Active Logo Image</p>
                      <p className="text-xs text-slate-500">Rendered with transparent background support</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer">
                      Replace
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-[#0B2545] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100">
                  <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-700">Click to upload official logo</span>
                  <span className="text-xs text-slate-400 mt-1">PNG, WEBP, or JPG (Max 5MB)</span>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
              )}
            </div>

            {/* Logo Placement & Size */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Placement</label>
                <select
                  value={settings.logo_placement}
                  onChange={(e) => setSettings({ ...settings, logo_placement: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 text-sm focus:ring-2 focus:ring-[#0B2545]/20"
                >
                  <option value="top-right">Top Right (Recommended)</option>
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Size Scale</label>
                <select
                  value={settings.logo_size}
                  onChange={(e) => setSettings({ ...settings, logo_size: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 text-sm focus:ring-2 focus:ring-[#0B2545]/20"
                >
                  <option value="small">Small (80 × 40 pt)</option>
                  <option value="medium">Medium (130 × 55 pt)</option>
                  <option value="large">Large (180 × 75 pt)</option>
                </select>
              </div>
            </div>

            {/* Logo Opacity */}
            <div>
              <div className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                <span>Logo Opacity</span>
                <span>{Math.round(settings.logo_opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.logo_opacity}
                onChange={(e) => setSettings({ ...settings, logo_opacity: parseFloat(e.target.value) })}
                className="w-full accent-[#0B2545]"
              />
            </div>
          </div>

          {/* Watermark Settings Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#0B2545]" />
                <h2 className="text-lg font-bold text-[#0B2545]">Watermark Protection</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.watermark_enabled}
                  onChange={(e) => setSettings({ ...settings, watermark_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#0B2545] focus:ring-[#0B2545]"
                />
                <span className="text-sm font-semibold text-slate-700">Watermark Enabled</span>
              </label>
            </div>

            {/* Watermark Type Selector */}
            <div className="flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, watermark_type: "text" })}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  settings.watermark_type === "text"
                    ? "bg-white text-[#0B2545] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Text Watermark
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, watermark_type: "image" })}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  settings.watermark_type === "image"
                    ? "bg-white text-[#0B2545] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Custom Watermark Image
              </button>
            </div>

            {settings.watermark_type === "text" ? (
              <>
                {/* Watermark Text */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Watermark Text</label>
                  <input
                    type="text"
                    value={settings.watermark_text}
                    onChange={(e) => setSettings({ ...settings, watermark_text: e.target.value })}
                    placeholder="e.g. LoksewaAI"
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 text-sm focus:ring-2 focus:ring-[#0B2545]/20 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Font Color */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.watermark_color}
                        onChange={(e) => setSettings({ ...settings, watermark_color: e.target.value })}
                        className="w-9 h-9 p-0.5 border border-slate-200 rounded-lg cursor-pointer bg-white"
                      />
                      <input
                        type="text"
                        value={settings.watermark_color}
                        onChange={(e) => setSettings({ ...settings, watermark_color: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Text Size</label>
                    <select
                      value={settings.watermark_size}
                      onChange={(e) => setSettings({ ...settings, watermark_size: e.target.value as any })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 text-sm focus:ring-2 focus:ring-[#0B2545]/20"
                    >
                      <option value="small">Small (32pt)</option>
                      <option value="medium">Medium (48pt - Recommended)</option>
                      <option value="large">Large (64pt)</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              /* Watermark Image Upload */
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Watermark Emblem / Image</label>
                {watermarkImgPreview ? (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center justify-between gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={watermarkImgPreview}
                      alt="Watermark Preview"
                      className="h-14 max-w-[140px] object-contain border border-slate-200 bg-white p-1 rounded-lg"
                    />
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer">
                        Replace
                        <input type="file" accept="image/*" onChange={handleWatermarkImageChange} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveWatermarkImage}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-[#0B2545] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-slate-100">
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm font-semibold text-slate-700">Click to upload watermark emblem</span>
                    <input type="file" accept="image/*" onChange={handleWatermarkImageChange} className="hidden" />
                  </label>
                )}
              </div>
            )}

            {/* Watermark Placement & Rotation */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Placement</label>
                <select
                  value={settings.watermark_placement}
                  onChange={(e) => setSettings({ ...settings, watermark_placement: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 text-sm focus:ring-2 focus:ring-[#0B2545]/20"
                >
                  <option value="diagonal-center">Diagonal Center (45°)</option>
                  <option value="center">Center (Horizontal)</option>
                  <option value="tile">Repeating Tiled</option>
                  <option value="top-center">Top Center</option>
                  <option value="bottom-center">Bottom Center</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Rotation ({settings.watermark_rotation}°)
                </label>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="5"
                  value={settings.watermark_rotation}
                  onChange={(e) => setSettings({ ...settings, watermark_rotation: parseInt(e.target.value) })}
                  className="w-full mt-2 accent-[#0B2545]"
                />
              </div>
            </div>

            {/* Watermark Opacity */}
            <div>
              <div className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                <span>Subtle Watermark Opacity</span>
                <span>{Math.round(settings.watermark_opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.01"
                value={settings.watermark_opacity}
                onChange={(e) => setSettings({ ...settings, watermark_opacity: parseFloat(e.target.value) })}
                className="w-full accent-[#0B2545]"
              />
              <p className="text-xs text-slate-400 mt-1">
                Recommended 10% - 20% to keep document text legible while asserting branding protection.
              </p>
            </div>
          </div>

          {/* Defaults and Category Eligibility Policy */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 lg:col-span-2">
            <h2 className="text-lg font-bold text-[#0B2545] pb-2 border-b border-slate-100">
              Policy & Automated Enforcement Defaults
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <input
                    id="apply_by_default"
                    type="checkbox"
                    checked={settings.apply_by_default_on_upload}
                    onChange={(e) => setSettings({ ...settings, apply_by_default_on_upload: e.target.checked })}
                    className="w-4 h-4 mt-1 rounded text-[#0B2545] focus:ring-[#0B2545]"
                  />
                  <div>
                    <label htmlFor="apply_by_default" className="text-sm font-bold text-[#0B2545] cursor-pointer">
                      Brand newly uploaded PDFs by default
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      When enabled, admin upload forms will automatically preselect branding unless explicitly unchecked.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <input
                    id="include_in_bulk"
                    type="checkbox"
                    checked={settings.include_in_bulk_by_default}
                    onChange={(e) => setSettings({ ...settings, include_in_bulk_by_default: e.target.checked })}
                    className="w-4 h-4 mt-1 rounded text-[#0B2545] focus:ring-[#0B2545]"
                  />
                  <div>
                    <label htmlFor="include_in_bulk" className="text-sm font-bold text-[#0B2545] cursor-pointer">
                      Include existing eligible PDFs in bulk branding by default
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Allows pre-selection of unbranded materials when launching bulk operations.
                    </p>
                  </div>
                </div>
              </div>

              {/* Eligible Categories Policy */}
              <div>
                <label className="block text-sm font-bold text-[#0B2545] mb-2">
                  Eligible Note Categories Policy
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Only documents matching checked categories will be branded by default.
                </p>
                <div className="space-y-2">
                  {CATEGORIES.map((cat) => {
                    const isChecked = settings.eligible_categories?.includes(cat.value);
                    return (
                      <label key={cat.value} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategoryEligibility(cat.value)}
                          className="w-4 h-4 rounded text-[#0B2545] focus:ring-[#0B2545]"
                        />
                        <span>{cat.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENT INVENTORY & BULK ACTIONS */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Documents</span>
                <p className="text-2xl font-extrabold text-[#0B2545] mt-1">{summary.total}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Branded</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-extrabold text-emerald-600">{summary.branded}</p>
                  {summary.outdated > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                      {summary.outdated} outdated
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Unbranded</span>
                <p className="text-2xl font-extrabold text-slate-700 mt-1">{summary.unbranded}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <span className="text-xs text-red-500 font-semibold uppercase tracking-wider">Failed</span>
                <p className="text-2xl font-extrabold text-red-600 mt-1">{summary.failed}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Excluded / Skipped</span>
                <p className="text-2xl font-extrabold text-slate-500 mt-1">{summary.excluded}</p>
              </div>
            </div>
          )}

          {/* Active Job Progress Banner */}
          {activeJob && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 text-[#0B2545] ${jobPolling ? "animate-spin" : ""}`} />
                  <span className="text-sm font-bold text-[#0B2545]">
                    Batch Job #{activeJob.id} ({activeJob.operation}) — Status: {activeJob.status}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-600">
                  {activeJob.processed_count} / {activeJob.total_files} processed
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#0B2545] h-2 transition-all duration-300"
                  style={{
                    width: `${activeJob.total_files > 0 ? (activeJob.processed_count / activeJob.total_files) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Success: {activeJob.success_count}</span>
                <span>Failed: {activeJob.failed_count}</span>
                <span>Skipped: {activeJob.skipped_count}</span>
              </div>
            </div>
          )}

          {/* Filters & Bulk Actions Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search document title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:ring-2 focus:ring-[#0B2545]/20"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
              >
                <option value="all">All Statuses</option>
                <option value="unbranded">Unbranded Only</option>
                <option value="branded">Branded Only</option>
                <option value="outdated">Outdated Version Only</option>
                <option value="failed">Failed Only</option>
                <option value="excluded">Excluded Only</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleTriggerBulkPreview("selected")}
                  disabled={previewLoading}
                  className="px-3.5 py-2 bg-[#0B2545] hover:bg-[#163E6C] text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  Brand Selected ({selectedIds.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => handleTriggerBulkPreview("all_eligible")}
                disabled={previewLoading}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Brand All Eligible
              </button>

              <button
                type="button"
                onClick={() => handleTriggerBulkPreview("reprocess_all")}
                disabled={previewLoading}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reprocess All (v{settings.version})
              </button>
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                  <tr>
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === documents.length && documents.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(documents.map(d => d.material_id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="w-4 h-4 rounded text-[#0B2545]"
                      />
                    </th>
                    <th className="p-3">Document Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Original Copy</th>
                    <th className="p-3">Preference</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docsLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2545]" />
                        Loading PDF documents...
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No PDF documents match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => {
                      const isSelected = selectedIds.includes(doc.material_id);
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds([...selectedIds, doc.material_id]);
                                } else {
                                  setSelectedIds(selectedIds.filter(id => id !== doc.material_id));
                                }
                              }}
                              className="w-4 h-4 rounded text-[#0B2545]"
                            />
                          </td>
                          <td className="p-3 font-medium text-slate-900 max-w-xs truncate">
                            {doc.material_title}
                            {doc.page_count > 0 && (
                              <span className="text-xs text-slate-400 block font-normal">
                                {doc.page_count} pages • {(doc.file_size_bytes / 1024).toFixed(0)} KB
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-xs text-slate-600 font-mono">
                            {doc.material_category}
                          </td>
                          <td className="p-3">
                            {doc.status === "branded" ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Branded (v{doc.applied_version})
                                </span>
                                {doc.is_outdated && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium" title="Branded with an older configuration version">
                                    outdated
                                  </span>
                                )}
                              </div>
                            ) : doc.status === "failed" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200" title={doc.error_message}>
                                <XCircle className="w-3 h-3" />
                                Failed
                              </span>
                            ) : doc.status === "excluded" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                Excluded
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                Unbranded
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-xs">
                            {doc.has_original ? (
                              <span className="text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Preserved
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Active copy only</span>
                            )}
                          </td>
                          <td className="p-3">
                            <select
                              value={doc.decision}
                              onChange={(e) => handleDecisionChange(doc.material_id, e.target.value as any)}
                              className="text-xs p-1.5 border border-slate-200 rounded bg-white text-slate-700"
                            >
                              <option value="default">Global Default</option>
                              <option value="apply">Always Brand</option>
                              <option value="skip">Skip (Do not brand)</option>
                            </select>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            {doc.status !== "branded" ? (
                              <button
                                type="button"
                                onClick={() => handleApplySingle(doc.material_id)}
                                className="px-2.5 py-1 bg-[#0B2545] hover:bg-[#163E6C] text-white rounded text-xs font-medium"
                              >
                                Brand Now
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReprocessSingle(doc.material_id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-medium"
                                title="Reprocess from pristine original"
                              >
                                Reprocess
                              </button>
                            )}
                            {doc.has_original && (
                              <button
                                type="button"
                                onClick={() => handleRestoreSingle(doc.material_id)}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-xs font-medium"
                                title="Restore clean unbranded original"
                              >
                                Restore
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <span>Showing {documents.length} of {docTotal} documents</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-slate-200 bg-white rounded hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  type="button"
                  disabled={documents.length < pageSize}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border border-slate-200 bg-white rounded hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explicit Bulk Confirmation Modal */}
      {showConfirmModal && previewData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Confirm Bulk PDF Branding</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              You are about to run a bulk branding operation using the current configuration (<strong>v{previewData.current_version}</strong>).
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Operation Action:</span>
                <span className="font-semibold text-slate-800">{previewData.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Affected Documents:</span>
                <span className="font-bold text-[#0B2545]">{previewData.affected_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Excluded / Skipped:</span>
                <span className="font-semibold text-slate-600">{previewData.excluded_count}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <p className="font-bold">Original Document Safety:</p>
              <p>
                Each clean source PDF will be archived as a preserved original prior to modification. Reprocessing will always originate from that pristine original to prevent duplicate watermarks.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkApply}
                className="px-4 py-2 bg-[#0B2545] hover:bg-[#163E6C] text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Confirm & Start Branding ({previewData.affected_count})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
