"use client";

import React from "react";
import { Brain, Target, BarChart2, FileText, BookOpen, Users } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered",
    sub: "Smart Recommendations",
    color: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-500/10 dark:bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    icon: Target,
    title: "Personalized",
    sub: "Study Plans",
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: BarChart2,
    title: "Smart Analytics",
    sub: "Track Progress",
    color: "text-[#D4A72C]",
    bg: "bg-[#D4A72C]/10",
    border: "border-[#D4A72C]/20",
  },
  {
    icon: FileText,
    title: "Mock Exams",
    sub: "Real Exam Environment",
    color: "text-red-500 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    icon: BookOpen,
    title: "Expert Notes",
    sub: "Curated Learning",
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    icon: Users,
    title: "Community",
    sub: "Learn & Grow Together",
    color: "text-cyan-500 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
];

export function FeatureStrip() {
  return (
    <section className="relative z-10 -mt-2 py-0">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/80 dark:bg-[#040B14]/80 backdrop-blur-xl border border-slate-200 dark:border-white/[0.06] rounded-[20px] shadow-[0_4px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-none">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`flex-1 min-w-[160px] flex flex-col items-center gap-2.5 px-6 py-5 group cursor-default transition-all hover:bg-slate-50 dark:hover:bg-white/[0.02] ${
                    i < features.length - 1
                      ? "border-r border-slate-100 dark:border-white/[0.04]"
                      : ""
                  }`}
                >
                  <div className={`w-9 h-9 rounded-[10px] ${f.bg} border ${f.border} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-4.5 h-4.5 ${f.color}`} />
                  </div>
                  <div className="text-center">
                    <div className="text-[13px] font-[700] text-slate-800 dark:text-white leading-tight">{f.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{f.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
