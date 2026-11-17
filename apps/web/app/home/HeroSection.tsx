"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, TrendingUp, Award, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { useMagneticHover, useSafeReducedMotion } from "./useHeroDepth";

// ── Subject mastery rows inside the dashboard mockup ───────────────────────────
const SUBJECT_MASTERY = [
  { label: "Structural Analysis", value: 92, color: "bg-[#2563EB]" },
  { label: "Fluid Mechanics", value: 88, color: "bg-blue-500" },
  { label: "Engineering Mathematics", value: 85, color: "bg-cyan-500" },
];

const EXAM_CHIPS = ["PSC", "License", "Entrance"];

const ACCENT_WORDS = ["NEC License.", "IOE Entrance.", "Top Ranks.", "Engineers."];

// ── Circular score gauge (pure SVG, no chart library) ──────────────────────────
function ScoreGauge({ value, reducedMotion }: { value: number; reducedMotion: boolean }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative w-[124px] h-[124px] shrink-0">
      <svg viewBox="0 0 124 124" className="w-full h-full -rotate-90">
        <circle
          cx="62" cy="62" r={radius} fill="none" strokeWidth="11"
          className="stroke-slate-100 dark:stroke-white/[0.08]"
        />
        <motion.circle
          cx="62" cy="62" r={radius} fill="none" stroke="url(#heroGaugeGradient)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reducedMotion ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={reducedMotion ? { duration: 0 } : { duration: 1.2, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
        <defs>
          <linearGradient id="heroGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#F0C95A" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-[900] text-slate-900 dark:text-white leading-none tracking-tight">
          {value}<span className="text-[13px] text-slate-500 dark:text-slate-400 font-[700]">%</span>
        </span>
        <span className="text-[9px] font-[800] text-[#1D4ED8] dark:text-[#F0C95A] uppercase tracking-widest mt-1.5">Excellent</span>
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
          <Award className="w-4 h-4 text-[#1D4ED8] dark:text-[#F0C95A]" />
        </div>
        <div className="text-[8px] font-[800] text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-0.5">Current Rank</div>
        <div className="text-[20px] font-[900] text-slate-900 dark:text-white leading-none mb-0.5">#27</div>
        <div className="text-[9.5px] font-[700] text-[#1D4ED8] dark:text-[#F0C95A]">Top 3%</div>
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
      className="absolute z-30 -bottom-4 -left-4 sm:-left-5"
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

// ── Hero showcase: a product-dashboard mockup that adapts to the theme ─────────
function HeroShowcase() {
  const reducedMotion = useSafeReducedMotion();
  const bars = [30, 40, 35, 50, 45, 70, 94];

  return (
    <div className="relative w-full flex items-center justify-center lg:justify-end">

      {/* Glow bed behind the card — gives it the sense of being lit from behind */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[#2563EB]/[0.10] dark:bg-[#2563EB]/[0.16] blur-[130px]" />
        <div className="absolute w-[440px] h-[440px] rounded-full bg-blue-500/[0.08] dark:bg-blue-500/[0.14] blur-[130px] translate-x-12 translate-y-8" />
      </div>

      {/* Product dashboard mockup container with accent badges */}
      <div className="relative z-20 w-full max-w-[490px]">
        <RankCard reducedMotion={reducedMotion} />
        <StreakCard reducedMotion={reducedMotion} />

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          whileHover={reducedMotion ? undefined : { y: -4, transition: { duration: 0.3 } }}
          className="rounded-[22px] overflow-hidden bg-white dark:bg-[#0B1524] border border-slate-200/80 dark:border-white/[0.09] shadow-[0_32px_80px_-20px_rgba(11,37,69,0.32)] dark:shadow-[0_32px_90px_-20px_rgba(0,0,0,0.85)]"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 h-10 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80 dark:bg-red-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 dark:bg-amber-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 dark:bg-emerald-400/60" />
            <span className="mx-auto text-[11px] font-[600] text-slate-600 dark:text-slate-400 tracking-wide">
              app.nesmastery.com/dashboard
            </span>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-[10.5px] font-[800] uppercase tracking-wider text-slate-700 dark:text-slate-300">
                AI Preparation Score
              </span>
              <span className="flex items-center gap-1 text-[11px] font-[700] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/12 px-2.5 py-0.5 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" /> +14.8%
              </span>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <ScoreGauge value={87} reducedMotion={reducedMotion} />
              <div className="flex-1 space-y-2.5">
                {SUBJECT_MASTERY.map((s, i) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11.5px] font-[600] text-slate-600 dark:text-slate-300 truncate pr-1">{s.label}</span>
                      <span className="text-[11.5px] font-[700] text-slate-900 dark:text-white shrink-0">{s.value}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${s.color}`}
                        initial={reducedMotion ? false : { width: 0 }}
                        animate={{ width: `${s.value}%` }}
                        transition={reducedMotion ? { duration: 0 } : { duration: 0.9, delay: 0.8 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] font-[800] uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Accuracy This Week
                </span>
                <span className="text-[15px] font-[900] text-slate-900 dark:text-white">94%</span>
              </div>
              <div className="h-10 w-full flex items-end gap-2">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 relative h-full">
                    <div className="absolute inset-0 bg-emerald-500/12 dark:bg-emerald-500/10 rounded-[3px]" />
                    <motion.div
                      className="absolute bottom-0 w-full bg-emerald-500 rounded-[3px]"
                      initial={reducedMotion ? false : { height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={
                        reducedMotion
                          ? { duration: 0 }
                          : { duration: 0.5, delay: 0.9 + i * 0.05, ease: "easeOut" }
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}

// ── Compact showcase card for mobile — same data, no mouse-parallax layers ────
function MobileHeroShowcase({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="lg:hidden relative w-full mt-5 mb-2"
    >
      {/* Glow bed */}
      <div className="absolute -inset-6 -z-10 pointer-events-none">
        <div className="absolute left-0 top-0 w-[220px] h-[220px] rounded-full bg-[#2563EB]/[0.16] blur-[80px]" />
        <div className="absolute right-0 bottom-0 w-[200px] h-[200px] rounded-full bg-blue-500/[0.12] blur-[80px]" />
      </div>

      <div className="rounded-[20px] overflow-hidden bg-white dark:bg-[#0B1524] border border-slate-200/80 dark:border-white/[0.09] shadow-[0_30px_70px_-24px_rgba(11,37,69,0.32)] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-1.5 px-4 h-9 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03]">
          <span className="w-2 h-2 rounded-full bg-red-300 dark:bg-red-400/60" />
          <span className="w-2 h-2 rounded-full bg-amber-300 dark:bg-amber-400/60" />
          <span className="w-2 h-2 rounded-full bg-emerald-300 dark:bg-emerald-400/60" />
          <span className="mx-auto text-[10px] font-[600] text-slate-600 dark:text-slate-400">
            app.nesmastery.com
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[9.5px] font-[800] uppercase tracking-widest text-slate-700 dark:text-slate-300">
              AI Preparation Score
            </span>
            <span className="flex items-center gap-1 text-[10px] font-[700] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/12 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" /> +14.8%
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ScoreGauge value={87} reducedMotion={reducedMotion} />
            <div className="flex-1 space-y-2">
              {SUBJECT_MASTERY.map((s, i) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10.5px] font-[600] text-slate-600 dark:text-slate-300 truncate pr-2">{s.label}</span>
                    <span className="text-[10.5px] font-[700] text-slate-900 dark:text-white shrink-0">{s.value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${s.color}`}
                      initial={reducedMotion ? false : { width: 0 }}
                      animate={{ width: `${s.value}%` }}
                      transition={reducedMotion ? { duration: 0 } : { duration: 0.9, delay: 0.7 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3.5 border-t border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#2563EB]/12 flex items-center justify-center">
                <Award className="w-4 h-4 text-[#1D4ED8] dark:text-[#F0C95A]" />
              </div>
              <div>
                <div className="text-[13px] font-[900] text-slate-900 dark:text-white leading-none">#27</div>
                <div className="text-[9px] font-[700] text-[#1D4ED8] dark:text-[#F0C95A] mt-0.5">Top 3%</div>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-100 dark:bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-orange-500/12 flex items-center justify-center text-base">
                🔥
              </div>
              <div>
                <div className="text-[12px] font-[900] text-slate-900 dark:text-white leading-none">7 Days</div>
                <div className="text-[9px] font-[700] text-orange-500 mt-0.5">Streak</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
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
    <>
      {/* Compact stat strip — mobile only. A single card, three equal columns,
          so it never wraps awkwardly the way the desktop row does on narrow
          screens. */}
      <div className="sm:hidden grid grid-cols-3 divide-x divide-slate-200/70 dark:divide-white/10 rounded-[16px] border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-md w-full mt-4">
        <div className="flex flex-col items-center justify-center py-2.5 px-1.5">
          <span className="text-[14px] font-[900] text-slate-900 dark:text-white leading-none">50K+</span>
          <span className="text-[9px] font-[600] text-slate-500 dark:text-slate-400 mt-1 text-center leading-tight">aspirants</span>
        </div>
        <div className="flex flex-col items-center justify-center py-2.5 px-1.5">
          <span className="flex items-center gap-0.5 text-[12.5px] font-[900] text-slate-900 dark:text-white leading-none">
            <span className="text-[#2563EB]">★</span> 4.9
          </span>
          <span className="text-[9px] font-[600] text-slate-500 dark:text-slate-400 mt-1 text-center leading-tight">rating</span>
        </div>
        <div className="flex flex-col items-center justify-center py-2.5 px-1.5">
          <span className="text-[14px] font-[900] text-slate-900 dark:text-white leading-none">12K+</span>
          <span className="text-[9px] font-[600] text-slate-500 dark:text-slate-400 mt-1 text-center leading-tight">questions</span>
        </div>
      </div>

      {/* Full row — sm and up. */}
      <div className="hidden sm:flex flex-wrap items-center gap-x-7 gap-y-4 pt-4 sm:pt-5">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2.5">
            {AVATAR_GRADIENTS.map((g, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${g} ring-2 ring-white dark:ring-[#070E1B] shadow-sm`}
              />
            ))}
          </div>
          <div>
            <div className="text-[14px] font-[800] text-slate-900 dark:text-white leading-tight">100+</div>
            <div className="text-[11.5px] font-[600] text-slate-500 dark:text-slate-400 leading-tight">active aspirants</div>
          </div>
        </div>

        <div className="block w-px h-9 bg-slate-200 dark:bg-white/10" />

        <div>
          <div className="flex items-center gap-1">
            {"★★★★★".split("").map((s, i) => (
              <span key={i} className="text-[#2563EB] text-[13px] leading-none">{s}</span>
            ))}
            <span className="text-[14px] font-[800] text-slate-900 dark:text-white ml-1.5 leading-none">4.9</span>
          </div>
          <div className="text-[11.5px] font-[600] text-slate-500 dark:text-slate-400 mt-1">average rating</div>
        </div>

        <div className="hidden md:block w-px h-9 bg-slate-200 dark:bg-white/10" />

        <div>
          <div className="text-[14px] font-[800] text-slate-900 dark:text-white leading-tight">200+</div>
          <div className="text-[11.5px] font-[600] text-slate-500 dark:text-slate-400 leading-tight">practice questions</div>
        </div>
      </div>
    </>
  );
}

// ── Headline: staggered line reveal ────────────────────────────────────────────
const headlineContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
};
const headlineLine = {
  hidden: { opacity: 1, y: 0 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function Headline({ reducedMotion }: { reducedMotion: boolean }) {
  const [wordIndex, setWordIndex] = React.useState(0);
  const [cycling, setCycling] = React.useState(false);

  React.useEffect(() => {
    if (reducedMotion) return;
    const t = setTimeout(() => setCycling(true), 2400);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  React.useEffect(() => {
    if (!cycling) return;
    const id = setInterval(() => {
      setWordIndex((i) => (i + 1) % ACCENT_WORDS.length);
    }, 2800);
    return () => clearInterval(id);
  }, [cycling]);

  return (
    <motion.h1
      className="text-[38px] xs:text-[44px] sm:text-[54px] md:text-[64px] lg:text-[74px] font-[900] tracking-[-0.035em] leading-[1.0] mb-4 sm:mb-5 text-slate-900 dark:text-white"
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
      variants={reducedMotion ? undefined : headlineContainer}
    >
      <motion.span variants={reducedMotion ? undefined : headlineLine} className="block">
        Engineering Excellence,
      </motion.span>
      <motion.span variants={reducedMotion ? undefined : headlineLine} className="block text-slate-600 dark:text-slate-400">
        mastered for
      </motion.span>
      <motion.span variants={reducedMotion ? undefined : headlineLine} className="relative block w-fit">
        <span className="relative inline-block overflow-hidden align-bottom" style={{ height: "1.15em" }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={ACCENT_WORDS[wordIndex]}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-110%", opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="block text-gradient-gold-shimmer"
            >
              {ACCENT_WORDS[wordIndex]}
            </motion.span>
          </AnimatePresence>
        </span>
        <motion.span
          initial={reducedMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="absolute -bottom-2 left-0 right-0 h-[3.5px] rounded-full bg-gradient-to-r from-[#1D4ED8] via-[#60A5FA] to-transparent opacity-60 origin-left"
        />
      </motion.span>
    </motion.h1>
  );
}

// ── Magnetic primary CTA ───────────────────────────────────────────────────────
function MagneticCTA() {
  const { ref, x, y, handleMouseMove, handleMouseLeave } = useMagneticHover(8);
  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full sm:w-auto"
    >
      <Link href="/register">
        <Button className="btn-gold-gradient relative overflow-hidden text-[#0B1524] h-[50px] sm:h-[52px] px-7 rounded-[13px] font-[800] text-[15px] shadow-[0_16px_40px_-12px_rgba(37,99,235,0.6)] border-none w-full sm:w-auto flex items-center justify-center gap-2.5 group">
          <span className="absolute inset-0 bg-white/25 -translate-x-full group-hover:animate-[shimmer_1.5s_ease-in-out]" />
          Start Preparing Now
          <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </Link>
    </motion.div>
  );
}

// ── Main Hero Section ──────────────────────────────────────────────────────────
export function HeroSection() {
  const reducedMotion = useSafeReducedMotion();

  return (
    <section className="bg-grain relative flex items-center pt-20 pb-8 sm:pt-24 sm:pb-10 lg:pt-24 lg:pb-10 overflow-hidden bg-slate-50 dark:bg-[#070E1B]">

      {/* ── Background layers ──────────────────────────────────────────────── */}

      {/* Base wash — a soft vertical lift so the section never reads as one
          flat fill, in either theme. */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-slate-100/60 dark:from-[#0B1526] dark:via-[#070E1B] dark:to-[#050A14]" />

      {/* Aurora blooms — the main source of colour and depth. */}
      <div className="absolute -top-[10%] left-[8%] w-[820px] h-[820px] rounded-full bg-[#2563EB]/[0.10] dark:bg-[#2563EB]/[0.13] blur-[150px] pointer-events-none" />
      <div className="absolute top-[6%] right-[2%] w-[760px] h-[760px] rounded-full bg-blue-500/[0.10] dark:bg-blue-500/[0.16] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-18%] left-[26%] w-[680px] h-[680px] rounded-full bg-violet-500/[0.07] dark:bg-violet-600/[0.14] blur-[150px] pointer-events-none" />

      {/* Perspective grid, radially masked so it fades before the edges. */}
      <div className="absolute inset-0 hero-grid pointer-events-none" />

      {/* Bottom fade into the next section, so the hero dissolves rather than
          ending on a hard edge. */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 dark:from-[#020611] to-transparent pointer-events-none" />

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-[1360px] mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-center">

          {/* ── LEFT: Hero text ── */}
          <div className="flex flex-col items-start text-left">

            {/* Headline */}
            <Headline reducedMotion={reducedMotion} />

            {/* Supporting copy — rendered directly as static element to eliminate LCP element render delay */}
            <p className="text-[15.5px] sm:text-[17px] md:text-[18px] text-slate-600 dark:text-slate-400 leading-[1.6] max-w-[520px] mb-5 sm:mb-6 font-[450]">
              Nepal&apos;s authoritative preparation platform for IOE Entrance and NEC Engineering License examinations — diagnosing conceptual gaps, curating verified question banks, and guiding you to top scores.
            </p>

            {/* CTAs */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
            >
              <MagneticCTA />
              <Link href="/courses" className="w-full sm:w-auto">
                <Button
                  variant="ghost"
                  className="h-[50px] sm:h-[52px] px-6 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/[0.12] hover:-translate-y-0.5 hover:border-slate-400 dark:hover:border-white/35 bg-white/70 dark:bg-white/[0.06] backdrop-blur-md rounded-[13px] font-[700] text-[15px] w-full sm:w-auto flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all group"
                >
                  <Play className="w-4 h-4 fill-current text-slate-700 dark:text-white group-hover:text-slate-900 dark:group-hover:text-white group-hover:scale-110 transition-transform" />
                  Explore Platform
                </Button>
              </Link>
            </motion.div>

            {/* Exam chips */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.7 }}
              className="flex flex-wrap items-center gap-2 mt-4 sm:mt-5"
            >
              <span className="text-[11px] font-[700] uppercase tracking-widest text-slate-700 dark:text-slate-300 mr-1">
                Prepare for
              </span>
              {EXAM_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="text-[12px] font-[600] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm"
                >
                  {chip}
                </span>
              ))}
            </motion.div>

            {/* Mobile-only product showcase — desktop gets the full parallax
                version on the right; mobile gets this compact static card so
                the page doesn't lose the platform's visual centerpiece. */}
            <MobileHeroShowcase reducedMotion={reducedMotion} />

            {/* Trust indicators */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <TrustIndicators />
            </motion.div>
          </div>

          {/* ── RIGHT: Product showcase ── */}
          <div className="hidden lg:block">
            <HeroShowcase />
          </div>

        </div>
      </div>
    </section>
  );
}
