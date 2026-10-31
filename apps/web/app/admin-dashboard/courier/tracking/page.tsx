"use client";

import React, { useEffect, useState } from "react";
import { 
  marketplaceApi, 
  CourierSyncLog, 
  NCMConfiguration 
} from "@/lib/api/marketplace";
import { 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Calendar, 
  Cpu, 
  Server, 
  ShieldCheck, 
  ArrowRight,
  Play
} from "lucide-react";
import toast from "react-hot-toast";

export default function TrackingSyncPage() {
  const [logs, setLogs] = useState<CourierSyncLog[]>([]);
  const [config, setConfig] = useState<NCMConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncLimit, setSyncLimit] = useState(50);

  const loadData = async () => {
    try {
      setLoading(true);
      const [logsData, configData] = await Promise.all([
        marketplaceApi.adminGetCourierSyncLogs(),
        marketplaceApi.adminGetCourierSettings(),
      ]);
      setLogs(logsData);
      setConfig(configData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load synchronization logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerSync = async () => {
    try {
      setSyncing(true);
      const res = await marketplaceApi.adminTriggerCourierSync(syncLimit);
      toast.success(
        `Batch synchronization completed (${res.status}): ${res.shipments_checked} checked, ${res.shipments_updated} updated, ${res.errors_count} errors.`
      );
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger synchronization");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#D4A72C]" />
            Tracking & Synchronization Console
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Monitor automated courier tracking polling, inspect batch execution telemetry, and manually sync active orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
            <span>Batch limit:</span>
            <select
              value={syncLimit}
              onChange={(e) => setSyncLimit(Number(e.target.value))}
              className="font-bold text-slate-800 bg-transparent focus:outline-none"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <button
            onClick={handleTriggerSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0B2545] text-white hover:bg-[#133966] transition-colors shadow-xs disabled:opacity-60"
          >
            <Play className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : "fill-white"}`} />
            {syncing ? "Running Sync..." : "Run Batch Sync Now"}
          </button>
        </div>
      </div>

      {/* Scheduler Architecture & Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Scheduler Architecture */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Scheduler Engine</span>
            <Cpu className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Render Cron / Celery Worker</div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Platform background jobs run via Render Scheduled Job invoking the Django management command on a fixed cron schedule.
          </p>
        </div>

        {/* Card 2: Auto-Sync Policy */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Auto-Sync State</span>
            <div className={`w-2.5 h-2.5 rounded-full ${config?.auto_sync_enabled ? 'bg-emerald-500' : 'bg-amber-400'}`} />
          </div>
          <div className={`font-bold text-sm ${config?.auto_sync_enabled ? 'text-emerald-700' : 'text-amber-700'}`}>
            {config?.auto_sync_enabled ? "Active & Polling" : "Temporarily Paused"}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            When active, newly dispatched orders transition through milestones (In Transit → Out for Delivery → Delivered) automatically.
          </p>
        </div>

        {/* Card 3: Dual Sync Architecture */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Dual Reliability Fallback</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Webhooks + Periodic Polling</div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            If NCM webhook callbacks drop or encounter timeouts, periodic polling safely reconciles tracking without manual intervention.
          </p>
        </div>
      </div>

      {/* Sync Execution History Log */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Batch Execution History</h3>
            <p className="text-xs text-slate-500">Audit trail of automated cron and manual synchronization executions</p>
          </div>
          <button
            onClick={loadData}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Trigger Type</th>
                <th className="px-4 py-3">Initiator</th>
                <th className="px-4 py-3 text-center">Shipments Checked</th>
                <th className="px-4 py-3 text-center">Updated</th>
                <th className="px-4 py-3 text-center">Errors</th>
                <th className="px-4 py-3">Result Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin text-[#D4A72C] mx-auto mb-1.5" />
                    Loading execution history...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No sync executions logged yet. Click &quot;Run Batch Sync Now&quot; to execute the first batch.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-800">
                      {new Date(log.synced_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800 capitalize">
                        {log.trigger_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.synced_by_username || "System (Scheduler)"}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {log.shipments_checked}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-600">
                      {log.shipments_updated}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-rose-600">
                      {log.errors_count}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : log.status === 'PARTIAL'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

