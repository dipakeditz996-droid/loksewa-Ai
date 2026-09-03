"use client";

import React, { useEffect, useState } from "react";
import { marketplaceApi, SellerPayout } from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<SellerPayout[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedPayout, setSelectedPayout] = useState<SellerPayout | null>(null);
  const [updateStatus, setUpdateStatus] = useState<SellerPayout["status"]>("PROCESSING");
  const [transactionRef, setTransactionRef] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const data = await marketplaceApi.adminGetPayouts();
      setPayouts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout) return;
    try {
      await marketplaceApi.adminUpdatePayoutStatus(
        selectedPayout.id,
        updateStatus,
        adminNote,
        rejectionReason,
        transactionRef
      );
      alert("Status updated successfully.");
      setSelectedPayout(null);
      fetchPayouts();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error updating status");
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Seller Payouts</h1>
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payouts.map(p => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium">#{p.id}</td>
                <td className="px-4 py-3">{p.seller_name}</td>
                <td className="px-4 py-3">Rs. {p.requested_amount}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{p.payout_account_details?.method_display}</div>
                  <div className="text-xs text-slate-500">{p.payout_account_details?.account_identifier}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${p.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : p.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button variant="outline" size="sm" onClick={() => {
                    setSelectedPayout(p);
                    setUpdateStatus(p.status);
                    setTransactionRef(p.transaction_reference || "");
                    setAdminNote(p.admin_note || "");
                    setRejectionReason(p.rejection_reason || "");
                  }}>
                    Review
                  </Button>
                </td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No payouts found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Review Payout #{selectedPayout.id}</h2>
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">New Status</label>
                <select className="w-full border rounded-lg px-3 py-2" value={updateStatus} onChange={e => setUpdateStatus(e.target.value as any)}>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="PAID">Paid</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              {updateStatus === 'PAID' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Transaction Reference</label>
                  <input type="text" className="w-full border rounded-lg px-3 py-2" required value={transactionRef} onChange={e => setTransactionRef(e.target.value)} />
                </div>
              )}

              {updateStatus === 'REJECTED' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Rejection Reason</label>
                  <input type="text" className="w-full border rounded-lg px-3 py-2" required value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Admin Note (Internal)</label>
                <textarea className="w-full border rounded-lg px-3 py-2" value={adminNote} onChange={e => setAdminNote(e.target.value)} />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setSelectedPayout(null)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
