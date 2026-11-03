"use client";

import React, { useState, useEffect } from "react";
import { 
  Coins, 
  User, 
  ArrowDownRight, 
  ArrowUpRight, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Receipt, 
  BookOpen, 
  Award, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Layers,
  RefreshCw,
  PlusCircle,
  Lock,
  Unlock
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  walletApi, 
  AdminWalletDetail, 
  StudentWallet,
  CoinTopUp 
} from "@/lib/api/wallet";
import toast from "react-hot-toast";

interface IndividualWalletModalProps {
  walletId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAdjust: (wallet: StudentWallet) => void;
  onOpenLock: (wallet: StudentWallet) => void;
  onRefreshParent: () => void;
}

export function IndividualWalletModal({
  walletId,
  isOpen,
  onClose,
  onOpenAdjust,
  onOpenLock,
  onRefreshParent,
}: IndividualWalletModalProps) {
  const [detail, setDetail] = useState<AdminWalletDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"ledger" | "topups" | "xp" | "rewards" | "content">("ledger");
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && walletId) {
      loadDetail(walletId);
    } else {
      setDetail(null);
    }
  }, [isOpen, walletId]);

  const loadDetail = async (id: number) => {
    try {
      setIsLoading(true);
      const data = await walletApi.getAdminWalletDetail(id);
      setDetail(data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load wallet details.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const wallet = detail?.wallet;
  const user = detail?.user_profile;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[24px] border border-border">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B2545] to-[#133A6B] p-6 text-white">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#FFD700] flex items-center gap-1.5">
                    <Coins className="w-4 h-4" />
                    Individual Wallet Inspection
                  </span>
                  {wallet?.is_locked ? (
                    <Badge variant="destructive" className="text-[10px]">Locked</Badge>
                  ) : (
                    <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">Active</span>
                  )}
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-white">
                  {user?.full_name || wallet?.username || "Loading..."}
                </DialogTitle>
                <p className="text-xs text-slate-300 mt-0.5 font-mono">
                  @{wallet?.username} • {wallet?.email} • Joined: {user ? new Date(user.date_joined).toLocaleDateString() : ""}
                </p>
              </div>

              {wallet && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => onOpenAdjust(wallet)}
                    className="bg-[#D4A72C] hover:bg-[#C29624] text-[#0B2545] font-bold text-xs rounded-xl h-9 gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Adjust Coins
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenLock(wallet)}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs rounded-xl h-9 gap-1.5"
                  >
                    {wallet.is_locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {wallet.is_locked ? "Unlock" : "Lock"}
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-xs space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#D4A72C]" />
              <p>Fetching wallet ledger and inspection records...</p>
            </div>
          ) : !detail ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              Unable to load wallet records.
            </div>
          ) : (
            <>
              {/* Financial Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-[#D4A72C]/10 border border-[#D4A72C]/30 text-center">
                  <div className="text-xs text-muted-foreground font-medium">Current Balance</div>
                  <div className="text-2xl font-black text-[#D4A72C] mt-0.5">
                    {wallet?.balance.toLocaleString()} <span className="text-xs font-semibold">Coins</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-xs text-muted-foreground font-medium">Total Credited</div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    +{wallet?.total_credited.toLocaleString()} <span className="text-xs font-semibold">Coins</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                  <div className="text-xs text-muted-foreground font-medium">Total Debited / Spent</div>
                  <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-0.5">
                    -{wallet?.total_debited.toLocaleString()} <span className="text-xs font-semibold">Coins</span>
                  </div>
                </div>
              </div>

              {wallet?.is_locked && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>
                    <span className="font-bold">Locked: </span>
                    {wallet.lock_reason || "Administrative restriction active."}
                  </span>
                </div>
              )}

              {/* Tabs for detailed sections */}
              <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as any)}
                className="w-full space-y-4"
              >
                <TabsList className="bg-muted/70 p-1 border border-border/60 rounded-xl h-auto flex flex-wrap gap-1">
                  <TabsTrigger value="ledger" className="text-xs font-semibold rounded-lg px-3 py-1.5">
                    Ledger Transactions ({detail.recent_transactions?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="topups" className="text-xs font-semibold rounded-lg px-3 py-1.5">
                    Top-Up History ({detail.topups?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="xp" className="text-xs font-semibold rounded-lg px-3 py-1.5">
                    XP Conversions ({detail.xp_conversions?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="rewards" className="text-xs font-semibold rounded-lg px-3 py-1.5">
                    Activity Rewards ({detail.reward_claims?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="content" className="text-xs font-semibold rounded-lg px-3 py-1.5">
                    Content Purchases ({detail.content_entitlements?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: Complete Ledger */}
                <TabsContent value="ledger" className="space-y-3">
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="divide-y divide-border">
                      {detail.recent_transactions.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">No ledger transactions</div>
                      ) : (
                        detail.recent_transactions.map((tx) => {
                          const isCredit = tx.transaction_type === "CREDIT" || (tx.transaction_type === "ADMIN_ADJUSTMENT" && tx.balance_after > tx.balance_before);
                          return (
                            <div key={tx.id} className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-muted/30">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] font-mono">#{tx.id}</Badge>
                                  <span className={`font-bold text-[11px] ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                                    {tx.transaction_type}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px]">{tx.reference_type}</Badge>
                                  <span className="text-muted-foreground text-[10px]">
                                    {new Date(tx.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <div className="font-medium text-primary dark:text-foreground">
                                  {tx.description}
                                </div>
                                {tx.reference_id && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    Ref: {tx.reference_id}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className={`font-black text-sm ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                                  {isCredit ? `+${tx.amount}` : `-${tx.amount}`}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  Bal: {tx.balance_before} → {tx.balance_after}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: Top-ups */}
                <TabsContent value="topups" className="space-y-3">
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="divide-y divide-border">
                      {detail.topups.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">No top-up records</div>
                      ) : (
                        detail.topups.map((t) => (
                          <div key={t.id} className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-muted/30">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold">#{t.id}</span>
                                <Badge className={
                                  t.status === "VERIFIED" ? "bg-emerald-500/10 text-emerald-600" :
                                  t.status === "REJECTED" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"
                                }>
                                  {t.status}
                                </Badge>
                                {t.verified_by_username ? (
                                  <span className="text-[10px] text-indigo-600 font-semibold">
                                    Manual Approved by @{t.verified_by_username}
                                  </span>
                                ) : t.status === "VERIFIED" ? (
                                  <span className="text-[10px] text-emerald-600 font-semibold">
                                    Auto-verified by OCR Engine
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-muted-foreground">
                                NPR {t.amount_npr} → {t.total_coins} Coins via {t.payment_method_display || t.payment_method_name || "Direct"}
                              </div>
                              {t.payment_reference && (
                                <div className="font-mono text-[10px] text-primary">
                                  Ref: {t.payment_reference}
                                </div>
                              )}
                              {t.rejection_reason && (
                                <div className="text-[10px] text-red-600 bg-red-500/10 p-1.5 rounded">
                                  Reason: {t.rejection_reason}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {t.receipt_image && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedReceipt(t.receipt_image!)}
                                  className="h-7 text-xs rounded-lg gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  Voucher
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 3: XP Conversions */}
                <TabsContent value="xp" className="space-y-3">
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="divide-y divide-border">
                      {detail.xp_conversions.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">No XP conversions recorded</div>
                      ) : (
                        detail.xp_conversions.map((xp) => (
                          <div key={xp.id} className="p-3 text-xs flex items-center justify-between">
                            <div>
                              <div className="font-bold text-primary">Converted {xp.xp_converted} XP</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{xp.conversion_rate_snapshot}</div>
                              <div className="text-[10px] text-muted-foreground">{new Date(xp.created_at).toLocaleString()}</div>
                            </div>
                            <div className="text-right font-black text-[#D4A72C]">
                              +{xp.coins_awarded} Coins
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 4: Rewards */}
                <TabsContent value="rewards" className="space-y-3">
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="divide-y divide-border">
                      {detail.reward_claims.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">No activity rewards claimed</div>
                      ) : (
                        detail.reward_claims.map((rc) => (
                          <div key={rc.id} className="p-3 text-xs flex items-center justify-between">
                            <div>
                              <div className="font-bold text-primary">{rc.activity_name || rc.activity_type}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">Ref: {rc.activity_reference}</div>
                              <div className="text-[10px] text-muted-foreground">{new Date(rc.claimed_at).toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-[#D4A72C]">+{rc.coins_awarded} Coins</span>
                              {rc.xp_awarded > 0 && (
                                <span className="block text-[10px] text-purple-600 font-semibold">+{rc.xp_awarded} XP</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 5: Content Purchases */}
                <TabsContent value="content" className="space-y-3">
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="divide-y divide-border">
                      {detail.content_entitlements.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">No content purchased with coins</div>
                      ) : (
                        detail.content_entitlements.map((ce) => (
                          <div key={ce.id} className="p-3 text-xs flex items-center justify-between">
                            <div>
                              <div className="font-bold text-primary">
                                {ce.content_type_display || ce.content_type} #{ce.content_id}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Purchased: {new Date(ce.purchased_at).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Expiry: {ce.expires_at ? new Date(ce.expires_at).toLocaleDateString() : "Lifetime Access"}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-red-600">-{ce.coins_spent} Coins</span>
                              <Badge className={ce.is_valid ? "bg-emerald-500/10 text-emerald-600 ml-2" : "bg-muted text-muted-foreground ml-2"}>
                                {ce.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}

          <div className="pt-2 flex justify-end">
            <Button variant="outline" onClick={onClose} className="rounded-xl text-xs h-9">
              Close Inspection
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Lightbox for receipt */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
          <DialogContent className="max-w-2xl p-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Payment Voucher</DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-auto rounded-lg bg-black/5 p-2 flex items-center justify-center">
              <img src={selectedReceipt} alt="Receipt" className="max-h-[65vh] w-auto object-contain rounded-md" />
            </div>
            <div className="flex justify-between pt-2 text-xs">
              <Button variant="outline" size="sm" onClick={() => window.open(selectedReceipt, "_blank")}>
                Open Original
              </Button>
              <Button size="sm" onClick={() => setSelectedReceipt(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
