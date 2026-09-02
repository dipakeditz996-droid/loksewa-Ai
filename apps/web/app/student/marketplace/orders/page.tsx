"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { marketplaceApi, Order } from "@/lib/api/marketplace";
import { Loader2, Package, Search, CheckCircle2, Clock, Truck, FileText, CheckCircle } from "lucide-react";

const STATUS_TIMELINE = [
  { id: 'PENDING_PAYMENT', label: 'Pending Payment', icon: FileText },
  { id: 'PAYMENT_VERIFICATION', label: 'Verifying', icon: Clock },
  { id: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
  { id: 'PROCESSING', label: 'Processing', icon: Package },
  { id: 'SHIPPED', label: 'Shipped', icon: Truck },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { id: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

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
        <h1 className="text-3xl font-extrabold mb-8 flex items-center gap-3">
          <Package className="w-8 h-8 text-[#163E6B] dark:text-[#D4A72C]" /> My Orders
        </h1>

        {orders.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <Search className="w-16 h-16 text-slate-300 dark:text-white/20 mb-4" />
            <h2 className="text-xl font-bold mb-2">No orders found</h2>
            <p className="text-slate-500 mb-6">You haven't placed any marketplace orders yet.</p>
            <button onClick={() => router.push("/marketplace")} className="px-6 py-3 rounded-lg bg-[#163E6B] text-white font-bold">Browse Marketplace</button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-6 border-b border-slate-200 dark:border-white/10 gap-4">
                  <div>
                    <h3 className="font-bold text-lg">Order #ORD-{order.id}</h3>
                    <p className="text-sm text-slate-500">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-500 mb-1">Total Amount</p>
                    <p className="font-extrabold text-xl">Rs. {Number(order.total_amount) + Number(order.delivery_fee || 0)}</p>
                    {Number(order.delivery_fee) > 0 && (
                      <p className="text-xs text-slate-400">Includes Rs. {order.delivery_fee} delivery</p>
                    )}
                  </div>
                  <div className="inline-block px-4 py-2 rounded-full text-sm font-bold bg-[#163E6B]/10 text-[#163E6B] dark:bg-[#D4A72C]/10 dark:text-[#D4A72C]">
                    {order.status}
                  </div>
                </div>
                
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex gap-4 items-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-lg overflow-hidden shrink-0">
                        {item.product_details?.cover_image && <img src={item.product_details.cover_image} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate">{item.product_details?.title}</h4>
                        <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <div className="font-bold">Rs. {item.price}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Delivery Address</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                      {order.shipping_address ? order.shipping_address.split('\n')[0] + '...' : "No address provided."}
                    </p>
                  </div>
                  <button 
                    onClick={() => router.push(`/student/marketplace/orders/${order.id}`)}
                    className="px-5 py-2.5 bg-[#163E6B] text-white text-sm font-bold rounded-lg hover:bg-[#1a4d82] transition-colors"
                  >
                    Track Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
