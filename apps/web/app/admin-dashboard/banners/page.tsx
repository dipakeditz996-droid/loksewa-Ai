"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Image as ImageIcon,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  ArrowUp,
  ArrowDown,
  Upload,
  Smartphone,
  Monitor,
  Eye,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"];
const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface BannerFormData {
  title: string;
  subtitle: string;
  badge_text: string;
  cta_text: string;
  cta_url: string;
  cta_secondary_text: string;
  cta_secondary_url: string;
  image_fit: "cover" | "contain";
  image_focal_x: "center" | "left" | "right";
  image_focal_y: "center" | "top" | "bottom";
  mobile_image_fit: "cover" | "contain";
  mobile_image_focal_x: "center" | "left" | "right";
  mobile_image_focal_y: "center" | "top" | "bottom";
  is_active: boolean;
  display_order: number;
}

interface ImageDimensionMeta {
  width: number;
  height: number;
  ratioStr: string;
  isPortrait: boolean;
  sizeKb?: number;
}

const calculateRatioString = (width: number, height: number): string => {
  if (!width || !height) return "16:9";
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const wRatio = width / divisor;
  const hRatio = height / divisor;
  if (
    (wRatio === 16 && hRatio === 9) ||
    (wRatio === 4 && hRatio === 3) ||
    (wRatio === 21 && hRatio === 9) ||
    (wRatio === 1 && hRatio === 1) ||
    (wRatio === 9 && hRatio === 16)
  ) {
    return `${wRatio}:${hRatio}`;
  }
  return `${(width / height).toFixed(2)}:1`;
};

const DEFAULT_FORM: BannerFormData = {
  title: "",
  subtitle: "",
  badge_text: "",
  cta_text: "",
  cta_url: "",
  cta_secondary_text: "",
  cta_secondary_url: "",
  image_fit: "cover",
  image_focal_x: "center",
  image_focal_y: "center",
  mobile_image_fit: "cover",
  mobile_image_focal_x: "center",
  mobile_image_focal_y: "center",
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
  const [previewTab, setPreviewTab] = useState<"desktop" | "mobile">("desktop");
  const [showMobileControls, setShowMobileControls] = useState(false);

  // File uploads & dimension metadata
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null);
  const [desktopDimensions, setDesktopDimensions] = useState<ImageDimensionMeta | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);
  const [mobileDimensions, setMobileDimensions] = useState<ImageDimensionMeta | null>(null);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Measure dimensions from File
  const inspectImageFile = (file: File, isMobileImage = false) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const meta: ImageDimensionMeta = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        ratioStr: calculateRatioString(img.naturalWidth, img.naturalHeight),
        isPortrait: img.naturalHeight > img.naturalWidth,
        sizeKb: Math.round(file.size / 1024),
      };
      if (isMobileImage) {
        setMobileDimensions(meta);
      } else {
        setDesktopDimensions(meta);
      }
    };
    img.src = url;
  };

  // Measure dimensions from existing URL
  const inspectImageUrl = (
    url: string,
    isMobileImage = false,
    fallbackWidth?: number | null,
    fallbackHeight?: number | null
  ) => {
    if (fallbackWidth && fallbackHeight) {
      const meta: ImageDimensionMeta = {
        width: fallbackWidth,
        height: fallbackHeight,
        ratioStr: calculateRatioString(fallbackWidth, fallbackHeight),
        isPortrait: fallbackHeight > fallbackWidth,
      };
      if (isMobileImage) setMobileDimensions(meta);
      else setDesktopDimensions(meta);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const meta: ImageDimensionMeta = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        ratioStr: calculateRatioString(img.naturalWidth, img.naturalHeight),
        isPortrait: img.naturalHeight > img.naturalWidth,
      };
      if (isMobileImage) setMobileDimensions(meta);
      else setDesktopDimensions(meta);
    };
    img.src = url;
  };

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

  const validateFile = (file: File): boolean => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      toast.error(
        `Unsupported image format (.${ext}). Supported: JPG, PNG, WEBP, GIF, AVIF, SVG.`
      );
      return false;
    }
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      toast.error(
        `Image size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 5MB limit.`
      );
      return false;
    }
    return true;
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({
      ...DEFAULT_FORM,
      display_order: banners.length,
    });
    setDesktopFile(null);
    setDesktopPreview(null);
    setDesktopDimensions(null);
    setMobileFile(null);
    setMobilePreview(null);
    setMobileDimensions(null);
    setPreviewTab("desktop");
    setShowMobileControls(false);
    setModalOpen(true);
  };

  const openEdit = (b: AdminBanner) => {
    setEditing(b);
    setFormData({
      title: b.title || "",
      subtitle: b.subtitle || "",
      badge_text: b.badge_text || "",
      cta_text: b.cta_text || "",
      cta_url: b.cta_url || "",
      cta_secondary_text: b.cta_secondary_text || "",
      cta_secondary_url: b.cta_secondary_url || "",
      image_fit: b.image_fit || "cover",
      image_focal_x: b.image_focal_x || "center",
      image_focal_y: b.image_focal_y || "center",
      mobile_image_fit: b.mobile_image_fit || "cover",
      mobile_image_focal_x: b.mobile_image_focal_x || "center",
      mobile_image_focal_y: b.mobile_image_focal_y || "center",
      is_active: b.is_active,
      display_order: b.display_order,
    });
    setDesktopFile(null);
    setDesktopPreview(b.image_url);
    setDesktopDimensions(null);
    setMobileFile(null);
    setMobilePreview(b.mobile_image_url);
    setMobileDimensions(null);

    if (b.image_url) {
      inspectImageUrl(b.image_url, false, b.image_width, b.image_height);
    }
    if (b.mobile_image_url) {
      inspectImageUrl(b.mobile_image_url, true, b.mobile_image_width, b.mobile_image_height);
    }

    setPreviewTab("desktop");
    setShowMobileControls(Boolean(b.mobile_image_url));
    setModalOpen(true);
  };

  const handleDesktopFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!validateFile(file)) {
        e.target.value = "";
        return;
      }
      setDesktopFile(file);
      setDesktopPreview(URL.createObjectURL(file));
      inspectImageFile(file, false);
    }
  };

  const handleMobileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!validateFile(file)) {
        e.target.value = "";
        return;
      }
      setMobileFile(file);
      setMobilePreview(URL.createObjectURL(file));
      inspectImageFile(file, true);
      setShowMobileControls(true);
    }
  };

  const handleSubmit = async () => {
    // Validation: Require either an image (desktop) or text headline (text-only banner)
    const hasImage = Boolean(desktopFile || (editing && editing.image_url));
    const hasTitle = Boolean(formData.title.trim());

    if (!hasImage && !hasTitle) {
      toast.error("Please provide either a banner image or a headline.");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("subtitle", formData.subtitle.trim());
      data.append("badge_text", formData.badge_text.trim());
      data.append("cta_text", formData.cta_text.trim());
      data.append("cta_url", formData.cta_url.trim());
      data.append("cta_secondary_text", formData.cta_secondary_text.trim());
      data.append("cta_secondary_url", formData.cta_secondary_url.trim());
      data.append("image_fit", formData.image_fit);
      data.append("image_focal_x", formData.image_focal_x);
      data.append("image_focal_y", formData.image_focal_y);
      data.append("mobile_image_fit", formData.mobile_image_fit);
      data.append("mobile_image_focal_x", formData.mobile_image_focal_x);
      data.append("mobile_image_focal_y", formData.mobile_image_focal_y);
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
      toast.success(res.is_active ? "Banner enabled on homepage" : "Banner disabled from homepage");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteBanner(deleteTarget.id);
      toast.success("Banner deleted successfully");
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
    const sourceItem = newBanners[index];
    const targetItem = newBanners[targetIndex];
    if (!sourceItem || !targetItem) return;

    newBanners[index] = targetItem;
    newBanners[targetIndex] = sourceItem;

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
      toast.success("Display order saved");
    } catch {
      toast.error("Failed to save reorder");
      loadData();
    }
  };

  // Preview computations
  const currentPreviewImage =
    previewTab === "mobile" && mobilePreview ? mobilePreview : desktopPreview;
  const currentDimensions =
    previewTab === "mobile" ? (mobileDimensions || desktopDimensions) : desktopDimensions;
  const currentFit =
    previewTab === "mobile" ? formData.mobile_image_fit : formData.image_fit;
  const currentFocalX =
    previewTab === "mobile" ? formData.mobile_image_focal_x : formData.image_focal_x;
  const currentFocalY =
    previewTab === "mobile" ? formData.mobile_image_focal_y : formData.image_focal_y;
  const currentFocalPos = `${currentFocalX} ${currentFocalY}`;

  const hasPreviewText = Boolean(
    formData.title.trim() ||
      formData.subtitle.trim() ||
      formData.badge_text.trim() ||
      (formData.cta_text.trim() && formData.cta_url.trim())
  );

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
            Configure dynamic banners, aspect ratio cropping, focal positions, headings, and CTAs.
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

      {/* Main Content: Banners Table */}
      <Card className="rounded-[16px] overflow-hidden border-slate-200 dark:border-white/10 shadow-xs">
        <CardHeader className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.05] py-4">
          <CardTitle className="text-base font-[800]">Active Slides & Carousel Queue</CardTitle>
          <CardDescription className="text-xs">
            Banners are transitioned in the order below every 5 seconds on the homepage. Only active banners appear publicly.
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
                    <TableHead className="w-48">Media & Fit</TableHead>
                    <TableHead>Headline & Content</TableHead>
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

                      {/* Image Thumbnail with Fit/Focal indicator */}
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="relative w-40 h-22 rounded-[10px] overflow-hidden bg-slate-900 border border-slate-200/80 dark:border-white/10 group-hover:border-[#2563EB]/40 transition-colors">
                            {banner.image_url ? (
                              <img
                                src={banner.image_url}
                                alt={banner.title || "Banner"}
                                className="w-full h-full"
                                style={{
                                  objectFit: banner.image_fit || "cover",
                                  objectPosition: `${banner.image_focal_x || "center"} ${banner.image_focal_y || "center"}`,
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 bg-gradient-to-br from-[#102D40] to-slate-950">
                                Text Only
                              </div>
                            )}
                            {banner.mobile_image_url && (
                              <div className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-[700] text-white flex items-center gap-0.5">
                                <Smartphone className="w-2.5 h-2.5" />
                                Mobile
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-[600] text-slate-500">
                            <span className="capitalize">{banner.image_fit || "cover"}</span>
                            <span>&middot;</span>
                            <span className="capitalize">{banner.image_focal_x || "center"}</span>
                            <span>/</span>
                            <span className="capitalize">{banner.image_focal_y || "center"}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Title & Info */}
                      <TableCell>
                        <div className="space-y-1">
                          {banner.badge_text ? (
                            <span className="inline-block text-[10px] font-[800] tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
                              {banner.badge_text}
                            </span>
                          ) : null}
                          <h4 className="text-sm font-[800] text-slate-800 dark:text-white">
                            {banner.title?.trim() ? (
                              banner.title
                            ) : (
                              <span className="italic text-slate-400 font-normal">
                                [No headline &mdash; Image only banner]
                              </span>
                            )}
                          </h4>
                          {banner.subtitle ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-md">
                              {banner.subtitle}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>

                      {/* CTAs */}
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {banner.cta_text && banner.cta_url ? (
                            <div className="flex items-center gap-1.5 font-[600] text-slate-700 dark:text-slate-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>{banner.cta_text}</span>
                              <span className="text-[10px] text-slate-400">({banner.cta_url})</span>
                            </div>
                          ) : null}
                          {banner.cta_secondary_text && banner.cta_secondary_url ? (
                            <div className="flex items-center gap-1.5 font-[500] text-slate-500">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              <span>{banner.cta_secondary_text}</span>
                              <span className="text-[10px] text-slate-400">({banner.cta_secondary_url})</span>
                            </div>
                          ) : null}
                          {!banner.cta_text && !banner.cta_secondary_text && (
                            <span className="text-slate-400 text-[11px] italic">No CTAs</span>
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
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-[900]">
              {editing ? "Edit Homepage Banner" : "Upload Homepage Banner"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure banner images, cropping mode, focal positioning, and optional text & CTAs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* Live Interactive Preview */}
            <div className="space-y-2 p-3 bg-slate-900 rounded-[14px] border border-slate-800">
              <div className="flex items-center justify-between pb-1 border-b border-white/10">
                <span className="text-xs font-[800] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
                  Live Crop & Placement Preview
                </span>
                <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPreviewTab("desktop")}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-[700] rounded-md transition-colors ${
                      previewTab === "desktop"
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Monitor className="w-3 h-3" /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("mobile")}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-[700] rounded-md transition-colors ${
                      previewTab === "mobile"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="w-3 h-3" /> Mobile
                  </button>
                </div>
              </div>

              {/* Preview Window Frame */}
              <div className="flex flex-col justify-center items-center py-2 space-y-2">
                <div
                  className={`relative overflow-hidden transition-all duration-300 rounded-[10px] border border-white/15 bg-slate-950 flex items-center justify-center ${
                    previewTab === "desktop"
                      ? "w-full max-w-[620px] aspect-[16/7] max-h-[220px]"
                      : "w-[180px] aspect-[9/16] max-h-[260px]"
                  }`}
                >
                  {currentPreviewImage ? (
                    <>
                      {/* Ambient Blurred Backdrop for Contain Mode: Demonstrates no dark side voids */}
                      {currentFit === "contain" && (
                        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                          <img
                            src={currentPreviewImage}
                            alt=""
                            aria-hidden="true"
                            className="w-full h-full object-cover blur-md opacity-45 scale-110 filter brightness-75 select-none"
                          />
                          <div className="absolute inset-0 bg-slate-950/20" />
                        </div>
                      )}
                      <img
                        src={currentPreviewImage}
                        alt="Crop preview"
                        className="relative z-10 w-full h-full block"
                        style={{
                          objectFit: currentFit,
                          objectPosition: currentFocalPos,
                        }}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 bg-gradient-to-br from-[#102D40] to-slate-950 p-4 text-center">
                      <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                      <span>{hasPreviewText ? "Text-only banner" : "No image selected"}</span>
                    </div>
                  )}

                  {/* Scrim overlay if text is present */}
                  {hasPreviewText && (
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-transparent pointer-events-none z-10" />
                  )}

                  {/* Text Overlay Preview */}
                  {hasPreviewText ? (
                    <div className="absolute inset-0 p-3 sm:p-4 flex flex-col justify-center items-start text-left pointer-events-none z-20">
                      {formData.badge_text.trim() && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2563EB]/40 border border-[#3B82F6]/50 mb-1.5 text-[9px] font-[800] uppercase text-[#93C5FD]">
                          <Sparkles className="w-2.5 h-2.5" />
                          {formData.badge_text.trim()}
                        </div>
                      )}
                      {formData.title.trim() && (
                        <h4 className="text-xs sm:text-sm font-[900] text-white leading-tight line-clamp-2 max-w-[85%] drop-shadow-md">
                          {formData.title.trim()}
                        </h4>
                      )}
                      {formData.subtitle.trim() && (
                        <p className="text-[10px] text-slate-200 line-clamp-1 max-w-[80%] mt-1">
                          {formData.subtitle.trim()}
                        </p>
                      )}
                      {formData.cta_text.trim() && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#2563EB] text-white text-[10px] font-[800]">
                          {formData.cta_text.trim()}
                        </div>
                      )}
                    </div>
                  ) : currentPreviewImage ? (
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] font-[700] text-slate-300 z-20">
                      Image-only banner (no text overlay)
                    </div>
                  ) : null}
                </div>

                {/* Dimension & Aspect Ratio Metadata Indicator */}
                <div className="w-full flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-1 pt-1 border-t border-white/10 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-[700] text-slate-300">
                      {previewTab === "desktop" ? "Desktop Preview" : "Mobile Preview"}:
                    </span>
                    {currentDimensions ? (
                      <span className="text-emerald-400 font-[700] inline-flex items-center gap-1">
                        ✓ {currentDimensions.width} × {currentDimensions.height} px
                        <span className="text-slate-400 font-[500]">
                          ({currentDimensions.ratioStr} {currentDimensions.isPortrait ? "Portrait" : "Landscape"}
                          {currentDimensions.sizeKb ? ` • ${currentDimensions.sizeKb} KB` : ""})
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">No image dimensions detected</span>
                    )}
                  </div>
                  <div className="text-[10.5px] text-slate-400">
                    Mode:{" "}
                    <strong className="text-white font-[700]">
                      {currentFit === "cover" ? "Full-Width Fill (Adaptive)" : "Contain with Ambient Backdrop"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Image Upload Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Desktop Image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-[800] uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-[#2563EB]" />
                    Desktop Image (JPG, PNG, WebP &le; 5MB)
                  </label>
                  {desktopDimensions && (
                    <span className="text-[10px] font-[700] text-emerald-600 dark:text-emerald-400">
                      {desktopDimensions.width}×{desktopDimensions.height} ({desktopDimensions.ratioStr})
                    </span>
                  )}
                </div>
                <div
                  onClick={() => desktopInputRef.current?.click()}
                  className="relative h-32 rounded-[12px] border-2 border-dashed border-slate-300 dark:border-white/15 hover:border-[#2563EB] bg-slate-50 dark:bg-white/[0.02] flex flex-col items-center justify-center p-2 cursor-pointer transition-colors overflow-hidden group"
                >
                  {desktopPreview ? (
                    <>
                      <img
                        src={desktopPreview}
                        alt="Desktop preview"
                        className="w-full h-full object-cover rounded-[8px]"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-[700] gap-1">
                        <div className="flex items-center gap-1.5">
                          <Upload className="w-4 h-4" /> Change Desktop Image
                        </div>
                        {desktopDimensions && (
                          <span className="text-[10px] text-emerald-300 font-[600]">
                            {desktopDimensions.width} × {desktopDimensions.height} px ({desktopDimensions.ratioStr})
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1 group-hover:text-[#2563EB]" />
                      <span className="text-xs font-[700] text-slate-600 dark:text-slate-300 block">
                        Select Desktop Image
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Recommended 1920x1080 (16:9) or 16:7 Banner
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-[800] uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                    Mobile Image (Optional)
                  </label>
                  {mobileDimensions && (
                    <span className="text-[10px] font-[700] text-emerald-600 dark:text-emerald-400">
                      {mobileDimensions.width}×{mobileDimensions.height} ({mobileDimensions.ratioStr})
                    </span>
                  )}
                </div>
                <div
                  onClick={() => mobileInputRef.current?.click()}
                  className="relative h-32 rounded-[12px] border-2 border-dashed border-slate-300 dark:border-white/15 hover:border-emerald-500 bg-slate-50 dark:bg-white/[0.02] flex flex-col items-center justify-center p-2 cursor-pointer transition-colors overflow-hidden group"
                >
                  {mobilePreview ? (
                    <>
                      <img
                        src={mobilePreview}
                        alt="Mobile preview"
                        className="w-full h-full object-cover rounded-[8px]"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-[700] gap-1">
                        <div className="flex items-center gap-1.5">
                          <Upload className="w-4 h-4" /> Change Mobile Image
                        </div>
                        {mobileDimensions && (
                          <span className="text-[10px] text-emerald-300 font-[600]">
                            {mobileDimensions.width} × {mobileDimensions.height} px ({mobileDimensions.ratioStr})
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <Smartphone className="w-5 h-5 text-slate-400 mx-auto mb-1 group-hover:text-emerald-500" />
                      <span className="text-xs font-[700] text-slate-600 dark:text-slate-300 block">
                        Select Mobile Variant
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Falls back to desktop image if empty
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

            {/* Desktop Image Controls: Fit & Focal Point */}
            <div className="p-3.5 bg-slate-50 dark:bg-white/[0.02] rounded-[12px] border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-[800] uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-[#2563EB]" />
                  Desktop Image Positioning & Cropping
                </span>
                <span className="text-[11px] text-slate-500">
                  Controls how the desktop image fills the hero container
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-[700] text-slate-600 dark:text-slate-400">
                    Fit Mode
                  </label>
                  <select
                    value={formData.image_fit}
                    onChange={(e) =>
                      setFormData({ ...formData, image_fit: e.target.value as any })
                    }
                    className="w-full h-9 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2.5 font-[600]"
                  >
                    <option value="cover">Cover (Full Width Fill & Adaptive Crop - Recommended)</option>
                    <option value="contain">Contain (Show Full Graphic with Ambient Backdrop Fill)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-[700] text-slate-600 dark:text-slate-400">
                    Horizontal Focal Position
                  </label>
                  <select
                    value={formData.image_focal_x}
                    onChange={(e) =>
                      setFormData({ ...formData, image_focal_x: e.target.value as any })
                    }
                    className="w-full h-9 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2.5 font-[600]"
                  >
                    <option value="center">Center (Default)</option>
                    <option value="left">Left (Focus left side)</option>
                    <option value="right">Right (Focus right side)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-[700] text-slate-600 dark:text-slate-400">
                    Vertical Focal Position
                  </label>
                  <select
                    value={formData.image_focal_y}
                    onChange={(e) =>
                      setFormData({ ...formData, image_focal_y: e.target.value as any })
                    }
                    className="w-full h-9 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2.5 font-[600]"
                  >
                    <option value="center">Center (Default)</option>
                    <option value="top">Top (Focus top/roof)</option>
                    <option value="bottom">Bottom (Focus bottom)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mobile Image Positioning Controls */}
            <div className="p-3.5 bg-slate-50 dark:bg-white/[0.02] rounded-[12px] border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-[800] uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  Mobile Image Positioning & Cropping
                </span>
                <button
                  type="button"
                  onClick={() => setShowMobileControls(!showMobileControls)}
                  className="text-[11px] font-[700] text-[#2563EB] hover:underline"
                >
                  {showMobileControls ? "Hide Details" : "Customize Mobile"}
                </button>
              </div>

              {showMobileControls && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 dark:border-white/10">
                  <div className="space-y-1">
                    <label className="text-xs font-[700] text-slate-600 dark:text-slate-400">
                      Mobile Fit Mode
                    </label>
                    <select
                      value={formData.mobile_image_fit}
                      onChange={(e) =>
                        setFormData({ ...formData, mobile_image_fit: e.target.value as any })
                      }
                      className="w-full h-9 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2.5 font-[600]"
                    >
                      <option value="cover">Cover (Full Width Fill & Adaptive Crop)</option>
                      <option value="contain">Contain (Show Full Graphic with Ambient Backdrop)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-[700] text-slate-600 dark:text-slate-400">
                      Mobile Horizontal Position
                    </label>
                    <select
                      value={formData.mobile_image_focal_x}
                      onChange={(e) =>
                        setFormData({ ...formData, mobile_image_focal_x: e.target.value as any })
                      }
                      className="w-full h-9 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2.5 font-[600]"
                    >
                      <option value="center">Center (Default)</option>
                      <option value="left">Left (Focus left)</option>
                      <option value="right">Right (Focus right)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-[700] text-slate-600 dark:text-slate-400">
                      Mobile Vertical Position
                    </label>
                    <select
                      value={formData.mobile_image_focal_y}
                      onChange={(e) =>
                        setFormData({ ...formData, mobile_image_focal_y: e.target.value as any })
                      }
                      className="w-full h-9 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2.5 font-[600]"
                    >
                      <option value="center">Center (Default)</option>
                      <option value="top">Top (Focus top)</option>
                      <option value="bottom">Bottom (Focus bottom)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Headline & Badge */}
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
                  Slide Headline (Optional &mdash; leave empty for image-only banner)
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Master IOE Entrance Examinations"
                  className="h-10 rounded-[10px]"
                />
              </div>
            </div>

            {/* Optional Subtitle */}
            <div className="space-y-1.5">
              <label className="text-xs font-[700] text-slate-700 dark:text-slate-300">
                Subtitle / Description (Optional)
              </label>
              <Textarea
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Targeted question banks, mock exams, and complete curriculum for engineering aspirants."
                rows={2}
                className="rounded-[10px] resize-none"
              />
            </div>

            {/* CTA 1 (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
              <div className="space-y-1.5">
                <label className="text-xs font-[700] text-slate-700 dark:text-slate-300">
                  Primary CTA Text (Optional)
                </label>
                <Input
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                  placeholder="e.g. Start Mock Exam"
                  className="h-10 rounded-[10px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-[700] text-slate-700 dark:text-slate-300">
                  Primary CTA Link (Optional)
                </label>
                <Input
                  value={formData.cta_url}
                  onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                  placeholder="/exams or /courses"
                  className="h-10 rounded-[10px]"
                />
              </div>
            </div>

            {/* CTA 2 (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-[700] text-slate-700 dark:text-slate-300">
                  Secondary CTA Text (Optional)
                </label>
                <Input
                  value={formData.cta_secondary_text}
                  onChange={(e) =>
                    setFormData({ ...formData, cta_secondary_text: e.target.value })
                  }
                  placeholder="e.g. Explore Courses"
                  className="h-10 rounded-[10px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-[700] text-slate-700 dark:text-slate-300">
                  Secondary CTA Link (Optional)
                </label>
                <Input
                  value={formData.cta_secondary_url}
                  onChange={(e) =>
                    setFormData({ ...formData, cta_secondary_url: e.target.value })
                  }
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
                <label className="text-xs font-[700] text-slate-500">Display Order:</label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
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
