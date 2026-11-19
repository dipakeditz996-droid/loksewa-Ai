"use client";

import React from "react";
import { Star, CheckCircle } from "lucide-react";
import { PublicTestimonial, PublicHomepageStatistic, publicApi } from "@/lib/api/public-api";
import { RetryImage } from "@/components/ui/retry-image";
import { WriteReviewTrigger } from "@/components/home/WriteReviewTrigger";
import { CountUp } from "@/components/ui/count-up";
import { useQuery } from "@tanstack/react-query";

const AVATAR_COLORS = [
  "from-blue-500 to-violet-600",
  "from-emerald-400 to-cyan-500",
  "from-[#2563EB] to-orange-500",
];

interface Props {
  testimonials?: PublicTestimonial[] | null;
  stats?: PublicHomepageStatistic[] | null;
}

export function SocialProofSection({ testimonials, stats: initialStats }: Props) {
  // Client-side live query so uploaded admin statistics show immediately
  const { data: livePlatformStats } = useQuery({
    queryKey: ["public-platform-statistics"],
    queryFn: async () => {
      const res = await publicApi.getHomepageStatistics();
      return res?.platform ?? null;
    },
    initialData: initialStats && initialStats.length > 0 ? initialStats : undefined,
    staleTime: 60 * 1000,
    refetchOnMount: true,
  });

  const platformStats = (livePlatformStats && livePlatformStats.length > 0) ? livePlatformStats : initialStats;

  // Real, admin-authored testimonials only — no fabricated names/quotes. When
  // an admin hasn't published any yet, the section simply omits this row.
  const displayTestimonials = testimonials && testimonials.length > 0 ? testimonials : [];

  const hasStats = Boolean(platformStats && platformStats.length > 0);
  const hasTestimonials = Boolean(displayTestimonials.length > 0);

  // If both stats and testimonials are empty, do not render an empty section
  if (!hasStats && !hasTestimonials) {
    return null;
  }

  return (
    <section className="py-12 sm:py-14 lg:py-16 bg-white dark:bg-[#020611] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-[#0B1F3A]/50 border border-slate-200 dark:border-[#102D40]/50 mb-4 sm:mb-5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10.5px] font-[800] uppercase tracking-widest text-slate-700 dark:text-[#4B8BE0]">
              Trusted by Aspirants
            </span>
          </div>
          <h2 className="text-[30px] sm:text-[36px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-3 sm:mb-4 leading-[1.1]">
            Built for serious{" "}
            <span className="text-gradient-gold">engineering exam preparation.</span>
          </h2>
          <p className="text-[15.5px] sm:text-[17px] text-slate-600 dark:text-slate-300 max-w-[520px] mx-auto font-[500]">
            Thousands of aspirants trust NES Mastery to prepare smarter, practice better, and perform with confidence.
          </p>
          <div className="mt-4 sm:mt-5">
            <WriteReviewTrigger />
          </div>
        </div>

        {/* Dynamic Platform Metrics */}
        {hasStats && (
          <div
            className={`grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 ${
              hasTestimonials ? "mb-8 sm:mb-10 md:mb-12" : ""
            }`}
          >
            {platformStats!.map((stat, i) => {
              const accentClass =
                stat.accent_style === "gold"
                  ? "text-gradient-gold"
                  : stat.accent_style === "blue"
                  ? "text-[#2563EB] dark:text-[#60A5FA]"
                  : stat.accent_style === "emerald"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : stat.accent_style === "amber"
                  ? "text-amber-500 dark:text-amber-400"
                  : i === 3
                  ? "text-gradient-gold"
                  : "text-slate-900 dark:text-white";

              return (
                <div
                  key={stat.id || stat.label}
                  className="relative bg-slate-50 dark:bg-[#040B14] border border-slate-200 dark:border-white/[0.05] rounded-[16px] sm:rounded-[20px] p-4 sm:p-6 text-center group hover:border-[#2563EB]/30 dark:hover:border-[#2563EB]/20 transition-all card-hover overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/[0.02] to-transparent rounded-[16px] sm:rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div
                    className={`text-[24px] xs:text-[28px] sm:text-[36px] md:text-[44px] font-[900] mb-1 leading-tight tracking-tight tabular-nums ${accentClass}`}
                  >
                    <CountUp
                      value={stat.value}
                      startValue={stat.animation_start_value}
                      duration={stat.animation_duration || 2.0}
                      precision={stat.precision}
                      thousandSeparator={stat.thousand_separator}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      enabled={stat.animation_enabled}
                    />
                  </div>
                  <div className="text-[12px] sm:text-[13px] font-[700] text-slate-800 dark:text-slate-100 mb-1">
                    {stat.label}
                  </div>
                  {stat.description && (
                    <div className="text-[10.5px] sm:text-[11.5px] text-slate-600 dark:text-slate-300 font-[500] leading-tight">
                      {stat.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Testimonials — omitted entirely until an admin publishes at least one */}
        {hasTestimonials && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayTestimonials.slice(0, 3).map((t, i) => (
              <div
                key={t.id}
                className="bg-slate-50 dark:bg-[#040B14] border border-slate-200 dark:border-white/[0.05] rounded-[20px] p-6 flex flex-col gap-4 hover:border-slate-300 dark:hover:border-white/[0.1] transition-all card-hover"
              >
                {/* Stars */}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-[#2563EB] text-[#2563EB]" />
                  ))}
                </div>

                {/* Review */}
                <p className="text-[14px] text-slate-600 dark:text-slate-300 leading-[1.7] flex-1">
                  &ldquo;{t.review}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                  {t.avatar ? (
                    <RetryImage src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-full bg-gradient-to-br ${
                        AVATAR_COLORS[i % AVATAR_COLORS.length]
                      } flex items-center justify-center text-white font-[700] text-[13px]`}
                    >
                      {t.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="text-[13px] font-[700] text-slate-800 dark:text-white">{t.name}</div>
                    <div className="text-[11.5px] text-[#2563EB] dark:text-[#2563EB] font-[600]">{t.position}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
