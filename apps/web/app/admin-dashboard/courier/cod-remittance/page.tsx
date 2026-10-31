"use client";

import React, { useEffect, useState } from "react";
import { 
  marketplaceApi, 
  CODRemittance 
} from "@/lib/api/marketplace";
import { 
  Banknote, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Eye, 
  FileText, 
  ShieldCheck, 
  Calendar,
  Lock,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";

export default function CODRemittancePage() {
  const [remittances, setRemittances] = useState<CODRemittance[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Verification modal state
  const [verifyingItem, setVerifyingItem] = useState<CODRemittance | null>(null);
  const [remittedAmount, setRemittedAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // Discrepancy modal state
  const [discrepancyItem, setDiscrepancyItem] = useState<CODRemittance | null>(null);
  const [discrepancyReason, setDiscrepancyReason] = useState("");
  const [courierReportedAmount, setCourierReportedAmount] = useState("");
  const [submittingDiscrepancy, setSubmittingDiscrepancy] = useState(false);

  const fetchRemittances = async () => {
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

      const res = await marketplaceApi.adminGetCODRemittances(params);
      if (Array.isArray(res)) {
        setRemittances(res);
        setTotalCount(res.length);
      } else {
        setRemittances(res.results || []);
        setTotalCount(res.count || (res.results ? res.results.length : 0));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load COD remittance records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRemittances();
  }, [activeTab, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRemittances();
  };

  const openVerifyModal = (item: CODRemittance) => {
    setVerifyingItem(item);
    setRemittedAmount(item.expected_amount);
    setReferenceNumber("");
    setVerificationNotes("");
  };

  const handleConfirmVerification = async () => {
    if (!verifyingItem) return;
    try {
      setSubmittingVerification(true);
      const updated = await marketplaceApi.adminVerifyCODRemittance(verifyingItem.id, {
        remitted_amount: remittedAmount,
        reference_number: referenceNumber,
        notes: verificationNotes,
      });

      toast.success(`COD Remittance for Order #${updated.order_id} verified and settled! Payment status updated to PAID.`);
      setRemittances((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setVerifyingItem(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to verify remittance");
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleFlagDiscrepancy = async () => {
    if (!discrepancyItem || !discrepancyReason.trim()) {
      toast.error("Please provide a reason for the discrepancy.");
      return;
    }
    try {
      setSubmittingDiscrepancy(true);
      const updated = await marketplaceApi.adminFlagCODRemittanceDiscrepancy(discrepancyItem.id, {
        discrepancy_reason: discrepancyReason.trim(),
        courier_reported_amount: courierReportedAmount ? courierReportedAmount : undefined,
      });

      toast.success(`Discrepancy flagged for Order #${updated.order_id}.`);
      setRemittances((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setDiscrepancyItem(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to flag discrepancy");
    } finally {
      setSubmittingDiscrepancy(false);
    }
  };

  const statusTabs = [
    { id: "all", label: "All Remittances" },
    { id: "PENDING", label: "Pending Verification" },
    { id: "VERIFIED", label: "Verified & Settled" },
    { id: "DISCREPANCY", label: "Discrepancy Flagged" },
  ];

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Banknote className="w-5 h-5 text-purple-700" />
            Cash on Delivery (COD) Remittance Ledger
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Audit courier collection vouchers, verify actual bank deposits, and settle remaining 85% COD order balances.
          </p>
        </div>

        <button
          onClick={() => fetchRemittances()}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-600" : "text-slate-500"}`} />
          Refresh Ledger
        </button>
      </div>

      {/* Accounting Compliance Rule Callout */}
      <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 flex items-start gap-3 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold text-sm text-purple-950 block">Authoritative COD Settlement Rule:</span>
          <p className="text-purple-900/90 leading-relaxed">
            NCM marking a package as <strong>Delivered</strong> does <em>never</em> automatically mark an order as PAID.
            The remaining 85% COD balance remains open until an authorized finance administrator records and verifies the actual courier bank remittance.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
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
                    ? "bg-purple-700 text-white shadow-xs font-semibold"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Total entries: <span className="font-bold text-slate-800">{totalCount}</span>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, NCM Tracking #, Bank Voucher Ref, customer name..."
              className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                setTimeout(fetchRemittances, 50);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">NCM Tracking</th>
                <th className="px-4 py-3">Courier Status</th>
                <th className="px-4 py-3 text-right">Advance (15%)</th>
                <th className="px-4 py-3 text-right">Remaining COD (85%)</th>
                <th className="px-4 py-3 text-right">Remitted Amount</th>
                <th className="px-4 py-3">Remittance Status</th>
                <th className="px-4 py-3">Verification Details</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin text-purple-600 mx-auto mb-1.5" />
                    Loading remittance records...
                  </td>
                </tr>
              ) : remittances.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    No COD remittance records found matching the current filter.
                  </td>
                </tr>
              ) : (
                remittances.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      Order #{r.order_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800 block">{r.customer_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{r.customer_phone}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">
                      {r.courier_tracking_id || "Pending"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                        {r.courier_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      NPR {Number(r.advance_paid).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-purple-700">
                      NPR {Number(r.expected_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {r.remitted_amount ? (
                        <span className="text-emerald-700">NPR {Number(r.remitted_amount).toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : r.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {r.status === 'VERIFIED' ? 'Settled' : r.status === 'PENDING' ? 'Pending Deposit' : 'Discrepancy'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px]">
                      {r.status === 'VERIFIED' ? (
                        <div>
                          <span className="text-slate-800 font-medium block">By: {r.verified_by_name || 'Admin'}</span>
                          <span className="text-slate-400 font-mono text-[10px]">
                            Ref: {r.reference_number || 'N/A'} • {r.verified_at ? new Date(r.verified_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Awaiting deposit voucher</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.status === 'PENDING' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openVerifyModal(r)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-purple-700 text-white hover:bg-purple-800 transition-colors shadow-2xs"
                          >
                            Verify Deposit
                          </button>
                          <button
                            onClick={() => {
                              setDiscrepancyItem(r);
                              setDiscrepancyReason("");
                              setCourierReportedAmount("");
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Flag Discrepancy"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

      {/* Verification Modal */}
      {verifyingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-purple-700" />
                  Verify Courier Remittance
                </h3>
                <p className="text-xs text-slate-500">Order #{verifyingItem.order_id} ({verifyingItem.customer_name})</p>
              </div>
              <button
                onClick={() => setVerifyingItem(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-lg">
                <span className="text-[11px] text-purple-700 block font-medium">Expected COD Remittance Amount:</span>
                <span className="text-lg font-bold text-purple-950 font-mono">
                  NPR {Number(verifyingItem.expected_amount).toLocaleString()}
                </span>
                <span className="text-[10px] text-purple-800 block mt-0.5">
                  Remaining 85% balance collected by NCM upon delivery.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Actual Remitted Amount Received (NPR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={remittedAmount}
                  onChange={(e) => setRemittedAmount(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Courier Bank Voucher / Transaction Slip Reference *
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. NCM-DEP-2026-004812"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Finance Notes / Statement Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Verified against bank credit statement..."
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                <strong>Warning:</strong> Confirming this will permanently mark Order #{verifyingItem.order_id}&apos;s remaining COD balance as settled (Payment status → PAID). This action cannot be duplicated.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setVerifyingItem(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVerification}
                disabled={submittingVerification || !referenceNumber.trim() || !remittedAmount}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-50 shadow-xs"
              >
                {submittingVerification ? "Verifying..." : "Confirm & Settle Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discrepancy Modal */}
      {discrepancyItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 text-rose-700">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Flag Remittance Discrepancy
                </h3>
                <p className="text-xs text-slate-500">Order #{discrepancyItem.order_id}</p>
              </div>
              <button
                onClick={() => setDiscrepancyItem(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Courier-Reported Collected Amount (if different)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={courierReportedAmount}
                  onChange={(e) => setCourierReportedAmount(e.target.value)}
                  placeholder={`Expected: NPR ${discrepancyItem.expected_amount}`}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Discrepancy *
                </label>
                <textarea
                  rows={3}
                  value={discrepancyReason}
                  onChange={(e) => setDiscrepancyReason(e.target.value)}
                  placeholder="Explain why the courier remittance does not match expected COD amount..."
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setDiscrepancyItem(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleFlagDiscrepancy}
                disabled={submittingDiscrepancy || !discrepancyReason.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submittingDiscrepancy ? "Flagging..." : "Flag Discrepancy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

