"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trophy, Flame, ArrowRight, TrendingUp, Award } from "lucide-react";

// ── Leaderboard ──────────────────────────────────────────────────────────────
const PODIUM = [
  { rank: 2, name: "Bikash T.", score: "97.9%", initial: "B", color: "from-blue-400 to-cyan-500", height: "h-16 sm:h-20" },
  { rank: 1, name: "Sujata R.", score: "98.7%", initial: "S", color: "from-[#D4A72C] to-[#E6BA3D]", height: "h-24 sm:h-28" },
  { rank: 3, name: "Manisha K.", score: "96.4%", initial: "M", color: "from-violet-400 to-purple-500", height: "h-12 sm:h-14" },
];

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function LeaderboardCard() {
  return (
    <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[24px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.6)] h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[11px] font-[800] uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">This Week</div>
          <div className="text-[16px] font-[800] text-slate-800 dark:text-white">Top Performers</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#D4A72C]/10 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-[#D4A72C]" />
        </div>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 sm:gap-6 mb-8 flex-1">
        {PODIUM.map((p) => (
          <div key={p.rank} className="flex flex-col items-center gap-2 w-[92px]">
            <span className="text-[22px] leading-none">{MEDAL[p.rank]}</span>
            <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-white font-[800] text-[15px] shadow-[0_6px_16px_rgba(0,0,0,0.15)]`}>
              {p.initial}
            </div>
            <div className="text-center">
              <div className="text-[12px] font-[700] text-slate-800 dark:text-white truncate max-w-[88px]">{p.name}</div>
              <div className="text-[11px] font-[700] text-[#D4A72C]">{p.score}</div>
            </div>
            <div className={`w-full ${p.height} rounded-t-[10px] bg-gradient-to-t from-slate-100 to-slate-50 dark:from-white/[0.06] dark:to-white/[0.02] border border-b-0 border-slate-200 dark:border-white/[0.08] flex items-start justify-center pt-2`}>
              <span className="text-[13px] font-[900] text-slate-400 dark:text-slate-500">#{p.rank}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Your position */}
      <div className="flex items-center gap-3.5 p-4 rounded-[14px] bg-[#D4A72C]/8 dark:bg-[#D4A72C]/[0.08] border border-[#D4A72C]/25 dark:border-[#D4A72C]/20">
        <div className="w-9 h-9 rounded-full bg-white dark:bg-[#0B1521] flex items-center justify-center shrink-0 border border-[#D4A72C]/30">
          <Award className="w-4 h-4 text-[#D4A72C]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-[800] uppercase tracking-widest text-slate-500 dark:text-slate-400">Your Rank</div>
          <div className="text-[15px] font-[900] text-slate-800 dark:text-white">#27 <span className="text-[11px] font-[700] text-[#D4A72C] ml-1">Top 3%</span></div>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-[700] text-emerald-500 shrink-0">
          <TrendingUp className="w-3.5 h-3.5" /> 6
        </div>
      </div>
    </div>
  );
}

// ── Streak ───────────────────────────────────────────────────────────────────
const WEEK = [
  { day: "MON", done: true },
  { day: "TUE", done: true },
  { day: "WED", done: true },
  { day: "THU", done: true },
  { day: "FRI", done: true },
  { day: "SAT", done: true },
  { day: "SUN", done: false, today: true },
];

function StreakCard() {
  return (
    <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[24px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.6)] h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[11px] font-[800] uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Consistency</div>
          <div className="text-[16px] font-[800] text-slate-800 dark:text-white">Your Study Streak</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center">
          <Flame className="w-4 h-4 text-orange-500" />
        </div>
      </div>

      {/* Big counter */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shrink-0 shadow-[0_8px_24px_rgba(249,115,22,0.35)]">
          <span className="absolute inset-0 rounded-full bg-orange-400 animate-pulse-glow opacity-40" />
          <span className="text-[26px] relative">🔥</span>
        </div>
        <div>
          <div className="text-[32px] font-[900] text-slate-800 dark:text-white leading-none mb-1">7 <span className="text-[15px] font-[700] text-slate-400">day streak</span></div>
          <div className="text-[12.5px] font-[700] text-orange-500">Keep going — don&apos;t break the chain!</div>
        </div>
      </div>

      {/* Week strip */}
      <div className="flex items-center justify-between gap-1.5 mb-8">
        {WEEK.map((d) => (
          <div key={d.day} className="flex flex-col items-center gap-1.5 flex-1">
            <span className="text-[9px] font-[700] text-slate-400 dark:text-slate-500 tracking-wide">{d.day[0]}</span>
            <div
              className={`w-full aspect-square max-w-[34px] rounded-[10px] flex items-center justify-center text-[13px] border ${
                d.today
                  ? "bg-gradient-to-br from-orange-400 to-red-500 border-transparent text-white"
                  : d.done
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  : "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-slate-300 dark:text-slate-600"
              }`}
            >
              {d.today ? "🔥" : d.done ? "✓" : ""}
            </div>
          </div>
        ))}
      </div>

      {/* Supporting stats */}
      <div className="grid grid-cols-2 gap-3 mt-auto pt-5 border-t border-slate-100 dark:border-white/[0.05]">
        <div>
          <div className="text-[10px] font-[700] text-slate-400 uppercase tracking-widest mb-1">Longest Streak</div>
          <div className="text-[16px] font-[900] text-slate-800 dark:text-white">21 days</div>
        </div>
        <div>
          <div className="text-[10px] font-[700] text-slate-400 uppercase tracking-widest mb-1">This Month</div>
          <div className="text-[16px] font-[900] text-emerald-500">89% consistent</div>
        </div>
      </div>
    </div>
  );
}

export function LeaderboardStreakSection() {
  return (
    <section className="py-24 bg-white dark:bg-[#020611] relative overflow-hidden">
      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[550px] h-[550px] bg-orange-500/[0.03] dark:bg-orange-500/[0.05] rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-[#0B1F3A]/50 border border-slate-200 dark:border-[#163E6B]/50 mb-5">
            <Trophy className="w-3.5 h-3.5 text-[#D4A72C]" />
            <span className="text-[10.5px] font-[800] uppercase tracking-widest text-slate-500 dark:text-[#4B8BE0]">Community &amp; Motivation</span>
          </div>
          <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-4 leading-[1.1]">
            See your rank. <span className="text-gradient-gold">Keep your streak.</span>
          </h2>
          <p className="text-[17px] text-slate-500 dark:text-slate-400 max-w-[540px] mx-auto font-[500]">
            Real competition against thousands of aspirants, and the daily habit that gets you to exam day ready.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <LeaderboardCard />
          <StreakCard />
        </div>

        <div className="flex justify-center">
          <Link href="/register">
            <Button className="bg-gradient-to-r from-[#C29322] to-[#E6BA3D] hover:opacity-90 text-[#020611] h-[50px] px-8 rounded-[12px] font-[700] text-[15px] shadow-[0_8px_30px_rgba(212,167,44,0.3)] flex items-center gap-2 group border-none">
              Join the Leaderboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

      </div>
    </section>
  );
}
