"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingBag, Star, Download, PlayCircle, Lock } from "lucide-react";
import { Product } from "@/lib/api/marketplace";

const STATIC_PRODUCTS = [
  {
    id: 1,
    title: "Mastering Constitutional Law (Video Course)",
    description: "Complete 15-hour video series covering every article with case studies.",
    price: 1500,
    original_price: 2500,
    rating: 4.9,
    reviews: 124,
    type: "COURSE",
    image: "bg-blue-500",
  },
  {
    id: 2,
    title: "Section Officer 10 Full Mock Sets (PDF)",
    description: "High-quality printable mock exams with detailed answer keys.",
    price: 500,
    original_price: 800,
    rating: 4.8,
    reviews: 89,
    type: "PDF",
    image: "bg-emerald-500",
  },
  {
    id: 3,
    title: "Current Affairs 2080 Yearbook",
    description: "The definitive guide to national and international events for Loksewa.",
    price: 350,
    original_price: null,
    rating: 4.7,
    reviews: 210,
    type: "PDF",
    image: "bg-[#D4A72C]",
  },
];

interface Props {
  products?: Product[] | null;
}

export function MarketplaceSection({ products }: Props) {
  const displayProducts = (products && products.length > 0)
    ? products.slice(0, 3)
    : STATIC_PRODUCTS as any;

  return (
    <section className="py-24 bg-slate-50 dark:bg-[#04080F] relative overflow-hidden">
      
      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
            <ShoppingBag className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[10.5px] font-[800] uppercase tracking-widest text-violet-600 dark:text-violet-400">Premium Marketplace</span>
          </div>
          <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-4 leading-[1.1]">
            Go beyond the <span className="text-gradient-blue-violet">standard syllabus.</span>
          </h2>
          <p className="text-[17px] text-slate-500 dark:text-slate-400 max-w-[520px] mx-auto font-[500]">
            Unlock expert-created masterclasses, premium mock sets, and specialized study guides.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {displayProducts.map((p: any) => (
            <Link key={p.id} href="/marketplace" className="group block">
              <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[24px] overflow-hidden hover:border-violet-500/30 dark:hover:border-violet-500/30 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] card-hover h-full flex flex-col">
                
                {/* Image placeholder (gradient) */}
                <div className={`h-[140px] relative ${p.image || "bg-gradient-to-br from-violet-500 to-blue-600"} p-4 flex flex-col justify-between`}>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-[800] uppercase tracking-wide bg-white/20 text-white backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5">
                      {p.type === "COURSE" ? <PlayCircle className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                      {p.type}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                      <Lock className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star className="w-3.5 h-3.5 fill-[#D4A72C] text-[#D4A72C]" />
                    <span className="text-[12px] font-[700] text-slate-700 dark:text-slate-300">{p.rating}</span>
                    <span className="text-[11px] text-slate-400">({p.reviews} reviews)</span>
                  </div>
                  
                  <h3 className="text-[16px] font-[800] text-slate-800 dark:text-white mb-2 leading-[1.3] group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {p.title}
                  </h3>
                  
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-[1.5] mb-5 flex-1">
                    {p.description}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/[0.04] mt-auto">
                    <div>
                      {p.original_price && (
                        <span className="text-[11px] text-slate-400 line-through mr-2">Rs. {p.original_price}</span>
                      )}
                      <span className="text-[18px] font-[900] text-slate-800 dark:text-white">Rs. {p.price}</span>
                    </div>
                    <span className="text-[12px] font-[700] text-violet-600 dark:text-violet-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                      View Details <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link href="/marketplace">
            <Button variant="outline" className="border-slate-300 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 bg-transparent h-[44px] px-6 rounded-[10px] font-[600] text-[14px] inline-flex items-center gap-2 group">
              Browse Entire Marketplace
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

      </div>
    </section>
  );
}
