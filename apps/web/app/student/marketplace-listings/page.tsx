"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  marketplaceApi,
  Product,
  SellerSale,
  MarketplaceSettings,
} from "@/lib/api/marketplace";
import {
  BookOpen,
  Loader2,
  Plus,
  UploadCloud,
  X,
  Package,
  ShoppingBag,
  Eye,
  Archive,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  Tag,
  Star,
  ChevronDown,
  ChevronUp,
  Info,
  Pencil,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONDITION_CHOICES = [
  { value: "LIKE_NEW", label: "Like New" },
  { value: "VERY_GOOD", label: "Very Good" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "ACCEPTABLE", label: "Acceptable" },
];

const CATEGORY_CHOICES = [
  { value: "USED_BOOK", label: "Used Book" },
  { value: "NEW_BOOK", label: "New Book" },
  { value: "REFERENCE_BOOK", label: "Reference Book" },
  { value: "GUIDE_BOOK", label: "Guide Book" },
  { value: "GENERAL_KNOWLEDGE", label: "General Knowledge" },
  { value: "CONSTITUTION_LAW", label: "Constitution / Law" },
  { value: "CURRENT_AFFAIRS", label: "Current Affairs" },
];

const IMAGE_LABEL_CHOICES = [
  { value: "front_cover", label: "Front Cover" },
  { value: "back_cover", label: "Back Cover" },
  { value: "spine", label: "Spine" },
  { value: "inside_pages", label: "Inside Pages" },
  { value: "damage", label: "Visible Damage" },
  { value: "other", label: "Other" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING_REVIEW: {
    label: "Pending Review",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: <Clock className="w-3 h-3" />,
  },
  ACTIVE: {
    label: "Active",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <XCircle className="w-3 h-3" />,
  },
  SOLD: {
    label: "Sold",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  ARCHIVED: {
    label: "Archived",
    color: "bg-slate-100 text-slate-600 border-slate-200",
    icon: <Archive className="w-3 h-3" />,
  },
  DRAFT: {
    label: "Draft",
    color: "bg-slate-100 text-slate-600 border-slate-200",
    icon: <Pencil className="w-3 h-3" />,
  },
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  PAYMENT_SUBMITTED: "bg-blue-100 text-blue-800",
  PAYMENT_VERIFICATION: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  PROCESSING: "bg-teal-100 text-teal-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-orange-100 text-orange-800",
};

// ---------------------------------------------------------------------------
// Blank form state
// ---------------------------------------------------------------------------

const BLANK_FORM = {
  title: "",
  description: "",
  category: "USED_BOOK",
  price: "",
  condition: "GOOD",
  stock: "1",
  location: "",
  author: "",
  publisher: "",
  isbn: "",
  edition: "",
  publication_year: "",
  negotiable: false,
  // condition details
  highlighting: false,
  writing_notes: false,
  page_damage: false,
  cover_condition: "",
  missing_pages: false,
  water_damage: false,
  binding_condition: "",
  extra_notes: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SellerDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"listings" | "sales" | "trust">("listings");

  // Data
  const [listings, setListings] = useState<Product[]>([]);
  const [sales, setSales] = useState<SellerSale[]>([]);
  const [marketSettings, setMarketSettings] =
    useState<MarketplaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [images, setImages] = useState<{ file: File; label: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [showConditionDetails, setShowConditionDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxImages = marketSettings?.max_listing_images ?? 6;

  // ---------------------------------------------------------------------------
  // Fetch helpers
  // ---------------------------------------------------------------------------

  const fetchListings = useCallback(async () => {
    try {
      const data = await marketplaceApi.getMyListings();
      setListings(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const data = await marketplaceApi.getMySales();
      setSales(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchListings(),
      marketplaceApi
        .adminGetMarketplaceSettings()
        .catch(() => null)
        .then((s) => s && setMarketSettings(s)),
    ]).finally(() => setLoading(false));
  }, [fetchListings]);

  useEffect(() => {
    if (activeTab === "sales" && sales.length === 0) {
      fetchSales();
    }
  }, [activeTab, fetchSales, sales.length]);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  const openCreateForm = () => {
    setEditingId(null);
    setForm({ ...BLANK_FORM });
    setImages([]);
    setFormError("");
    setShowConditionDetails(false);
    setShowForm(true);
  };

  const openEditForm = (listing: Product) => {
    setEditingId(listing.id);
    const cd = listing.condition_details || {};
    setForm({
      title: listing.title,
      description: listing.description,
      category: listing.category,
      price: listing.price,
      condition: listing.condition || "GOOD",
      stock: String(listing.stock ?? 1),
      location: listing.location || "",
      author: listing.author || "",
      publisher: listing.publisher || "",
      isbn: listing.isbn || "",
      edition: listing.edition || "",
      publication_year: listing.publication_year || "",
      negotiable: listing.negotiable ?? false,
      highlighting: cd.highlighting ?? false,
      writing_notes: cd.writing_notes ?? false,
      page_damage: cd.page_damage ?? false,
      cover_condition: cd.cover_condition ?? "",
      missing_pages: cd.missing_pages ?? false,
      water_damage: cd.water_damage ?? false,
      binding_condition: cd.binding_condition ?? "",
      extra_notes: cd.extra_notes ?? "",
    });
    setImages([]);
    setFormError("");
    setShowConditionDetails(
      !!(
        cd.highlighting ||
        cd.writing_notes ||
        cd.page_damage ||
        cd.missing_pages ||
        cd.water_damage ||
        cd.cover_condition ||
        cd.binding_condition ||
        cd.extra_notes
      )
    );
    setShowForm(true);
  };

  const handleImageAdd = (files: FileList) => {
    const remaining = maxImages - images.length;
    const newImgs = Array.from(files)
      .slice(0, remaining)
      .map((file) => ({ file, label: "other" }));
    setImages((prev) => [...prev, ...newImgs]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const fd = new FormData();
      // Basic fields
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("category", form.category);
      fd.append("price", form.price);
      fd.append("condition", form.condition);
      fd.append("stock", form.stock);
      fd.append("location", form.location);
      fd.append("negotiable", form.negotiable ? "true" : "false");
      if (form.author) fd.append("author", form.author);
      if (form.publisher) fd.append("publisher", form.publisher);
      if (form.isbn) fd.append("isbn", form.isbn);
      if (form.edition) fd.append("edition", form.edition);
      if (form.publication_year)
        fd.append("publication_year", form.publication_year);

      // Condition details as JSON
      const conditionDetails = {
        highlighting: form.highlighting,
        writing_notes: form.writing_notes,
        page_damage: form.page_damage,
        cover_condition: form.cover_condition,
        missing_pages: form.missing_pages,
        water_damage: form.water_damage,
        binding_condition: form.binding_condition,
        extra_notes: form.extra_notes,
      };
      fd.append("condition_details", JSON.stringify(conditionDetails));

      // Images
      images.forEach((img) => {
        fd.append("images", img.file);
        fd.append("image_labels", img.label);
      });

      if (editingId) {
        await marketplaceApi.updateListing(editingId, fd);
      } else {
        await marketplaceApi.createListing(fd);
      }

      await fetchListings();
      setShowForm(false);
      setEditingId(null);
    } catch (err: any) {
      setFormError(err.message || "Failed to save listing.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id: number) => {
    if (!confirm("Archive this listing?")) return;
    try {
      await marketplaceApi.archiveListing(id);
      await fetchListings();
    } catch (err: any) {
      alert(err.message || "Failed to archive.");
    }
  };

  const handleResubmit = async (id: number) => {
    try {
      await marketplaceApi.resubmitListing(id);
      await fetchListings();
    } catch (err: any) {
      alert(err.message || "Failed to resubmit.");
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const getStatusConfig = (s: string) =>
    STATUS_CONFIG[s] || {
      label: s,
      color: "bg-slate-100 text-slate-600 border-slate-200",
      icon: null,
    };

  const primaryImage = (listing: Product) => {
    if (listing.images?.length) {
      const primary = listing.images.find((i) => i.is_primary);
      return primary?.image || listing.images[0]?.image || null;
    }
    return listing.cover_image || null;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-[#163E6B]" />
      </div>
    );
  }

  return (
    <div className="font-sans text-slate-900 dark:text-slate-50">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-[#163E6B] dark:text-[#D4A72C]" />
              Seller Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Manage your used book listings and track your sales.
            </p>
          </div>
          {activeTab === "listings" && (
            <Button
              onClick={openCreateForm}
              className="bg-[#163E6B] hover:bg-[#1a4d82] text-white font-bold gap-2"
            >
              <Plus className="w-4 h-4" /> Sell a Book
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mb-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1 w-fit">
          {(
            [
              { key: "listings", label: "My Listings", icon: Package },
              { key: "sales", label: "My Sales", icon: ShoppingBag },
              { key: "trust", label: "Trust Center", icon: Star },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === key
                  ? "bg-[#163E6B] text-white shadow"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* CREATE / EDIT FORM                                                  */}
        {/* ------------------------------------------------------------------ */}
        {showForm && activeTab === "listings" && (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 md:p-8 mb-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {editingId ? "Edit Listing" : "Create New Listing"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="flex gap-2 items-start p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-5 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="label-style">Book Title *</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    className="input-style"
                    placeholder="e.g. Loksewa Tayari Pustika"
                  />
                </div>
                <div>
                  <label className="label-style">Author</label>
                  <input
                    value={form.author}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, author: e.target.value }))
                    }
                    className="input-style"
                  />
                </div>
                <div>
                  <label className="label-style">Publisher</label>
                  <input
                    value={form.publisher}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, publisher: e.target.value }))
                    }
                    className="input-style"
                  />
                </div>
                <div>
                  <label className="label-style">ISBN</label>
                  <input
                    value={form.isbn}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isbn: e.target.value }))
                    }
                    className="input-style"
                    placeholder="13-digit ISBN"
                  />
                </div>
                <div>
                  <label className="label-style">Edition</label>
                  <input
                    value={form.edition}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, edition: e.target.value }))
                    }
                    className="input-style"
                    placeholder="e.g. 3rd"
                  />
                </div>
                <div>
                  <label className="label-style">Publication Year</label>
                  <input
                    value={form.publication_year}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        publication_year: e.target.value,
                      }))
                    }
                    className="input-style"
                    placeholder="e.g. 2023"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="label-style">Category *</label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    className="input-style"
                  >
                    {CATEGORY_CHOICES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-style">Condition *</label>
                  <select
                    required
                    value={form.condition}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, condition: e.target.value }))
                    }
                    className="input-style"
                  >
                    {CONDITION_CHOICES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-style">Price (Rs.) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                    className="input-style"
                  />
                </div>
                <div>
                  <label className="label-style">Stock / Copies *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.stock}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, stock: e.target.value }))
                    }
                    className="input-style"
                  />
                </div>
                <div>
                  <label className="label-style">Location *</label>
                  <input
                    required
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                    className="input-style"
                    placeholder="e.g. Kathmandu, Butwal"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="negotiable"
                    checked={form.negotiable}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, negotiable: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#163E6B]"
                  />
                  <label
                    htmlFor="negotiable"
                    className="text-sm font-semibold cursor-pointer"
                  >
                    Price is Negotiable
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label-style">Description *</label>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="input-style min-h-[100px] resize-y"
                  placeholder="Describe the book's content, notes inside, usage history..."
                />
              </div>

              {/* Condition Details (collapsible) */}
              <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setShowConditionDetails((v) => !v)
                  }
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-white/5 text-sm font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#163E6B] dark:text-[#D4A72C]" />
                    Physical Condition Details (Recommended)
                  </span>
                  {showConditionDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showConditionDetails && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        key: "highlighting",
                        label: "Has highlighting / underlines",
                      },
                      {
                        key: "writing_notes",
                        label: "Has handwritten notes / writing",
                      },
                      { key: "page_damage", label: "Has torn or damaged pages" },
                      { key: "missing_pages", label: "Has missing pages" },
                      { key: "water_damage", label: "Has water damage or stains" },
                    ].map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={(form as any)[key]}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              [key]: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 accent-[#163E6B]"
                        />
                        {label}
                      </label>
                    ))}
                    <div>
                      <label className="label-style">Cover Condition</label>
                      <input
                        value={form.cover_condition}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            cover_condition: e.target.value,
                          }))
                        }
                        className="input-style"
                        placeholder="e.g. Good, Minor scratches"
                      />
                    </div>
                    <div>
                      <label className="label-style">Binding Condition</label>
                      <input
                        value={form.binding_condition}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            binding_condition: e.target.value,
                          }))
                        }
                        className="input-style"
                        placeholder="e.g. Intact, Slightly loose"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label-style">Additional Notes</label>
                      <textarea
                        value={form.extra_notes}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            extra_notes: e.target.value,
                          }))
                        }
                        className="input-style"
                        placeholder="Any other condition details buyers should know..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Image Upload */}
              <div>
                <label className="label-style mb-2 block">
                  Book Images (max {maxImages})
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) =>
                    e.target.files && handleImageAdd(e.target.files)
                  }
                />

                {images.length === 0 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <UploadCloud className="w-7 h-7 text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-500">
                      Upload book photos
                    </p>
                    <p className="text-xs text-slate-400">
                      Front cover, back, pages, damage, etc.
                    </p>
                  </div>
                )}

                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className="relative border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden"
                      >
                        <img
                          src={URL.createObjectURL(img.file)}
                          alt={img.label}
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1.5">
                          <select
                            value={img.label}
                            onChange={(e) => {
                              const updated = [...images];
                              const item = updated[i];
                              if (item) item.label = e.target.value;
                              setImages(updated);
                            }}
                            className="w-full text-xs bg-transparent text-white border-0 outline-none"
                          >
                            {IMAGE_LABEL_CHOICES.map((l) => (
                              <option
                                key={l.value}
                                value={l.value}
                                className="text-black"
                              >
                                {l.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setImages((prev) => prev.filter((_, j) => j !== i))
                          }
                          className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {images.length < maxImages && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <Plus className="w-6 h-6 mb-1" />
                        <span className="text-xs">Add more</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#D4A72C] hover:bg-[#c49a20] text-[#0A1118] font-bold px-8"
                >
                  {submitting && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  {editingId ? "Update Listing" : "Submit for Review"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* LISTINGS TAB                                                        */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "listings" && (
          <div className="space-y-4">
            {listings.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="font-bold text-lg text-slate-600 dark:text-slate-400">
                  No listings yet
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Click "Sell a Book" to list your first used book.
                </p>
              </div>
            ) : (
              listings.map((listing) => {
                const sc = getStatusConfig(listing.listing_status || "");
                const img = primaryImage(listing);
                return (
                  <div
                    key={listing.id}
                    className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row gap-4"
                  >
                    {/* Image */}
                    <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-white/10">
                      {img ? (
                        <img
                          src={img}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <BookOpen className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 items-start">
                        <h4 className="font-bold text-base truncate flex-1">
                          {listing.title}
                        </h4>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${sc.color}`}
                        >
                          {sc.icon} {sc.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          Rs. {listing.price}
                          {listing.negotiable && (
                            <span className="text-emerald-600 font-semibold ml-1">
                              (Negotiable)
                            </span>
                          )}
                        </span>
                        {listing.condition_display && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {listing.condition_display}
                          </span>
                        )}
                        {listing.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {listing.location}
                          </span>
                        )}
                        <span>Stock: {listing.stock}</span>
                        <span>
                          {listing.images?.length ?? 0} image
                          {listing.images?.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Rejection reason */}
                      {listing.listing_status === "REJECTED" &&
                        listing.rejection_reason && (
                          <div className="mt-2 flex gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>
                              <strong>Rejection reason:</strong>{" "}
                              {listing.rejection_reason}
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditForm(listing)}
                        className="text-xs gap-1"
                        disabled={
                          listing.listing_status === "SOLD" ||
                          listing.listing_status === "ARCHIVED"
                        }
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>

                      {listing.listing_status === "REJECTED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResubmit(listing.id)}
                          className="text-xs gap-1 text-blue-600 border-blue-300"
                        >
                          <RefreshCw className="w-3 h-3" /> Resubmit
                        </Button>
                      )}

                      {listing.listing_status !== "SOLD" &&
                        listing.listing_status !== "ARCHIVED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleArchive(listing.id)}
                            className="text-xs gap-1 text-slate-500"
                          >
                            <Archive className="w-3 h-3" /> Archive
                          </Button>
                        )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SALES TAB                                                           */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "sales" && (
          <div className="space-y-4">
            {salesLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#163E6B]" />
              </div>
            ) : sales.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="font-bold text-lg text-slate-600 dark:text-slate-400">
                  No sales yet
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Once a buyer purchases your listing, it will appear here.
                </p>
              </div>
            ) : (
              sales.map((sale) => (
                <div
                  key={sale.id}
                  className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5"
                >
                  {/* Order header */}
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                    <span className="text-sm font-bold">
                      Order #{sale.id}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${ORDER_STATUS_COLOR[sale.status] || "bg-slate-100 text-slate-600"}`}
                    >
                      {sale.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-3 mb-4">
                    {sale.my_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row items-start gap-4 text-sm p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10"
                      >
                        {item.product_details.cover_image && (
                          <img
                            src={item.product_details.cover_image}
                            alt=""
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-slate-200 dark:border-white/10"
                          />
                        )}
                        <div className="flex-1 min-w-0 w-full">
                          <p className="font-bold text-base truncate text-slate-800 dark:text-slate-200">
                            {item.product_details.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                            <span className="text-slate-500 font-medium bg-white dark:bg-black/20 px-2 py-1 rounded shadow-sm">
                              Price: Rs. {item.price}
                            </span>
                            <span className="text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded shadow-sm">
                              Commission: -Rs. {item.commission_amount}
                            </span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded shadow-sm">
                              Net Earnings: Rs. {item.seller_earning}
                            </span>
                          </div>
                          
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${item.fulfillment_status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'}`}>
                              Fulfillment: {item.fulfillment_status}
                            </span>
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${item.payout_status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                              Payout: {item.payout_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex flex-col md:flex-row justify-between gap-4 text-sm pt-4 border-t border-slate-100 dark:border-white/10">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><MapPin className="w-4 h-4"/> Shipping Details</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{sale.buyer_display.name}</span>
                      <span className="whitespace-pre-line text-slate-500 dark:text-slate-400 text-xs mt-1 bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-white/10">{sale.buyer_display.shipping_address}</span>
                    </div>
                    <div className="flex flex-col gap-1 md:text-right">
                      <span className="text-slate-500 text-xs">Placed: {new Date(sale.created_at).toLocaleDateString("en-NP", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TRUST CENTER TAB                                                    */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "trust" && (
          <div className="space-y-6">
            {/* Reputation Summary */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
              <div className="text-center md:text-left">
                <h2 className="text-xl font-bold mb-1">Your Reputation</h2>
                <p className="text-sm text-slate-500">Based on buyer feedback</p>
              </div>
              <div className="flex-1 flex justify-center md:justify-start gap-12">
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-extrabold text-amber-500 flex items-center gap-2">
                    {listings[0]?.seller_details?.average_rating?.toFixed(1) || "N/A"}
                    <Star className="w-8 h-8 fill-current" />
                  </span>
                  <span className="text-sm font-medium mt-1">Average Rating</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-extrabold text-[#163E6B] dark:text-[#D4A72C]">
                    {listings[0]?.seller_details?.total_reviews || 0}
                  </span>
                  <span className="text-sm font-medium mt-1">Total Reviews</span>
                </div>
              </div>
            </div>

            {/* Note about active disputes */}
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5 flex items-start gap-4">
              <Info className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-800 dark:text-amber-300">Disputes & Payout Holds</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  If a buyer opens a dispute against an item you sold, its payout will be placed <span className="font-bold">ON HOLD</span>. Admin will review the dispute and release the payout once resolved. Check your active sales to see if any payouts are on hold.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global styles injected via className strings since we can't use CSS modules here */}
      <style>{`
        .label-style { display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem; color: inherit; }
        .input-style {
          width: 100%; height: 2.75rem; padding: 0 1rem;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 0.875rem;
        }
        .dark .input-style {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.1);
          color: white;
        }
        textarea.input-style { height: auto; padding: 0.75rem 1rem; }
        select.input-style { appearance: none; }
      `}</style>
    </div>
  );
}
