"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicBanner, publicApi } from "@/lib/api/public-api";
import { useQuery } from "@tanstack/react-query";
import { useSafeReducedMotion } from "./useHeroDepth";

// ── Default Curated Banners (Fallback when none configured in database) ───────
const FALLBACK_BANNERS: PublicBanner[] = [
  {
    id: -1,
    title: "Master IOE Entrance & NEC License Examinations",
    subtitle: "Nepal's premier engineering platform with verified question banks, live mock tests, and smart performance analytics.",
    badge_text: "IOE Entrance & NEC License 2081/82",
    cta_text: "Start Preparing Now",
    cta_url: "/register",
    cta_secondary_text: "Explore Courses",
    cta_secondary_url: "/courses",
    image_url: "/media/hero_background.webp",
    mobile_image_url: null,
    display_order: 0,
  },
  {
    id: -2,
    title: "Curated Engineering Syllabus. Zero Fluff.",
    subtitle: "Topic-wise marks distribution and official syllabus breakdown for PSC Technical and License cadres.",
    badge_text: "Official Syllabus",
    cta_text: "Browse Syllabus",
    cta_url: "/syllabus",
    cta_secondary_text: "Practice Question Sets",
    cta_secondary_url: "/practice",
    image_url: "/media/course.webp",
    mobile_image_url: null,
    display_order: 1,
  },
  {
    id: -3,
    title: "Real Exam Simulations & Instant Scoring",
    subtitle: "Experience timed computer-based tests with negative marking, percentile rankings, and comprehensive explanations.",
    badge_text: "Live Mock Tests",
    cta_text: "Take Free Mock Test",
    cta_url: "/exams",
    cta_secondary_text: "Explore All Exams",
    cta_secondary_url: "/exams",
    image_url: "/images/admin_bg.jpg",
    mobile_image_url: null,
    display_order: 2,
  },
];

const EXAM_CHIPS = ["PSC Civil & Electrical", "NEC License", "IOE Entrance"];

const DEFAULT_FALLBACK_IMAGES = [
  "/media/hero_background.webp",
  "/media/course.webp",
  "/images/admin_bg.jpg",
];

// ── Trust indicators ───────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  "from-blue-400 to-blue-600",
  "from-violet-400 to-violet-600",
  "from-emerald-400 to-emerald-600",
  "from-orange-400 to-orange-600",
  "from-[#2563EB] to-[#60A5FA]",
];

function TrustIndicators() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 border-t border-white/20 mt-2 w-full max-w-[560px]">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {AVATAR_GRADIENTS.map((g, i) => (
            <div
              key={i}
              className={`w-7 h-7 rounded-full bg-gradient-to-br ${g} ring-2 ring-slate-900 shadow-xs`}
            />
          ))}
        </div>
        <div>
          <div className="text-[14px] font-[900] text-white leading-tight drop-shadow-sm">10,000+</div>
          <div className="text-[11.5px] font-[600] text-slate-200 leading-tight">Aspirants Enrolled</div>
        </div>
      </div>

      <div className="hidden sm:block w-px h-8 bg-white/25" />

      <div className="flex items-center gap-2">
        <div className="flex text-amber-400 text-[14px] leading-none drop-shadow-sm">★★★★★</div>
        <div>
          <div className="text-[14px] font-[900] text-white leading-tight drop-shadow-sm">4.9/5</div>
          <div className="text-[11.5px] font-[600] text-slate-200 leading-tight">Student Rating</div>
        </div>
      </div>

      <div className="hidden sm:block w-px h-8 bg-white/25" />

      <div>
        <div className="text-[14px] font-[900] text-white leading-tight drop-shadow-sm">5,000+</div>
        <div className="text-[11.5px] font-[600] text-slate-200 leading-tight">Exam Questions</div>
      </div>
    </div>
  );
}

// ── Main Hero Section with Dynamic Banner Carousel ────────────────────────────
interface HeroSectionProps {
  banners?: PublicBanner[] | null;
}

export function HeroSection({ banners: initialBanners }: HeroSectionProps) {
  const reducedMotion = useSafeReducedMotion();

  // Client-side live query so uploaded admin banners show immediately without waiting for ISR build cache
  const { data: liveBanners } = useQuery({
    queryKey: ["public-banners"],
    queryFn: () => publicApi.getBanners(),
    initialData: initialBanners && initialBanners.length > 0 ? initialBanners : undefined,
    staleTime: 60 * 1000,
  });

  // Combine real banners (live or SSR) or use fallback
  const banners = (liveBanners && liveBanners.length > 0)
    ? liveBanners
    : (initialBanners && initialBanners.length > 0)
      ? initialBanners
      : FALLBACK_BANNERS;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const totalSlides = banners.length;
  const currentBanner: PublicBanner = banners[currentIndex] ?? banners[0] ?? FALLBACK_BANNERS[0]!;
  const fallbackImage = DEFAULT_FALLBACK_IMAGES[currentIndex % DEFAULT_FALLBACK_IMAGES.length]!;
  const fallbackData = FALLBACK_BANNERS[currentIndex % FALLBACK_BANNERS.length]!;

  // Auto transition every 5 seconds (paused only when hovering over controls or if only 1 slide exists)
  useEffect(() => {
    if (totalSlides <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(timer);
  }, [totalSlides, isHovered]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  return (
    <section
      className="relative flex items-center pt-20 pb-10 sm:pt-22 sm:pb-12 lg:pt-24 lg:pb-12 overflow-hidden bg-slate-950 text-white min-h-[520px] sm:min-h-[560px] lg:min-h-[600px]"
    >
      {/* ── Dynamic Banner Carousel Background ──────────────────────────────── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence>
          <motion.div
            key={currentBanner.id ?? currentIndex}
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.3 : 0.8, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* Desktop & Mobile Responsive Banner Image */}
            <picture className="w-full h-full block">
              {currentBanner.mobile_image_url && (
                <source
                  media="(max-width: 768px)"
                  srcSet={currentBanner.mobile_image_url}
                />
              )}
              <img
                src={currentBanner.image_url || fallbackImage}
                alt={currentBanner.title || fallbackData.title}
                className="w-full h-full object-cover object-[center_26%] filter brightness-[1.20] contrast-[1.08] saturate-[1.12]"
                loading="eager"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== fallbackImage) {
                    target.src = fallbackImage;
                  }
                }}
              />
            </picture>

            {/* Targeted architectural scrim: soft gradient on the left for text legibility, clear on center & right so building is clearly visible */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/45 pointer-events-none" />
          </motion.div>
        </AnimatePresence>

        {/* Ambient Aurora Glows */}
        <div className="absolute -top-[10%] left-[5%] w-[500px] h-[500px] rounded-full bg-[#2563EB]/[0.12] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[5%] w-[450px] h-[450px] rounded-full bg-blue-600/[0.10] blur-[120px] pointer-events-none" />

        {/* Subtle Architectural Perspective Grid */}
        <div className="absolute inset-0 bg-neural-grid opacity-15 pointer-events-none" />
      </div>

      {/* ── Content Grid ────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-[1360px] mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-[760px]">
          {/* Dynamic Slide Content */}
          <div className="flex flex-col items-start text-left">

            {/* Slide Badge */}
            {currentBanner.badge_text ? (
              <motion.div
                key={`badge-${currentBanner.id ?? currentIndex}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2563EB]/25 border border-[#3B82F6]/50 backdrop-blur-md mb-4 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#93C5FD]" />
                <span className="text-[11.5px] font-[800] uppercase tracking-wider text-[#93C5FD]">
                  {currentBanner.badge_text}
                </span>
              </motion.div>
            ) : !currentBanner.id ? (
              <motion.div
                key={`badge-${currentBanner.id ?? currentIndex}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2563EB]/25 border border-[#3B82F6]/50 backdrop-blur-md mb-4 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#93C5FD]" />
                <span className="text-[11.5px] font-[800] uppercase tracking-wider text-[#93C5FD]">
                  Engineering Entrance & License
                </span>
              </motion.div>
            ) : null}

            {/* Dynamic Headline */}
            {currentBanner.title ? (
              <motion.h1
                key={`title-${currentBanner.id ?? currentIndex}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-[34px] xs:text-[40px] sm:text-[48px] md:text-[54px] lg:text-[60px] font-[900] tracking-[-0.035em] leading-[1.06] mb-4 text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]"
              >
                <span>{currentBanner.title}</span>
              </motion.h1>
            ) : !currentBanner.id ? (
              <motion.h1
                key={`title-${currentBanner.id ?? currentIndex}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-[34px] xs:text-[40px] sm:text-[48px] md:text-[54px] lg:text-[60px] font-[900] tracking-[-0.035em] leading-[1.06] mb-4 text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]"
              >
                Engineering Excellence,{" "}
                <span className="text-[#60A5FA]">Mastered.</span>
              </motion.h1>
            ) : null}

            {/* Concise Supporting Copy (Clean, focused, no lengthy fluff) */}
            {currentBanner.subtitle && (
              <motion.p
                key={`sub-${currentBanner.id ?? currentIndex}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-[16px] sm:text-[17.5px] md:text-[18.5px] text-slate-100 leading-[1.55] max-w-[540px] mb-6 font-[500] drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]"
              >
                {currentBanner.subtitle}
              </motion.p>
            )}

            {/* Professional CTA Buttons (Polished height, radius, hierarchy) */}
            <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto mb-6">
              <Link href={currentBanner.cta_url || "/register"} className="w-full sm:w-auto">
                <Button className="h-[48px] sm:h-[50px] px-8 rounded-[12px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-[800] text-[15px] shadow-[0_10px_25px_-5px_rgba(37,99,235,0.6)] border border-blue-400/30 w-full sm:w-auto flex items-center justify-center gap-2.5 group transition-all">
                  {currentBanner.cta_text || "Start Preparing Now"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              {currentBanner.cta_secondary_text && (
                <Link href={currentBanner.cta_secondary_url || "/courses"} className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="h-[48px] sm:h-[50px] px-7 rounded-[12px] border border-white/35 text-white hover:text-white hover:bg-white/20 hover:border-white/60 bg-slate-950/60 backdrop-blur-md font-[700] text-[15px] w-full sm:w-auto flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <Play className="w-4 h-4 fill-white text-white" />
                    {currentBanner.cta_secondary_text}
                  </Button>
                </Link>
              )}
            </div>

            {/* Exam Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-[11.5px] font-[800] uppercase tracking-wider text-slate-200 mr-1 drop-shadow-sm">
                Curriculum:
              </span>
              {EXAM_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="text-[12px] font-[700] text-white bg-slate-950/80 border border-white/20 px-3 py-1 rounded-full backdrop-blur-md shadow-sm"
                >
                  {chip}
                </span>
              ))}
            </div>

            {/* Trust Indicators */}
            <TrustIndicators />
          </div>
        </div>

        {/* ── Carousel Navigation Controls & Pagination Indicators ─────────── */}
        {totalSlides > 1 && (
          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex items-center justify-between pt-8 sm:pt-10 mt-4 border-t border-white/10"
          >
            {/* Pagination Indicators / Slide Dots */}
            <div className="flex items-center gap-2">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all duration-300 rounded-full ${
                    idx === currentIndex
                      ? "w-8 h-2.5 bg-[#2563EB]"
                      : "w-2.5 h-2.5 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
              <span className="text-xs font-[700] text-slate-400 ml-2">
                0{currentIndex + 1} / 0{totalSlides}
              </span>
            </div>

            {/* Prev / Next Controls */}
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
    </section>
  );
}
