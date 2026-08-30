"use client";

import React, { useEffect, useState } from "react";
import {
  ClipboardList, Download, Settings as SettingsIcon, Clock, Loader2, AlertCircle,
  CheckCircle2, XCircle, Server
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminApi, AdminExportJob } from "@/lib/api/admin";
import { downloadFile } from "@/lib/api/client";
import toast from "react-hot-toast";

const EXPORT_STATUS_META: Record<AdminExportJob["status"], { label: string; className: string; icon: React.ReactNode }> = {
  pending: { label: "Queued", className: "bg-slate-100 text-slate-600", icon: <Clock className="w-3.5 h-3.5" /> },
  processing: { label: "Processing", className: "bg-blue-50 text-blue-600", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  completed: { label: "Ready", className: "bg-emerald-50 text-emerald-600", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  failed: { label: "Failed", className: "bg-red-50 text-red-600", icon: <XCircle className="w-3.5 h-3.5" /> },
};

const RETENTION_OPTIONS = [30, 90, 180, 365];

export default function AuditLogsLayout({ children }: { children: React.ReactNode }) {
  const [retentionModalOpen, setRetentionModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [retentionDays, setRetentionDays] = useState(90);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [retentionError, setRetentionError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportJobs, setExportJobs] = useState<AdminExportJob[]>([]);
  const [queueingJob, setQueueingJob] = useState(false);

  const fetchExportJobs = async () => {
    try {
      setExportJobs(await adminApi.getAuditLogExportJobs());
    } catch (error) {
      console.error("Failed to fetch export jobs", error);
    }
  };

  useEffect(() => {
    fetchExportJobs();
    // Large exports can take a while to generate - poll rather than require
    // a manual refresh, but only while something is still in flight.
    const interval = setInterval(() => {
      setExportJobs((prev) => {
        if (prev.some((j) => j.status === "pending" || j.status === "processing")) {
          fetchExportJobs();
        }
        return prev;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleQueueBackgroundExport = async () => {
    setQueueingJob(true);
    try {
      await adminApi.createAuditLogExportJob();
      await fetchExportJobs();
      toast.success("Export queued - it'll appear below once it's ready.");
      setExportModalOpen(false);
    } catch {
      toast.error("Failed to queue the background export. Please try again.");
    } finally {
      setQueueingJob(false);
    }
  };

  useEffect(() => {
    if (!retentionModalOpen) return;
    setRetentionLoading(true);
    setRetentionError(null);
    adminApi
      .getAuditLogRetention()
      .then((data) => setRetentionDays(data.retentionDays))
      .catch(() => setRetentionError("Unable to load the current retention policy."))
      .finally(() => setRetentionLoading(false));
  }, [retentionModalOpen]);

  const handleSaveRetention = async () => {
    setRetentionSaving(true);
    setRetentionError(null);
    try {
      const result = await adminApi.saveAuditLogRetention(retentionDays);
      toast.success(
        result.purgedCount > 0
          ? `Retention set to ${result.retentionDays} days. Purged ${result.purgedCount} older admin-action log${result.purgedCount === 1 ? "" : "s"}.`
          : `Retention set to ${result.retentionDays} days.`
      );
      setRetentionModalOpen(false);
    } catch {
      setRetentionError("Failed to save the retention policy. Please try again.");
    } finally {
      setRetentionSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadFile("/admin/audit-logs/export/", "audit-logs.csv");
      toast.success("Audit logs exported.");
      setExportModalOpen(false);
    } catch {
      toast.error("Failed to export audit logs. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] relative bg-slate-50">

      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 md:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-[#D4A72C]" />
              Audit Logs
            </h1>
            <p className="text-slate-500 text-sm mt-1">Monitor system activity and track administrative actions.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setRetentionModalOpen(true)}>
              <SettingsIcon className="w-4 h-4 mr-2" /> Retention
            </Button>
            <Button size="sm" className="bg-[#0B2545] text-white hover:bg-[#163E6C]" onClick={() => setExportModalOpen(true)}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 pb-24 space-y-6">
        {/* Background export jobs - generated by a Celery job
            (administration/export_service.py) instead of in-request, for
            when the audit log is too large for "Download CSV Now" above to
            be comfortable. */}
        {exportJobs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" /> Background Export Jobs
            </p>
            {exportJobs.map((job) => {
              const meta = EXPORT_STATUS_META[job.status];
              return (
                <div key={job.id} className="flex items-center justify-between gap-3 text-sm py-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.className}`}>
                      {meta.icon} {meta.label}
                    </span>
                    <span className="text-slate-500">
                      {new Date(job.createdAt).toLocaleString()}
                      {job.status === "completed" && ` · ${job.rowCount.toLocaleString()} rows`}
                      {job.status === "failed" && job.errorMessage && ` · ${job.errorMessage}`}
                    </span>
                  </div>
                  {job.status === "completed" && job.downloadUrl && (
                    <a href={job.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-[#0B2545] font-semibold hover:underline flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {children}
      </main>

      {/* Retention Settings Modal */}
      <Dialog open={retentionModalOpen} onOpenChange={(open) => !retentionSaving && setRetentionModalOpen(open)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#D4A72C]" /> Audit Retention Policy
            </DialogTitle>
            <DialogDescription>
              Configure how long admin-action audit log entries are kept before being permanently deleted.
              User registrations, content creation, and evaluation records shown alongside them are never
              affected - this only prunes the AuditLog table.
            </DialogDescription>
          </DialogHeader>

          {retentionLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Retention Period</label>
                <select
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  disabled={retentionSaving}
                >
                  {RETENTION_OPTIONS.map((days) => (
                    <option key={days} value={days}>
                      {days === 365 ? "1 Year" : `${days} Days`}
                    </option>
                  ))}
                </select>
              </div>

              {retentionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{retentionError}</p>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                <p>Saving immediately deletes admin-action log entries older than {retentionDays} days. This cannot be undone.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRetentionModalOpen(false)} disabled={retentionSaving}>
              Cancel
            </Button>
            <Button
              className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
              onClick={handleSaveRetention}
              disabled={retentionLoading || retentionSaving}
            >
              {retentionSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Modal */}
      <Dialog open={exportModalOpen} onOpenChange={(open) => !exporting && setExportModalOpen(open)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-500" /> Export Audit Logs
            </DialogTitle>
            <DialogDescription>
              Download every audit event currently on record as a CSV file.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-600">
              The export includes the same fields shown in the table: timestamp, action, user, email, details, and severity.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600 flex items-start gap-2">
              <Server className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
              <p>
                If the log is large, generate it in the background instead - it appears below the header once ready,
                without holding this page open.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setExportModalOpen(false)} disabled={exporting || queueingJob} className="sm:mr-auto">
              Cancel
            </Button>
            <Button variant="outline" onClick={handleQueueBackgroundExport} disabled={exporting || queueingJob}>
              {queueingJob ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Server className="w-4 h-4 mr-2" />}
              Generate in Background
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleExport} disabled={exporting || queueingJob}>
              {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {exporting ? "Exporting…" : "Download CSV Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
