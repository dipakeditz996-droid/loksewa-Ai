"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart2, TrendingUp, ChevronRight, Activity, Calendar, Award } from "lucide-react";

export function AnalyticsSection() {
  return (
    <section className="py-24 bg-slate-50 dark:bg-[#04080F] relative overflow-hidden">

      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-40 pointer-events-none" />
      <div className="absolute top-[30%] left-[-10%] w-[500px] h-[500px] bg-[#D4A72C]/[0.03] dark:bg-[#D4A72C]/[0.08] rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ── LEFT: Text ── */}
          <div className="order-2 lg:order-1">
            <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-5 leading-[1.15]">
              Measure every <br className="hidden md:block" />
              <span className="text-gradient-gold">step of progress.</span>
            </h2>

            <p className="text-[17px] text-slate-500 dark:text-slate-400 leading-[1.7] mb-8 max-w-[480px] font-[500]">
              Deep analytics go beyond just right or wrong. Understand your speed, accuracy trends, topic-level mastery, and compare your readiness against thousands of other aspirants.
            </p>

            <div className="space-y-4 mb-10">
              {[
                { label: "Accuracy Trends", desc: "Track how your accuracy improves over time across different subjects." },
                { label: "Speed Analysis", desc: "Identify questions that take too much time and optimize your exam speed." },
                { label: "Percentile Ranking", desc: "See exactly where you stand compared to real competitors." },
              ].map((f) => (
                <div key={f.label} className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4A72C]" />
                    <h3 className="text-[15px] font-[800] text-slate-800 dark:text-white">{f.label}</h3>
                  </div>
                  <p className="text-[13.5px] text-slate-500 dark:text-slate-400 leading-[1.6] pl-3.5">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>

            <Link href="/register">
              <Button className="bg-gradient-to-r from-[#C29322] to-[#E6BA3D] hover:opacity-90 text-[#020611] h-[50px] px-8 rounded-[12px] font-[700] text-[15px] shadow-[0_8px_30px_rgba(212,167,44,0.3)] flex items-center gap-2 group border-none">
                Start Tracking Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* ── RIGHT: Analytics Dashboard ── */}
          <div className="order-1 lg:order-2 relative">
            
            {/* Main card */}
            <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[24px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-[11px] font-[800] uppercase tracking-widest text-slate-400 mb-1">PERFORMANCE ANALYTICS</div>
                  <div className="text-[16px] font-[800] text-slate-800 dark:text-white">Accuracy Trend</div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/[0.03] px-3 py-1.5 rounded-[8px] text-[12px] font-[600] text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Last 30 Days
                </div>
              </div>

              {/* Chart visualization */}
              <div className="relative h-[220px] mb-8 flex items-end justify-between gap-2">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[100, 75, 50, 25, 0].map((v) => (
                    <div key={v} className="flex items-center gap-3">
                      <span className="text-[10px] font-[600] text-slate-400 w-6 text-right">{v}%</span>
                      <div className="flex-1 h-px bg-slate-100 dark:bg-white/[0.03]" />
                    </div>
                  ))}
                </div>

                {/* Bars */}
                <div className="absolute inset-0 left-10 flex items-end justify-between pt-5 pb-[1px]">
                  {[
                    { h: 42, day: "01" }, { h: 48, day: "05" }, { h: 55, day: "10" }, 
                    { h: 52, day: "15" }, { h: 68, day: "20" }, { h: 74, day: "25" }, 
                    { h: 87, day: "30", active: true }
                  ].map((bar, i) => (
                    <div key={i} className="flex flex-col items-center gap-3 w-8 relative group">
                      {/* Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[11px] font-[800] px-2.5 py-1 rounded-[6px] pointer-events-none">
                        {bar.h}%
                      </div>
                      
                      <div className="w-full bg-slate-100 dark:bg-white/[0.05] rounded-t-[4px] relative overflow-hidden" style={{ height: "180px" }}>
                        <div 
                          className={`absolute bottom-0 w-full rounded-t-[4px] transition-all duration-700 animate-bar-grow ${
                            bar.active ? "bg-gradient-to-t from-[#D4A72C] to-[#E6BA3D]" : "bg-blue-500/80 dark:bg-blue-500/60"
                          }`} 
                          style={{ height: `${bar.h}%`, animationDelay: `${i * 100}ms` }} 
                        />
                      </div>
                      <span className={`text-[10px] font-[700] ${bar.active ? "text-[#D4A72C]" : "text-slate-400"}`}>{bar.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100 dark:border-white/[0.04]">
                <div>
                  <div className="text-[11px] font-[700] text-slate-400 uppercase tracking-widest mb-1">Avg Score</div>
                  <div className="text-[20px] font-[900] text-slate-800 dark:text-white">68.5%</div>
                </div>
                <div>
                  <div className="text-[11px] font-[700] text-slate-400 uppercase tracking-widest mb-1">Highest</div>
                  <div className="text-[20px] font-[900] text-[#D4A72C]">87.0%</div>
                </div>
                <div>
                  <div className="text-[11px] font-[700] text-slate-400 uppercase tracking-widest mb-1">Growth</div>
                  <div className="text-[20px] font-[900] text-emerald-500 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> +45%
                  </div>
                </div>
              </div>
            </div>

            {/* Floating metric cards */}
            <div className="absolute -right-8 top-12 bg-white/95 dark:bg-[#0B1521]/95 backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] p-4 rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-2xl animate-float hidden md:flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                <Award className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-[24px] font-[900] text-slate-800 dark:text-white leading-none mb-1">Top 5%</div>
              <div className="text-[10px] font-[700] text-slate-400 uppercase tracking-widest">Percentile</div>
            </div>

            <div className="absolute -left-6 bottom-16 bg-white/95 dark:bg-[#0B1521]/95 backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] p-4 rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-2xl animate-float-reverse hidden md:flex flex-col gap-1">
              <div className="text-[10px] font-[800] text-slate-400 uppercase tracking-widest mb-1">Time per Question</div>
              <div className="flex items-end gap-2">
                <span className="text-[28px] font-[900] text-slate-800 dark:text-white leading-none">42<span className="text-[16px]">s</span></span>
                <span className="text-[11px] font-[700] text-emerald-500 pb-1">↓ 12s faster</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
