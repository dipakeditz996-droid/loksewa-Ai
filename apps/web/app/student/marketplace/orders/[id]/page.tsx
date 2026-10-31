"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { marketplaceApi, Order, Review, Dispute } from "@/lib/api/marketplace";
import { Loader2, Package, ArrowLeft, CheckCircle2, Clock, Truck, FileText, CheckCircle, MapPin, Box, Star, AlertTriangle, MessageSquare, XCircle, RefreshCw, CreditCard, UploadCloud, Info, X, ShieldCheck, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PaymentMethod } from "@/lib/api/marketplace";
import { buildMediaUrl } from "@/lib/api/client";
import { RetryNextImage as Image } from "@/components/ui/retry-next-image";
import { TrustModals } from "@/components/marketplace/trust-modals";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_TIMELINE = [
  { id: 'PENDING_PAYMENT', label: 'Pending Payment', icon: FileText },
  { id: 'PAYMENT_VERIFICATION', label: 'Verifying', icon: Clock },
  { id: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
  { id: 'PROCESSING', label: 'Processing', icon: Package },
  { id: 'SHIPPED', label: 'Shipped', icon: Truck },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { id: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

export default function StudentOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string | undefined;
  const numOrderId = Number(orderId);
  const isValidOrderId = Boolean(
    orderId &&
    orderId !== "null" &&
    orderId !== "undefined" &&
    !isNaN(numOrderId) &&
    numOrderId > 0
  );
  const [order, setOrder] = useState<Order | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [holding, setHolding] = useState(false);

  // Payment recovery modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentRecoveryMode, setPaymentRecoveryMode] = useState<'TRY_AGAIN' | 'SWITCH_METHOD'>('TRY_AGAIN');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<'PREPAID' | 'COD'>('PREPAID');
  const [txnCode, setTxnCode] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Modal states
  const [modalType, setModalType] = useState<'REVIEW' | 'DISPUTE'>('REVIEW');
  const [modalItemId, setModalItemId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchOrderData = () => {
    if (!isValidOrderId) {
      setLoading(false);
      return;
    }
    Promise.all([
      marketplaceApi.getOrder(Number(orderId)),
      marketplaceApi.getReviews(),
      marketplaceApi.getDisputes(),
      marketplaceApi.getPaymentMethods()
    ])
      .then(([orderData, reviewsData, disputesData, methodsData]) => {
        setOrder(orderData);
        setReviews(reviewsData);
        setDisputes(disputesData);
        setPaymentMethods(methodsData);
        if (methodsData.length > 0 && !selectedMethodId) {
          setSelectedMethodId(methodsData[0]?.id ?? null);
        }
        if (orderData.is_cod) {
          setSelectedPaymentMode('COD');
        } else {
          setSelectedPaymentMode('PREPAID');
        }
        setLoading(false);
      })
      
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrderData();
  }, [orderId]);

  const openPaymentRecoveryModal = (mode: 'TRY_AGAIN' | 'SWITCH_METHOD') => {
    if (!order) return;
    setPaymentRecoveryMode(mode);
    setTxnCode("");
    setScreenshot(null);
    setScreenshotPreview(null);
    setPaymentNote("");
    if (order.latest_payment_submission?.payment_method_id) {
      setSelectedMethodId(order.latest_payment_submission.payment_method_id);
    } else if (paymentMethods.length > 0) {
      setSelectedMethodId(paymentMethods[0]?.id ?? null);
    }
    setSelectedPaymentMode(order.is_cod ? 'COD' : 'PREPAID');
    setPaymentModalOpen(true);
  };

  const handleSwitchMode = async (targetMode: 'PREPAID' | 'COD') => {
    if (!order || targetMode === selectedPaymentMode) return;
    try {
      const updated = await marketplaceApi.switchPaymentMode(order.id, targetMode);
      setOrder(updated);
      setSelectedPaymentMode(targetMode);
      toast.success(`Switched to ${targetMode === 'COD' ? 'Cash on Delivery (15% Advance)' : 'Full Online Payment'}`);
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to switch payment mode");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Screenshot must be less than 5MB");
        return;
      }
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRecoveryPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !selectedMethodId) {
      toast.error("Please select a payment method.");
      return;
    }
    if (!txnCode.trim() || !screenshot) {
      toast.error("Please enter the transaction reference code and upload your payment screenshot.");
      return;
    }

    setSubmittingPayment(true);
    try {
      const formData = new FormData();
      formData.append('order', order.id.toString());
      formData.append('payment_method', selectedMethodId.toString());
      formData.append('transaction_id', txnCode.trim());
      formData.append('screenshot', screenshot);
      if (paymentNote.trim()) formData.append('note', paymentNote.trim());

      await marketplaceApi.submitPayment(formData);
      toast.success("Payment proof submitted successfully! Awaiting admin verification.");
      setPaymentModalOpen(false);
      fetchOrderData();
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "";
      if (
        typeof detail === "string" &&
        (detail.toLowerCase().includes("already have a pending payment") ||
         detail.toLowerCase().includes("pending payment verification"))
      ) {
        toast.success("Payment proof submitted successfully! Awaiting admin verification.");
        setPaymentModalOpen(false);
        fetchOrderData();
        return;
      }
      toast.error(detail || "Failed to submit payment proof.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleHoldOrder = async () => {
    if (!order) return;
    setHolding(true);
    try {
      const updated = await marketplaceApi.holdOrder(order.id, holdReason);
      setOrder(updated);
      setHoldModalOpen(false);
      setHoldReason("");
      toast.success("Order placed on hold successfully.");
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to put order on hold.");
    } finally {
      setHolding(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!confirm("Are you sure you want to cancel this order? Stock will be released back to the marketplace.")) return;
    try {
      setCancelling(true);
      const updated = await marketplaceApi.cancelOrder(order.id);
      setOrder(updated);
      toast.success("Order cancelled successfully.");
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  };

  const openModal = (type: 'REVIEW' | 'DISPUTE', itemId: number) => {
    setModalType(type);
    setModalItemId(itemId);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 flex-col">
        <Loader2 className="w-10 h-10 animate-spin text-[#163E6B]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 flex-col">
        <p>Order not found.</p>
      </div>
    );
  }

  return (
    <div className="font-sans text-slate-900 dark:text-slate-50">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <button 
          onClick={() => router.push("/student/marketplace/orders")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6 font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <Package className="w-8 h-8 text-[#163E6B] dark:text-[#D4A72C]" /> Order #ORD-{order.id}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Placed on {new Date(order.created_at).toLocaleDateString("en-NP", {
                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(order.status === 'CONFIRMED' || order.status === 'PROCESSING') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHoldModalOpen(true)}
                className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 font-bold text-xs"
              >
                Put Order on Hold
              </Button>
            )}
            <div className="inline-block px-5 py-2 rounded-full text-sm font-bold bg-[#163E6B]/10 text-[#163E6B] dark:bg-[#D4A72C]/10 dark:text-[#D4A72C] uppercase tracking-wide border border-[#163E6B]/20 dark:border-[#D4A72C]/20">
              {order.status.replace(/_/g, " ")}
            </div>
          </div>
        </div>

        {/* On Hold Order Banner */}
        {order.status === 'ON_HOLD' && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <Clock className="w-8 h-8 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xl font-extrabold text-amber-900 dark:text-amber-200">
                    Order is currently On Hold
                  </h3>
                  {order.held_at && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold self-start">
                      Held on {new Date(order.held_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {order.hold_reason && (
                  <p className="text-sm text-amber-900 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                    <strong>Hold Reason:</strong> {order.hold_reason}
                  </p>
                )}
                <div className="text-xs text-amber-800 dark:text-amber-400 bg-amber-100/40 p-3 rounded-lg border border-amber-200/60 leading-relaxed">
                  <strong>Strict Advance Policy:</strong> Per marketplace policy, the 15% COD advance payment (Rs. {order.cod_advance_paid || order.cod_advance_required}) is non-refundable once verified. Our administration will review your held order to reschedule dispatch or assist you with any requirements.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Rejection Recovery Card */}
        {order.latest_payment_submission?.status === 'REJECTED' && order.can_retry_payment && (
          <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800/60 rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex items-start gap-4">
              <XCircle className="w-8 h-8 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xl font-extrabold text-red-900 dark:text-red-200">
                    Payment not completed
                  </h3>
                  <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-bold self-start">
                    Attempt #{order.latest_payment_submission.attempt_number} Rejected
                  </span>
                </div>
                
                <div className="text-sm text-red-800 dark:text-red-300 space-y-1.5 bg-red-100/50 dark:bg-red-900/20 p-3.5 rounded-xl border border-red-200 dark:border-red-800/40">
                  <p>
                    <strong>Reason supplied by administrator:</strong>{" "}
                    <span className="font-semibold text-red-950 dark:text-red-100">
                      {order.latest_payment_submission.rejection_reason || "Invalid / Unclear screenshot or incorrect transaction code."}
                    </span>
                  </p>
                  <p className="text-xs text-red-700/90 dark:text-red-400">
                    Rejected Amount: Rs. {order.latest_payment_submission.submitted_amount} • Ref: {order.latest_payment_submission.transaction_id}
                    {order.latest_payment_submission.verified_at && ` • ${new Date(order.latest_payment_submission.verified_at).toLocaleString()}`}
                  </p>
                </div>
                
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Your order is still held in our system. You can review your transaction and try submitting again, or switch to another supported payment method.
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button 
                    onClick={() => openPaymentRecoveryModal('TRY_AGAIN')} 
                    className="bg-[#163E6B] hover:bg-[#163E6B]/90 text-white font-bold gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Try Again
                  </Button>
                  <Button 
                    onClick={() => openPaymentRecoveryModal('SWITCH_METHOD')} 
                    variant="outline" 
                    className="border-slate-300 font-bold gap-2 bg-white dark:bg-slate-800"
                  >
                    <CreditCard className="w-4 h-4" /> Pay Another Way
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={handleCancelOrder} 
                    disabled={cancelling}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs ml-auto"
                  >
                    {cancelling ? "Cancelling..." : "Cancel Order"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Submitted Awaiting Verification Banner */}
        {order.status === 'PAYMENT_SUBMITTED' && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <Clock className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-200 text-base">
                Payment Verification Pending
              </h4>
              <p className="text-sm text-blue-800/80 dark:text-blue-300/70 mt-1">
                Your payment proof ({order.is_cod ? '15% COD Advance' : 'Full Online Payment'}) has been submitted and is currently being reviewed by our administration. Once verified, your physical items will be packaged and dispatched.
              </p>
            </div>
          </div>
        )}

        {/* Unpaid Order Action Banner (if not rejected yet) */}
        {order.status === 'PENDING_PAYMENT' && order.latest_payment_submission?.status !== 'REJECTED' && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="font-bold text-amber-900 dark:text-amber-200 text-base">
                {order.is_cod ? "COD Advance Payment Required (15%)" : "Payment Awaiting Submission"}
              </h4>
              <p className="text-sm text-amber-800/80 dark:text-amber-300/70 mt-1">
                {order.is_cod 
                  ? `Please pay the mandatory 15% advance (Rs. ${order.cod_advance_required}) to confirm and dispatch your order. The remaining 85% balance (Rs. ${order.cod_remaining_balance}) is paid in cash upon delivery.`
                  : `Your order is reserved. Please submit payment proof (Rs. ${Number(order.total_amount) + Number(order.delivery_fee)}) to confirm dispatch.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => openPaymentRecoveryModal('TRY_AGAIN')} 
                className="bg-[#163E6B] hover:bg-[#163E6B]/90 text-white font-bold"
              >
                Submit Payment Proof
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancelOrder} 
                disabled={cancelling}
                className="text-red-600 border-red-200 hover:bg-red-50 font-bold"
              >
                {cancelling ? "Cancelling..." : "Cancel Order"}
              </Button>
            </div>
          </div>
        )}

        {/* COD Advance Verified Info Banner */}
        {order.is_cod && order.payment_status === 'PARTIALLY_PAID' && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-base">
                COD Advance Verified • Order Confirmed for Dispatch
              </h4>
              <p className="text-sm text-emerald-800/80 dark:text-emerald-300/70 mt-1">
                Your 15% advance payment (Rs. {order.cod_advance_paid}) was verified. The remaining 85% balance of <strong className="text-emerald-950 dark:text-emerald-100">Rs. {order.cod_remaining_balance}</strong> will be collected in cash when your package is delivered to your address.
              </p>
            </div>
          </div>
        )}

        {/* Global Timeline */}
        {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 md:p-8 mb-8 shadow-sm">
            <h4 className="font-bold text-lg mb-8 text-slate-800 dark:text-slate-200">Overall Order Progress</h4>
            <div className="relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-white/10 rounded-full hidden sm:block"></div>
              <div className="flex flex-col sm:flex-row justify-between gap-6 relative z-10">
                {STATUS_TIMELINE.map((step, index) => {
                  const currentIndex = STATUS_TIMELINE.findIndex(s => s.id === order.status);
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex;
                  const Icon = step.icon;
                  
                  return (
                    <div key={step.id} className={`flex sm:flex-col items-center gap-4 sm:gap-3 text-center flex-1 ${!isCompleted ? 'opacity-40 grayscale' : ''}`}>
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                        isCompleted 
                          ? isCurrent 
                            ? 'bg-[#163E6B] border-[#163E6B] text-white dark:bg-[#D4A72C] dark:border-[#D4A72C] dark:text-slate-900 ring-4 ring-[#163E6B]/20 dark:ring-[#D4A72C]/20 scale-110' 
                            : 'bg-[#163E6B] border-[#163E6B] text-white dark:bg-[#D4A72C] dark:border-[#D4A72C] dark:text-slate-900'
                          : 'bg-white border-slate-300 text-slate-400 dark:bg-[#0A1118] dark:border-slate-700'
                      }`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="text-left sm:text-center">
                        <span className={`block text-xs sm:text-sm font-bold ${isCurrent ? 'text-[#163E6B] dark:text-[#D4A72C]' : 'text-slate-600 dark:text-slate-400'}`}>
                          {step.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {(order.status === 'CANCELLED' || order.status === 'REFUNDED') && (
          <div className="bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 rounded-2xl p-6 mb-8 font-semibold">
             This order has been {order.status.toLowerCase()}.
          </div>
        )}

        {/* NCM Courier Shipment & Tracking Banner */}
        {order.courier_shipment && (
          <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-white dark:from-indigo-950/30 dark:via-slate-900/40 dark:to-slate-900/20 border-2 border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-100 dark:border-indigo-900/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                      Dispatched via Nepal Can Move (NCM)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
                      {order.courier_shipment.courier_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Waybill / Order ID: <strong className="font-mono text-slate-700 dark:text-slate-200">#{order.courier_shipment.ncm_order_id}</strong>
                    {order.courier_shipment.tracking_id && (
                      <> • Tracking Code: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{order.courier_shipment.tracking_id}</strong></>
                    )}
                  </p>
                </div>
              </div>

              {order.courier_shipment.tracking_id && (
                <a
                  href={`https://nepalcanmove.com/track?tracking_id=${encodeURIComponent(order.courier_shipment.tracking_id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
                >
                  Track on NCM Portal
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
              <div className="bg-white/80 dark:bg-white/5 p-3 rounded-xl border border-indigo-100/60 dark:border-indigo-900/40">
                <span className="text-slate-400 block font-medium">Delivery Route</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {order.courier_shipment.origin_branch} → {order.courier_shipment.destination_branch}
                </span>
                <span className="text-[10px] text-slate-500">{order.courier_shipment.delivery_type}</span>
              </div>

              <div className="bg-white/80 dark:bg-white/5 p-3 rounded-xl border border-indigo-100/60 dark:border-indigo-900/40">
                <span className="text-slate-400 block font-medium">Amount Due on Delivery</span>
                <span className="font-extrabold text-amber-700 dark:text-amber-400 mt-0.5 block text-sm">
                  Rs. {order.courier_shipment.cod_charge}
                </span>
                <span className="text-[10px] text-slate-500">
                  {order.is_cod ? "Remaining 85% payable to courier agent" : "Fully prepaid online"}
                </span>
              </div>

              <div className="bg-white/80 dark:bg-white/5 p-3 rounded-xl border border-indigo-100/60 dark:border-indigo-900/40">
                <span className="text-slate-400 block font-medium">Last Tracking Update</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">
                  {order.courier_shipment.last_synced_at
                    ? new Date(order.courier_shipment.last_synced_at).toLocaleString()
                    : "In transit"}
                </span>
                <span className="text-[10px] text-slate-500">Auto-synchronized</span>
              </div>
            </div>

            {order.courier_shipment.status_history && order.courier_shipment.status_history.length > 0 && (
              <div className="mt-4 pt-4 border-t border-indigo-100/80 dark:border-indigo-900/40">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Courier Transit History</h5>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {order.courier_shipment.status_history.map((ev: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{ev.status || ev.state || "Milestone"}</span>
                        {ev.location && <span className="text-slate-500 text-[11px]">({ev.location})</span>}
                        {ev.remarks && <span className="text-slate-400 text-[11px]">— {ev.remarks}</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ev.timestamp || ev.time || ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Items Section */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Box className="w-6 h-6 text-slate-400" /> Items in your Order
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row gap-5">
                  <div className="w-24 h-32 bg-slate-100 dark:bg-white/10 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-white/5">
                    {item.product_details?.cover_image && (
                      <img src={item.product_details.cover_image} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg mb-1">{item.product_details?.title || item.snapshot_product_name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-3">
                        Sold by {item.product_details?.seller_details?.full_name || item.snapshot_seller_name || "LoksewaAI"}
                      </p>
                      
                      {item.fulfillment_status && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          Status: <span className={
                            item.fulfillment_status === 'DELIVERED' ? 'text-emerald-600 dark:text-emerald-400' :
                            item.fulfillment_status === 'SHIPPED' ? 'text-blue-600 dark:text-blue-400' :
                            'text-amber-600 dark:text-amber-400'
                          }>{item.fulfillment_status}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 flex flex-col gap-4 border-t border-slate-100 dark:border-white/10 pt-4">
                      <div className="flex justify-between items-end">
                        <span className="text-slate-500 font-medium">Qty: {item.quantity}</span>
                        <span className="font-extrabold text-lg">Rs. {item.price}</span>
                      </div>
                      
                      {/* Trust Actions */}
                      {item.fulfillment_status === 'DELIVERED' && (
                        <div className="flex flex-wrap gap-3 pt-2">
                          {(() => {
                            const existingReview = reviews.find(r => r.order_item === item.id);
                            const existingDispute = disputes.find(d => d.order_item === item.id);
                            
                            return (
                              <>
                                {!existingReview ? (
                                  <button 
                                    onClick={() => openModal('REVIEW', item.id)}
                                    className="px-4 py-2 bg-[#163E6B]/10 text-[#163E6B] dark:bg-[#D4A72C]/10 dark:text-[#D4A72C] hover:bg-[#163E6B]/20 dark:hover:bg-[#D4A72C]/20 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                  >
                                    <Star className="w-4 h-4" /> Leave Review
                                  </button>
                                ) : (
                                  <div className="px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-sm font-bold flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> Reviewed ({existingReview.rating}★)
                                  </div>
                                )}
                                
                                {!existingDispute ? (
                                  <button 
                                    onClick={() => openModal('DISPUTE', item.id)}
                                    className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                  >
                                    <AlertTriangle className="w-4 h-4" /> Report Issue
                                  </button>
                                ) : (
                                  <div className="px-4 py-2 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-lg text-sm font-bold flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" /> Dispute: {existingDispute.status.replace('_', ' ')}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-lg">Payment Summary</h3>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10">
                  {order.is_cod ? "COD (15% Advance)" : "Prepaid (Online)"}
                </span>
              </div>

              <div className="space-y-2.5 text-sm pb-4 border-b border-slate-100 dark:border-white/10">
                <div className="flex justify-between">
                  <span className="text-slate-500">Product Subtotal</span>
                  <span className="font-medium">Rs. {order.total_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Charge</span>
                  <span className="font-medium">
                    {Number(order.delivery_fee) > 0 ? `Rs. ${order.delivery_fee}` : "Free delivery"}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-white/10 font-bold">
                  <span>Final Order Total</span>
                  <span className="text-[#163E6B] dark:text-[#D4A72C]">
                    Rs. {Number(order.total_amount) + Number(order.delivery_fee)}
                  </span>
                </div>
              </div>

              {order.is_cod && (
                <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs space-y-2">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex justify-between">
                    <span>15% Advance Required:</span>
                    <span>Rs. {order.cod_advance_required}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Advance Status:</span>
                    <span className="font-semibold text-emerald-600">
                      {order.payment_status === 'PARTIALLY_PAID' ? `Verified (Rs. ${order.cod_advance_paid})` : 'Pending'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-amber-200 dark:border-amber-900/50 flex justify-between font-bold text-amber-950 dark:text-amber-100">
                    <span>85% Payable on Delivery:</span>
                    <span>Rs. {order.cod_remaining_balance}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                <span>Payment State:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {order.payment_status || "UNPAID"}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-slate-400" /> Delivery Address
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                {order.shipping_address || "No address provided."}
              </p>
              {order.contact_number && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10">
                  <p className="text-xs text-slate-500 font-semibold mb-1">Contact Number</p>
                  <p className="text-sm font-medium">{order.contact_number}</p>
                </div>
              )}
            </div>
          </div>

        </div>
      {/* Payment Recovery & Submission Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#163E6B] dark:text-[#D4A72C]" />
              {paymentRecoveryMode === 'TRY_AGAIN' ? 'Complete Payment Proof' : 'Pay Another Way / Switch Payment Mode'}
            </DialogTitle>
            <DialogDescription>
              Submit your verified payment proof for Order #ORD-{order.id}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRecoveryPayment} className="space-y-5 pt-3">
            {/* Payment Mode Selector if switching */}
            {paymentRecoveryMode === 'SWITCH_METHOD' && (
              <div className="space-y-2 pb-3 border-b">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Payment Mode</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('PREPAID')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedPaymentMode === 'PREPAID'
                        ? 'border-[#163E6B] bg-[#163E6B]/5 ring-2 ring-[#163E6B] dark:border-[#D4A72C] dark:ring-[#D4A72C]'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-bold text-sm">Full Online Payment</p>
                    <p className="text-xs text-slate-500 mt-0.5">Pay 100% now via wallet / bank</p>
                    <p className="font-extrabold text-[#163E6B] dark:text-[#D4A72C] mt-1 text-sm">
                      Rs. {Number(order.total_amount) + Number(order.delivery_fee)}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchMode('COD')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedPaymentMode === 'COD'
                        ? 'border-[#163E6B] bg-[#163E6B]/5 ring-2 ring-[#163E6B] dark:border-[#D4A72C] dark:ring-[#D4A72C]'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-sm">Cash on Delivery</p>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded">15% Advance</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Pay 15% now, 85% on delivery</p>
                    <p className="font-extrabold text-amber-600 mt-1 text-sm">
                      Rs. {((Number(order.total_amount) + Number(order.delivery_fee)) * 0.15).toFixed(2)}
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Payable Amount Highlight */}
            <div className="bg-[#163E6B]/5 dark:bg-[#D4A72C]/10 border border-[#163E6B]/20 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {order.is_cod ? "15% Mandatory Advance Amount" : "Payable Amount (100%)"}
                </p>
                <p className="text-xs text-slate-400">
                  {order.is_cod ? `Remaining 85% (Rs. ${order.cod_remaining_balance}) paid in cash on delivery` : "Total order amount"}
                </p>
              </div>
              <div className="text-2xl font-black text-[#163E6B] dark:text-[#D4A72C]">
                Rs. {order.is_cod ? order.cod_advance_required : (Number(order.total_amount) + Number(order.delivery_fee)).toFixed(2)}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Choose Wallet / Bank</Label>
              <div className="grid grid-cols-3 gap-3">
                {paymentMethods.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMethodId(m.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedMethodId === m.id
                        ? 'border-[#163E6B] bg-[#163E6B]/5 ring-2 ring-[#163E6B] dark:border-[#D4A72C] dark:ring-[#D4A72C]'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-bold text-xs">{m.display_name}</p>
                    <p className="text-[10px] text-slate-400">{m.method_type}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Method Details & QR */}
            {(() => {
              const method = paymentMethods.find(m => m.id === selectedMethodId);
              if (!method) return null;
              const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
              const qrSrc = method.qr_image ? buildMediaUrl(method.qr_image) : null;
              const payable = order.is_cod ? order.cod_advance_required : (Number(order.total_amount) + Number(order.delivery_fee)).toFixed(2);

              return (
                <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {qrSrc && (
                      <div className="w-28 h-28 relative bg-white p-1 rounded-lg border shrink-0">
                        <Image src={qrSrc} alt="QR" fill className="object-contain" unoptimized />
                      </div>
                    )}
                    <div className="flex-1 text-xs space-y-1 w-full">
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-slate-500">Account Name:</span>
                        <span className="font-semibold">{method.account_name}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-slate-500">Account No / ID:</span>
                        <span className="font-mono font-bold">{method.account_number}</span>
                      </div>
                      {method.bank_name && (
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-slate-500">Bank & Branch:</span>
                          <span className="font-medium">{method.bank_name} ({method.branch || 'Main'})</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 font-bold text-primary">
                        <span>Exact Transfer:</span>
                        <span>Rs. {payable}</span>
                      </div>
                    </div>
                  </div>

                  {/* Instruction text */}
                  <div className="bg-blue-50/70 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-200/60 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                    <p>• Transfer <strong>Rs. {payable}</strong> to the account above.</p>
                    <p>• In Remarks/Purpose, write: <strong className="font-mono">Order #{order.id}</strong></p>
                    {method.instructions && <p>• {method.instructions}</p>}
                  </div>
                </div>
              );
            })()}

            {/* Transaction ID */}
            <div className="space-y-1.5">
              <Label htmlFor="rec-txnId" className="text-xs font-semibold">Transaction ID / Reference Code *</Label>
              <Input
                id="rec-txnId"
                placeholder="e.g. 000ABC123XYZ"
                value={txnCode}
                onChange={e => setTxnCode(e.target.value)}
                required
                className="font-mono"
              />
            </div>

            {/* Screenshot Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Screenshot Receipt *</Label>
              <div className="border-2 border-dashed rounded-xl p-4 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                {screenshotPreview ? (
                  <div className="space-y-2 flex flex-col items-center">
                    <div className="relative w-36 h-48 rounded-md overflow-hidden border">
                      <Image src={screenshotPreview} alt="Screenshot" fill className="object-cover" />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => { setScreenshot(null); setScreenshotPreview(null); }}>
                      Change Screenshot
                    </Button>
                  </div>
                ) : (
                  <div>
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold">Click to upload payment receipt</p>
                    <p className="text-[10px] text-slate-400 mb-2">JPG, PNG, or WEBP (max 5MB)</p>
                    <input
                      id="rec-screenshot"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={() => document.getElementById('rec-screenshot')?.click()}>
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="rec-note" className="text-xs font-semibold">Optional Note for Admin</Label>
              <Textarea
                id="rec-note"
                placeholder="Any comment about this payment retry..."
                value={paymentNote}
                onChange={e => setPaymentNote(e.target.value)}
                rows={2}
                className="resize-none text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)} disabled={submittingPayment}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingPayment || !txnCode.trim() || !screenshot} className="bg-[#163E6B] text-white font-bold">
                {submittingPayment ? "Submitting Proof..." : "Submit Payment for Verification"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
            {/* Hold Order Confirmation Dialog */}
      <Dialog open={holdModalOpen} onOpenChange={setHoldModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Put Order on Hold
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-300">
              Temporarily pause processing of Order #ORD-{order?.id}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/50 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-300 space-y-1">
              <p className="font-bold">⚠️ Non-Refundable Advance Rule</p>
              <p>
                Please note that the 15% COD advance payment is non-refundable when putting this order on hold or cancelling after payment verification.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="holdReasonInput" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Reason for Hold (Optional)
              </Label>
              <Textarea
                id="holdReasonInput"
                placeholder="e.g. Away from home for a few days, please delay delivery..."
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setHoldModalOpen(false)} disabled={holding}>
              Cancel
            </Button>
            <Button
              onClick={handleHoldOrder}
              disabled={holding}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {holding ? "Placing on hold..." : "Confirm Put on Hold"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      </main>
      
      <TrustModals 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={modalType}
        orderItemId={modalItemId}
        onSuccess={fetchOrderData}
      />
    </div>
  );
}
