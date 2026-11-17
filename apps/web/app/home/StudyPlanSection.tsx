// @ts-nocheck

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";

const STUDY_PLAN = [
  { day: "MON", topic: "Structural Analysis", tasks: "20 Questions", type: "practice", done: true },
  { day: "TUE", topic: "Fluid Mechanics", tasks: "30 Questions", type: "practice", done: true },
  { day: "WED", topic: "Mock Examination", tasks: "Full Test", type: "exam", done: false, active: true },
  { day: "THU", topic: "Weak Topic Revision", tasks: "AI Selected", type: "revision", done: false },
  { day: "FRI", topic: "Surveying & Geomatics", tasks: "25 Questions", type: "practice", done: false },
  { day: "SAT", topic: "Full Practice", tasks: "50 Questions", type: "practice", done: false },
  { day: "SUN", topic: "Performance Review", tasks: "Analytics", type: "review", done: false },
];

const TYPE_STYLES: Record<string, { bg: string; border: string; dot: string; text: string }> = {
  practice: {
    bg: "bg-blue-50 dark:bg-blue-500/[0.06]",
    border: "border-blue-100 dark:border-blue-500/[0.15]",
    dot: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
  },
  exam: {
    bg: "bg-[#2563EB]/8 dark:bg-[#2563EB]/[0.08]",
    border: "border-[#2563EB]/25 dark:border-[#2563EB]/20",
    dot: "bg-[#2563EB]",
    text: "text-[#1E40AF] dark:text-[#2563EB]",
  },
  revision: {
    bg: "bg-violet-50 dark:bg-violet-500/[0.06]",
    border: "border-violet-100 dark:border-violet-500/[0.15]",
    dot: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
  },
  review: {
    bg: "bg-emerald-50 dark:bg-emerald-500/[0.06]",
    border: "border-emerald-100 dark:border-emerald-500/[0.15]",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
};

export function StudyPlanSection() {
  return (
    <section className="pt-6 sm:pt-8 pb-12 sm:pb-14 lg:pb-16 bg-white dark:bg-[#020611] relative overflow-hidden">

      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* ── LEFT: Weekly plan ── */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 mb-5">
              <CalendarDays className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-[10.5px] font-[800] uppercase tracking-widest text-[#2563EB] dark:text-[#2563EB]">AI Study Plan</span>
            </div>

            <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
              {/* Plan header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-[11px] font-[800] text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">WEEK OF AUG 18–24</div>
                  <div className="text-[15px] font-[800] text-slate-800 dark:text-white">Your Weekly Schedule</div>
                </div>
                <div className="text-[10px] font-[700] text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  2/7 Done
                </div>
              </div>

              {/* Days */}
              <div className="space-y-2.5">
                {STUDY_PLAN.map((day) => {
                  const s = TYPE_STYLES[day.type] || TYPE_STYLES.practice;
                  return (
                    <div
                      key={day.day}
                      className={`flex items-center gap-3.5 p-3.5 rounded-[14px] border transition-all ${
                        day.active
                          ? "bg-[#2563EB]/8 dark:bg-[#2563EB]/[0.08] border-[#2563EB]/30 dark:border-[#2563EB]/25 shadow-[0_0_20px_rgba(37,99,235,0.1)] dark:shadow-[0_0_20px_rgba(37,99,235,0.08)]"
                          : day.done
                          ? "bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.03] opacity-60"
                          : `${(s || TYPE_STYLES.practice).bg} ${(s || TYPE_STYLES.practice).border}`
                      }`}
                    >
                      {/* Day label */}
                      <div className={`w-9 shrink-0 text-center text-[11px] font-[800] uppercase tracking-wide ${
                        day.active ? "text-[#2563EB] dark:text-[#2563EB]" : day.done ? "text-slate-500 dark:text-slate-400" : (s || TYPE_STYLES.practice).text
                      }`}>
                        {day.day}
                      </div>

                      {/* Dot */}
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${day.done ? "bg-emerald-500" : day.active ? "bg-[#2563EB] animate-pulse" : (s || TYPE_STYLES.practice).dot}`} />

                      {/* Content */}
                      <div className="flex-1">
                        <div className={`text-[13px] font-[700] ${day.done ? "text-slate-500 dark:text-slate-400 line-through" : "text-slate-800 dark:text-white"}`}>
                          {day.topic}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-[500]">{day.tasks}</div>
                      </div>

                      {/* Status */}
                      {day.done && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      {day.active && (
                        <span className="text-[10px] font-[700] text-[#2563EB] dark:text-[#2563EB] bg-[#2563EB]/10 px-2 py-0.5 rounded-full whitespace-nowrap">TODAY</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Text ── */}
          <div>
            <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-5 leading-[1.15]">
              Your preparation.{" "}
              <span className="text-gradient-gold">Your path.</span>
            </h2>

            <p className="text-[17px] text-slate-600 dark:text-slate-300 leading-[1.7] mb-8 max-w-[460px] font-[500]">
              NES Mastery builds a personalized weekly study plan tailored to your target position, syllabus coverage, and weak areas — so you always know what to prepare next.
            </p>

            <div className="space-y-4 mb-10">
              {[
                "Dynamically adjusted based on your performance",
                "Prioritizes weak topics automatically",
                "Balances practice, revision, and mock exams",
                "Progress tracked daily and weekly",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4.5 h-4.5 text-[#2563EB] shrink-0 mt-0.5" />
                  <span className="text-[14.5px] text-slate-600 dark:text-slate-300">{f}</span>
                </div>
              ))}
            </div>

            <Link href="/register">
              <Button className="bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] hover:opacity-90 text-[#020611] h-[50px] px-8 rounded-[12px] font-[700] text-[15px] shadow-[0_8px_30px_rgba(37,99,235,0.3)] flex items-center gap-2 group border-none">
                Build My Study Plan
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
