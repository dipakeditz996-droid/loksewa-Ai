"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Globe, Mail, Shield, FileText, RotateCcw, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { adminApi, AdminWebsitePage } from "@/lib/api/admin";
import toast from "react-hot-toast";

const PAGE_META: Record<string, { label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  contact: { label: "Contact", description: "Manage contact information and support details.", icon: Mail },
  privacy: { label: "Privacy Policy", description: "Manage the public privacy policy.", icon: Shield },
  terms: { label: "Terms & Conditions", description: "Manage platform terms.", icon: FileText },
  refund: { label: "Refund Policy", description: "Manage refund/payment policy.", icon: RotateCcw },
};

// Fixed display order regardless of what order the API returns rows in.
const SLUG_ORDER = ["contact", "privacy", "terms", "refund"];

export default function WebsiteContentPage() {
  const [pages, setPages] = useState<AdminWebsitePage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getWebsitePages()
      .then(setPages)
      .catch(() => toast.error("Failed to load website content."))
      .finally(() => setLoading(false));
  }, []);

  const ordered = SLUG_ORDER
    .map((slug) => pages.find((p) => p.slug === slug))
    .filter((p): p is AdminWebsitePage => !!p);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
          <Globe className="w-6 h-6 text-[#D4A72C]" />
          Website Content
        </h1>
        <p className="text-slate-500 text-sm mt-1">Manage public website information, policies, and customer-facing content.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {ordered.map((page) => {
            const meta = PAGE_META[page.slug];
            const Icon = meta?.icon ?? Globe;
            return (
              <Link
                key={page.slug}
                href={`/admin-dashboard/website-content/${page.slug}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#0B2545]/5 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#0B2545]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#0B2545]">{meta?.label ?? page.title}</p>
                    <Badge
                      variant="outline"
                      className={
                        page.status === "published"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                          : "bg-slate-100 text-slate-600 border-slate-200 text-[10px]"
                      }
                    >
                      {page.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{meta?.description}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Updated {new Date(page.updated_at).toLocaleDateString()}
                    {page.updated_by_name ? ` by ${page.updated_by_name}` : ""} &middot; /{page.slug}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-sm font-semibold text-[#0B2545] group-hover:text-[#D4A72C] transition-colors shrink-0">
                  Edit <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
