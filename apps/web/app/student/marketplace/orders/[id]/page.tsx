"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { marketplaceApi, Order, Review, Dispute } from "@/lib/api/marketplace";
import { Loader2, Package, ArrowLeft, CheckCircle2, Clock, Truck, FileText, CheckCircle, MapPin, Box, Star, AlertTriangle, MessageSquare } from "lucide-react";
import { TrustModals } from "@/components/marketplace/trust-modals";

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
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalType, setModalType] = useState<'REVIEW' | 'DISPUTE'>('REVIEW');
  const [modalItemId, setModalItemId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchOrderData = () => {
    if (!orderId) return;
    Promise.all([
      marketplaceApi.getOrder(Number(orderId)),
      marketplaceApi.getReviews(),
      marketplaceApi.getDisputes()
    ])
      .then(([orderData, reviewsData, disputesData]) => {
        setOrder(orderData);
        setReviews(reviewsData);
        setDisputes(disputesData);
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
          <div className="inline-block px-5 py-2 rounded-full text-sm font-bold bg-[#163E6B]/10 text-[#163E6B] dark:bg-[#D4A72C]/10 dark:text-[#D4A72C] uppercase tracking-wide border border-[#163E6B]/20 dark:border-[#D4A72C]/20">
            {order.status.replace(/_/g, " ")}
          </div>
        </div>

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
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4">Payment Summary</h3>
              <div className="space-y-3 text-sm mb-4 pb-4 border-b border-slate-100 dark:border-white/10">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium">Rs. {order.total_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Fee</span>
                  <span className="font-medium">Rs. {order.delivery_fee}</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-lg font-extrabold">
                <span>Total</span>
                <span className="text-[#163E6B] dark:text-[#D4A72C]">
                  Rs. {Number(order.total_amount) + Number(order.delivery_fee)}
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
