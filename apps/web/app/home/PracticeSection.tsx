"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Target, Clock, BarChart2, Sparkles, Shuffle, BookOpen, Zap } from "lucide-react";

const PRACTICE_TYPES = [
  {
    icon: Target,
    title: "Topic Practice",
    description: "Focused practice on a single topic to build deep mastery.",
    questions: "10–50",
    difficulty: "Configurable",
    accuracy: "Topic-specific",
    time: "15–45 min",
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/8 dark:bg-blue-500/8",
    border: "border-blue-500/15 dark:border-blue-500/15",
    href: "/practice",
    badge: "Most Used",
    badgeColor: "text-blue-600 dark:text-blue-300 bg-blue-500/10",
  },
  {
    icon: BookOpen,
    title: "Subject Practice",
    description: "Cross-topic practice within a subject for comprehensive coverage.",
    questions: "30–100",
    difficulty: "Mixed",
    accuracy: "Subject-wide",
    time: "30–90 min",
    color: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-500/8",
    border: "border-violet-500/15",
    href: "/practice",
    badge: null,
    badgeColor: "",
  },
  {
    icon: Sparkles,
    title: "AI Recommended",
    description: "AI-curated questions targeting your personal weak areas.",
    questions: "20",
    difficulty: "Adaptive",
    accuracy: "Personalized",
    time: "20–30 min",
    color: "text-[#D4A72C]",
    bg: "bg-[#D4A72C]/8",
    border: "border-[#D4A72C]/15",
    href: "/practice",
    badge: "AI-Powered",
    badgeColor: "text-[#D4A72C] bg-[#D4A72C]/10",
  },
  {
    icon: Shuffle,
    title: "Mixed Practice",
    description: "Random questions from across the entire syllabus for exam-like variety.",
    questions: "50",
    difficulty: "Mixed",
    accuracy: "Overall",
    time: "45–60 min",
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/15",
    href: "/practice",
    badge: null,
    badgeColor: "",
  },
  {
    icon: Zap,
    title: "Daily Practice",
    description: "10 fresh daily questions to keep your preparation consistent.",
    questions: "10",
    difficulty: "Moderate",
    accuracy: "Daily score",
    time: "10–15 min",
    color: "text-orange-500 dark:text-orange-400",
    bg: "bg-orange-500/8",
    border: "border-orange-500/15",
    href: "/practice",
    badge: "Daily",
    badgeColor: "text-orange-600 dark:text-orange-300 bg-orange-500/10",
  },
];

export function PracticeSection() {
  return (
    <section className="py-24 bg-slate-50 dark:bg-[#04080F] relative overflow-hidden">

      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
            <Target className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10.5px] font-[800] uppercase tracking-widest text-blue-500 dark:text-blue-400">Smart Practice</span>
          </div>
          <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-4 leading-[1.1]">
            Practice with{" "}
            <span className="text-gradient-blue-violet">purpose.</span>
          </h2>
          <p className="text-[17px] text-slate-500 dark:text-slate-400 max-w-[520px] mx-auto font-[500]">
            Five modes of intelligent practice — from daily habits to AI-powered targeted sessions.
          </p>
        </div>

        {/* Practice cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {PRACTICE_TYPES.slice(0, 3).map((p) => {
            const Icon = p.icon;
            return (
              <Link key={p.title} href={p.href} className="group block">
                <div className={`relative bg-white dark:bg-[#060E18] border ${p.border} rounded-[20px] p-5 card-hover shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] h-full flex flex-col gap-4`}>
                  {/* Badge */}
                  {p.badge && (
                    <div className={`absolute top-4 right-4 text-[10px] font-[800] uppercase tracking-wide px-2.5 py-1 rounded-full ${p.badgeColor}`}>
                      {p.badge}
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-[12px] ${p.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${p.color}`} />
                  </div>

                  {/* Text */}
                  <div>
                    <h3 className="text-[16px] font-[800] text-slate-800 dark:text-white mb-1.5">{p.title}</h3>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-[1.6]">{p.description}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    {[
                      { label: "Questions", value: p.questions },
                      { label: "Time", value: p.time },
                      { label: "Difficulty", value: p.difficulty },
                      { label: "Accuracy", value: p.accuracy },
                    ].map((s) => (
                      <div key={s.label} className="bg-slate-50 dark:bg-white/[0.03] rounded-[10px] px-2.5 py-2">
                        <div className="text-[9.5px] font-[700] uppercase tracking-wide text-slate-400 mb-0.5">{s.label}</div>
                        <div className="text-[12px] font-[700] text-slate-700 dark:text-slate-200">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className={`flex items-center gap-1.5 text-[13px] font-[700] ${p.color} group-hover:gap-2.5 transition-all`}>
                    Start Practice <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom 2 + button row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRACTICE_TYPES.slice(3).map((p) => {
            const Icon = p.icon;
            return (
              <Link key={p.title} href={p.href} className="group block">
                <div className={`relative bg-white dark:bg-[#060E18] border ${p.border} rounded-[20px] p-5 card-hover shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] flex items-center gap-4`}>
                  <div className={`w-10 h-10 rounded-[12px] ${p.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${p.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[14px] font-[800] text-slate-800 dark:text-white">{p.title}</h3>
                      {p.badge && (
                        <span className={`text-[9.5px] font-[800] uppercase tracking-wide px-2 py-0.5 rounded-full ${p.badgeColor}`}>
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-[1.5]">{p.description}</p>
                  </div>
                  <ArrowRight className={`w-4 h-4 ${p.color} shrink-0 group-hover:translate-x-1 transition-transform`} />
                </div>
              </Link>
            );
          })}

          {/* Big CTA */}
          <Link href="/practice" className="block">
            <div className="bg-gradient-to-br from-[#0B2545] to-[#163E6B] rounded-[20px] p-5 flex items-center gap-4 card-hover h-full shadow-[0_4px_30px_rgba(11,37,69,0.3)]">
              <div className="w-10 h-10 rounded-[12px] bg-white/10 flex items-center justify-center shrink-0">
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-[800] text-white mb-1">View All Practice</div>
                <div className="text-[12px] text-slate-400">1,000+ practice sets</div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#D4A72C] shrink-0" />
            </div>
          </Link>
        </div>

      </div>
    </section>
  );
}
