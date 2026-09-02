"use client";

import React, { useEffect, useState } from "react";
import { marketplaceApi, Review, Dispute } from "@/lib/api/marketplace";
import { 
  ShieldCheck, Loader2, Star, AlertTriangle, User, FileText, CheckCircle, MessageSquare
} from "lucide-react";

export default function AdminTrustCenterPage() {
  const [activeTab, setActiveTab] = useState<'disputes' | 'reviews'>('disputes');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      marketplaceApi.adminGetReviews(),
      marketplaceApi.adminGetDisputes()
    ])
      .then(([r, d]) => {
        setReviews(r);
        setDisputes(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleResolveDispute = async (id: number, resolution: 'REFUND_BUYER' | 'RELEASE_PAYOUT') => {
    if (!confirm(`Are you sure you want to resolve this dispute and ${resolution.replace('_', ' ')}?`)) return;
    try {
      await marketplaceApi.adminResolveDispute(id, 'RESOLVED', resolution);
      fetchAll();
    } catch (err: any) {
      alert(err.message || "Failed to resolve dispute");
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      await marketplaceApi.adminDeleteReview(id);
      fetchAll();
    } catch (err: any) {
      alert(err.message || "Failed to delete review");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#163E6B]" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Trust & Safety Center
          </h1>
          <p className="text-slate-500 mt-1">Manage marketplace disputes, reviews, and reports.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${
            activeTab === 'disputes' 
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Active Disputes ({disputes.filter(d => d.status === 'OPEN').length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${
            activeTab === 'reviews' 
              ? 'bg-[#163E6B]/10 text-[#163E6B] dark:bg-[#D4A72C]/10 dark:text-[#D4A72C]' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Star className="w-4 h-4" />
          Recent Reviews
        </button>
      </div>

      {activeTab === 'disputes' && (
        <div className="space-y-4">
          {disputes.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="font-bold text-lg">No Disputes</h3>
              <p className="text-slate-500 text-sm">The marketplace is peaceful.</p>
            </div>
          ) : (
            disputes.map(dispute => (
              <div key={dispute.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 flex flex-col md:flex-row gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      dispute.status === 'OPEN' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                    }`}>
                      {dispute.status}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      Order Item #{dispute.order_item}
                    </span>
                  </div>
                  <h4 className="font-bold text-lg mb-1">{dispute.reason}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-100 dark:border-white/10 mb-3">
                    "{dispute.description}"
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5"/> By Buyer #{dispute.buyer}</span>
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5"/> Filed on {new Date(dispute.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {dispute.status === 'OPEN' && (
                  <div className="flex flex-col gap-2 shrink-0 md:border-l md:border-slate-200 md:dark:border-white/10 md:pl-5">
                    <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Resolution Actions</p>
                    <button 
                      onClick={() => handleResolveDispute(dispute.id, 'REFUND_BUYER')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                      Refund Buyer
                    </button>
                    <button 
                      onClick={() => handleResolveDispute(dispute.id, 'RELEASE_PAYOUT')}
                      className="px-4 py-2 bg-[#163E6B] hover:bg-[#1a4d82] text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                      Release to Seller
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="font-bold text-lg">No Reviews</h3>
            </div>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 relative group">
                <button 
                  onClick={() => handleDeleteReview(review.id)}
                  className="absolute top-4 right-4 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold hover:underline"
                >
                  Delete
                </button>
                <div className="flex items-center gap-1 text-amber-500 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-slate-200 dark:text-slate-700'}`} />
                  ))}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 italic">"{review.review_text}"</p>
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-white/10 pt-3">
                  <span>Buyer #{review.buyer}</span>
                  <span>Order Item #{review.order_item}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
