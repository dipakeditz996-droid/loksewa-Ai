"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  marketplaceApi, 
  CourierOverviewData, 
  CourierShipment 
} from "@/lib/api/marketplace";
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Banknote, 
  Activity, 
  RefreshCw, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  X
} from "lucide-react";
import toast from "react-hot-toast";

export default function CourierOverviewPage() {
  const [data, setData] = useState<CourierOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<CourierShipment | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await marketplaceApi.adminGetCourierOverview();
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load courier overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const res = await marketplaceApi.adminTriggerCourierSync(50);
      toast.success(`Sync finished: ${res.shipments_checked} checked, ${res.shipments_updated} updated.`);
      fetchOverview();
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger sync");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 text-[#D4A72C] animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Loading courier operational metrics...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {
    total_shipments: 0,
    pending_pickup: 0,
    in_transit: 0,
    out_for_delivery: 0,
    delivered: 0,
    returned: 0,
    failed_sync_count: 0,
    remittance_pending_count: 0,
    remittance_pending_amount: 0,
    remittance_verified_count: 0,
    remittance_verified_amount: 0,
    remittance_discrepancy_count: 0,
  };

  const config = data?.configuration;

  return (
    <div className="space-y-6">
      {/* Top Banner Status Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full ${config?.connection_status === 'connected' ? 'bg-emerald-500 animate-pulse' : config?.connection_status === 'error' ? 'bg-rose-500' : 'bg-amber-400'}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm md:text-base">
                NCM Status: {config?.is_enabled ? "Integration Active" : "Integration Disabled"}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 uppercase">
                {config?.environment || "demo"}
              </span>
              {config?.connection_status === 'connected' && (
                <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Online ({config.last_connection_latency_ms || 120}ms)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hub: {config?.default_origin_branch || "Kathmandu"} • Live Rates: {config?.live_rates_enabled ? "On" : "Off"} • Auto-Sync: {config?.auto_sync_enabled ? "Active" : "Paused"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-[#D4A72C]" : "text-slate-500"}`} />
            {syncing ? "Syncing..." : "Sync Active Shipments"}
          </button>
          <Link
            href="/admin-dashboard/courier/settings"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0B2545] text-white hover:bg-[#133966] transition-colors shadow-xs"
          >
            Configure NCM
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Shipments */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Shipments</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{metrics.total_shipments}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Dispatched via NCM</p>
          </div>
        </div>

        {/* Pending Pickup */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Pickup</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600">{metrics.pending_pickup}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Waiting for courier pickup</p>
          </div>
        </div>

        {/* In Transit */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">In Transit</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-600">{metrics.in_transit}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Moving between hubs</p>
          </div>
        </div>

        {/* Out for Delivery */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Out for Delivery</span>
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-cyan-600">{metrics.out_for_delivery}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">With local rider</p>
          </div>
        </div>

        {/* Delivered */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Delivered</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600">{metrics.delivered}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Successful deliveries</p>
          </div>
        </div>

        {/* Returned */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Returned / Cancelled</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600">{metrics.returned}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Failed or returned packages</p>
          </div>
        </div>

        {/* COD Pending Remittance */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">COD Remittance Due</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-700">
              NPR {Number(metrics.remittance_pending_amount || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {metrics.remittance_pending_count} order(s) pending deposit
            </p>
          </div>
        </div>

        {/* Failed Sync Errors */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Sync Failures</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-800">{metrics.failed_sync_count}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Logged tracking errors</p>
          </div>
        </div>
      </div>

      {/* Main Sections: Recent Shipments & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Shipments Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Recent Dispatches</h2>
              <p className="text-xs text-slate-500">Latest shipments sent through Nepal Can Move</p>
            </div>
            <Link
              href="/admin-dashboard/courier/shipments"
              className="text-xs font-semibold text-[#0B2545] hover:text-[#D4A72C] flex items-center gap-1 transition-colors"
            >
              View All Shipments
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Order & Ref</th>
                  <th className="px-4 py-3">NCM Tracking</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">COD</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {!data?.recent_shipments || data.recent_shipments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No courier shipments dispatched yet.
                    </td>
                  </tr>
                ) : (
                  data.recent_shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 block">#{s.order}</span>
                        <span className="text-[10px] text-slate-400">{s.vref_id || `ORD-${s.order}`}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-800">
                        {s.tracking_id || s.ncm_order_id}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{s.destination_branch}</span>
                        <span className="text-[10px] text-slate-400 block">{s.delivery_type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          s.courier_status.toLowerCase().includes('deliver')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.courier_status.toLowerCase().includes('transit') || s.courier_status.toLowerCase().includes('dispatched')
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : s.courier_status.toLowerCase().includes('return')
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {s.courier_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {Number(s.cod_charge) > 0 ? (
                          <span className="text-purple-700">NPR {Number(s.cod_charge).toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400">Prepaid</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedShipment(s)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Operations & Remittance Summary Card (1 Col) */}
        <div className="space-y-4">
          {/* COD Remittance Callout */}
          <div className="bg-linear-to-br from-purple-50 to-indigo-50 border border-purple-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 text-purple-900 font-semibold text-sm">
              <Banknote className="w-4 h-4 text-purple-700" />
              Cash on Delivery Remittance
            </div>
            <p className="text-xs text-purple-800/80 mt-1.5">
              Strict Accounting Policy: NCM delivery does not settle student orders. Admins must verify courier bank deposit vouchers.
            </p>

            <div className="mt-4 pt-4 border-t border-purple-200/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-purple-700 font-medium block">Verified Settled</span>
                <span className="text-sm font-bold text-purple-950">
                  NPR {Number(metrics.remittance_verified_amount || 0).toLocaleString()} ({metrics.remittance_verified_count})
                </span>
              </div>
              <Link
                href="/admin-dashboard/courier/cod-remittance"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-700 text-white hover:bg-purple-800 transition-colors shadow-xs"
              >
                Audit Remittance
              </Link>
            </div>
          </div>

          {/* Scheduler & Webhook Status Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
              Automation & Platform
            </h3>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Render Cron Task</span>
              <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                sync_ncm_shipments
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Last Batch Sync</span>
              <span className="font-medium text-slate-800">
                {config?.last_sync_at ? new Date(config.last_sync_at).toLocaleTimeString() : "Never"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Webhook Receiver</span>
              <span className={`font-semibold ${config?.webhook_enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                {config?.webhook_enabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div className="pt-2">
              <Link
                href="/admin-dashboard/courier/tracking"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Tracking Console & Logs
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Shipment Detail Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Shipment Details</h3>
                <p className="text-xs text-slate-500 font-mono">NCM #{selectedShipment.ncm_order_id}</p>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Order ID</span>
                  <span className="font-bold text-slate-900 text-sm">#{selectedShipment.order}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tracking Code</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedShipment.tracking_id || selectedShipment.ncm_order_id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">Origin Hub:</span>
                  <span className="font-medium text-slate-800">{selectedShipment.origin_branch}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Destination Hub:</span>
                  <span className="font-medium text-slate-800">{selectedShipment.destination_branch}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">Delivery Type:</span>
                  <span className="font-medium text-slate-800">{selectedShipment.delivery_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Package Weight:</span>
                  <span className="font-medium text-slate-800">{selectedShipment.weight} kg</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">Courier Invoiced Fee:</span>
                  <span className="font-semibold text-slate-800">NPR {selectedShipment.actual_charge}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">COD Collectable:</span>
                  <span className="font-semibold text-purple-700">NPR {selectedShipment.cod_charge}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Status Timeline:</span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[11px]">
                  {selectedShipment.status_history && selectedShipment.status_history.length > 0 ? (
                    selectedShipment.status_history.map((h, i) => (
                      <div key={i} className="flex justify-between text-slate-700">
                        <span>{h.status || h.state}</span>
                        <span className="text-slate-400 text-[10px]">
                          {h.timestamp ? new Date(h.timestamp).toLocaleDateString() : ""}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-400">No milestone events recorded yet.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedShipment(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium text-xs hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

