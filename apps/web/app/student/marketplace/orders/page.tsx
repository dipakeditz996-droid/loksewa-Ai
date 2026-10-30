"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { marketplaceApi, Order } from "@/lib/api/marketplace";
import { Loader2, Package, Search, Clock, CreditCard, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const getOrderStatusBadge = (order: Order) => {
  if (order.status === 'PENDING_PAYMENT') {
    const isRejected = order.latest_payment_submission?.status === 'REJECTED';
    return {
      label: isRejected ? 'Payment Rejected' : 'Payment Not Completed',
      className: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60',
    };
  }
  if (order.status === 'ON_HOLD') {
    return {
      label: 'On Hold',
      className: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60',
    };
  }
  if (order.status === 'PAYMENT_SUBMITTED' || order.status === 'PAYMENT_VERIFICATION') {
    return {
      label: 'Payment Verifying',
      className: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/60',
    };
  }
  if (order.status === 'CONFIRMED') {
    return {
      label: 'Order Confirmed',
      className: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-700/60',
    };
  }
  if (order.status === 'PROCESSING') {
    return {
      label: 'Processing',
      className: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/60',
    };
  }
  if (order.status === 'SHIPPED') {
    return {
      label: 'Shipped',
      className: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-700/60',
    };
  }
  if (order.status === 'OUT_FOR_DELIVERY') {
    return {
      label: 'Out for Delivery',
      className: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700/60',
    };
  }
  if (order.status === 'DELIVERED') {
    return {
      label: 'Delivered',
      className: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/60',
    };
  }
  if (order.status === 'CANCELLED') {
    return {
      label: 'Cancelled',
      className: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700/60',
    };
  }
  return {
    label: order.status.replace(/_/g, ' '),
    className: 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200',
  };
};

export default function StudentOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketplaceApi.getOrders()
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 flex-col">
        <Loader2 className="w-10 h-10 animate-spin text-[#163E6B]" />
      </div>
    );
  }

  return (
    <div className="font-sans text-slate-900 dark:text-slate-50">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <Package className="w-8 h-8 text-[#163E6B] dark:text-[#D4A72C]" /> Track My Orders
          </h1>
          <Button
            variant="outline"
            onClick={() => router.push("/marketplace")}
            className="text-sm font-semibold"
          >
            Explore Marketplace
          </Button>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <Search className="w-16 h-16 text-slate-300 dark:text-white/20 mb-4" />
            <h2 className="text-xl font-bold mb-2">No orders found</h2>
            <p className="text-slate-500 mb-6">You haven't placed any marketplace orders yet.</p>
            <Button onClick={() => router.push("/marketplace")} className="bg-[#163E6B] hover:bg-[#163E6B]/90 text-white font-bold">
              Browse Marketplace
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const badge = getOrderStatusBadge(order);
              const isIncompletePayment = order.status === 'PENDING_PAYMENT';
              const isRejected = order.latest_payment_submission?.status === 'REJECTED';
              const dueAmount = order.is_cod 
                ? order.cod_advance_required 
                : (Number(order.total_amount) + Number(order.delivery_fee || 0)).toFixed(2);

              return (
                <div key={order.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:border-slate-300 transition-all">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-6 border-b border-slate-200 dark:border-white/10 gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Order #ORD-{order.id}</h3>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Placed on {new Date(order.created_at).toLocaleString()}
                        {order.held_at && order.status === 'ON_HOLD' && ` • Held on ${new Date(order.held_at).toLocaleDateString()}`}
                      </p>
                    </div>

                    <div className="text-right sm:text-right w-full sm:w-auto">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Total Amount</p>
                      <p className="font-extrabold text-2xl text-[#163E6B] dark:text-[#D4A72C]">
                        Rs. {Number(order.total_amount) + Number(order.delivery_fee || 0)}
                      </p>
                      <div className="flex items-center justify-end gap-2 text-xs text-slate-500 mt-0.5">
                        <span>{order.is_cod ? 'Cash on Delivery (15% Advance)' : 'Full Online Prepaid'}</span>
                        {Number(order.delivery_fee) > 0 && (
                          <span>• Includes Rs. {order.delivery_fee} delivery</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Not Completed / Action Needed Notice */}
                  {isIncompletePayment && (
                    <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                            {isRejected ? "Payment proof was rejected" : "Payment Not Completed"}
                          </p>
                          <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                            {isRejected
                              ? `Reason: ${order.latest_payment_submission?.rejection_reason || "Invalid transaction details"}. Please resubmit proof.`
                              : `Outstanding amount due: Rs. ${dueAmount}. Complete payment to confirm and dispatch your order.`}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => router.push(`/student/marketplace/orders/${order.id}`)}
                        className="bg-[#163E6B] hover:bg-[#163E6B]/90 text-white font-bold text-xs shrink-0"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                        Complete Payment
                      </Button>
                    </div>
                  )}

                  {/* Items list */}
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex gap-4 items-center">
                        <div className="w-14 h-14 bg-slate-100 dark:bg-white/10 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-white/5 flex items-center justify-center">
                          {item.product_details?.cover_image ? (
                            <img src={item.product_details.cover_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate text-slate-800 dark:text-slate-100">
                            {item.product_details?.title || item.snapshot_product_name || `Product #${item.product}`}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Qty: {item.quantity} • Unit: Rs. {item.price}
                          </p>
                        </div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          Rs. {Number(item.price) * item.quantity}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer with Tracking Action */}
                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Deliver to: </span>
                      {order.shipping_address ? order.shipping_address.split('\n')[0] : "Shipping address recorded"}
                    </div>
                    <Button
                      onClick={() => router.push(`/student/marketplace/orders/${order.id}`)}
                      className="bg-[#163E6B] hover:bg-[#163E6B]/90 text-white text-xs font-bold px-4 py-2 rounded-lg"
                    >
                      Track Order Details
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
