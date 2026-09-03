"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Loader2,
  BookOpen,
  Clock,
  AlertCircle,
  User,
  MapPin,
  Tag,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { marketplaceApi, Product } from "@/lib/api/marketplace";
import { toast } from "sonner";

const STATUS_CHOICES = ["", "PENDING_REVIEW", "ACTIVE", "REJECTED", "SOLD", "ARCHIVED"];

const STATUS_BADGE: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-100 text-amber-800 border border-amber-200",
  ACTIVE: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  REJECTED: "bg-red-100 text-red-800 border border-red-200",
  SOLD: "bg-blue-100 text-blue-800 border border-blue-200",
  ARCHIVED: "bg-slate-100 text-slate-600 border border-slate-200",
  DRAFT: "bg-slate-100 text-slate-600 border border-slate-200",
};

export default function ListingModerationPage() {
  const [listings, setListings] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING_REVIEW");
  const [selected, setSelected] = useState<Product | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await marketplaceApi.adminGetProducts({
        is_seller_listing: "true",
      });
      setListings(data);
    } catch {
      toast.error("Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = listings.filter(
    (l) =>
      (!statusFilter || l.listing_status === statusFilter) &&
      (l.title.toLowerCase().includes(search.toLowerCase()) ||
      (l.author || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.location || "").toLowerCase().includes(search.toLowerCase()))
  );

  const handleApprove = async (id: number) => {
    setBusy(id);
    try {
      await marketplaceApi.adminApproveListing(id);
      toast.success("Listing approved and published.");
      fetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve.");
    } finally {
      setBusy(null);
    }
  };

  const handleRejectOpen = (listing: Product) => {
    setSelected(listing);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selected) return;
    setBusy(selected.id);
    try {
      await marketplaceApi.adminRejectListing(selected.id, rejectReason);
      toast.success("Listing rejected.");
      setShowRejectModal(false);
      fetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject.");
    } finally {
      setBusy(null);
    }
  };

  const handleArchive = async (id: number) => {
    if (!confirm("Archive this listing?")) return;
    setBusy(id);
    try {
      await marketplaceApi.adminArchiveListing(id);
      toast.success("Listing archived.");
      fetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive.");
    } finally {
      setBusy(null);
    }
  };

  const primaryImage = (l: Product) => {
    if (l.images?.length) {
      const p = l.images.find((i) => i.is_primary);
      return p?.image || l.images[0]?.image || null;
    }
    return l.cover_image;
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0B2545] dark:text-slate-100">Listing Moderation</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Review, approve, or reject student-submitted book listings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none"
          >
            <option value="">All Statuses</option>
            {STATUS_CHOICES.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by title, author, location..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Pending", key: "PENDING_REVIEW", color: "text-amber-600 dark:text-amber-400" },
          { label: "Active", key: "ACTIVE", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Rejected", key: "REJECTED", color: "text-red-600 dark:text-red-400" },
          { label: "Sold", key: "SOLD", color: "text-blue-600 dark:text-blue-400" },
        ].map(({ label, key, color }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-left transition-all ${statusFilter === key ? `ring-2 ring-current ${color}` : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10"}`}
          >
            <p className="text-xs font-bold mb-0.5">{label}</p>
            <p className={`text-lg font-extrabold ${statusFilter === key ? color : "text-[#0B2545] dark:text-slate-200"}`}>
              {listings.filter((l) => l.listing_status === key).length}
            </p>
          </button>
        ))}
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#163E6B]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/5 rounded-2xl">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-[15px] font-bold text-[#0B2545] dark:text-slate-200">
            {statusFilter === "ACTIVE" ? "No active listings yet."
            : statusFilter === "PENDING_REVIEW" ? "No listings awaiting review."
            : statusFilter === "REJECTED" ? "No rejected listings."
            : statusFilter === "SOLD" ? "No sold listings."
            : "No listings found."}
          </p>
          <p className="text-[13px] text-slate-500 mt-1">
            {statusFilter === "ACTIVE" ? "Approved student books will appear here." : "Change your filters or check back later."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((listing) => (
            <div
              key={listing.id}
              className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 shadow-sm"
            >
              {/* Image */}
              <div className="w-20 h-28 sm:w-24 sm:h-32 shrink-0 rounded-lg overflow-hidden bg-slate-50 dark:bg-white/10 border border-slate-100 dark:border-white/5 flex items-center justify-center p-2">
                {primaryImage(listing) ? (
                  <img
                    src={primaryImage(listing)!}
                    alt={listing.title}
                    className="w-full h-full object-cover rounded shadow-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <BookOpen className="w-6 h-6 text-slate-300" />
                    <span className="text-[10px] text-slate-400 font-medium leading-tight">Book image unavailable</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2 items-start mb-1">
                  <h4 className="text-[16px] font-bold text-[#0B2545] dark:text-slate-100 truncate flex-1">{listing.title}</h4>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${STATUS_BADGE[listing.listing_status || ""] || "bg-slate-100 text-slate-600"}`}
                  >
                    {(listing.listing_status || "").replace(/_/g, " ")}
                  </span>
                </div>

                <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-400 mb-3">
                  {listing.author ? `${listing.author} · ` : ""}Student Seller · Used Book
                </p>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Rs. {listing.price}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {listing.seller_details?.first_name || "Unknown Seller"}
                  </span>
                  {listing.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {listing.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Condition: {listing.condition_display || listing.condition || "N/A"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Stock: {listing.stock || 1}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(listing.created_at).toLocaleDateString("en-NP")}
                  </span>
                </div>

                {/* Description preview */}
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2">
                  {listing.description}
                </p>

                {/* Images row */}
                {listing.images && listing.images.length > 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {listing.images.slice(0, 5).map((img) => (
                      <a
                        key={img.id}
                        href={img.image}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={img.image}
                          alt={img.label}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-white/10 hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                    {listing.images.length > 5 && (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-slate-500">
                        +{listing.images.length - 5}
                      </div>
                    )}
                  </div>
                )}

                {/* Rejection reason */}
                {listing.listing_status === "REJECTED" && listing.rejection_reason && (
                  <div className="mt-2 flex gap-1.5 items-start text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      <strong>Rejection reason:</strong> {listing.rejection_reason}
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex sm:flex-col gap-2 shrink-0 sm:justify-start items-end border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-white/10 pt-3 sm:pt-0 sm:pl-4 mt-3 sm:mt-0 w-full sm:w-auto">
                {listing.listing_status === "PENDING_REVIEW" && (
                  <>
                    <Button
                      size="sm"
                      disabled={busy === listing.id}
                      onClick={() => handleApprove(listing.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                    >
                      {busy === listing.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === listing.id}
                      onClick={() => handleRejectOpen(listing)}
                      className="text-red-600 border-red-300 hover:bg-red-50 text-xs gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </Button>
                  </>
                )}

                {listing.listing_status === "REJECTED" && (
                  <Button
                    size="sm"
                    disabled={busy === listing.id}
                    onClick={() => handleApprove(listing.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Approve
                  </Button>
                )}

                {listing.listing_status === "ACTIVE" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === listing.id}
                      onClick={() => handleRejectOpen(listing)}
                      className="text-red-600 border-red-300 text-xs gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === listing.id}
                      onClick={() => handleArchive(listing.id)}
                      className="text-xs"
                    >
                      Archive
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">
              Provide a reason for rejection. This will be shown to the seller
              so they can improve and resubmit.
            </p>
            <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl text-sm font-semibold">
              {selected?.title}
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">
                Reason (shown to seller)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Please upload clearer images of the book cover and condition..."
                className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-slate-100 text-sm resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectConfirm}
                disabled={busy !== null}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {busy !== null && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Reject Listing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
