"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Search, Filter, CheckCircle2, XCircle, CreditCard, AlertCircle,
  Eye, Image as ImageIcon, MessageSquareWarning, X, Download, ZoomIn, AlertTriangle,
  Package, MapPin, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RetryImage } from "@/components/ui/retry-image";
import { marketplaceApi, PaymentSubmission } from "@/lib/api/marketplace";
import { toast } from "sonner";

function MarketplacePaymentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("order_id");
  const paymentIdParam = searchParams.get("payment_id");
  const initialSearch = searchParams.get("search");

  const [search, setSearch] = useState(() => {
    if (orderIdParam) return orderIdParam;
    if (initialSearch) return initialSearch;
    return "";
  });
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentSubmission | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  
  const [rejectionReason, setRejectionReason] = useState("Invalid / Unclear Screenshot");
  const [rejectionNote, setRejectionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    if (orderIdParam) {
      setSearch(orderIdParam);
    }
  }, [orderIdParam]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await marketplaceApi.adminGetSubmissions();
      // Enrich submissions that reference an order if order_details / product_name is missing
      const needOrders = data.some(p => p.order && (!p.order_details?.items?.length || !p.product_name));
      if (needOrders) {
        try {
          const orders = await marketplaceApi.adminGetOrders();
          const orderMap = new Map(orders.map(o => [o.id, o]));
          data.forEach(p => {
            if (p.order && orderMap.has(p.order)) {
              const o = orderMap.get(p.order)!;
              if (!p.order_details || !p.order_details.items?.length) {
                p.order_details = {
                  id: o.id,
                  total_amount: o.total_amount,
                  delivery_fee: o.delivery_fee,
                  final_total: o.final_total || String(Number(o.total_amount) + Number(o.delivery_fee)),
                  is_cod: !!o.is_cod,
                  payment_method_type: o.payment_method_type || 'PREPAID',
                  cod_advance_required: String(o.cod_advance_required || '0.00'),
                  cod_advance_paid: String(o.cod_advance_paid || '0.00'),
                  cod_remaining_balance: String(o.cod_remaining_balance || '0.00'),
                  status: o.status,
                  payment_status: o.payment_status || 'UNPAID',
                  shipping_address: o.shipping_address,
                  shipping_address_snapshot: o.shipping_address_snapshot || {},
                  contact_number: o.contact_number,
                  items: (o.items || []).map((it) => ({
                    id: it.id,
                    product_id: it.product || it.product_details?.id || null,
                    title: it.snapshot_product_name || it.product_details?.title || 'Product',
                    quantity: it.quantity,
                    price: it.price,
                    total_price: String((Number(it.price) * it.quantity).toFixed(2)),
                    cover_image: it.product_details?.cover_image || null,
                    category: it.product_details?.category || null,
                    condition: it.product_details?.condition || null,
                    seller_name: it.snapshot_seller_name || null,
                  })),
                };
              }
              if (!p.product_id && o.items?.[0]) {
                p.product_id = o.items[0].product || o.items[0].product_details?.id || null;
              }
              if ((!p.product_name || p.product_name.startsWith('Order #')) && o.items?.[0]) {
                p.product_name = o.items[0].snapshot_product_name || o.items[0].product_details?.title || undefined;
              }
            }
          });
        } catch (e) {
          console.warn("Could not enrich payments with orders list:", e);
        }
      }

      setSubmissions(data);
      if (selectedPayment) {
        const updated = data.find(p => p.id === selectedPayment.id);
        setSelectedPayment(updated || null);
      } else if (orderIdParam) {
        const oId = Number(orderIdParam);
        const match = data.find(p => p.order === oId || p.order_details?.id === oId);
        if (match) {
          setSelectedPayment(match);
        }
      } else if (paymentIdParam) {
        const pId = Number(paymentIdParam);
        const match = data.find(p => p.id === pId);
        if (match) {
          setSelectedPayment(match);
        }
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract Product ID from PaymentSubmission
  const getPaymentProductId = (p: PaymentSubmission): string | number | null => {
    if (p.product_id) return p.product_id;
    if (p.product) return p.product;
    if (p.product_details?.id) return p.product_details.id;
    if (p.order_details?.items && p.order_details.items.length > 0) {
      const item = p.order_details.items[0];
      if (item?.product_id) return item.product_id;
    }
    return null;
  };

  // Helper to extract clean Product Name / Title from PaymentSubmission
  const getPaymentProductName = (p: PaymentSubmission): string => {
    if (p.product_details?.title) return p.product_details.title;
    if (p.product_name && !p.product_name.startsWith("Order #")) return p.product_name;
    if (p.order_details?.items && p.order_details.items.length > 0) {
      const items = p.order_details.items;
      const first = items[0];
      if (first) {
        if (items.length === 1) {
          return first.title;
        }
        return `${first.title} (+${items.length - 1} more items)`;
      }
    }
    if (p.product_name) return p.product_name;
    if (p.order_details?.id || p.order) {
      return `Order #${p.order_details?.id || p.order}`;
    }
    return "Product Purchase";
  };

  // Ensure full order details are loaded when a payment is selected
  useEffect(() => {
    if (selectedPayment?.order && (!selectedPayment.order_details || !selectedPayment.order_details.items || selectedPayment.order_details.items.length === 0)) {
      marketplaceApi.adminGetOrder(selectedPayment.order)
        .then((orderData) => {
          if (!orderData) return;
          setSelectedPayment((prev) => {
            if (!prev || prev.id !== selectedPayment.id) return prev;
            return {
              ...prev,
              order_details: {
                id: orderData.id,
                total_amount: orderData.total_amount,
                delivery_fee: orderData.delivery_fee,
                final_total: orderData.final_total || String(Number(orderData.total_amount) + Number(orderData.delivery_fee)),
                is_cod: !!orderData.is_cod,
                payment_method_type: orderData.payment_method_type || 'PREPAID',
                cod_advance_required: String(orderData.cod_advance_required || '0.00'),
                cod_advance_paid: String(orderData.cod_advance_paid || '0.00'),
                cod_remaining_balance: String(orderData.cod_remaining_balance || '0.00'),
                status: orderData.status,
                payment_status: orderData.payment_status || 'UNPAID',
                shipping_address: orderData.shipping_address,
                shipping_address_snapshot: orderData.shipping_address_snapshot || {},
                contact_number: orderData.contact_number,
                items: (orderData.items || []).map((it) => ({
                  id: it.id,
                  product_id: it.product || it.product_details?.id || null,
                  title: it.snapshot_product_name || it.product_details?.title || 'Product',
                  quantity: it.quantity,
                  price: it.price,
                  total_price: String((Number(it.price) * it.quantity).toFixed(2)),
                  cover_image: it.product_details?.cover_image || null,
                  category: it.product_details?.category || null,
                  condition: it.product_details?.condition || null,
                  seller_name: it.snapshot_seller_name || null,
                })),
              },
            };
          });
        })
        .catch((err) => console.error("Failed to load order details fallback:", err));
    }
  }, [selectedPayment?.id, selectedPayment?.order]);

  const filteredPayments = submissions.filter(p => {
    const studentName = p.student_details?.first_name 
      ? `${p.student_details.first_name} ${p.student_details.last_name}`
      : p.student_details?.username || "Unknown";
    const prodName = getPaymentProductName(p).toLowerCase();
    const prodId = String(getPaymentProductId(p) || "");
    const orderRef = (p.order_details?.id || p.order) ? `order #${p.order_details?.id || p.order}` : "";
    const s = search.toLowerCase().trim();
    if (!s) return true;
    const cleanNum = s.replace(/[^0-9]/g, "");
    return (
      p.transaction_id.toLowerCase().includes(s) || 
      studentName.toLowerCase().includes(s) ||
      p.id.toString().includes(s) ||
      prodName.includes(s) ||
      prodId.includes(s) ||
      orderRef.toLowerCase().includes(s) ||
      (p.order && String(p.order).toLowerCase().includes(s)) ||
      (p.order_details?.id && String(p.order_details.id).toLowerCase().includes(s)) ||
      (cleanNum && (String(p.order) === cleanNum || String(p.order_details?.id) === cleanNum || String(p.id) === cleanNum))
    );
  });

  const getStatusColor = (status: string) => {
    switch(status.toUpperCase()) {
      case "PENDING": return "bg-amber-100 text-amber-700 border-amber-200";
      case "NEEDS REVIEW": return "bg-orange-100 text-orange-700 border-orange-200";
      case "APPROVED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "REJECTED": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const handleApprove = async () => {
    if(!selectedPayment) return;
    const isCod = selectedPayment.is_cod_advance || selectedPayment.order_details?.is_cod;
    const confirmMsg = isCod 
      ? `Approve 15% COD advance payment (Rs. ${selectedPayment.submitted_amount}) for Order #${selectedPayment.order_details?.id || selectedPayment.id}?\n\nThis will confirm the order for dispatch. The remaining balance (Rs. ${selectedPayment.order_details?.cod_remaining_balance || '85%'}) will remain payable upon delivery.`
      : `Approve payment of Rs. ${selectedPayment.submitted_amount} for transaction ${selectedPayment.transaction_id}?`;
    if (confirm(confirmMsg)) {
      setSubmitting(true);
      try {
        await marketplaceApi.adminReviewSubmission(selectedPayment.id, 'APPROVED');
        toast.success("Payment Approved successfully.");
        await fetchSubmissions();
      } catch (err: any) {
        toast.error(err.message || "Failed to approve payment");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleReject = async () => {
    if(!selectedPayment) return;
    setSubmitting(true);
    try {
      const fullReason = `${rejectionReason}${rejectionNote ? ' - ' + rejectionNote : ''}`;
      await marketplaceApi.adminReviewSubmission(selectedPayment.id, 'REJECTED', fullReason);
      toast.success("Payment Rejected.");
      setIsRejectModalOpen(false);
      await fetchSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 relative">
      
      {/* Main Table Area */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${selectedPayment ? 'hidden lg:flex lg:w-1/2' : 'w-full'}`}>
        <div className="bg-white p-4 rounded-t-xl shadow-sm border border-b-0 border-slate-200 flex justify-between items-center shrink-0">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search Transaction ID, Order ID, Student, Product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50"
            />
          </div>
          <Button variant="outline" className="bg-white gap-2">
            <Filter className="w-4 h-4" /> Filters
          </Button>
        </div>

        {orderIdParam && (
          <div className="bg-blue-50/90 border-x border-b border-blue-100 px-4 py-2.5 flex items-center justify-between text-xs text-[#0B2545]">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Filtered for Order #{orderIdParam}</span>
              {filteredPayments.length > 0 ? (
                <span className="bg-blue-200/70 text-blue-900 font-bold px-2 py-0.5 rounded text-[11px]">
                  {filteredPayments.length} payment record(s)
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded text-[11px]">
                  No payment voucher uploaded yet
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSearch("");
                router.replace("/admin-dashboard/marketplace/payments");
              }}
              className="text-blue-700 hover:text-blue-900 font-medium underline cursor-pointer"
            >
              Show all payments
            </button>
          </div>
        )}

        <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 flex-1 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-50 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <TableRow>
                <TableHead>Code & Student</TableHead>
                <TableHead>Amount & Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-36 text-center text-slate-500">
                    <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No payment submissions found.</p>
                    {orderIdParam && (
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        No manual payment voucher was submitted yet for Order #{orderIdParam}. If this was a COD or online gateway order, payment may be collected upon delivery or processed directly.
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => {
                  const studentName = payment.student_details?.first_name 
                    ? `${payment.student_details.first_name} ${payment.student_details.last_name}`
                    : payment.student_details?.username || "Unknown";
                  const productName = getPaymentProductName(payment);
                  const productId = getPaymentProductId(payment);
                    
                  return (
                    <TableRow 
                      key={payment.id} 
                      className={`cursor-pointer hover:bg-slate-50 transition-colors ${selectedPayment?.id === payment.id ? 'bg-blue-50/50 border-l-4 border-l-[#0B2545]' : 'border-l-4 border-l-transparent'}`}
                      onClick={() => setSelectedPayment(payment)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#0B2545]">{payment.transaction_id}</span>
                          {(payment.is_cod_advance || payment.order_details?.is_cod) && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-extrabold px-1.5 py-0.5 rounded">
                              15% COD
                            </span>
                          )}
                          {(payment.attempt_number || 1) > 1 && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.5 rounded">
                              Att #{payment.attempt_number}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-slate-700 mt-1">{studentName}</div>

                        {/* Product Name & Product ID */}
                        <div className="mt-1 space-y-0.5">
                          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 truncate max-w-[240px]" title={productName}>
                            <Package className="w-3.5 h-3.5 text-[#0B2545] shrink-0" />
                            <span className="truncate">{productName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {productId && (
                              <span className="inline-flex items-center font-mono text-[10px] font-bold bg-blue-50 text-[#0B2545] border border-blue-200 px-1.5 py-0.5 rounded">
                                Product ID: #{productId}
                              </span>
                            )}
                            {(payment.order_details?.id || payment.order) && (
                              <span className="inline-flex items-center text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                Order #{payment.order_details?.id || payment.order}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-800">
                          Rs. {Number(payment.submitted_amount).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {payment.payment_method_details?.display_name || 'N/A'}
                          {(payment.is_cod_advance || payment.order_details?.is_cod) && payment.order_details?.cod_remaining_balance && (
                            <span className="block text-[11px] text-amber-700 font-medium">
                              Due on delivery: Rs. {Number(payment.order_details.cod_remaining_balance).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-[#0B2545]">
                          Verify <Eye className="w-4 h-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Verification Panel (Slide-over/Side Panel) */}
      {selectedPayment && (() => {
        const selectedProductName = getPaymentProductName(selectedPayment);
        const selectedProductId = getPaymentProductId(selectedPayment);

        return (
        <div className="flex flex-col w-full lg:w-1/2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden shrink-0">
          {/* Panel Header */}
          <div className="bg-[#0B2545] text-white p-4 flex justify-between items-center shrink-0">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#D4A72C]" />
                Verify Payment
              </h3>
              <p className="text-white/70 text-xs mt-0.5">
                {selectedPayment.order_details?.id || selectedPayment.order
                  ? `Order #${selectedPayment.order_details?.id || selectedPayment.order} • Payment ID #${selectedPayment.id}`
                  : `Payment ID #${selectedPayment.id}`}
                {selectedProductId && ` • Product ID #${selectedProductId}`}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8" onClick={() => setSelectedPayment(null)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Warning State */}
            {selectedPayment.status === "PENDING" && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <p>Carefully verify the <strong>Transaction Code</strong> and <strong>Amount</strong> against the uploaded screenshot before approving.</p>
              </div>
            )}

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Student</p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-[#0B2545] text-white text-[10px]">
                      {(selectedPayment.student_details?.first_name?.[0] || selectedPayment.student_details?.username?.[0] || 'U').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-slate-800 text-sm truncate" title={selectedPayment.student_details?.first_name ? `${selectedPayment.student_details.first_name} ${selectedPayment.student_details.last_name}` : selectedPayment.student_details?.username || "Unknown"}>
                    {selectedPayment.student_details?.first_name 
                      ? `${selectedPayment.student_details.first_name} ${selectedPayment.student_details.last_name}`
                      : selectedPayment.student_details?.username || "Unknown"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Product / Items</p>
                <div className="flex items-start gap-1.5 mt-1">
                  <Package className="w-4 h-4 text-[#0B2545] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#0B2545] text-sm truncate" title={selectedProductName}>
                      {selectedProductName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {selectedProductId && (
                        <span className="font-mono text-[10px] font-bold bg-blue-100 text-[#0B2545] border border-blue-200 px-1.5 py-0.5 rounded">
                          Product ID: #{selectedProductId}
                        </span>
                      )}
                      {(selectedPayment.order_details?.id || selectedPayment.order) && (
                        <span className="text-[10px] font-medium text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded">
                          Order #{selectedPayment.order_details?.id || selectedPayment.order}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {selectedPayment.order_details?.items && selectedPayment.order_details.items.length > 1 && (
                  <span className="text-[11px] text-slate-500 block mt-1">
                    +{selectedPayment.order_details.items.length - 1} more item(s) in this order
                  </span>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Payment Method & Mode</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedPayment.payment_method_details?.display_name || 'N/A'}
                  </span>
                  {selectedPayment.is_cod_advance || selectedPayment.order_details?.is_cod ? (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                      15% COD Advance
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                      Prepaid
                    </span>
                  )}
                </div>
                {(selectedPayment.attempt_number || 1) > 1 && (
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Attempt #{selectedPayment.attempt_number}
                  </span>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Amount to Verify</p>
                <p className="font-bold text-emerald-600 text-lg mt-0.5 leading-none">
                  Rs. {Number(selectedPayment.submitted_amount).toLocaleString()}
                </p>
                {(selectedPayment.is_cod_advance || selectedPayment.order_details?.is_cod) && selectedPayment.order_details?.final_total && (
                  <p className="text-[11px] text-amber-700 mt-1 font-medium">
                    15% of total Rs. {Number(selectedPayment.order_details.final_total).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Complete Order Accounting & Products */}
            {selectedPayment.order_details && (
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3.5">
                <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#0B2545]" />
                    Order #{selectedPayment.order_details.id} Products & Summary
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      Order: {selectedPayment.order_details.status}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Payment: {selectedPayment.order_details.payment_status}
                    </span>
                  </div>
                </div>

                {/* Ordered Products List */}
                {selectedPayment.order_details.items?.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-600 block">Ordered Products:</span>
                    <div className="space-y-2">
                      {selectedPayment.order_details.items.map((it) => (
                        <div key={it.id} className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                          {it.cover_image ? (
                            <img
                              src={it.cover_image}
                              alt={it.title}
                              className="w-12 h-14 object-cover rounded border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-14 bg-slate-100 rounded border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {(it.product_id || it.id) && (
                                <span className="bg-blue-50 text-[#0B2545] font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                                  Product ID: #{it.product_id || it.id}
                                </span>
                              )}
                              {it.category && (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase">
                                  {it.category.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                            <h5 className="font-semibold text-sm text-slate-800 truncate" title={it.title}>
                              {it.title}
                            </h5>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                              {it.category && (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase">
                                  {it.category.replace('_', ' ')}
                                </span>
                              )}
                              {it.seller_name && (
                                <span>Sold by: <strong className="text-slate-700 font-medium">{it.seller_name}</strong></span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 font-medium mt-1">
                              Qty: {it.quantity} × Rs. {Number(it.price).toLocaleString()} = <span className="font-bold text-[#0B2545]">Rs. {Number(it.total_price || (Number(it.price) * it.quantity)).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-1">No product items found for this order.</div>
                )}
                
                {/* Financial Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Subtotal:</span>
                    <span className="font-semibold text-slate-800">Rs. {Number(selectedPayment.order_details.total_amount).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Delivery Fee:</span>
                    <span className="font-semibold text-slate-800">Rs. {Number(selectedPayment.order_details.delivery_fee).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Final Total:</span>
                    <span className="font-bold text-[#0B2545]">Rs. {Number(selectedPayment.order_details.final_total).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Payment Mode:</span>
                    <span className="font-bold text-slate-700">{selectedPayment.order_details.is_cod ? '15% COD' : 'Prepaid'}</span>
                  </div>
                </div>

                {selectedPayment.order_details.is_cod && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>Mandatory 15% Advance Required:</span>
                      <span>Rs. {Number(selectedPayment.order_details.cod_advance_required).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Verified Advance Received:</span>
                      <span>Rs. {Number(selectedPayment.order_details.cod_advance_paid).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-800 pt-1 border-t border-amber-200">
                      <span>Remaining 85% Due on Delivery:</span>
                      <span>Rs. {Number(selectedPayment.order_details.cod_remaining_balance).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {(selectedPayment.order_details.shipping_address || selectedPayment.order_details.contact_number) && (
                  <div className="pt-2 border-t border-slate-200/70 text-xs text-slate-600 space-y-1">
                    {selectedPayment.order_details.contact_number && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700">Contact:</span>
                        <span>{selectedPayment.order_details.contact_number}</span>
                      </div>
                    )}
                    {selectedPayment.order_details.shipping_address && (
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-700">Delivery Destination: </span>
                          <span className="whitespace-pre-line">{selectedPayment.order_details.shipping_address}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Direct Product Details (when not an order) */}
            {!selectedPayment.order_details && selectedPayment.product_details && (
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
                  <Package className="w-4 h-4 text-[#0B2545]" />
                  Product Details
                </h4>
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                  {selectedPayment.product_details.cover_image ? (
                    <img
                      src={selectedPayment.product_details.cover_image}
                      alt={selectedPayment.product_details.title}
                      className="w-14 h-16 object-cover rounded border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-16 bg-slate-100 rounded border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                      <Package className="w-7 h-7" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {(selectedPayment.product_details.id || selectedPayment.product) && (
                        <span className="bg-blue-50 text-[#0B2545] font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                          Product ID: #{selectedPayment.product_details.id || selectedPayment.product}
                        </span>
                      )}
                      {selectedPayment.product_details.category && (
                        <span className="inline-block bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase">
                          {selectedPayment.product_details.category.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-sm text-slate-800 truncate" title={selectedPayment.product_details.title}>
                      {selectedPayment.product_details.title}
                    </h5>
                    {selectedPayment.product_details.category && (
                      <span className="inline-block bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase mt-0.5">
                        {selectedPayment.product_details.category.replace('_', ' ')}
                      </span>
                    )}
                    <div className="text-sm font-bold text-emerald-600 mt-1">
                      Rs. {Number(selectedPayment.product_details.final_price || selectedPayment.product_details.price).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fallback Product Info Card when neither detailed section is populated */}
            {!selectedPayment.order_details && !selectedPayment.product_details && (
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
                  <Package className="w-4 h-4 text-[#0B2545]" />
                  Product Information
                </h4>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2 mb-1">
                    {selectedProductId && (
                      <span className="bg-blue-50 text-[#0B2545] font-mono text-xs font-bold px-2 py-0.5 rounded border border-blue-200">
                        Product ID: #{selectedProductId}
                      </span>
                    )}
                    {selectedPayment.order && (
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        Order #{selectedPayment.order}
                      </span>
                    )}
                  </div>
                  <h5 className="font-bold text-sm text-slate-800">
                    {selectedProductName}
                  </h5>
                </div>
              </div>
            )}

            {/* Transaction Code Box */}
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Student Entered Code</p>
              <div className="bg-slate-900 rounded p-3 font-mono text-xl text-white tracking-widest break-all">
                {selectedPayment.transaction_id}
              </div>
            </div>

            {/* Screenshot Preview */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <h4 className="font-bold text-[#0B2545] flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  Uploaded Screenshot
                </h4>
                <div className="flex gap-2">
                  <a href={selectedPayment.screenshot} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground h-7 px-3 text-xs bg-white text-slate-600">
                    <ZoomIn className="w-3 h-3 mr-1"/> Zoom
                  </a>
                </div>
              </div>
              
              <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center min-h-[300px]">
                {selectedPayment.screenshot ? (
                  <RetryImage src={selectedPayment.screenshot} alt="Payment Screenshot" className="max-w-full max-h-[400px] object-contain" />
                ) : (
                  <div className="text-center text-slate-400 p-6">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="font-medium text-sm">No screenshot uploaded.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Note Box */}
            {selectedPayment.note && (
              <div className="bg-slate-50 rounded-lg p-4 text-left border border-slate-100">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Student Note</p>
                <div className="text-slate-700 text-sm">
                  {selectedPayment.note}
                </div>
              </div>
            )}

          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 shrink-0">
            {selectedPayment.status === "PENDING" && (
              <Button onClick={handleApprove} disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {selectedPayment.is_cod_advance || selectedPayment.order_details?.is_cod
                  ? "Approve 15% Advance & Confirm Dispatch"
                  : "Approve Full Payment & Confirm Order"}
              </Button>
            )}
            
            {selectedPayment.status === "PENDING" && (
              <Button 
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-11 font-semibold bg-white"
                onClick={() => setIsRejectModalOpen(true)}
                disabled={submitting}
              >
                <XCircle className="w-5 h-5 mr-2" />
                Reject Payment
              </Button>
            )}

            {selectedPayment.status === "REJECTED" && (
              <div className="flex-1 text-center text-red-600 font-semibold p-2">
                Rejected: {selectedPayment.rejection_reason}
              </div>
            )}
            
            {selectedPayment.status === "APPROVED" && (
              <div className="flex-1 text-center text-emerald-600 font-semibold p-2">
                Approved
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* Reject Modal Overlay */}
      {isRejectModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
              <h3 className="font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Reject Payment
              </h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setIsRejectModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">Please provide a reason for rejecting this payment. The student will be notified.</p>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Rejection Reason *</label>
                <select 
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                >
                  <option>Invalid / Unclear Screenshot</option>
                  <option>Incorrect Transaction Code</option>
                  <option>Payment Amount Incorrect</option>
                  <option>Duplicate Payment Detected</option>
                  <option>Payment Not Found in Statement</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Additional Note to Student</label>
                <Textarea 
                  placeholder="E.g., Please upload a clearer screenshot where the transaction code is visible." 
                  className="resize-none" 
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRejectModalOpen(false)} disabled={submitting}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleReject} disabled={submitting}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function MarketplacePaymentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading payment verifications...</div>}>
      <MarketplacePaymentsContent />
    </Suspense>
  );
}
