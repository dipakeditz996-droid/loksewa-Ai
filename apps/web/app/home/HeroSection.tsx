"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, TrendingUp, Award, Sparkles, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoksewaBadgeIcon } from "@/components/ui/loksewa-badge-icon";

// ── Orbital ring labels ────────────────────────────────────────────────────────
const ORBIT_LABELS = ["SYLLABUS", "PRACTICE", "EXAMS", "PERFORMANCE", "PROGRESS"];

// ── Floating AI cards ──────────────────────────────────────────────────────────
function AIRecommendationCard() {
  return (
    <div className="absolute z-30 top-[10%] left-0 lg:left-[-5%] xl:left-[-10%] animate-float-reverse">
      <div className="bg-white/95 dark:bg-[#0B1521]/95 backdrop-blur-2xl border border-slate-200 dark:border-blue-500/20 rounded-[18px] p-4 w-[260px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span className="text-[10px] font-[800] uppercase tracking-widest text-[#3B82F6]">AI RECOMMENDATION</span>
        </div>
        <p className="text-[13px] font-medium text-slate-700 dark:text-white mb-3 leading-[1.5]">
          Your Constitutional Law accuracy dropped <span className="text-red-500 font-bold">8%</span>.
        </p>
        <p className="text-[9.5px] font-[700] text-slate-400 uppercase tracking-widest mb-2">Recommended action</p>
        <Link href="/practice" className="flex items-center justify-between bg-slate-50 dark:bg-[#163E6B]/30 hover:bg-blue-50 dark:hover:bg-[#163E6B]/50 border border-slate-200 dark:border-[#163E6B]/50 rounded-[10px] p-2.5 group transition-colors">
          <span className="text-[12.5px] font-[700] text-slate-800 dark:text-white">20 Practice Questions</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-800 dark:text-white group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Personalized for you
        </div>
      </div>
    </div>
  );
}

function RankCard() {
  return (
    <div className="absolute z-30 top-[3%] right-[5%] animate-float">
      <div className="bg-white/95 dark:bg-[#0B1521]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/6 rounded-[16px] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:shadow-2xl flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-[#D4A72C]/10 flex items-center justify-center mb-2">
          <Award className="w-4.5 h-4.5 text-[#D4A72C]" />
        </div>
        <div className="text-[9px] font-[800] text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">CURRENT RANK</div>
        <div className="text-[26px] font-[900] text-slate-800 dark:text-white leading-none mb-1">#27</div>
        <div className="text-[11px] font-[700] text-[#D4A72C] mb-1.5">Top 3%</div>
        <div className="text-[10px] font-[700] text-emerald-500">↑ 6 positions</div>
      </div>
    </div>
  );
}

function PerformanceCard() {
  const bars = [30, 40, 35, 50, 45, 70, 94];
  return (
    <div className="absolute z-20 bottom-[12%] right-[2%] lg:right-[-2%] animate-float-slow">
      <div className="bg-white/95 dark:bg-[#0B1521]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/6 rounded-[18px] p-4 w-[200px] shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:shadow-2xl">
        <div className="text-[9px] font-[800] text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">PERFORMANCE</div>
        <div className="flex items-end gap-2 mb-2">
          <div className="text-[28px] font-[900] text-slate-800 dark:text-white leading-none">94%</div>
          <div className="text-[12px] font-[700] text-emerald-500 mb-1">↑ 12.4%</div>
        </div>
        <div className="text-[10px] text-slate-400 mb-2.5">Accuracy This Week</div>
        <div className="h-10 w-full flex items-end gap-1">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 relative" style={{ height: "100%" }}>
              <div className="absolute bottom-0 w-full bg-emerald-500/20 rounded-t-[2px] transition-all" style={{ height: "100%" }} />
              <div className="absolute bottom-0 w-full bg-emerald-500 rounded-t-[2px]" style={{ height: `${h}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StreakCard() {
  return (
    <div className="absolute z-20 bottom-[8%] left-[5%] lg:left-[2%] animate-float">
      <div className="bg-white/95 dark:bg-[#0B1521]/95 backdrop-blur-2xl border border-slate-200 dark:border-orange-500/20 rounded-[16px] p-3.5 flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:shadow-2xl">
        <div className="w-9 h-9 rounded-[10px] bg-orange-500/10 flex items-center justify-center text-xl">🔥</div>
        <div>
          <div className="text-[13px] font-[900] text-slate-800 dark:text-white">7 DAY STREAK</div>
          <div className="text-[11px] font-[700] text-orange-500">Keep going!</div>
        </div>
      </div>
    </div>
  );
}

// ── AI Preparation Core Visualization ─────────────────────────────────────────
function AIPreparationCore() {
  return (
    <div className="relative w-full h-[560px] flex items-center justify-center">

      {/* Floating AI Cards */}
      <AIRecommendationCard />
      <RankCard />
      <PerformanceCard />
      <StreakCard />

      {/* Outer orbital ring */}
      <div className="absolute w-[420px] h-[420px] rounded-full border border-slate-300/30 dark:border-[#163E6B]/30 animate-spin-slow">
        {ORBIT_LABELS.map((label, i) => {
          const angle = (i * 360) / ORBIT_LABELS.length - 90;
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * 210;
          const y = Math.sin(rad) * 210;
          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${-angle - 90}deg)`,
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#163E6B] dark:bg-[#2563EB]/60 shadow-[0_0_12px_rgba(37,99,235,0.8)]" />
              <div className="text-[8px] font-[900] text-slate-400 dark:text-[#4B8BE0] tracking-widest mt-1.5 whitespace-nowrap">
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle ring (reverse spin) */}
      <div className="absolute w-[340px] h-[340px] rounded-full border border-[#D4A72C]/15 dark:border-[#D4A72C]/20 animate-spin-slow-reverse">
        {/* Accent dot */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#D4A72C] shadow-[0_0_15px_rgba(212,167,44,0.8)]" />
      </div>

      {/* Center glow base */}
      <div className="absolute w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(37,99,235,0.18)_0%,transparent_70%)]" />

      {/* Core card */}
      <div className="relative z-20 w-[260px] h-[260px] rounded-full flex flex-col items-center justify-center bg-white/70 dark:bg-[#06101C]/80 backdrop-blur-3xl border border-white dark:border-[#163E6B]/40 shadow-[0_30px_80px_rgba(0,0,0,0.1)] dark:shadow-[0_0_80px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.05)]">
        {/* Spinning gold arc */}
        <div className="absolute inset-0 rounded-full border-t-[2.5px] border-[#D4A72C] animate-spin-medium opacity-80" />

        <div className="text-[9.5px] font-[800] text-slate-400 dark:text-[#4B8BE0] uppercase tracking-[0.2em] mb-1.5 text-center">AI PREPARATION SCORE</div>
        <div className="text-[68px] font-[900] text-slate-800 dark:text-white leading-none tracking-tighter">
          87<span className="text-[24px] text-slate-400 dark:text-slate-500 font-[700]">%</span>
        </div>
        <div className="text-[13px] font-[700] text-[#D4A72C] mb-3">Excellent</div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full">
          <TrendingUp className="w-3 h-3" />
          <span className="text-[11px] font-[700]">+14.8% this month</span>
        </div>
      </div>

    </div>
  );
}

// ── Trust indicators ───────────────────────────────────────────────────────────
function TrustIndicators() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-6">
      {/* Avatars */}
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {["bg-blue-400", "bg-violet-400", "bg-emerald-400", "bg-orange-400", "bg-[#D4A72C]"].map((c, i) => (
            <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-white dark:border-[#020611] flex items-center justify-center text-white text-[10px] font-bold`}>
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>
        <div>
          <div className="text-[13px] font-[700] text-slate-800 dark:text-white">50K+ Aspirants</div>
          <div className="flex items-center gap-1">
            {"★★★★★".split("").map((s, i) => (
              <span key={i} className="text-[#D4A72C] text-[11px]">{s}</span>
            ))}
            <span className="text-[11px] font-[600] text-slate-500 dark:text-slate-400 ml-1">4.9/5</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-white/10" />

      {/* Badges */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          "✓ Verified Content",
          "✓ AI-Powered",
          "✓ Progress Tracking",
        ].map((t) => (
          <span key={t} className="text-[12px] font-[600] text-slate-500 dark:text-[#4B8BE0]">{t}</span>
        ))}
      </div>
    </div>
  );
}

// ── Main Hero Section ──────────────────────────────────────────────────────────
export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden">

      {/* ── Background layers ── */}
      <div className="absolute inset-0 bg-slate-50 dark:bg-[#020611]" />

      {/* Background image */}
      <div className="absolute inset-0 opacity-40 dark:opacity-60 [mask-image:linear-gradient(to_bottom,black_30%,transparent_90%)] transition-opacity duration-500">
        <Image
          src="/media/hero_background.jpg"
          alt="LoksewaAI Hero"
          fill
          priority
          className="object-cover object-center"
        />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-50/95 via-slate-50/80 to-slate-50/20 dark:from-[#020611] dark:via-[#020611]/85 dark:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent dark:from-[#020611] dark:via-transparent" />

      {/* Neural grid */}
      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid" />

      {/* Atmospheric glows */}
      <div className="absolute top-[15%] right-[8%] w-[700px] h-[700px] bg-[#D4A72C]/6 dark:bg-[#D4A72C]/8 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[900px] h-[900px] bg-blue-500/4 dark:bg-[#163E6B]/12 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute top-[30%] right-[25%] w-[400px] h-[400px] bg-violet-500/3 dark:bg-violet-600/8 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Content ── */}
      <div className="relative z-10 max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">

          {/* ── LEFT: Hero text ── */}
          <div className="flex flex-col items-start text-left">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#0B1F3A]/50 border border-slate-200 dark:border-[#163E6B]/60 shadow-sm backdrop-blur-md mb-7">
              <LoksewaBadgeIcon className="w-3.5 h-3.5 text-[#D4A72C]" />
              <span className="text-[10.5px] font-[800] uppercase tracking-widest text-slate-500 dark:text-[#4B8BE0]">
                POWERED BY INTELLIGENT LEARNING
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[52px] sm:text-[64px] md:text-[76px] lg:text-[88px] font-[900] tracking-[-0.03em] leading-[1.04] mb-6 text-slate-900 dark:text-white">
              YOUR LOKSEWA{" "}
              <br className="hidden md:block" />
              <span className="text-gradient-blue-violet">PREPARATION,</span>{" "}
              <br className="hidden md:block" />
              <span className="relative inline-block">
                <span className="text-gradient-gold">UPGRADED.</span>
                {/* Gold underline glow */}
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-transparent via-[#E6BA3D] to-transparent opacity-80 blur-[2px]" />
                <span className="absolute -bottom-1 left-[5%] right-[5%] h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              </span>
            </h1>

            {/* Supporting copy */}
            <p className="text-[17px] md:text-[20px] text-slate-600 dark:text-slate-400 leading-[1.65] max-w-[560px] mb-10 font-[500]">
              Learn smarter. Practice with intelligence.{" "}
              <br className="hidden md:block" />
              Track your progress. Prepare with confidence.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full sm:w-auto">
              <Link href="/register">
                <Button className="relative overflow-hidden bg-gradient-to-r from-[#C29322] to-[#E6BA3D] hover:opacity-95 text-[#020611] h-[58px] px-9 rounded-[13px] font-[800] text-[17px] shadow-[0_12px_35px_-8px_rgba(212,167,44,0.45)] border-none w-full sm:w-auto flex items-center justify-center gap-2.5 group transition-all hover:shadow-[0_16px_45px_-8px_rgba(212,167,44,0.6)] hover:-translate-y-0.5">
                  <span className="absolute inset-0 bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_ease-in-out]" />
                  Start Preparing Now
                  <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/courses">
                <Button
                  variant="outline"
                  className="h-[58px] px-9 border-slate-300 dark:border-[#163E6B]/60 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-[#163E6B]/20 bg-white/70 dark:bg-[#0B1F3A]/30 backdrop-blur-md rounded-[13px] font-[700] text-[17px] w-full sm:w-auto flex items-center justify-center gap-2 transition-all"
                >
                  Explore Platform
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <TrustIndicators />
          </div>

          {/* ── RIGHT: AI Visualization ── */}
          <div className="hidden lg:block">
            <AIPreparationCore />
          </div>

        </div>
      </div>
    </section>
  );
}
