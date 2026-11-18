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

const SUBJECT_MASTERY = [
  { label: "Structural Analysis", value: 92, color: "bg-[#2563EB]" },
  { label: "Fluid Mechanics", value: 88, color: "bg-blue-500" },
  { label: "Engineering Mathematics", value: 85, color: "bg-cyan-500" },
];

const EXAM_CHIPS = ["PSC Civil & Electrical", "NEC License", "IOE Entrance"];

// ── Circular score gauge ───────────────────────────────────────────────────────
function ScoreGauge({ value, reducedMotion }: { value: number; reducedMotion: boolean }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative w-[124px] h-[124px] shrink-0">
      <svg viewBox="0 0 124 124" className="w-full h-full -rotate-90">
        <circle
          cx="62"
          cy="62"
          r={radius}
          fill="none"
          strokeWidth="11"
          className="stroke-slate-100 dark:stroke-white/[0.08]"
        />
        <motion.circle
          cx="62"
          cy="62"
          r={radius}
          fill="none"
          stroke="url(#heroGaugeGradient)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reducedMotion ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={reducedMotion ? { duration: 0 } : { duration: 1.2, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
        <defs>
          <linearGradient id="heroGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#F0C95A" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-[900] text-slate-900 dark:text-white leading-none tracking-tight">
          {value}
          <span className="text-[13px] text-slate-500 dark:text-slate-400 font-[700]">%</span>
        </span>
        <span className="text-[9px] font-[800] text-[#2563EB] dark:text-[#F0C95A] uppercase tracking-widest mt-1.5">
          Excellent
        </span>
      </div>
    </div>
  );
}

// ── Accent badges ─────────────────────────────────────────────────────────────
function RankCard({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 0.55, delay: 0.35, ease: [0.16, 1, 0.3, 1] }
      }
      whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.2 } }}
      className="absolute z-30 -top-4 -right-4 sm:-right-5"
    >
      <div className="rounded-[16px] p-3 flex flex-col items-center bg-white/95 dark:bg-[#0E1A2E]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_16px_36px_-12px_rgba(11,37,69,0.28)] dark:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.7)]">
        <div className="w-8 h-8 rounded-full bg-[#2563EB]/12 dark:bg-[#2563EB]/15 flex items-center justify-center mb-1.5">
          <Award className="w-4 h-4 text-[#2563EB] dark:text-[#F0C95A]" />
        </div>
        <div className="text-[8px] font-[800] text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-0.5">
          Current Rank
        </div>
        <div className="text-[20px] font-[900] text-slate-900 dark:text-white leading-none mb-0.5">#27</div>
        <div className="text-[9.5px] font-[700] text-[#2563EB] dark:text-[#F0C95A]">Top 3%</div>
      </div>
    </motion.div>
  );
}

function StreakCard({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 0.55, delay: 0.45, ease: [0.16, 1, 0.3, 1] }
      }
      whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.2 } }}
      className="absolute z-30 -top-4 -left-4 sm:-left-5"
    >
      <div className="rounded-[16px] p-2.5 px-3 flex items-center gap-2.5 bg-white/95 dark:bg-[#0E1A2E]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_16px_36px_-12px_rgba(11,37,69,0.28)] dark:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.7)]">
        <div className="w-8 h-8 rounded-[10px] bg-orange-500/12 flex items-center justify-center text-lg">
          <span className="inline-block">🔥</span>
        </div>
        <div>
          <div className="text-[12px] font-[900] text-slate-900 dark:text-white leading-tight">7 Day Streak</div>
          <div className="text-[10px] font-[700] text-orange-500">Keep going!</div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Hero showcase: product-dashboard mockup ──────────────────────────────────
function HeroShowcase() {
  const reducedMotion = useSafeReducedMotion();

  return (
    <div className="relative w-full flex items-center justify-center lg:justify-end">
      {/* Glow bed behind the card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-[460px] h-[460px] rounded-full bg-[#2563EB]/[0.12] dark:bg-[#2563EB]/[0.18] blur-[120px]" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-500/[0.10] dark:bg-blue-500/[0.16] blur-[120px] translate-x-12 translate-y-8" />
      </div>

      <div className="relative z-20 w-full max-w-[480px]">
        <RankCard reducedMotion={reducedMotion} />
        <StreakCard reducedMotion={reducedMotion} />

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          whileHover={reducedMotion ? undefined : { y: -4, transition: { duration: 0.3 } }}
          className="rounded-[22px] overflow-hidden bg-white/95 dark:bg-[#0B1524]/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/[0.10] shadow-[0_32px_80px_-20px_rgba(11,37,69,0.35)] dark:shadow-[0_32px_90px_-20px_rgba(0,0,0,0.85)]"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 h-10 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.03]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
            <span className="mx-auto text-[11px] font-[600] text-slate-500 dark:text-slate-400 tracking-wide">
              app.nesmastery.com/dashboard
            </span>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-[10.5px] font-[800] uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Engineering Mastery Score
              </span>
              <span className="flex items-center gap-1 text-[10.5px] font-[700] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/12 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" /> +14.8%
              </span>
            </div>

            <div className="flex items-center gap-4">
              <ScoreGauge value={87} reducedMotion={reducedMotion} />
              <div className="flex-1 space-y-2">
                {SUBJECT_MASTERY.map((s, i) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10.5px] font-[600] text-slate-600 dark:text-slate-300 truncate pr-2">
                        {s.label}
                      </span>
                      <span className="text-[10.5px] font-[700] text-slate-900 dark:text-white shrink-0">
                        {s.value}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${s.color}`}
                        initial={reducedMotion ? false : { width: 0 }}
                        animate={{ width: `${s.value}%` }}
                        transition={
                          reducedMotion
                            ? { duration: 0 }
                            : { duration: 0.9, delay: 0.7 + i * 0.1, ease: [0.16, 1, 0.3, 1] }
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 mt-4 pt-3.5 border-t border-slate-100 dark:border-white/[0.06] text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-300 font-[600]">Live Mock Exam Ready</span>
              </div>
              <span className="text-[11px] font-[700] text-[#2563EB] dark:text-[#60A5FA]">
                Verified 2081/82
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

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
      className="relative flex items-center pt-20 pb-12 sm:pt-24 sm:pb-16 lg:pt-28 lg:pb-16 overflow-hidden bg-slate-950 text-white min-h-[640px] lg:min-h-[700px]"
    >
      {/* ── Dynamic Banner Carousel Background ──────────────────────────────── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBanner.id || currentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
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
                className="w-full h-full object-cover object-center filter brightness-[0.92] contrast-[1.08]"
                loading="eager"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== "/media/hero_background.webp") {
                    target.src = "/media/hero_background.webp";
                  }
                }}
              />
            </picture>

            {/* High-visibility architectural scrim: dark on left for text legibility, clear on center/right for image visibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#020611]/90 via-[#020611]/55 to-[#020611]/15" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#020611]/60 via-transparent to-[#020611]/75" />
          </motion.div>
        </AnimatePresence>

        {/* Ambient Aurora Glows */}
        <div className="absolute -top-[10%] left-[5%] w-[600px] h-[600px] rounded-full bg-[#2563EB]/[0.15] blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full bg-blue-600/[0.12] blur-[140px] pointer-events-none" />

        {/* Subtle Architectural Perspective Grid */}
        <div className="absolute inset-0 bg-neural-grid opacity-20 pointer-events-none" />

        {/* Bottom soft transition into next section (clean, no heavy fog) */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#020611]/90 to-transparent pointer-events-none" />
      </div>

      {/* ── Content Grid ────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-[1360px] mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-center">

          {/* LEFT: Dynamic Slide Content */}
          <div className="flex flex-col items-start text-left">

            {/* Slide Badge */}
            <motion.div
              key={`badge-${currentBanner.id}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2563EB]/25 border border-[#3B82F6]/50 backdrop-blur-md mb-4 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#93C5FD]" />
              <span className="text-[11.5px] font-[800] uppercase tracking-wider text-[#93C5FD]">
                {currentBanner.badge_text || "Engineering Entrance & License"}
              </span>
            </motion.div>

            {/* Dynamic Headline */}
            <motion.h1
              key={`title-${currentBanner.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-[34px] xs:text-[40px] sm:text-[48px] md:text-[54px] lg:text-[60px] font-[900] tracking-[-0.035em] leading-[1.06] mb-4 text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]"
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

            {/* Concise Supporting Copy (Clean, focused, no lengthy fluff) */}
            {currentBanner.subtitle && (
              <motion.p
                key={`sub-${currentBanner.id}`}
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
                    className="h-[48px] sm:h-[50px] px-7 rounded-[12px] border border-white/40 text-white hover:text-white hover:bg-white/20 hover:border-white/60 bg-white/10 backdrop-blur-md font-[700] text-[15px] w-full sm:w-auto flex items-center justify-center gap-2 transition-all shadow-sm"
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
                  className="text-[12px] font-[700] text-white bg-slate-900/75 border border-white/25 px-3 py-1 rounded-full backdrop-blur-md shadow-sm"
                >
                  {chip}
                </span>
              ))}
            </div>

            {/* Trust Indicators */}
            <TrustIndicators />
          </div>

          {/* RIGHT: High-fidelity Product Showcase Mockup */}
          <div className="hidden lg:block">
            <HeroShowcase />
          </div>

        </div>

        {/* ── Carousel Navigation Controls & Pagination Indicators ─────────── */}
        {totalSlides > 1 && (
          <div className="flex items-center justify-between pt-8 sm:pt-10 mt-4 border-t border-white/10">
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
