"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, FileText, BookmarkPlus, ChevronRight, TrendingUp, Target } from "lucide-react";

const OPTIONS = ["A. Article 16", "B. Article 18", "C. Article 20", "D. Article 22"];
const SELECTED = 1; // index of selected option

export function MockExamSection() {
  return (
    <section className="py-24 bg-white dark:bg-[#020611] relative overflow-hidden">

      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <FileText className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10.5px] font-[800] uppercase tracking-widest text-red-500 dark:text-red-400">Mock Examinations</span>
          </div>
          <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-4 leading-[1.1]">
            Experience the real exam{" "}
            <span className="text-gradient-gold">before the real exam.</span>
          </h2>
          <p className="text-[17px] text-slate-500 dark:text-slate-400 max-w-[520px] mx-auto font-[500]">
            Full-length timed mock exams replicating the exact Loksewa exam environment.
          </p>
        </div>

        {/* Main exam interface preview */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* Exam UI */}
          <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[24px] overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.6)]">

            {/* Exam header bar */}
            <div className="bg-slate-50 dark:bg-[#04080F] border-b border-slate-200 dark:border-white/[0.05] px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-[800] uppercase tracking-widest text-[#D4A72C] mb-1">REALISTIC EXAM ENVIRONMENT</div>
                <h3 className="text-[16px] font-[800] text-slate-800 dark:text-white">Section Officer — Full Mock Exam</h3>
              </div>
              <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-500/[0.08] border border-red-100 dark:border-red-500/[0.15] px-4 py-2 rounded-[10px]">
                <Clock className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-[20px] font-[900] text-slate-800 dark:text-white tracking-widest font-mono">01:24:38</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[13px] font-[600] text-slate-500 dark:text-slate-400">Question <span className="text-slate-800 dark:text-white font-[700]">34</span> of 100</span>
                <span className="text-[12px] font-[700] text-emerald-600 dark:text-emerald-400">34% Complete</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-white/[0.05] rounded-full overflow-hidden">
                <div className="w-[34%] h-full bg-gradient-to-r from-[#D4A72C] to-[#E6BA3D] rounded-full" />
              </div>
            </div>

            {/* Question */}
            <div className="px-6 py-5">
              <p className="text-[16px] md:text-[18px] font-[600] text-slate-800 dark:text-white leading-[1.65] mb-6">
                Which of the following is related to the fundamental right to <span className="font-[800] text-[#D4A72C]">equality</span> according to the Constitution of Nepal 2072?
              </p>

              {/* Options */}
              <div className="space-y-3">
                {OPTIONS.map((opt, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-4 rounded-[14px] border cursor-pointer transition-all ${
                      i === SELECTED
                        ? "bg-blue-50 dark:bg-[#163E6B]/20 border-blue-500/30 dark:border-blue-500/30 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]"
                        : "bg-white dark:bg-[#04080F] border-slate-200 dark:border-white/[0.05] hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-[800] shrink-0 ${
                      i === SELECTED
                        ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                        : "border-slate-300 dark:border-slate-600 text-slate-500"
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className={`text-[15px] ${i === SELECTED ? "font-[600] text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>
                      {opt}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action bar */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-white/[0.04]">
                <button className="flex items-center gap-2 text-[13px] font-[600] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
                  <BookmarkPlus className="w-4 h-4" />
                  Mark for Review
                </button>
                <div className="flex gap-3">
                  <Button variant="outline" className="h-10 px-5 rounded-[10px] text-[13px] font-[600] border-slate-200 dark:border-white/10 text-slate-700 dark:text-white bg-transparent">
                    Previous
                  </Button>
                  <Button className="h-10 px-6 rounded-[10px] text-[13px] font-[700] bg-[#D4A72C] text-[#020611] hover:bg-[#C29322] border-none">
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Side analytics */}
          <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
              <div className="text-[10px] font-[800] uppercase tracking-widest text-slate-400 mb-4">Live Analytics</div>
              {[
                { label: "Accuracy", value: "78%", icon: Target, color: "text-emerald-500" },
                { label: "Avg. Speed", value: "62s / Q", icon: Clock, color: "text-blue-500" },
                { label: "Est. Rank", value: "#41", icon: TrendingUp, color: "text-[#D4A72C]" },
                { label: "Readiness", value: "Good", icon: FileText, color: "text-violet-500" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-50 dark:border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    <span className="text-[12.5px] text-slate-500 dark:text-slate-400">{label}</span>
                  </div>
                  <span className={`text-[13px] font-[800] ${color}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Question navigator mini */}
            <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[20px] p-5">
              <div className="text-[10px] font-[800] uppercase tracking-widest text-slate-400 mb-3">Questions</div>
              <div className="grid grid-cols-7 gap-1.5 mb-3">
                {Array.from({ length: 21 }, (_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-[5px] text-[9px] font-[700] flex items-center justify-center ${
                      i < 33 / 5
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : i === Math.floor(33 / 5)
                        ? "bg-blue-500 text-white"
                        : "bg-slate-100 dark:bg-white/[0.05] text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] font-[600] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Answered</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-white/10 inline-block" />Skipped</span>
              </div>
            </div>

            {/* CTA */}
            <Link href="/exams">
              <Button className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:opacity-90 text-white h-[48px] rounded-[12px] font-[700] text-[14px] flex items-center justify-center gap-2 group border-none shadow-[0_8px_25px_rgba(239,68,68,0.3)]">
                Explore Mock Exams
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
