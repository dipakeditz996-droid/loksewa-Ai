"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicBanner, PublicHomepageStatistic, publicApi } from "@/lib/api/public-api";
import { useQuery } from "@tanstack/react-query";
import { useSafeReducedMotion } from "./useHeroDepth";
import { CountUp } from "@/components/ui/count-up";

// ── Main Hero Section with Dynamic Banner Carousel ────────────────────────────
const AVATAR_GRADIENTS = [
  "from-blue-400 to-blue-600",
  "from-violet-400 to-violet-600",
  "from-emerald-400 to-emerald-600",
  "from-orange-400 to-orange-600",
  "from-[#2563EB] to-[#60A5FA]",
];

interface HeroStatisticsProps {
  stats?: PublicHomepageStatistic[] | null;
}

function HeroStatistics({ stats: initialStats }: HeroStatisticsProps) {
  const { data: liveHeroStats } = useQuery({
    queryKey: ["public-hero-statistics"],
    queryFn: async () => {
      const res = await publicApi.getHomepageStatistics();
      return res?.hero ?? null;
    },
    initialData: initialStats && initialStats.length > 0 ? initialStats : undefined,
    staleTime: 60 * 1000,
    refetchOnMount: true,
  });

  const stats = (liveHeroStats && liveHeroStats.length > 0) ? liveHeroStats : initialStats;

  if (!stats || stats.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 border-t border-white/20 mt-6 w-full max-w-[620px]">
      {stats.map((stat, idx) => {
        const isRating = stat.icon === "star" || stat.accent_style === "amber" || stat.suffix.includes("/5");
        const isUsers = stat.icon === "users" || stat.label.toLowerCase().includes("aspirant") || stat.label.toLowerCase().includes("enrolled");

        return (
          <React.Fragment key={stat.id || stat.label}>
            {idx > 0 && <div className="hidden sm:block w-px h-8 bg-white/25 shrink-0" />}
            <div className="flex items-center gap-2.5">
              {isUsers && (
                <div className="flex -space-x-2 shrink-0">
                  {AVATAR_GRADIENTS.map((g, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full bg-gradient-to-br ${g} ring-2 ring-slate-900 shadow-xs`}
                    />
                  ))}
                </div>
              )}
              {isRating && (
                <div className="flex text-amber-400 text-[14px] leading-none drop-shadow-sm shrink-0">
                  ★★★★★
                </div>
              )}
              <div>
                <div className="text-[14px] sm:text-[15px] font-[900] text-white leading-tight drop-shadow-sm">
                  <CountUp
                    value={stat.value}
                    startValue={stat.animation_start_value}
                    duration={stat.animation_duration || 1.5}
                    precision={stat.precision}
                    thousandSeparator={stat.thousand_separator}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    enabled={stat.animation_enabled}
                  />
                </div>
                <div className="text-[11.5px] font-[600] text-slate-200 leading-tight mt-0.5">
                  {stat.label}
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

interface HeroSectionProps {
  banners?: PublicBanner[] | null;
  stats?: PublicHomepageStatistic[] | null;
}

export function HeroSection({ banners: initialBanners, stats: initialStats }: HeroSectionProps) {
  const reducedMotion = useSafeReducedMotion();

  // Client-side live query so uploaded admin banners show immediately without waiting for ISR cache
  const { data: liveBanners } = useQuery({
    queryKey: ["public-banners"],
    queryFn: () => publicApi.getBanners(),
    initialData: initialBanners && initialBanners.length > 0 ? initialBanners : undefined,
    staleTime: 5 * 1000,
    refetchOnMount: true,
  });

  // Filter to only banners that contain genuine meaningful content (image or text)
  const banners = useMemo<PublicBanner[]>(() => {
    const raw = (liveBanners !== undefined ? liveBanners : initialBanners) || [];
    return raw.filter((b) => {
      if (!b) return false;
      const hasImage = Boolean(b.image_url && b.image_url.trim());
      const hasText = Boolean(
        (b.title && b.title.trim()) ||
        (b.subtitle && b.subtitle.trim()) ||
        (b.badge_text && b.badge_text.trim()) ||
        (b.cta_text && b.cta_text.trim() && b.cta_url && b.cta_url.trim()) ||
        (b.cta_secondary_text && b.cta_secondary_text.trim() && b.cta_secondary_url && b.cta_secondary_url.trim())
      );
      return hasImage || hasText;
    });
  }, [liveBanners, initialBanners]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const totalSlides = banners.length;

  // Auto transition every 5 seconds when multiple slides exist
  useEffect(() => {
    if (totalSlides <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(timer);
  }, [totalSlides, isHovered]);

  const handlePrev = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const handleNext = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  // If no valid banners configured by admin, do not render empty wrappers or fallback placeholders
  if (totalSlides === 0) {
    return null;
  }

  const safeIndex = currentIndex % totalSlides;
  const currentBanner = banners[safeIndex]!;

  // Extract trimmed content fields
  const title = currentBanner.title?.trim() || "";
  const subtitle = currentBanner.subtitle?.trim() || "";
  const badgeText = currentBanner.badge_text?.trim() || "";
  const ctaText = currentBanner.cta_text?.trim() || "";
  const ctaUrl = currentBanner.cta_url?.trim() || "";
  const ctaSecondaryText = currentBanner.cta_secondary_text?.trim() || "";
  const ctaSecondaryUrl = currentBanner.cta_secondary_url?.trim() || "";

  const hasPrimaryCta = Boolean(ctaText && ctaUrl);
  const hasSecondaryCta = Boolean(ctaSecondaryText && ctaSecondaryUrl);
  const hasAnyCta = hasPrimaryCta || hasSecondaryCta;
  const hasTextContent = Boolean(title || subtitle || badgeText || hasAnyCta);
  const hasImage = Boolean(currentBanner.image_url?.trim());

  // Image fit and focal positioning
  const desktopFit = currentBanner.image_fit === "contain" ? "contain" : "cover";
  const desktopFocalX = currentBanner.image_focal_x || "center";
  const desktopFocalY = currentBanner.image_focal_y || "center";
  const desktopPosition = `${desktopFocalX} ${desktopFocalY}`;

  const mobileFit = (currentBanner.mobile_image_fit || currentBanner.image_fit) === "contain" ? "contain" : "cover";
  const mobileFocalX = currentBanner.mobile_image_focal_x || currentBanner.image_focal_x || "center";
  const mobileFocalY = currentBanner.mobile_image_focal_y || currentBanner.image_focal_y || "center";
  const mobilePosition = `${mobileFocalX} ${mobileFocalY}`;

  // Image-only slide click destination
  const imageOnlyLink = !hasTextContent && ctaUrl ? ctaUrl : null;

  return (
    <section
      className={`relative flex items-center overflow-hidden bg-slate-950 text-white ${
        hasTextContent
          ? "pt-20 pb-12 sm:pt-24 sm:pb-16 lg:pt-28 lg:pb-16 min-h-[460px] sm:min-h-[520px] lg:min-h-[580px]"
          : "min-h-[260px] sm:min-h-[380px] md:min-h-[480px] lg:min-h-[560px]"
      }`}
    >
      {/* ── Banner Media Background ────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBanner.id ?? safeIndex}
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 1.01 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.3 : 0.6, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {hasImage ? (
              <picture className="w-full h-full block">
                {currentBanner.mobile_image_url && (
                  <source
                    media="(max-width: 768px)"
                    srcSet={currentBanner.mobile_image_url}
                  />
                )}
                <img
                  src={currentBanner.image_url!}
                  alt={title || "Homepage hero banner"}
                  className="w-full h-full block transition-all duration-300"
                  style={
                    {
                      objectFit: desktopFit,
                      objectPosition: desktopPosition,
                      "--mobile-fit": mobileFit,
                      "--mobile-pos": mobilePosition,
                    } as React.CSSProperties
                  }
                  loading="eager"
                />
              </picture>
            ) : (
              // Clean brand architectural backdrop for text-only banners
              <div className="w-full h-full bg-gradient-to-br from-[#102D40] via-[#0E2536] to-slate-950" />
            )}

            {/* Contrast scrim: ONLY rendered when text exists, preserving clean visual for image-only banners */}
            {hasTextContent && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/40 pointer-events-none" />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Ambient brand aura glow (subtle, non-distracting) */}
        <div className="absolute -top-[10%] left-[5%] w-[420px] h-[420px] rounded-full bg-[#2563EB]/[0.08] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[5%] w-[380px] h-[380px] rounded-full bg-[#174A68]/[0.10] blur-[120px] pointer-events-none" />
      </div>

      {/* ── Content Grid or Image-Only Click Wrapper ────────────────────────── */}
      {hasTextContent ? (
        <div className="relative z-10 max-w-[1360px] mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-[760px]">
            <div className="flex flex-col items-start text-left">
              {/* Badge (Only if explicitly entered) */}
              {badgeText && (
                <motion.div
                  key={`badge-${currentBanner.id ?? safeIndex}`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2563EB]/25 border border-[#3B82F6]/50 backdrop-blur-md mb-4 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#93C5FD]" />
                  <span className="text-[11.5px] font-[800] uppercase tracking-wider text-[#93C5FD]">
                    {badgeText}
                  </span>
                </motion.div>
              )}

              {/* Headline (Only if explicitly entered) */}
              {title && (
                <motion.h1
                  key={`title-${currentBanner.id ?? safeIndex}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[32px] xs:text-[38px] sm:text-[46px] md:text-[52px] lg:text-[58px] font-[900] tracking-[-0.035em] leading-[1.08] mb-4 text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]"
                >
                  <span>{title}</span>
                </motion.h1>
              )}

              {/* Subtitle / Description (Only if explicitly entered) */}
              {subtitle && (
                <motion.p
                  key={`sub-${currentBanner.id ?? safeIndex}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-[15px] sm:text-[17px] md:text-[18px] text-slate-100 leading-[1.55] max-w-[560px] mb-6 font-[500] drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]"
                >
                  {subtitle}
                </motion.p>
              )}

              {/* CTA Buttons (Only if explicitly configured) */}
              {hasAnyCta && (
                <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto">
                  {hasPrimaryCta && (
                    <Link href={ctaUrl} className="w-full sm:w-auto">
                      <Button className="h-[48px] sm:h-[50px] px-8 rounded-[12px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-[800] text-[15px] shadow-[0_10px_25px_-5px_rgba(37,99,235,0.6)] border border-blue-400/30 w-full sm:w-auto flex items-center justify-center gap-2.5 group transition-all">
                        {ctaText}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  )}

                  {hasSecondaryCta && (
                    <Link href={ctaSecondaryUrl} className="w-full sm:w-auto">
                      <Button
                        variant="outline"
                        className="h-[48px] sm:h-[50px] px-7 rounded-[12px] border border-white/35 text-white hover:text-white hover:bg-white/20 hover:border-white/60 bg-slate-950/60 backdrop-blur-md font-[700] text-[15px] w-full sm:w-auto flex items-center justify-center gap-2 transition-all shadow-md"
                      >
                        <Play className="w-4 h-4 fill-white text-white" />
                        {ctaSecondaryText}
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              {/* Dynamic Hero Statistics */}
              <HeroStatistics stats={initialStats} />
            </div>
          </div>

          {/* Carousel Controls for Slides with Text */}
          {totalSlides > 1 && (
            <div
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="flex items-center justify-between pt-8 sm:pt-10 mt-4 border-t border-white/10"
            >
              {/* Pagination Dots */}
              <div className="flex items-center gap-2">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`transition-all duration-300 rounded-full ${
                      idx === safeIndex
                        ? "w-8 h-2.5 bg-[#2563EB]"
                        : "w-2.5 h-2.5 bg-white/30 hover:bg-white/50"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
                <span className="text-xs font-[700] text-slate-400 ml-2">
                  0{safeIndex + 1} / 0{totalSlides}
                </span>
              </div>

              {/* Prev / Next Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrev}
                  className="w-9 h-9 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                  aria-label="Previous banner"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  className="w-9 h-9 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                  aria-label="Next banner"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Image-Only Slide: Clean full-width presentation with optional link & controls
        <>
          {imageOnlyLink && (
            <Link
              href={imageOnlyLink}
              className="absolute inset-0 z-10 block"
              aria-label={title || "Hero banner"}
            />
          )}

          {/* Floating Carousel Controls for Image-Only Slides */}
          {totalSlides > 1 && (
            <div
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="absolute bottom-4 right-4 sm:bottom-6 sm:right-8 z-20 flex items-center gap-3 bg-slate-950/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15"
            >
              <div className="flex items-center gap-1.5">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`transition-all duration-300 rounded-full ${
                      idx === safeIndex
                        ? "w-6 h-2 bg-[#2563EB]"
                        : "w-2 h-2 bg-white/40 hover:bg-white/60"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1 ml-1 border-l border-white/20 pl-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrev}
                  className="w-7 h-7 rounded-full text-white hover:bg-white/20 p-0"
                  aria-label="Previous banner"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  className="w-7 h-7 rounded-full text-white hover:bg-white/20 p-0"
                  aria-label="Next banner"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
