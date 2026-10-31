"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  marketplaceApi, 
  CourierShipment 
} from "@/lib/api/marketplace";
import { 
  Package, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  X, 
  ExternalLink, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Banknote,
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";

export default function CourierShipmentsPage() {
  const [shipments, setShipments] = useState<CourierShipment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<CourierShipment | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        page_size: pageSize,
      };
      if (activeTab !== "all") {
        params.status = activeTab;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (branchFilter.trim()) {
        params.destination_branch = branchFilter.trim();
      }

      const res = await marketplaceApi.adminGetCourierShipments(params);
      if (Array.isArray(res)) {
        setShipments(res);
        setTotalCount(res.length);
      } else {
        setShipments(res.results || []);
        setTotalCount(res.count || (res.results ? res.results.length : 0));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load courier shipments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [activeTab, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchShipments();
  };

  const handleSyncSingle = async (shipmentId: number) => {
    try {
      setSyncingId(shipmentId);
      const updated = await marketplaceApi.adminSyncShipment(shipmentId);
      toast.success(`Shipment #${updated.ncm_order_id} synchronized: ${updated.courier_status}`);
      setShipments((prev) => prev.map((s) => (s.id === shipmentId ? updated : s)));
      if (selectedShipment && selectedShipment.id === shipmentId) {
        setSelectedShipment(updated);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to synchronize shipment");
    } finally {
      setSyncingId(null);
    }
  };

  const statusTabs = [
    { id: "all", label: "All Shipments" },
    { id: "pending_pickup", label: "Pending Pickup" },
    { id: "in_transit", label: "In Transit" },
    { id: "out_for_delivery", label: "Out for Delivery" },
    { id: "delivered", label: "Delivered" },
    { id: "returned", label: "Returned" },
  ];

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-[#D4A72C]" />
            Courier Shipments Ledger
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Search, filter, inspect status timelines, and trigger live synchronizations for dispatched orders.
          </p>
        </div>

        <button
          onClick={() => fetchShipments()}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#D4A72C]" : "text-slate-500"}`} />
          Refresh List
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Status Tabs */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#0B2545] text-white shadow-xs font-semibold"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Showing <span className="font-bold text-slate-800">{totalCount}</span> shipment(s)
          </div>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, NCM Tracking #, Ref ID, student name, or phone..."
              className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setPage(1);
                setTimeout(fetchShipments, 50);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Main Shipments Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="px-4 py-3">Order & Ref</th>
                <th className="px-4 py-3">NCM Tracking</th>
                <th className="px-4 py-3">Route (Origin → Dest)</th>
                <th className="px-4 py-3">Delivery Type</th>
                <th className="px-4 py-3">Courier Status</th>
                <th className="px-4 py-3 text-right">Fee (Inv.)</th>
                <th className="px-4 py-3 text-right">COD</th>
                <th className="px-4 py-3 text-center">Last Synced</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#D4A72C] mx-auto mb-2" />
                    Loading shipment records...
                  </td>
                </tr>
              ) : shipments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No shipments found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                shipments.map((s) => {
                  const st = (s.courier_status || "").toLowerCase();
                  const isDelivered = st.includes("deliver");
                  const isTransit = st.includes("transit") || st.includes("dispatched") || st.includes("complete");
                  const isReturned = st.includes("return") || st.includes("cancel");

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">Order #{s.order}</span>
                        <span className="font-mono text-[10px] text-slate-400">{s.vref_id || `ORD-${s.order}`}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-800">
                        {s.tracking_id || s.ncm_order_id}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800 block">
                          {s.origin_branch} → <strong className="text-slate-900">{s.destination_branch}</strong>
                        </span>
                        <span className="text-[10px] text-slate-400">{s.weight} kg</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {s.delivery_type}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          isDelivered
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isTransit
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : isReturned
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {s.courier_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        NPR {Number(s.actual_charge).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {Number(s.cod_charge) > 0 ? (
                          <span className="text-purple-700">NPR {Number(s.cod_charge).toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Prepaid</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 font-mono text-[10px]">
                        {s.last_synced_at ? new Date(s.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Never"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleSyncSingle(s.id)}
                            disabled={syncingId === s.id}
                            className="p-1.5 text-slate-500 hover:text-[#0B2545] rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50"
                            title="Sync status with NCM"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingId === s.id ? "animate-spin text-[#D4A72C]" : ""}`} />
                          </button>
                          <button
                            onClick={() => setSelectedShipment(s)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors"
                            title="View Timeline & Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div>
              Page <span className="font-semibold text-slate-900">{page}</span> of <span className="font-semibold text-slate-900">{totalPages}</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-out / Detail Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Shipment Inspector</h3>
                <p className="text-xs text-slate-500 font-mono">NCM ID: {selectedShipment.ncm_order_id}</p>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Associated Order</span>
                  <span className="font-bold text-slate-900 text-sm">#{selectedShipment.order}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Current Courier Status</span>
                  <span className="font-bold text-[#0B2545] text-sm">{selectedShipment.courier_status}</span>
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
                  <span className="text-slate-500 block">Invoiced Courier Fee:</span>
                  <span className="font-semibold text-slate-800">NPR {selectedShipment.actual_charge}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Collect on Delivery (COD):</span>
                  <span className="font-semibold text-purple-700">NPR {selectedShipment.cod_charge}</span>
                </div>
              </div>

              {/* Status History Timeline */}
              <div>
                <span className="text-slate-600 font-semibold block mb-1.5">Milestone History:</span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[11px]">
                  {selectedShipment.status_history && selectedShipment.status_history.length > 0 ? (
                    selectedShipment.status_history.map((h, i) => (
                      <div key={i} className="flex justify-between items-center text-slate-700 pb-1 border-b border-slate-100 last:border-none">
                        <div>
                          <span className="font-bold text-slate-800">{h.status || h.state}</span>
                          {h.remarks && <span className="block text-[10px] text-slate-500">{h.remarks}</span>}
                        </div>
                        <span className="text-slate-400 text-[10px]">
                          {h.timestamp ? new Date(h.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ""}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-400">No milestone events recorded yet.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleSyncSingle(selectedShipment.id)}
                disabled={syncingId === selectedShipment.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingId === selectedShipment.id ? "animate-spin text-[#D4A72C]" : ""}`} />
                {syncingId === selectedShipment.id ? "Syncing..." : "Sync Tracking Now"}
              </button>
              <button
                onClick={() => setSelectedShipment(null)}
                className="px-4 py-2 rounded-lg bg-[#0B2545] text-white font-medium text-xs hover:bg-[#133966]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

