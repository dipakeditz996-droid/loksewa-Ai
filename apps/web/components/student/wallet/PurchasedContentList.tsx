"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Coins,
  ExternalLink,
  Filter,
  Search,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { walletApi, PurchasedContentItem } from "@/lib/api/wallet";

export const PurchasedContentList: React.FC = () => {
  const [items, setItems] = useState<PurchasedContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchPurchased = useCallback(async () => {
    setLoading(true);
    try {
      const res = await walletApi.getPurchasedContent({
        status: statusFilter,
        content_type: typeFilter,
        page,
      });
      setItems(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      console.error("Failed to load purchased content:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, page]);

  useEffect(() => {
    fetchPurchased();
  }, [fetchPurchased]);

  const getContentUrl = (item: PurchasedContentItem) => {
    if (item.content_type === "STUDY_MATERIAL") {
      return `/student/learning?note=${item.content_id}`;
    } else if (item.content_type === "EXAMINATION") {
      return `/student/exams/${item.content_id}`;
    } else {
      return `/student/practice?set=${item.content_id}`;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "STUDY_MATERIAL":
        return <FileText className="w-5 h-5 text-blue-500" />;
      case "EXAMINATION":
        return <BookOpen className="w-5 h-5 text-purple-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <span>Unlocked Content ({totalCount})</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Learning materials and examinations you unlocked with coins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Unlocked</option>
            <option value="EXPIRED">Expired Access</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">All Types</option>
            <option value="STUDY_MATERIAL">Study Notes</option>
            <option value="EXAMINATION">Examinations</option>
            <option value="QUESTION_SET">Question Sets</option>
          </select>

          <button
            onClick={fetchPurchased}
            title="Refresh list"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
          <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
          <span className="text-xs font-medium">Loading your unlocked items...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
          <div className="max-w-sm mx-auto">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Unlocked Content Found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              You haven&apos;t purchased any standalone study notes or exams with coins yet.
            </p>
          </div>
          <Link
            href="/student/learning"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <span>Explore Learning Materials</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {items.map((item) => {
            const isCurrentlyValid = item.is_valid && item.status === "ACTIVE";
            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0 mt-0.5">
                    {getTypeIcon(item.content_type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.content_type_display || item.content_type}
                      </span>
                      {isCurrentlyValid ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                          <XCircle className="w-3 h-3" />
                          <span>Expired</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {item.content_title || `${item.content_type} #${item.content_id}`}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                      <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                        <Coins className="w-3.5 h-3.5" />
                        {item.coins_spent} Coins
                      </span>
                      <span>•</span>
                      <span>
                        Purchased: {new Date(item.purchased_at).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {item.is_permanent
                          ? "Permanent Access"
                          : item.expires_at
                          ? `Expires: ${new Date(item.expires_at).toLocaleDateString()}`
                          : "Permanent"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {isCurrentlyValid ? (
                    <Link
                      href={getContentUrl(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400 italic px-2">Access Ended</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
