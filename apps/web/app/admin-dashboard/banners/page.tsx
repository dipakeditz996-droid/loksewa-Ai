"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Image as ImageIcon,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  ArrowUp,
  ArrowDown,
  Upload,
  Smartphone,
  Monitor,
  ExternalLink,
  CheckCircle2,
  Sliders,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { adminApi, AdminBanner } from "@/lib/api/admin";
import toast from "react-hot-toast";

interface BannerFormData {
  title: string;
  subtitle: string;
  badge_text: string;
  cta_text: string;
  cta_url: string;
  cta_secondary_text: string;
  cta_secondary_url: string;
  is_active: boolean;
  display_order: number;
}

const DEFAULT_FORM: BannerFormData = {
  title: "",
  subtitle: "",
  badge_text: "",
  cta_text: "Start Preparing Now",
  cta_url: "/exams",
  cta_secondary_text: "Explore Courses",
  cta_secondary_url: "/courses",
  is_active: true,
  display_order: 0,
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBanner | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<BannerFormData>(DEFAULT_FORM);

  // File uploads
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<AdminBanner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async (search?: string) => {
    try {
      setLoading(true);
      const res = await adminApi.getBanners(search);
      setBanners(res);
    } catch (err) {
      console.error("Failed to load banners", err);
      toast.error("Failed to load banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadData(searchTerm || undefined), 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const openCreate = () => {
    setEditing(null);
    setFormData({
      ...DEFAULT_FORM,
      display_order: banners.length,
    });
    setDesktopFile(null);
    setDesktopPreview(null);
    setMobileFile(null);
    setMobilePreview(null);
    setModalOpen(true);
  };

  const openEdit = (b: AdminBanner) => {
    setEditing(b);
    setFormData({
      title: b.title || "",
      subtitle: b.subtitle || "",
      badge_text: b.badge_text || "",
      cta_text: b.cta_text || "",
      cta_url: b.cta_url || "/exams",
      cta_secondary_text: b.cta_secondary_text || "",
      cta_secondary_url: b.cta_secondary_url || "/courses",
      is_active: b.is_active,
      display_order: b.display_order,
    });
    setDesktopFile(null);
    setDesktopPreview(b.image_url);
    setMobileFile(null);
    setMobilePreview(b.mobile_image_url);
    setModalOpen(true);
  };

  const handleDesktopFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDesktopFile(file);
      setDesktopPreview(URL.createObjectURL(file));
    }
  };

  const handleMobileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMobileFile(file);
      setMobilePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!editing && !desktopFile) {
      toast.error("Please select a desktop banner image.");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("subtitle", formData.subtitle);
      data.append("badge_text", formData.badge_text);
      data.append("cta_text", formData.cta_text);
      data.append("cta_url", formData.cta_url);
      data.append("cta_secondary_text", formData.cta_secondary_text);
      data.append("cta_secondary_url", formData.cta_secondary_url);
      data.append("is_active", String(formData.is_active));
      data.append("display_order", String(formData.display_order));

      if (desktopFile) {
        data.append("image", desktopFile);
      }
      if (mobileFile) {
        data.append("mobile_image", mobileFile);
      }

      if (editing) {
        await adminApi.updateBanner(editing.id, data);
        toast.success("Banner updated successfully");
      } else {
        await adminApi.createBanner(data);
        toast.success("Banner created successfully");
      }

      setModalOpen(false);
      loadData(searchTerm || undefined);
    } catch (err: any) {
      console.error("Save banner failed", err);
      toast.error(err?.message || "Failed to save banner");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (banner: AdminBanner) => {
    try {
      const res = await adminApi.toggleBannerActive(banner.id);
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, is_active: res.is_active } : b))
      );
      toast.success(res.is_active ? "Banner enabled" : "Banner disabled");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteBanner(deleteTarget.id);
      toast.success("Banner deleted");
      setDeleteTarget(null);
      loadData(searchTerm || undefined);
    } catch {
      toast.error("Failed to delete banner");
    } finally {
      setDeleting(false);
    }
  };

  const moveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const newBanners = [...banners];
    const temp = newBanners[index];
    newBanners[index] = newBanners[targetIndex];
    newBanners[targetIndex] = temp;

    // Re-assign display_order
    const reorderPayload = newBanners.map((b, idx) => ({
      id: b.id,
      display_order: idx,
    }));

    setBanners(
      newBanners.map((b, idx) => ({
        ...b,
        display_order: idx,
      }))
    );

    try {
      await adminApi.reorderBanners(reorderPayload);
      toast.success("Order updated");
    } catch {
      toast.error("Failed to save reorder");
      loadData();
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-[12px] bg-[#2563EB]/10 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-[#2563EB]" />
            </div>
            <h1 className="text-2xl font-[900] tracking-tight text-slate-900 dark:text-white">
              Homepage Hero Banners
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage dynamic slides, banners, headings, and CTAs shown in the homepage hero carousel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(searchTerm || undefined)}
            className="gap-2 h-10 rounded-[10px]"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            onClick={openCreate}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-[700] gap-2 h-10 px-5 rounded-[10px] shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Upload New Banner
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search banners by title, subtitle, badge..."
            className="pl-9 h-10 rounded-[10px]"
          />
        </div>
        <div className="text-sm font-[600] text-slate-500">
          Total: {banners.length} {banners.length === 1 ? "banner" : "banners"}
        </div>
      </div>

      {/* Main Content: Banners Table / Cards */}
      <Card className="rounded-[16px] overflow-hidden border-slate-200 dark:border-white/10 shadow-xs">
        <CardHeader className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.05] py-4">
          <CardTitle className="text-base font-[800]">Active Slides & Carousel Queue</CardTitle>
          <CardDescription className="text-xs">
            Banners are transitioned in the order below every 5–6 seconds on the homepage.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-[#2563EB]" />
              <span className="text-sm">Loading homepage banners...</span>
            </div>
          ) : banners.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center mb-3">
                <ImageIcon className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-base font-[800] text-slate-800 dark:text-white mb-1">
                No hero banners found
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mb-5">
                Upload your first homepage banner image with custom title and CTAs to start rotating slides dynamically.
              </p>
              <Button onClick={openCreate} className="bg-[#2563EB] text-white gap-2 rounded-[10px]">
                <Plus className="w-4 h-4" />
                Upload Banner
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-16 text-center">Order</TableHead>
                    <TableHead className="w-44">Preview</TableHead>
                    <TableHead>Heading & Details</TableHead>
                    <TableHead className="w-48">CTA Buttons</TableHead>
                    <TableHead className="w-28 text-center">Status</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners.map((banner, idx) => (
                    <TableRow key={banner.id} className="group">
                      {/* Order Controls */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={idx === 0}
                            onClick={() => moveOrder(idx, "up")}
                            className="h-6 w-6 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <span className="text-xs font-[800] text-slate-600 dark:text-slate-300">
                            #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={idx === banners.length - 1}
                            onClick={() => moveOrder(idx, "down")}
                            className="h-6 w-6 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Image Thumbnail */}
                      <TableCell>
                        <div className="relative w-36 h-20 rounded-[10px] overflow-hidden bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 group-hover:border-[#2563EB]/40 transition-colors">
                          {banner.image_url ? (
                            <img
                              src={banner.image_url}
                              alt={banner.title || "Banner"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                              No image
                            </div>
                          )}
                          {banner.mobile_image_url && (
                            <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-[700] text-white flex items-center gap-0.5">
                              <Smartphone className="w-2.5 h-2.5" />
                              Mobile
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Title & Info */}
                      <TableCell>
                        <div className="space-y-1">
                          {banner.badge_text && (
                            <span className="inline-block text-[10px] font-[800] tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
                              {banner.badge_text}
                            </span>
                          )}
                          <h4 className="text-sm font-[800] text-slate-800 dark:text-white">
                            {banner.title || <span className="italic text-slate-400">Default Headline</span>}
                          </h4>
                          {banner.subtitle && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-md">
                              {banner.subtitle}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* CTAs */}
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {banner.cta_text && (
                            <div className="flex items-center gap-1.5 font-[600] text-slate-700 dark:text-slate-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>{banner.cta_text}</span>
                              <span className="text-[10px] text-slate-400">({banner.cta_url})</span>
                            </div>
                          )}
                          {banner.cta_secondary_text && (
                            <div className="flex items-center gap-1.5 font-[500] text-slate-500">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              <span>{banner.cta_secondary_text}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Active Toggle */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Switch
                            checked={banner.is_active}
                            onCheckedChange={() => handleToggleActive(banner)}
                          />
                          <span className="text-[10px] font-[700] text-slate-500">
                            {banner.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(banner)}
                            className="h-8 w-8 text-slate-600 hover:text-[#2563EB]"
                            title="Edit banner"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(banner)}
                            className="h-8 w-8 text-slate-600 hover:text-red-600"
                            title="Delete banner"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-[900]">
              {editing ? "Edit Homepage Banner" : "Upload Homepage Banner"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure banner image, mobile alternative, headline, and call-to-action buttons.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* Image Upload Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Desktop Image */}
              <div className="space-y-2">
                <label className="text-xs font-[800] uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-[#2563EB]" />
                  Desktop Image * (16:9 / 1920x1080)
                </label>
                <div
                  onClick={() => desktopInputRef.current?.click()}
                  className="relative h-36 rounded-[12px] border-2 border-dashed border-slate-300 dark:border-white/15 hover:border-[#2563EB] bg-slate-50 dark:bg-white/[0.02] flex flex-col items-center justify-center p-2 cursor-pointer transition-colors overflow-hidden group"
                >
                  {desktopPreview ? (
                    <>
                      <img
                        src={desktopPreview}
                        alt="Desktop preview"
                        className="w-full h-full object-cover rounded-[8px]"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-[700] gap-1.5">
                        <Upload className="w-4 h-4" /> Change Image
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-3">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1 group-hover:text-[#2563EB]" />
                      <span className="text-xs font-[700] text-slate-600 dark:text-slate-300 block">
                        Select Desktop Image
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        JPG, PNG, WebP up to 5MB
                      </span>
                    </div>
                  )}
                  <input
                    ref={desktopInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDesktopFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Mobile Image */}
              <div className="space-y-2">
                <label className="text-xs font-[800] uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  Mobile Image (Optional)
                </label>
                <div
                  onClick={() => mobileInputRef.current?.click()}
                  className="relative h-36 rounded-[12px] border-2 border-dashed border-slate-300 dark:border-white/15 hover:border-emerald-500 bg-slate-50 dark:bg-white/[0.02] flex flex-col items-center justify-center p-2 cursor-pointer transition-colors overflow-hidden group"
                >
                  {mobilePreview ? (
                    <>
                      <img
                        src={mobilePreview}
                        alt="Mobile preview"
                        className="w-full h-full object-cover rounded-[8px]"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-[700] gap-1.5">
                        <Upload className="w-4 h-4" /> Change Mobile Image
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-3">
                      <Smartphone className="w-6 h-6 text-slate-400 mx-auto mb-1 group-hover:text-emerald-500" />
                      <span className="text-xs font-[700] text-slate-600 dark:text-slate-300 block">
                        Select Mobile Variant
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Falls back to desktop if empty
                      </span>
                    </div>
                  )}
                  <input
                    ref={mobileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleMobileFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Headline & Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1 space-y-1.5">
                <label className="text-xs font-[700] text-slate-700 dark:text-slate-300">
                  Badge Text (Optional)
                </label>
                <Input
                  value={formData.badge_text}
                  onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                  placeholder="e.g. IOE Entrance 2081/82"
                  className="h-10 rounded-[10px]"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-[700] text-slate-700 dark:text-slate-300">
                  Slide Headline (Optional)
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Nepal's Premier Engineering Platform"
                  className="h-10 rounded-[10px]"
                />
              </div>
            </div>

            {/* Subtitle */}
            <div className="space-y-1.5">
              <label className="text-xs font-[700] text-slate-700 dark:text-slate-300">
                Subtitle / Description (Optional, Keep Concise)
              </label>
              <Textarea
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Targeted question banks, mock exams, and complete curriculum for IOE & NEC."
                rows={2}
                className="rounded-[10px] resize-none"
              />
            </div>

            {/* CTA 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
              <div className="space-y-1.5">
                <label className="text-xs font-[700] text-slate-700 dark:text-slate-300">
                  Primary CTA Text
                </label>
                <Input
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                  placeholder="e.g. Start Preparing Now"
                  className="h-10 rounded-[10px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-[700] text-slate-700 dark:text-slate-300">
                  Primary CTA Link
                </label>
                <Input
                  value={formData.cta_url}
                  onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                  placeholder="/exams or /register"
                  className="h-10 rounded-[10px]"
                />
              </div>
            </div>

            {/* CTA 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-[700] text-slate-700 dark:text-slate-300">
                  Secondary CTA Text
                </label>
                <Input
                  value={formData.cta_secondary_text}
                  onChange={(e) => setFormData({ ...formData, cta_secondary_text: e.target.value })}
                  placeholder="e.g. Explore Courses"
                  className="h-10 rounded-[10px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-[700] text-slate-700 dark:text-slate-300">
                  Secondary CTA Link
                </label>
                <Input
                  value={formData.cta_secondary_url}
                  onChange={(e) => setFormData({ ...formData, cta_secondary_url: e.target.value })}
                  placeholder="/courses or /syllabus"
                  className="h-10 rounded-[10px]"
                />
              </div>
            </div>

            {/* Status & Display Order */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/[0.05]">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  id="banner-active"
                />
                <label
                  htmlFor="banner-active"
                  className="text-sm font-[700] text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Enable on homepage
                </label>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-[700] text-slate-500">Order Number:</label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-20 h-9 rounded-[8px] text-center"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="rounded-[10px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-[700] rounded-[10px] gap-2 min-w-[120px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : editing ? (
                "Update Banner"
              ) : (
                "Save & Publish"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-[18px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-[900] text-red-600">
              Delete Homepage Banner?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete this banner? It will be removed immediately from the
              homepage carousel. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-[10px]">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2 rounded-[10px]"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Banner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
