import React, { useEffect, useState } from "react";
import { 
  marketplaceApi, 
  SellerPayout, 
  PayoutAccount, 
  SellerBalance 
} from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Wallet, CreditCard, AlertCircle, Loader2, Info } from "lucide-react";
import toast from "react-hot-toast";
import { toast as sonnerToast } from "sonner";

// Dual toast notification helper to guarantee visibility across toaster configurations
const notifySuccess = (message: string) => {
  toast.success(message);
  try { sonnerToast.success(message); } catch {}
};

const notifyError = (message: string) => {
  toast.error(message);
  try { sonnerToast.error(message); } catch {}
};

export default function PayoutsTab() {
  const [balance, setBalance] = useState<SellerBalance | null>(null);
  const [payouts, setPayouts] = useState<SellerPayout[]>([]);
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [requestAmount, setRequestAmount] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);

  // Status and error states
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

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
      if (acc.length > 0 && acc[0] && !selectedAccountId) {
        setSelectedAccountId(String(acc[0].id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const availableBalanceNum = parseFloat(balance?.available_balance || "0");
  const minPayoutNum = parseFloat(balance?.minimum_payout_amount || "500");
  const hasInsufficientBalance = availableBalanceNum < minPayoutNum;

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);

    const parsedAmount = parseFloat(requestAmount);

    if (!requestAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      const msg = "Please enter a valid payout amount.";
      setRequestError(msg);
      notifyError(msg);
      return;
    }

    if (!selectedAccountId) {
      const msg = "Please select a payout account.";
      setRequestError(msg);
      notifyError(msg);
      return;
    }

    if (parsedAmount < minPayoutNum) {
      const msg = `Minimum payout amount is Rs. ${minPayoutNum.toFixed(2)}.`;
      setRequestError(msg);
      notifyError(msg);
      return;
    }

    if (parsedAmount > availableBalanceNum) {
      const msg = `Requested amount (Rs. ${parsedAmount.toFixed(2)}) exceeds your available balance of Rs. ${availableBalanceNum.toFixed(2)}.`;
      setRequestError(msg);
      notifyError(msg);
      return;
    }
    
    setIsSubmittingPayout(true);
    try {
      await marketplaceApi.requestPayout({
        requested_amount: requestAmount,
        payout_account_id: parseInt(selectedAccountId, 10)
      });
      notifySuccess("Payout requested successfully.");
      setShowRequestForm(false);
      setRequestAmount("");
      setRequestError(null);
      fetchData();
    } catch (err: any) {
      const errorMsg = err?.data?.detail || err?.message || "Error requesting payout";
      setRequestError(errorMsg);
      notifyError(errorMsg);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);

    if (!accName.trim() || !accId.trim()) {
      const msg = "Please fill in all required fields.";
      setAccountError(msg);
      notifyError(msg);
      return;
    }

    if (accMethod === "BANK" && (!bankName.trim() || !branch.trim())) {
      const msg = "Please specify Bank Name and Branch.";
      setAccountError(msg);
      notifyError(msg);
      return;
    }

    setIsSubmittingAccount(true);
    try {
      const newAcc = await marketplaceApi.createPayoutAccount({
        method: accMethod,
        account_name: accName.trim(),
        account_identifier: accId.trim(),
        bank_name: accMethod === "BANK" ? bankName.trim() : "",
        branch: accMethod === "BANK" ? branch.trim() : ""
      });
      notifySuccess("Account added successfully.");
      setShowAccountForm(false);
      setAccName("");
      setAccId("");
      setBankName("");
      setBranch("");
      setAccountError(null);
      if (newAcc?.id) {
        setSelectedAccountId(String(newAcc.id));
      }
      fetchData();
    } catch (err: any) {
      const errorMsg = err?.data?.detail || err?.message || "Error adding account";
      setAccountError(errorMsg);
      notifyError(errorMsg);
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    PROCESSING: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    FAILED: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    CANCELLED: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading payout details...</div>;

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center">
          <span className="text-slate-500 font-medium text-sm">Available Balance</span>
          <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">Rs. {balance?.available_balance || "0.00"}</span>
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
      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={() => {
            setShowRequestForm(!showRequestForm);
            setRequestError(null);
          }} 
          className="bg-[#163E6B] hover:bg-[#163E6B]/90 text-white"
        >
          <Wallet className="w-4 h-4 mr-2" /> Request Payout
        </Button>
        <Button 
          onClick={() => {
            setShowAccountForm(!showAccountForm);
            setAccountError(null);
          }} 
          variant="outline"
        >
          <CreditCard className="w-4 h-4 mr-2" /> Add Payout Account
        </Button>
      </div>

      {/* Request Payout Form */}
      {showRequestForm && (
        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10">
          <h3 className="font-bold text-base mb-3">Request Payout</h3>

          {/* Insufficient balance notice */}
          {hasInsufficientBalance && (
            <div className="p-3.5 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-bold text-xs uppercase tracking-wide">Insufficient Available Balance</p>
                <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  Your current available balance is <span className="font-bold text-emerald-600 dark:text-emerald-400">Rs. {balance?.available_balance || "0.00"}</span>. 
                  A minimum of <span className="font-bold">Rs. {balance?.minimum_payout_amount || "500.00"}</span> is required to submit a payout request.
                  Earnings will be added automatically once your sold marketplace items are delivered.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {requestError && (
            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-medium leading-relaxed">{requestError}</span>
            </div>
          )}

          <form onSubmit={handleRequestPayout} className="space-y-4 max-w-sm">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium">Amount (Min Rs. {balance?.minimum_payout_amount || "500.00"})</label>
                {!hasInsufficientBalance && (
                  <button
                    type="button"
                    onClick={() => {
                      setRequestAmount(balance?.available_balance || "");
                      setRequestError(null);
                    }}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Max (Rs. {balance?.available_balance})
                  </button>
                )}
              </div>
              <input 
                type="number" 
                step="0.01"
                min={minPayoutNum}
                value={requestAmount} 
                onChange={(e) => {
                  setRequestAmount(e.target.value);
                  if (requestError) setRequestError(null);
                }} 
                placeholder={`Min ${balance?.minimum_payout_amount || "500.00"}`}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-[#163E6B]"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Available to withdraw: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Rs. {balance?.available_balance || "0.00"}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Select Account</label>
              {accounts.length === 0 ? (
                <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                  No saved payout accounts found. Please click <strong>"Add Payout Account"</strong> above first.
                </div>
              ) : (
                <select 
                  value={selectedAccountId} 
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value);
                    if (requestError) setRequestError(null);
                  }}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-[#163E6B]"
                  required
                >
                  <option value="">-- Select Account --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.method_display} - {acc.account_name} ({acc.account_identifier})</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                type="submit" 
                disabled={isSubmittingPayout || hasInsufficientBalance || accounts.length === 0}
                className={hasInsufficientBalance ? "opacity-60 cursor-not-allowed" : ""}
              >
                {isSubmittingPayout ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : hasInsufficientBalance ? (
                  "Insufficient Balance"
                ) : (
                  "Submit Request"
                )}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => {
                  setShowRequestForm(false);
                  setRequestError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Add Account Form */}
      {showAccountForm && (
        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10">
          <h3 className="font-bold text-base mb-3">Add Payout Account</h3>

          {/* Account Error Banner */}
          {accountError && (
            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-medium leading-relaxed">{accountError}</span>
            </div>
          )}

          <form onSubmit={handleAddAccount} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <select 
                value={accMethod} 
                onChange={(e) => setAccMethod(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-[#163E6B]"
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
                onChange={(e) => {
                  setAccName(e.target.value);
                  if (accountError) setAccountError(null);
                }} 
                placeholder="Full Name as on Account"
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-[#163E6B]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {accMethod === "BANK" ? "Bank Account Number" : "Mobile / Wallet Number"}
              </label>
              <input 
                type="text" 
                value={accId} 
                onChange={(e) => {
                  setAccId(e.target.value);
                  if (accountError) setAccountError(null);
                }} 
                placeholder={accMethod === "BANK" ? "Account Number" : "e.g. 98XXXXXXXX"}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-[#163E6B]"
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
                    onChange={(e) => {
                      setBankName(e.target.value);
                      if (accountError) setAccountError(null);
                    }} 
                    placeholder="e.g. NIC Asia Bank"
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-[#163E6B]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Branch</label>
                  <input 
                    type="text" 
                    value={branch} 
                    onChange={(e) => {
                      setBranch(e.target.value);
                      if (accountError) setAccountError(null);
                    }} 
                    placeholder="e.g. New Road Branch"
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-[#163E6B]"
                    required
                  />
                </div>
              </>
            )}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmittingAccount}>
                {isSubmittingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Account"
                )}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => {
                  setShowAccountForm(false);
                  setAccountError(null);
                }}
              >
                Cancel
              </Button>
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
