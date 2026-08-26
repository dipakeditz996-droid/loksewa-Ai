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
    <section className="relative z-20 -mt-10 py-0">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="card-hover flex flex-col items-center text-center gap-2.5 px-4 py-5 rounded-[18px] bg-white/90 dark:bg-white/[0.05] backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_10px_30px_-12px_rgba(11,37,69,0.16)] dark:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] cursor-default"
              >
                <div className={`w-10 h-10 rounded-[11px] ${f.bg} border ${f.border} flex items-center justify-center transition-transform duration-300`}>
                  <Icon className={`w-[18px] h-[18px] ${f.color}`} />
                </div>
                <div>
                  <div className="text-[13px] font-[700] text-slate-800 dark:text-white leading-tight">{f.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{f.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
