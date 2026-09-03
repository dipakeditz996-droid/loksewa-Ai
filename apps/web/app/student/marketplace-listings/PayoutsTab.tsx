import React, { useEffect, useState } from "react";
import { 
  marketplaceApi, 
  SellerPayout, 
  PayoutAccount, 
  SellerBalance 
} from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, CreditCard, Clock, CheckCircle, XCircle } from "lucide-react";

export default function PayoutsTab() {
  const [balance, setBalance] = useState<SellerBalance | null>(null);
  const [payouts, setPayouts] = useState<SellerPayout[]>([]);
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [requestAmount, setRequestAmount] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);

  // Account form state
  const [accMethod, setAccMethod] = useState<"ESEWA" | "KHALTI" | "BANK">("ESEWA");
  const [accName, setAccName] = useState("");
  const [accId, setAccId] = useState("");
  const [bankName, setBankName] = useState("");
  const [branch, setBranch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bal, pay, acc] = await Promise.all([
        marketplaceApi.getPayoutBalance(),
        marketplaceApi.getPayoutHistory(),
        marketplaceApi.getPayoutAccounts()
      ]);
      setBalance(bal);
      setPayouts(pay);
      setAccounts(acc);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestAmount || !selectedAccountId) return alert("Please fill all fields");
    
    try {
      await marketplaceApi.requestPayout({
        requested_amount: requestAmount,
        payout_account_id: parseInt(selectedAccountId)
      });
      alert("Payout requested successfully.");
      setShowRequestForm(false);
      setRequestAmount("");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error requesting payout");
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName || !accId) return alert("Please fill required fields");
    try {
      await marketplaceApi.createPayoutAccount({
        method: accMethod,
        account_name: accName,
        account_identifier: accId,
        bank_name: bankName,
        branch: branch
      });
      alert("Account added successfully");
      setShowAccountForm(false);
      fetchData();
    } catch (err: any) {
      alert("Error adding account");
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    PAID: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-red-100 text-red-800",
    FAILED: "bg-orange-100 text-orange-800",
    CANCELLED: "bg-slate-100 text-slate-800",
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center">
          <span className="text-slate-500 font-medium text-sm">Available Balance</span>
          <span className="text-3xl font-extrabold text-emerald-600 mt-2">Rs. {balance?.available_balance || "0.00"}</span>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center">
          <span className="text-slate-500 font-medium text-sm">Pending Payouts</span>
          <span className="text-3xl font-extrabold text-amber-500 mt-2">Rs. {balance?.pending_payouts || "0.00"}</span>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center">
          <span className="text-slate-500 font-medium text-sm">Total Paid Out</span>
          <span className="text-3xl font-extrabold text-[#163E6B] dark:text-[#D4A72C] mt-2">Rs. {balance?.paid_out || "0.00"}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={() => setShowRequestForm(!showRequestForm)} className="bg-[#163E6B] hover:bg-[#163E6B]/90 text-white">
          <Wallet className="w-4 h-4 mr-2" /> Request Payout
        </Button>
        <Button onClick={() => setShowAccountForm(!showAccountForm)} variant="outline">
          <CreditCard className="w-4 h-4 mr-2" /> Add Payout Account
        </Button>
      </div>

      {/* Request Payout Form */}
      {showRequestForm && (
        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10">
          <h3 className="font-bold mb-4">Request Payout</h3>
          <form onSubmit={handleRequestPayout} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (Min Rs. {balance?.minimum_payout_amount})</label>
              <input 
                type="number" 
                value={requestAmount} 
                onChange={(e) => setRequestAmount(e.target.value)} 
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Select Account</label>
              <select 
                value={selectedAccountId} 
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20"
                required
              >
                <option value="">-- Select --</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.method_display} - {acc.account_name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit">Submit Request</Button>
              <Button type="button" variant="ghost" onClick={() => setShowRequestForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Add Account Form */}
      {showAccountForm && (
        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10">
          <h3 className="font-bold mb-4">Add Payout Account</h3>
          <form onSubmit={handleAddAccount} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <select 
                value={accMethod} 
                onChange={(e) => setAccMethod(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20"
              >
                <option value="ESEWA">eSewa</option>
                <option value="KHALTI">Khalti</option>
                <option value="BANK">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Name</label>
              <input 
                type="text" 
                value={accName} 
                onChange={(e) => setAccName(e.target.value)} 
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Number / ID</label>
              <input 
                type="text" 
                value={accId} 
                onChange={(e) => setAccId(e.target.value)} 
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20"
                required
              />
            </div>
            {accMethod === "BANK" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Bank Name</label>
                  <input 
                    type="text" 
                    value={bankName} 
                    onChange={(e) => setBankName(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Branch</label>
                  <input 
                    type="text" 
                    value={branch} 
                    onChange={(e) => setBranch(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20"
                    required
                  />
                </div>
              </>
            )}
            <div className="flex gap-2 pt-2">
              <Button type="submit">Save Account</Button>
              <Button type="button" variant="ghost" onClick={() => setShowAccountForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payout History */}
        <div>
          <h3 className="font-bold text-lg mb-4">Payout History</h3>
          <div className="space-y-3">
            {payouts.length === 0 ? (
              <p className="text-slate-500 text-sm">No payouts requested yet.</p>
            ) : (
              payouts.map((payout) => (
                <div key={payout.id} className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm">Rs. {payout.requested_amount}</p>
                    <p className="text-xs text-slate-500">{new Date(payout.created_at).toLocaleDateString()}</p>
                    {payout.transaction_reference && (
                      <p className="text-xs text-slate-400 mt-1">Ref: {payout.transaction_reference}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${STATUS_COLORS[payout.status] || "bg-slate-100"}`}>
                    {payout.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Saved Accounts */}
        <div>
          <h3 className="font-bold text-lg mb-4">Saved Accounts</h3>
          <div className="space-y-3">
            {accounts.length === 0 ? (
              <p className="text-slate-500 text-sm">No accounts added yet.</p>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm">{acc.method_display}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{acc.account_name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-1">{acc.account_identifier}</p>
                    </div>
                  </div>
                  {acc.bank_name && (
                    <div className="mt-2 text-xs text-slate-500">
                      {acc.bank_name} - {acc.branch}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
