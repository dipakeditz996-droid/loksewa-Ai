"use client";

import React from "react";
import { Star, CheckCircle } from "lucide-react";
import { PublicTestimonial } from "@/lib/api/public-api";

// ── Curated static metrics (backend-configurable via /public/stats/ eventually) ──
const STATIC_METRICS = [
  { value: "50K+", label: "Aspirants", description: "Active learners" },
  { value: "250K+", label: "Questions", description: "Practice questions" },
  { value: "1,000+", label: "Practice Sets", description: "Topic-wise sets" },
  { value: "95%", label: "Content Accuracy", description: "Verified by experts" },
];

// ── Curated static testimonials (backend-configurable via /public/testimonials/) ──
const STATIC_TESTIMONIALS: PublicTestimonial[] = [
  {
    id: 1,
    name: "Ramesh Thapa",
    position: "Section Officer | FPSC",
    avatar: null,
    review: "LoksewaAI transformed how I prepare. The AI identifies exactly where I'm weak and gives me targeted practice. Cleared my Section Officer exam on first attempt.",
    rating: 5,
  },
  {
    id: 2,
    name: "Sita Sharma",
    position: "Kharidar | PSC",
    avatar: null,
    review: "The personalized study plan kept me on track. Mock exams feel exactly like the real thing. I improved from 62% to 91% accuracy in just 3 months.",
    rating: 5,
  },
  {
    id: 3,
    name: "Hari Poudel",
    position: "Sub-Engineer | LoGo",
    avatar: null,
    review: "Best investment for Loksewa preparation. The notes are comprehensive, practice sets are well-structured, and the AI recommendations are spot-on.",
    rating: 5,
  },
];

const AVATAR_COLORS = [
  "from-blue-500 to-violet-600",
  "from-emerald-400 to-cyan-500",
  "from-[#D4A72C] to-orange-500",
];

interface Props {
  testimonials?: PublicTestimonial[] | null;
}

export function SocialProofSection({ testimonials }: Props) {
  const displayTestimonials = (testimonials && testimonials.length > 0)
    ? testimonials
    : STATIC_TESTIMONIALS;

  return (
    <section className="py-24 bg-white dark:bg-[#020611] relative overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-[#0B1F3A]/50 border border-slate-200 dark:border-[#163E6B]/50 mb-5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10.5px] font-[800] uppercase tracking-widest text-slate-500 dark:text-[#4B8BE0]">Trusted by Aspirants</span>
          </div>
          <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-4 leading-[1.1]">
            Built for serious{" "}
            <span className="text-gradient-gold">Loksewa preparation.</span>
          </h2>
          <p className="text-[17px] text-slate-500 dark:text-slate-400 max-w-[520px] mx-auto font-[500]">
            Thousands of aspirants trust LoksewaAI to prepare smarter, practice better, and perform with confidence.
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {STATIC_METRICS.map((m, i) => (
            <div
              key={m.label}
              className="relative bg-slate-50 dark:bg-[#040B14] border border-slate-200 dark:border-white/[0.05] rounded-[20px] p-6 text-center group hover:border-[#D4A72C]/30 dark:hover:border-[#D4A72C]/20 transition-all card-hover"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#D4A72C]/[0.02] to-transparent rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={`text-[36px] md:text-[44px] font-[900] mb-1 ${
                i === 3 ? "text-gradient-gold" : "text-slate-900 dark:text-white"
              }`}>
                {m.value}
              </div>
              <div className="text-[13px] font-[700] text-slate-700 dark:text-slate-200 mb-1">{m.label}</div>
              <div className="text-[11.5px] text-slate-400 dark:text-slate-500">{m.description}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayTestimonials.slice(0, 3).map((t, i) => (
            <div
              key={t.id}
              className="bg-slate-50 dark:bg-[#040B14] border border-slate-200 dark:border-white/[0.05] rounded-[20px] p-6 flex flex-col gap-4 hover:border-slate-300 dark:hover:border-white/[0.1] transition-all card-hover"
            >
              {/* Stars */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-[#D4A72C] text-[#D4A72C]" />
                ))}
              </div>

              {/* Review */}
              <p className="text-[14px] text-slate-600 dark:text-slate-300 leading-[1.7] flex-1">
                &ldquo;{t.review}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                {t.avatar ? (
                  <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-[700] text-[13px]`}>
                    {t.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="text-[13px] font-[700] text-slate-800 dark:text-white">{t.name}</div>
                  <div className="text-[11.5px] text-[#D4A72C] font-[600]">{t.position}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
