"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight, BookOpen, Users, DollarSign, ChevronRight, BarChart2 } from "lucide-react";

export function TeacherSection() {
  return (
    <section className="py-24 bg-white dark:bg-[#060E18] relative overflow-hidden">
      
      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />
      
      {/* Background shapes */}
      <div className="absolute top-[10%] left-[-5%] w-[400px] h-[400px] bg-[#D4A72C]/[0.03] dark:bg-[#D4A72C]/[0.06] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#163E6B]/[0.03] dark:bg-[#163E6B]/[0.1] rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-slate-50 dark:bg-[#0A1520] border border-slate-200 dark:border-white/[0.06] rounded-[32px] p-8 md:p-12 lg:p-16 overflow-hidden relative shadow-[0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          
          {/* Subtle grid pattern inside card */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] opacity-60" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-12 lg:gap-20 items-center">
            
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4A72C]/10 border border-[#D4A72C]/20 mb-6">
                <GraduationCap className="w-3.5 h-3.5 text-[#D4A72C]" />
                <span className="text-[10.5px] font-[800] uppercase tracking-widest text-[#D4A72C]">Teacher Ecosystem</span>
              </div>
              
              <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-5 leading-[1.1]">
                Are you a <span className="text-gradient-gold">Loksewa expert?</span>
              </h2>
              
              <p className="text-[17px] text-slate-500 dark:text-slate-400 leading-[1.7] mb-8 font-[500] max-w-[480px]">
                Join Nepal&apos;s most advanced EdTech platform. Create courses, write study materials, build mock exams, and monetize your expertise directly on LoksewaAI.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-10">
                {[
                  { icon: BookOpen, text: "Course Creation Tools" },
                  { icon: Users, text: "Reach 50,000+ Aspirants" },
                  { icon: DollarSign, text: "Monetize Content" },
                  { icon: BarChart2, text: "Student Analytics" },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                      <f.icon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <span className="text-[14px] font-[600] text-slate-700 dark:text-slate-300">{f.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/teacher/login">
                  <Button className="w-full sm:w-auto bg-[#D4A72C] hover:bg-[#C29322] text-[#020611] h-[50px] px-8 rounded-[12px] font-[700] text-[15px] border-none flex items-center justify-center gap-2 group transition-all hover:-translate-y-0.5 shadow-[0_8px_25px_rgba(212,167,44,0.3)]">
                    Go to Teacher Portal
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" className="w-full sm:w-auto h-[50px] px-8 rounded-[12px] font-[600] text-[15px] border-slate-300 dark:border-white/10 text-slate-700 dark:text-white bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center transition-all">
                    Apply to Teach
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right UI Preview */}
            <div className="relative">
              <div className="bg-white dark:bg-[#04080F] border border-slate-200 dark:border-white/[0.08] rounded-[20px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.6)] relative z-20">
                <div className="flex items-center gap-3 mb-5 border-b border-slate-100 dark:border-white/[0.06] pb-4">
                  <div className="w-10 h-10 rounded-[10px] bg-[#D4A72C] flex items-center justify-center text-[#020611] font-[800] text-[16px]">RP</div>
                  <div>
                    <div className="text-[14px] font-[800] text-slate-800 dark:text-white">Ramesh Poudel</div>
                    <div className="text-[11px] text-[#D4A72C] font-[600]">Verified Educator</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Total Students", value: "4,205", trend: "+120 this week" },
                    { label: "Total Revenue", value: "Rs. 1,45,000", trend: "+12% this month" },
                    { label: "Active Courses", value: "4", trend: "1 in review" },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-50 dark:bg-white/[0.03] rounded-[12px] p-3.5 flex items-center justify-between border border-transparent dark:border-white/[0.02]">
                      <div>
                        <div className="text-[11px] font-[700] text-slate-500 uppercase tracking-widest mb-0.5">{s.label}</div>
                        <div className="text-[13px] font-[600] text-emerald-600 dark:text-emerald-400">{s.trend}</div>
                      </div>
                      <div className="text-[18px] font-[800] text-slate-800 dark:text-white">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[radial-gradient(circle,rgba(212,167,44,0.15)_0%,transparent_70%)] pointer-events-none" />
              <div className="absolute -left-6 -top-6 w-32 h-32 bg-[radial-gradient(circle,rgba(37,99,235,0.1)_0%,transparent_70%)] pointer-events-none" />
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
