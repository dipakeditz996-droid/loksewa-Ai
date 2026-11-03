"use client";

import React, { useState, useEffect } from "react";
import { 
  Coins, 
  Upload, 
  QrCode, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  Copy, 
  Check, 
  Eye, 
  RefreshCw,
  Building,
  Smartphone
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  walletApi, 
  TopUpConfig, 
  CoinTopUp, 
  ActivePaymentMethod 
} from "@/lib/api/wallet";
import toast from "react-hot-toast";

interface TopUpWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingTopUpToResubmit?: CoinTopUp | null;
}

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

export function TopUpWorkflow({
  isOpen,
  onClose,
  onSuccess,
  existingTopUpToResubmit,
}: TopUpWorkflowProps) {
  // Steps: 1: Amount & Coins, 2: Payment Method & QR/Instructions, 3: Voucher Upload & Reference, 4: Verification Result
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [config, setConfig] = useState<TopUpConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Form State
  const [amountNpr, setAmountNpr] = useState<number>(500);
  const [selectedMethod, setSelectedMethod] = useState<ActivePaymentMethod | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Active top-up created in step 2/3
  const [activeTopUp, setActiveTopUp] = useState<CoinTopUp | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      if (existingTopUpToResubmit) {
        // Resubmitting a previously rejected/uncertain top-up
        setActiveTopUp(existingTopUpToResubmit);
        setAmountNpr(Number(existingTopUpToResubmit.amount_npr));
        setPaymentReference(existingTopUpToResubmit.payment_reference || "");
        setStep(3);
      } else {
        setStep(1);
        setActiveTopUp(null);
        setPaymentReference("");
        setReceiptFile(null);
        setReceiptPreview(null);
      }
    }
  }, [isOpen, existingTopUpToResubmit]);

  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      const data = await walletApi.getTopUpConfig();
      setConfig(data);
      if (data.payment_methods?.length > 0 && !selectedMethod) {
        setSelectedMethod(data.payment_methods[0] || null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load top-up configuration.");
    } finally {
      setLoadingConfig(false);
    }
  };

  // Calculate coins & bonus
  const rate = Number(config?.npr_to_coin_rate || 1);
  const bonusPct = Number(config?.bonus_percentage || 0);
  const baseCoins = Math.floor(amountNpr * rate);
  const bonusCoins = bonusPct > 0 ? Math.floor((baseCoins * bonusPct) / 100) : 0;
  const totalCoins = baseCoins + bonusCoins;

  const minNpr = Number(config?.min_topup_npr || 50);
  const maxNpr = Number(config?.max_topup_npr || 50000);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size cannot exceed 10MB.");
        return;
      }
      setReceiptFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => setReceiptPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    }
  };

  // Step 1 -> Step 2
  const handleProceedToMethod = () => {
    if (amountNpr < minNpr) {
      toast.error(`Minimum top-up is NPR ${minNpr}.`);
      return;
    }
    if (amountNpr > maxNpr) {
      toast.error(`Maximum top-up is NPR ${maxNpr}.`);
      return;
    }
    setStep(2);
  };

  // Step 2 -> Step 3: Create PENDING top-up request on backend
  const handleProceedToUpload = async () => {
    if (!selectedMethod) {
      toast.error("Please select a payment method.");
      return;
    }

    try {
      setIsSubmitting(true);
      // Create request if not already created
      if (!activeTopUp) {
        const idempotencyKey = `topup_req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const res = await walletApi.createTopUpRequest({
          amount_npr: amountNpr,
          payment_method_id: selectedMethod.id,
          idempotency_key: idempotencyKey,
        });
        setActiveTopUp(res);
      }
      setStep(3);
    } catch (err: any) {
      toast.error(err?.message || "Failed to initialize top-up request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3 -> Step 4: Submit Voucher & Start Verification
  const handleSubmitVoucher = async () => {
    if (!activeTopUp) {
      toast.error("Top-up request expired. Please start over.");
      setStep(1);
      return;
    }
    if (!selectedMethod) {
      toast.error("Please select a payment method.");
      return;
    }
    const cleanRef = paymentReference.trim();
    if (!cleanRef) {
      toast.error("Please enter the transaction reference code / ID from your receipt.");
      return;
    }
    if (!receiptFile && !activeTopUp.receipt_image) {
      toast.error("Please upload the payment voucher / receipt screenshot.");
      return;
    }

    try {
      setIsSubmitting(true);
      const fd = new FormData();
      fd.append("payment_method_id", String(selectedMethod.id));
      fd.append("payment_reference", cleanRef);
      if (receiptFile) {
        fd.append("receipt_image", receiptFile);
      }

      const updated = await walletApi.submitTopUpPayment(activeTopUp.id, fd);
      setActiveTopUp(updated);
      setStep(4);
      startPolling(updated.id);
    } catch (err: any) {
      toast.error(err?.message || "Payment voucher submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll top-up status until final decision
  const startPolling = (topupId: number) => {
    setIsPolling(true);
    let attempts = 0;
    const maxAttempts = 15;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const current = await walletApi.getTopUpStatus(topupId);
        setActiveTopUp(current);

        if (
          current.status === "VERIFIED" ||
          current.status === "REJECTED" ||
          current.verification_status === "VERIFIED_CONFIDENT" ||
          current.verification_status === "VERIFIED_UNCERTAIN" ||
          current.verification_status === "VERIFICATION_FAILED"
        ) {
          clearInterval(interval);
          setIsPolling(false);
          if (current.status === "VERIFIED") {
            toast.success("Payment automatically verified and coins credited!");
            onSuccess();
          }
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setIsPolling(false);
        }
      } catch {
        clearInterval(interval);
        setIsPolling(false);
      }
    }, 2500);
  };

  const getStatusDisplay = (topup: CoinTopUp) => {
    if (topup.status === "VERIFIED") {
      return {
        title: "Top-up Verified & Credited!",
        badge: "VERIFIED",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/30",
        icon: CheckCircle2,
        desc: `Successfully credited ${topup.total_coins} coins to your wallet. You can start using them immediately!`,
      };
    }

    if (topup.status === "REJECTED") {
      return {
        title: "Top-up Request Rejected",
        badge: "REJECTED",
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-500/10 border-red-500/30",
        icon: XCircle,
        desc: topup.rejection_reason || "The submitted receipt could not be verified by the system.",
      };
    }

    if (topup.verification_status === "VERIFIED_UNCERTAIN" || topup.status === "SUBMITTED") {
      return {
        title: "Payment Awaiting Review",
        badge: "AWAITING REVIEW",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/30",
        icon: Clock,
        desc: "Your payment receipt was received and is in the queue for manual admin verification. Coins will be credited once verified.",
      };
    }

    if (topup.verification_status === "VERIFICATION_IN_PROGRESS") {
      return {
        title: "Automated OCR Verification in Progress...",
        badge: "VERIFYING",
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/30",
        icon: RefreshCw,
        desc: "Our automated system is inspecting your receipt details (amount, transaction ID, merchant). Please wait a few moments...",
      };
    }

    return {
      title: "Payment Submitted",
      badge: topup.status,
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-muted border-border",
      icon: Clock,
      desc: "Your top-up request has been recorded.",
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[24px] border border-border">
        {/* Header with Step indicator */}
        <div className="bg-gradient-to-r from-[#0B2545] to-[#133A6B] p-6 text-white">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FFD700] flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                Coin Top-Up
              </span>
              <span className="text-xs text-slate-300">Step {step} of 4</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white">
              {step === 1 && "Choose Amount & Calculate Coins"}
              {step === 2 && "Select Payment Method & Pay"}
              {step === 3 && "Submit Payment Voucher"}
              {step === 4 && "Verification Status"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-300">
              {step === 1 && "Select the NPR amount you wish to deposit to receive coins."}
              {step === 2 && "Scan the QR code or transfer directly to our authorized account."}
              {step === 3 && "Upload the payment screenshot and enter the transaction reference."}
              {step === 4 && "Real-time automated payment verification result."}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          <div className="w-full bg-white/20 h-1.5 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-[#D4A72C] h-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* STEP 1: Amount Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quick Select Amount (NPR)
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_AMOUNTS.map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant={amountNpr === amt ? "default" : "outline"}
                      onClick={() => setAmountNpr(amt)}
                      className={`h-11 rounded-xl text-xs sm:text-sm font-bold ${
                        amountNpr === amt
                          ? "bg-[#0B2545] text-white hover:bg-[#133A6B]"
                          : "hover:border-[#D4A72C]/60"
                      }`}
                    >
                      Rs. {amt}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Or Enter Custom Amount (NPR)
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    NPR
                  </span>
                  <Input
                    id="custom-amount"
                    type="number"
                    min={minNpr}
                    max={maxNpr}
                    value={amountNpr || ""}
                    onChange={(e) => setAmountNpr(Number(e.target.value))}
                    className="pl-14 h-12 text-lg font-bold rounded-xl"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>Min: NPR {minNpr}</span>
                  <span>Max: NPR {maxNpr}</span>
                </div>
              </div>

              {/* Coin Calculation Summary Card */}
              <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Coin Breakdown
                  </span>
                  {bonusPct > 0 && (
                    <Badge className="bg-[#D4A72C] text-[#0B2545] font-black hover:bg-[#D4A72C] text-xs px-2.5">
                      +{bonusPct}% Bonus Active
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-amber-500/20 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground">Base Coins</div>
                    <div className="text-lg font-bold text-primary dark:text-foreground">
                      {baseCoins.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Bonus Coins</div>
                    <div className="text-lg font-bold text-[#D4A72C]">
                      +{bonusCoins.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold">Total You Get</div>
                    <div className="text-xl font-extrabold text-[#D4A72C]">
                      {totalCoins.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-center pt-1">
                  Exchange Rate: 1 NPR = {rate} Base Coin
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={onClose} className="rounded-xl h-11">
                  Cancel
                </Button>
                <Button
                  onClick={handleProceedToMethod}
                  disabled={amountNpr < minNpr || amountNpr > maxNpr}
                  className="bg-[#0B2545] text-white hover:bg-[#133A6B] font-bold rounded-xl h-11 px-6 gap-2"
                >
                  <span>Select Payment Method</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Payment Method & Instructions */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Select Payment Option
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {config?.payment_methods?.map((pm) => {
                    const isSelected = selectedMethod?.id === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setSelectedMethod(pm)}
                        className={`text-left p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                          isSelected
                            ? "border-[#D4A72C] bg-[#D4A72C]/10 shadow-sm"
                            : "border-border hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          pm.method_type === "BANK"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-emerald-500/10 text-emerald-600"
                        }`}>
                          {pm.method_type === "BANK" ? (
                            <Building className="w-5 h-5" />
                          ) : (
                            <Smartphone className="w-5 h-5" />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="font-bold text-sm text-primary dark:text-foreground">
                            {pm.display_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {pm.account_name}
                          </div>
                          <div className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                            {pm.account_number}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Method Details & QR Display */}
              {selectedMethod && (
                <div className="rounded-2xl border border-border bg-muted/40 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* QR Code Container */}
                    {selectedMethod.qr_image ? (
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-md shrink-0 text-center">
                        <img
                          src={selectedMethod.qr_image}
                          alt="Payment QR"
                          className="w-40 h-40 object-contain mx-auto rounded-lg"
                        />
                        <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
                          Scan with {selectedMethod.display_name}
                        </span>
                      </div>
                    ) : (
                      <div className="w-40 h-40 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center p-4 text-center text-muted-foreground shrink-0">
                        <QrCode className="w-8 h-8 mb-1 opacity-50" />
                        <span className="text-xs">Direct Transfer Account</span>
                      </div>
                    )}

                    {/* Account Particulars */}
                    <div className="space-y-2.5 flex-1 min-w-0 w-full text-xs sm:text-sm">
                      <div className="flex items-center justify-between pb-1 border-b border-border/60">
                        <span className="text-muted-foreground">Amount to Transfer:</span>
                        <span className="font-black text-base text-[#D4A72C]">
                          NPR {amountNpr.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Account Name:</span>
                        <div className="flex items-center gap-1.5 font-semibold text-primary dark:text-foreground">
                          <span>{selectedMethod.account_name}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedMethod.account_name, "acc_name")}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {copiedField === "acc_name" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Account / ID Number:</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-primary dark:text-foreground">
                          <span>{selectedMethod.account_number}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedMethod.account_number, "acc_no")}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {copiedField === "acc_no" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>

                      {selectedMethod.bank_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Bank Name:</span>
                          <span className="font-medium text-primary dark:text-foreground">
                            {selectedMethod.bank_name}
                          </span>
                        </div>
                      )}

                      {selectedMethod.branch && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Branch:</span>
                          <span className="font-medium text-primary dark:text-foreground">
                            {selectedMethod.branch}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Instructions Note */}
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-bold">Important Instructions: </span>
                    {config?.instructions || "Transfer the exact amount to the account above. Save the payment receipt / screenshot and note the transaction code."}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-xl h-11 gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={handleProceedToUpload}
                  disabled={!selectedMethod || isSubmitting}
                  className="bg-[#0B2545] text-white hover:bg-[#133A6B] font-bold rounded-xl h-11 px-6 gap-2"
                >
                  <span>I Have Completed Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Voucher Upload & Reference Submission */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-xl bg-muted/60 p-4 flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <span className="text-muted-foreground">Expected Deposit: </span>
                  <span className="font-bold text-primary dark:text-foreground">
                    NPR {amountNpr}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Coins Credited on Verification: </span>
                  <span className="font-black text-[#D4A72C]">
                    {totalCoins} Coins
                  </span>
                </div>
              </div>

              {/* Transaction ID Input */}
              <div className="space-y-2">
                <Label htmlFor="payment-ref" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Transaction Code / Reference ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="payment-ref"
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value.toUpperCase())}
                  placeholder="e.g. 10B9X3A or TXN-98402834"
                  className="h-12 font-mono font-bold tracking-wider text-base uppercase rounded-xl"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Found on your payment success receipt (eSewa Transaction Code, Khalti Txn ID, or Bank Reference).
                </p>
              </div>

              {/* Receipt File Upload */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Payment Receipt Screenshot / PDF <span className="text-red-500">*</span>
                </Label>
                <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-[#D4A72C] transition-colors relative">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {receiptPreview ? (
                    <div className="space-y-2">
                      <img
                        src={receiptPreview}
                        alt="Receipt Preview"
                        className="max-h-48 mx-auto rounded-lg object-contain shadow-sm"
                      />
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {receiptFile?.name} (Click or drag to change)
                      </p>
                    </div>
                  ) : receiptFile ? (
                    <div className="space-y-2">
                      <FileText className="w-10 h-10 mx-auto text-primary" />
                      <p className="text-sm font-semibold">{receiptFile.name}</p>
                      <p className="text-xs text-muted-foreground">PDF Document Selected</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-muted rounded-full w-12 h-12 mx-auto flex items-center justify-center text-muted-foreground">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="font-semibold text-sm">
                        Click to upload or drag & drop payment voucher
                      </div>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, WEBP, or PDF (up to 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                  className="rounded-xl h-11 gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmitVoucher}
                  disabled={isSubmitting || !paymentReference.trim()}
                  className="bg-gradient-to-r from-[#D4A72C] to-[#E5B83E] hover:from-[#C29624] hover:to-[#D4A72C] text-[#0B2545] font-black rounded-xl h-11 px-6 gap-2 shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span>Submit for Verification</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Verification Result & Progress */}
          {step === 4 && activeTopUp && (
            <div className="space-y-6">
              {(() => {
                const statusInfo = getStatusDisplay(activeTopUp);
                const Icon = statusInfo.icon;

                return (
                  <div className={`rounded-2xl border p-6 text-center space-y-4 ${statusInfo.bg}`}>
                    <div className={`p-4 rounded-full inline-block ${statusInfo.color}`}>
                      <Icon className={`w-12 h-12 ${isPolling ? "animate-spin" : ""}`} />
                    </div>

                    <div className="space-y-1">
                      <Badge className={`text-xs font-bold mb-1 ${statusInfo.color}`}>
                        {statusInfo.badge}
                      </Badge>
                      <h3 className={`text-xl font-extrabold ${statusInfo.color}`}>
                        {statusInfo.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                        {statusInfo.desc}
                      </p>
                    </div>

                    {/* Breakdown of submitted info */}
                    <div className="rounded-xl bg-card/80 border border-border p-4 text-left max-w-md mx-auto space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Top-Up Request ID:</span>
                        <span className="font-mono font-bold">#{activeTopUp.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Reference:</span>
                        <span className="font-mono font-bold">{activeTopUp.payment_reference}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deposited Amount:</span>
                        <span className="font-bold">NPR {activeTopUp.amount_npr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Coins:</span>
                        <span className="font-black text-[#D4A72C]">
                          {activeTopUp.total_coins} Coins
                        </span>
                      </div>
                      {activeTopUp.detected_provider && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Detected Provider:</span>
                          <span className="font-semibold">{activeTopUp.detected_provider}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons based on status */}
                    <div className="pt-2 flex flex-wrap justify-center gap-3">
                      {activeTopUp.status === "VERIFIED" && (
                        <Button
                          onClick={() => {
                            onSuccess();
                            onClose();
                          }}
                          className="bg-[#0B2545] text-white hover:bg-[#133A6B] font-bold rounded-xl h-11 px-8"
                        >
                          View My Updated Wallet
                        </Button>
                      )}

                      {activeTopUp.status === "REJECTED" && (
                        <Button
                          onClick={() => {
                            setStep(3);
                          }}
                          className="bg-[#D4A72C] text-[#0B2545] font-bold rounded-xl h-11 px-6 gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Try Resubmitting Receipt
                        </Button>
                      )}

                      {activeTopUp.status !== "VERIFIED" && activeTopUp.status !== "REJECTED" && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            onSuccess();
                            onClose();
                          }}
                          className="rounded-xl h-11 px-6"
                        >
                          Close (Track in Wallet History)
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
