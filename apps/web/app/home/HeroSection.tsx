"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  TrendingUp,
  Award,
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicBanner } from "@/lib/api/public-api";
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
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 pt-3.5 border-t border-white/15 mt-1 w-full">
      <div className="flex items-center gap-2.5">
        <div className="flex -space-x-2">
          {AVATAR_GRADIENTS.map((g, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full bg-gradient-to-br ${g} ring-1.5 ring-slate-900 shadow-xs`}
            />
          ))}
        </div>
        <div>
          <div className="text-[13px] font-[900] text-white leading-tight">10,000+</div>
          <div className="text-[10.5px] font-[600] text-slate-300 leading-tight">Aspirants Enrolled</div>
        </div>
      </div>

      <div className="hidden sm:block w-px h-7 bg-white/20" />

      <div className="flex items-center gap-1.5">
        <div className="flex text-amber-400 text-[13px] leading-none">★★★★★</div>
        <div>
          <div className="text-[13px] font-[900] text-white leading-tight">4.9/5</div>
          <div className="text-[10.5px] font-[600] text-slate-300 leading-tight">Rating</div>
        </div>
      </div>

      <div className="hidden sm:block w-px h-7 bg-white/20" />

      <div>
        <div className="text-[13px] font-[900] text-white leading-tight">5,000+</div>
        <div className="text-[10.5px] font-[600] text-slate-300 leading-tight">Exam Questions</div>
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

  // Combine real banners or use fallback
  const banners = (initialBanners && initialBanners.length > 0)
    ? initialBanners
    : FALLBACK_BANNERS;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const totalSlides = banners.length;
  const currentBanner = banners[currentIndex] || banners[0];

  // Auto transition every 5.5 seconds (paused on hover or if only 1 slide exists)
  useEffect(() => {
    if (totalSlides <= 1 || isHovered || reducedMotion) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 5500);

    return () => clearInterval(timer);
  }, [totalSlides, isHovered, reducedMotion]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  return (
    <section
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex items-center pt-24 pb-8 sm:pt-28 sm:pb-10 lg:pt-32 lg:pb-10 overflow-hidden bg-slate-950 text-white min-h-[500px] sm:min-h-[540px] lg:min-h-[580px]"
    >
      {/* ── Dynamic Banner Carousel Background ──────────────────────────────── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBanner.id || currentIndex}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
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
                src={currentBanner.image_url || "/media/hero_background.webp"}
                alt={currentBanner.title || "NES Mastery Banner"}
                className="w-full h-full object-cover object-[center_28%] filter brightness-100 contrast-[1.02]"
                loading="eager"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== "/media/hero_background.webp") {
                    target.src = "/media/hero_background.webp";
                  }
                }}
              />
            </picture>

            {/* Soft left-only scrim for text readability; rest of image is 100% natural, bright & clear */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#020611]/85 via-[#020611]/45 to-transparent max-w-[850px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020611]/60 via-transparent to-[#020611]/30 pointer-events-none" />
          </motion.div>
        </AnimatePresence>

        {/* Ambient Aurora Glow */}
        <div className="absolute -top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-[#2563EB]/[0.10] blur-[120px] pointer-events-none" />
      </div>

      {/* ── Content Grid ────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-[1360px] mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 items-center">

          {/* LEFT: Dynamic Slide Content in Sleek Glass Card */}
          <div className="flex flex-col items-start text-left p-6 sm:p-7 lg:p-8 rounded-[24px] bg-slate-950/75 backdrop-blur-xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-[620px]">

            {/* Slide Badge */}
            <motion.div
              key={`badge-${currentBanner.id}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2563EB]/25 border border-[#3B82F6]/50 backdrop-blur-md mb-3.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#93C5FD]" />
              <span className="text-[11px] font-[800] uppercase tracking-wider text-[#93C5FD]">
                {currentBanner.badge_text || "Engineering Entrance & License"}
              </span>
            </motion.div>

            {/* Dynamic Headline */}
            <motion.h1
              key={`title-${currentBanner.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-[30px] xs:text-[36px] sm:text-[42px] md:text-[48px] lg:text-[52px] font-[900] tracking-[-0.03em] leading-[1.08] mb-3 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
            >
              {currentBanner.title ? (
                <span>{currentBanner.title}</span>
              ) : (
                <>
                  Engineering Excellence,{" "}
                  <span className="text-[#60A5FA]">Mastered.</span>
                </>
              )}
            </motion.h1>

            {/* Concise Supporting Copy */}
            {currentBanner.subtitle && (
              <motion.p
                key={`sub-${currentBanner.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-[14.5px] sm:text-[16px] text-slate-200 leading-[1.5] max-w-[500px] mb-5 font-[500]"
              >
                {currentBanner.subtitle}
              </motion.p>
            )}

            {/* Professional CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-4">
              <Link href={currentBanner.cta_url || "/register"} className="w-full sm:w-auto">
                <Button className="h-[46px] sm:h-[48px] px-7 rounded-[12px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-[800] text-[14.5px] shadow-[0_10px_25px_-5px_rgba(37,99,235,0.6)] border border-blue-400/30 w-full sm:w-auto flex items-center justify-center gap-2 group transition-all">
                  {currentBanner.cta_text || "Start Preparing Now"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              {currentBanner.cta_secondary_text && (
                <Link href={currentBanner.cta_secondary_url || "/courses"} className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="h-[46px] sm:h-[48px] px-6 rounded-[12px] border border-white/40 text-white hover:text-white hover:bg-white/20 hover:border-white/60 bg-white/10 backdrop-blur-md font-[700] text-[14.5px] w-full sm:w-auto flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Play className="w-4 h-4 fill-white text-white" />
                    {currentBanner.cta_secondary_text}
                  </Button>
                </Link>
              )}
            </div>

            {/* Exam Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="text-[11px] font-[800] uppercase tracking-wider text-slate-300 mr-1">
                Curriculum:
              </span>
              {EXAM_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="text-[11.5px] font-[700] text-white bg-slate-900/80 border border-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm"
                >
                  {chip}
                </span>
              ))}
            </div>

            {/* Trust Indicators */}
            <TrustIndicators />
          </div>

          {/* RIGHT: High-visibility unobstructed photo area with floating accent badge */}
          <div className="hidden lg:flex flex-col items-end justify-between self-stretch py-4">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-[16px] bg-slate-950/70 backdrop-blur-xl border border-white/20 shadow-xl text-white">
              <div className="w-8 h-8 rounded-full bg-[#2563EB]/25 flex items-center justify-center">
                <Award className="w-4 h-4 text-[#60A5FA]" />
              </div>
              <div>
                <div className="text-[10px] font-[800] uppercase tracking-wider text-slate-300">Aspirants Leaderboard</div>
                <div className="text-[14px] font-[900] text-white">Rank #27 <span className="text-[11px] font-[700] text-[#60A5FA] ml-1">Top 3%</span></div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-950/70 backdrop-blur-xl border border-white/20 text-white shadow-xl mt-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11.5px] font-[700] text-emerald-300">Live Mock Exam Ready</span>
              <span className="text-white/40">•</span>
              <span className="text-[11px] font-[600] text-slate-300">Verified 2081/82</span>
            </div>
          </div>

        </div>

        {/* ── Carousel Navigation Controls & Pagination Indicators ─────────── */}
        {totalSlides > 1 && (
          <div className="flex items-center justify-between pt-6 mt-4 border-t border-white/15">
            {/* Pagination Indicators / Slide Dots */}
            <div className="flex items-center gap-2">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all duration-300 rounded-full ${
                    idx === currentIndex
                      ? "w-8 h-2.5 bg-[#2563EB]"
                      : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
              <span className="text-xs font-[700] text-white/80 ml-2">
                0{currentIndex + 1} / 0{totalSlides}
              </span>
            </div>

            {/* Prev / Next Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                className="w-9 h-9 rounded-full border-white/30 bg-slate-900/60 text-white hover:bg-[#2563EB] hover:border-[#2563EB] hover:text-white transition-all shadow-md backdrop-blur-md"
                aria-label="Previous banner"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="w-9 h-9 rounded-full border-white/30 bg-slate-900/60 text-white hover:bg-[#2563EB] hover:border-[#2563EB] hover:text-white transition-all shadow-md backdrop-blur-md"
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
