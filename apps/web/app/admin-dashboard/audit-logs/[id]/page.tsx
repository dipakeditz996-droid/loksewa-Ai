"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, Loader2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminApi, AdminAuditLogDetail } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";

const SEVERITY_STYLE: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  success: "bg-emerald-100 text-emerald-700",
};

export default function AuditEventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = decodeURIComponent(String(params.id));

  const [detail, setDetail] = useState<AdminAuditLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminApi
      .getAuditLogDetail(eventId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Unable to load this event.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-700">Event Not Found</h2>
        <p className="text-slate-500 mt-2 text-center max-w-md">
          {error || "This audit event doesn't exist or may have been pruned by the retention policy."}
        </p>
        <Button className="mt-6" variant="outline" onClick={() => router.push("/admin-dashboard/audit-logs")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Audit Logs
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/admin-dashboard/audit-logs")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Audit Logs
      </Button>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0B2545]/5 rounded-lg">
              <Activity className="w-5 h-5 text-[#0B2545]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#0B2545]">{detail.actionLabel}</h1>
              <p className="text-sm text-slate-500">{new Date(detail.timestamp).toLocaleString()}</p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded ${SEVERITY_STYLE[detail.severity] || "bg-slate-100 text-slate-600"}`}>
            {detail.severity.charAt(0).toUpperCase() + detail.severity.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Actor</p>
            <p className="text-sm text-slate-800 mt-1">{detail.actorName || "System"}</p>
            {detail.actorEmail && <p className="text-xs text-slate-500">{detail.actorEmail}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Entity</p>
            <p className="text-sm text-slate-800 mt-1">
              {detail.entityType}
              {detail.entityId ? ` #${detail.entityId}` : ""}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Details</p>
          <pre className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(detail.details, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
