"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight, Sparkles } from "lucide-react";
import { PublicPackage } from "@/lib/api/public-api";

// ── Curated static packages (backend-configurable via /packages/public/) ──
const STATIC_PACKAGES: PublicPackage[] = [
  {
    id: 1,
    name: "Basic Plan",
    slug: "basic",
    description: "Essential tools to start your preparation.",
    price: "0",
    duration_days: 30,
    duration_label: "Free Forever",
    features: [
      "Access to public syllabus",
      "Daily 10 practice questions",
      "1 free mock exam per month",
      "Basic performance stats",
    ],
    is_popular: false,
    is_active: true,
    course_access: false,
    practice_access: true,
    mock_exam_access: false,
    notes_access: false,
    ai_features: false,
    color_accent: "from-slate-500 to-slate-600",
  },
  {
    id: 2,
    name: "Pro Preparation",
    slug: "pro",
    description: "The complete toolkit for serious aspirants.",
    price: "1,499",
    duration_days: 30,
    duration_label: "Per Month",
    features: [
      "Unlimited practice questions",
      "Unlimited full mock exams",
      "Detailed AI performance analytics",
      "Personalized study plan",
      "Access to all premium notes",
    ],
    is_popular: true,
    is_active: true,
    course_access: true,
    practice_access: true,
    mock_exam_access: true,
    notes_access: true,
    ai_features: true,
    color_accent: "from-[#D4A72C] to-[#E6BA3D]",
  },
  {
    id: 3,
    name: "Exam Pass",
    slug: "exam-pass",
    description: "Intensive 3-month access for exam season.",
    price: "3,499",
    duration_days: 90,
    duration_label: "For 3 Months",
    features: [
      "Everything in Pro Preparation",
      "Priority expert support",
      "Exclusive revision materials",
      "Live doubt clearing sessions",
    ],
    is_popular: false,
    is_active: true,
    course_access: true,
    practice_access: true,
    mock_exam_access: true,
    notes_access: true,
    ai_features: true,
    color_accent: "from-violet-600 to-blue-600",
  },
];

interface Props {
  packages?: PublicPackage[] | null;
}

export function PricingSection({ packages }: Props) {
  const displayPackages = (packages && packages.length > 0)
    ? packages
    : STATIC_PACKAGES;

  return (
    <section className="py-24 bg-slate-50 dark:bg-[#020611] relative overflow-hidden">
      
      {/* Background elements */}
      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#D4A72C]/[0.03] dark:bg-[#D4A72C]/[0.05] rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4A72C]/10 border border-[#D4A72C]/20 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-[#D4A72C]" />
            <span className="text-[10.5px] font-[800] uppercase tracking-widest text-[#D4A72C]">Simple Pricing</span>
          </div>
          <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-4 leading-[1.1]">
            Invest in your <span className="text-gradient-gold">future.</span>
          </h2>
          <p className="text-[17px] text-slate-500 dark:text-slate-400 max-w-[520px] mx-auto font-[500]">
            Choose the plan that fits your preparation journey. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1000px] mx-auto items-center">
          {displayPackages.map((pkg) => (
            <div 
              key={pkg.id} 
              className={`relative bg-white dark:bg-[#060E18] border rounded-[24px] overflow-hidden transition-all ${
                pkg.is_popular 
                  ? "border-[#D4A72C]/50 dark:border-[#D4A72C]/50 shadow-[0_20px_60px_rgba(212,167,44,0.1)] dark:shadow-[0_20px_80px_rgba(212,167,44,0.15)] md:scale-105 z-10" 
                  : "border-slate-200 dark:border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
              }`}
            >
              {pkg.is_popular && (
                <div className="bg-gradient-to-r from-[#C29322] to-[#E6BA3D] text-[#020611] text-center py-1.5 text-[11px] font-[800] uppercase tracking-widest">
                  MOST POPULAR
                </div>
              )}

              <div className="p-8">
                <h3 className="text-[20px] font-[800] text-slate-900 dark:text-white mb-2">{pkg.name}</h3>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 h-[40px]">{pkg.description}</p>
                
                <div className="my-6">
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-[20px] font-[700] text-slate-500 dark:text-slate-400 pb-1">Rs.</span>
                    <span className="text-[44px] font-[900] text-slate-900 dark:text-white leading-none tracking-tight">{pkg.price}</span>
                  </div>
                  <div className="text-[13px] font-[600] text-slate-500 dark:text-slate-400">{pkg.duration_label}</div>
                </div>

                <Link href="/register">
                  <Button 
                    className={`w-full h-[48px] rounded-[12px] font-[700] text-[15px] transition-all mb-8 ${
                      pkg.is_popular 
                        ? "bg-gradient-to-r from-[#C29322] to-[#E6BA3D] hover:opacity-90 text-[#020611] border-none shadow-[0_8px_25px_rgba(212,167,44,0.3)]" 
                        : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10"
                    }`}
                  >
                    Get Started Now
                  </Button>
                </Link>

                <div className="space-y-4">
                  {pkg.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        pkg.is_popular ? "bg-[#D4A72C]/10" : "bg-emerald-500/10"
                      }`}>
                        <Check className={`w-3 h-3 ${pkg.is_popular ? "text-[#D4A72C]" : "text-emerald-500"}`} />
                      </div>
                      <span className="text-[14px] text-slate-600 dark:text-slate-300">{feature}</span>
                    </div>
                  ))}
                  
                  {/* For Basic plan, show missing features */}
                  {!pkg.is_popular && pkg.price === "0" && (
                    <>
                      <div className="flex items-start gap-3 opacity-50">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-slate-100 dark:bg-white/5">
                          <X className="w-3 h-3 text-slate-400" />
                        </div>
                        <span className="text-[14px] text-slate-400">Advanced AI Analytics</span>
                      </div>
                      <div className="flex items-start gap-3 opacity-50">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-slate-100 dark:bg-white/5">
                          <X className="w-3 h-3 text-slate-400" />
                        </div>
                        <span className="text-[14px] text-slate-400">Premium Study Materials</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
