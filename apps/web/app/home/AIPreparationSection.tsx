"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, TrendingDown, Target, ArrowRight, Zap } from "lucide-react";

const WEAK_TOPICS = [
  { name: "Constitutional Law", accuracy: 62, questions: 20 },
  { name: "Current Affairs", accuracy: 68, questions: 15 },
  { name: "Public Administration", accuracy: 71, questions: 12 },
];

const STRONG_TOPICS = [
  { name: "Nepal History", accuracy: 91 },
  { name: "General Science", accuracy: 88 },
  { name: "Geography", accuracy: 85 },
];

export function AIPreparationSection() {
  return (
    <section className="py-24 bg-slate-50 dark:bg-[#04080F] relative overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-50" />
      <div className="absolute top-[20%] right-[-5%] w-[500px] h-[500px] bg-violet-500/[0.03] dark:bg-violet-600/[0.08] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[500px] bg-blue-500/[0.03] dark:bg-blue-500/[0.06] rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ── LEFT: Text ── */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-5">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-[10.5px] font-[800] uppercase tracking-widest text-violet-500 dark:text-violet-400">AI Intelligence Layer</span>
            </div>

            <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-5 leading-[1.15]">
              Your preparation{" "}
              <span className="text-gradient-blue-violet">should adapt to you.</span>
            </h2>

            <p className="text-[17px] text-slate-500 dark:text-slate-400 leading-[1.7] mb-8 max-w-[480px] font-[500]">
              LoksewaAI continuously analyzes your performance and builds a dynamic preparation roadmap — identifying weak areas, recommending targeted practice, and tracking your exam readiness in real time.
            </p>

            {/* AI insight bullets */}
            <div className="space-y-3 mb-10">
              {[
                { icon: Target, text: "Identifies weak topics from your practice patterns", color: "text-blue-500" },
                { icon: Zap, text: "Recommends targeted questions for maximum improvement", color: "text-violet-500" },
                { icon: TrendingUp, text: "Predicts exam readiness and expected improvement", color: "text-emerald-500" },
              ].map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-[8px] bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <p className="text-[14.5px] text-slate-600 dark:text-slate-300 leading-[1.6]">{text}</p>
                </div>
              ))}
            </div>

            <Link href="/register">
              <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 text-white h-[50px] px-8 rounded-[12px] font-[700] text-[15px] shadow-[0_8px_30px_rgba(124,58,237,0.3)] flex items-center gap-2 group border-none">
                Activate AI Preparation
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* ── RIGHT: AI Dashboard ── */}
          <div className="bg-white dark:bg-[#06101C] border border-slate-200 dark:border-white/[0.06] rounded-[24px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.6)]">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-[11px] font-[800] uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">AI DASHBOARD</div>
                <div className="text-[16px] font-[800] text-slate-800 dark:text-white">Preparation Analysis</div>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-[700]">Live</span>
              </div>
            </div>

            {/* Score ring */}
            <div className="flex items-center gap-6 mb-6 p-4 bg-slate-50 dark:bg-[#0A1520] rounded-[16px] border border-slate-100 dark:border-white/[0.04]">
              <div className="relative w-[80px] h-[80px] shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" className="text-slate-200 dark:text-white/5" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="url(#scoreGrad)" strokeWidth="6"
                    strokeDasharray={`${(87 / 100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[18px] font-[900] text-slate-800 dark:text-white leading-none">87%</div>
                  <div className="text-[9px] font-[700] text-blue-500">SCORE</div>
                </div>
              </div>
              <div>
                <div className="text-[13px] font-[800] text-slate-800 dark:text-white mb-1">Preparation Score</div>
                <div className="text-[12px] text-[#D4A72C] font-[700] mb-2">Excellent Progress</div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[12px] font-[700]">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +14.8% this month
                </div>
              </div>
            </div>

            {/* Weak topics */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[11px] font-[800] uppercase tracking-widest text-slate-400 dark:text-slate-500">Weak Areas — AI Action Required</span>
              </div>
              <div className="space-y-2.5">
                {WEAK_TOPICS.map((t) => (
                  <div key={t.name} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-500/[0.05] border border-red-100 dark:border-red-500/[0.1] rounded-[12px]">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] font-[700] text-slate-800 dark:text-white">{t.name}</span>
                        <span className="text-[11px] font-[700] text-red-500">{t.accuracy}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-red-100 dark:bg-red-500/10 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${t.accuracy}%` }} />
                      </div>
                    </div>
                    <Link href="/practice" className="shrink-0 text-[11px] font-[700] text-red-600 dark:text-red-400 hover:text-red-700 whitespace-nowrap flex items-center gap-1 hover:gap-1.5 transition-all">
                      {t.questions}Q <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Strong topics */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-[800] uppercase tracking-widest text-slate-400 dark:text-slate-500">Strong Areas</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {STRONG_TOPICS.map((t) => (
                  <div key={t.name} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/[0.07] border border-emerald-100 dark:border-emerald-500/[0.15] rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[12px] font-[600] text-slate-700 dark:text-emerald-300">{t.name}</span>
                    <span className="text-[11px] font-[700] text-emerald-600 dark:text-emerald-400">{t.accuracy}%</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
