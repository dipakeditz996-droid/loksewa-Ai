// @ts-nocheck

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Map, ChevronRight, FileText } from "lucide-react";
import { PublicNote } from "@/lib/api/public-api";

const STATIC_SYLLABUSES = [
  {
    id: 1,
    title: "NEC Civil Engineering License Syllabus (ACiE)",
    description: "Complete technical syllabus and marking breakdown.",
    subject: "Civil Engineering",
    tag: "License 2081/82",
    pages: "Official PDF",
  },
  {
    id: 2,
    title: "PSC 5th Central - General/Highway/Irrigation/Sanitary",
    description: "Official curriculum for 5th level sub-engineer.",
    subject: "General Studies",
    tag: "PSC 5th Level",
    pages: "Paper I & II",
  },
  {
    id: 3,
    title: "PSC 5th Central - Building & Architect Syllabus",
    description: "Prescribed curriculum for building and architecture.",
    subject: "Architecture",
    tag: "Technical Cadre",
    pages: "Complete Guide",
  },
  {
    id: 4,
    title: "PSC 5th Central - Electrical Engineering Syllabus",
    description: "Detailed syllabus for electrical sub-engineers.",
    subject: "Electrical",
    tag: "PSC Central",
    pages: "Official PDF",
  },
  {
    id: 5,
    title: "PSC 7th Level Civil (Highway & Bridge) Syllabus",
    description: "Official syllabus for assistant engineer examinations.",
    subject: "Civil 7th Level",
    tag: "Assistant Engineer",
    pages: "Subjective & MCQs",
  },
];

interface Props {
  notes?: PublicNote[] | null;
}

export function SyllabusSection({ notes }: Props) {
  const syllabusList = (notes && notes.length > 0)
    ? notes.slice(0, 5).map((n, idx) => ({
        id: n.id || idx + 1,
        title: n.title,
        description: n.description || "Official syllabus document.",
        subject: n.subject_name || "Engineering",
        tag: n.material_type || "Syllabus",
        pages: "Official PDF",
      }))
    : STATIC_SYLLABUSES;

  return (
    <section className="py-12 sm:py-14 lg:py-16 bg-white dark:bg-[#020611] relative overflow-hidden">

      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <Map className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10.5px] font-[800] uppercase tracking-widest text-emerald-500 dark:text-emerald-400">Structured Syllabus</span>
            </div>
            <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight leading-[1.1]">
              Know exactly{" "}
              <span className="text-gradient-gold">what to prepare.</span>
            </h2>
          </div>
          <Link href="/syllabus">
            <Button
              variant="outline"
              className="border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:text-slate-900 dark:hover:text-[#2563EB] hover:bg-slate-100 dark:hover:bg-white/10 hover:border-[#2563EB]/50 dark:hover:border-[#2563EB]/50 bg-transparent transition-all h-[44px] px-6 rounded-[10px] font-[600] text-[14px] flex items-center gap-2 group whitespace-nowrap shadow-sm"
            >
              Explore Syllabus
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Hierarchy visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT: Engineering Academic Hierarchy */}
          <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-[#2563EB]/10 flex items-center justify-center">
                    <Map className="w-4.5 h-4.5 text-[#2563EB]" />
                  </div>
                  <div>
                    <div className="text-[15px] font-[800] text-slate-800 dark:text-white">Engineering Academic Hierarchy</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-[500]">Systematic structure of every examination</div>
                  </div>
                </div>
                <span className="text-[10.5px] font-[700] text-[#2563EB] bg-[#2563EB]/10 border border-[#2563EB]/20 px-2.5 py-1 rounded-full">
                  5 Levels
                </span>
              </div>

              {/* Hierarchy Steps */}
              <div className="space-y-4 my-2">
                {[
                  { level: "Exam", desc: "PSC Civil (5th/7th Level), NEC License, Electrical...", color: "bg-[#2563EB]" },
                  { level: "Paper", desc: "Paper I (General & Basic), Paper II (Technical)...", color: "bg-blue-500" },
                  { level: "Subject", desc: "Structural Analysis, Fluid Mechanics, Surveying...", color: "bg-violet-500" },
                  { level: "Chapter", desc: "Stress & Strain, Pipe Flow, Levelling & Contouring...", color: "bg-emerald-500" },
                  { level: "Topic", desc: "SFD & BMD, Bernoulli Equation, Total Station...", color: "bg-pink-500" },
                ].map((item, i) => (
                  <div key={item.level} className="flex items-start gap-3.5">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${item.color} shrink-0 mt-1 ring-4 ring-slate-100 dark:ring-white/[0.04]`} />
                      {i < 4 && <div className="w-0.5 h-7 bg-slate-200 dark:bg-white/[0.08] mt-1" />}
                    </div>
                    <div>
                      <div className="text-[13.5px] font-[800] text-slate-800 dark:text-white">{item.level}</div>
                      <div className="text-[12px] text-slate-600 dark:text-slate-300 font-[500] leading-snug">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 mt-4 border-t border-slate-100 dark:border-white/[0.05]">
              {[
                { label: "Exam Positions", value: "20+", color: "text-[#2563EB]" },
                { label: "Subjects Covered", value: "100%", color: "text-emerald-500" },
                { label: "Topics Mapped", value: "500+", color: "text-blue-500" },
                { label: "Questions Linked", value: "5,000+", color: "text-violet-500" },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.04] rounded-[12px] p-2 text-center">
                  <div className={`text-[17px] font-[900] ${s.color} leading-tight`}>{s.value}</div>
                  <div className="text-[9.5px] font-[600] text-slate-500 dark:text-slate-400 truncate">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Syllabus PDFs Vertical List & Explore */}
          <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                    <FileText className="w-4.5 h-4.5 text-red-500" />
                  </div>
                  <div>
                    <div className="text-[15px] font-[800] text-slate-800 dark:text-white">Official Syllabus PDFs</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-[500]">Curated & verified curriculum downloads</div>
                  </div>
                </div>
                <span className="text-[10.5px] font-[700] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  Free PDFs
                </span>
              </div>

              {/* Vertical list of 4-5 syllabus items */}
              <div className="flex flex-col gap-2.5">
                {syllabusList.map((item) => (
                  <Link
                    key={item.id}
                    href="/syllabus"
                    className="group flex items-center justify-between p-3 rounded-[14px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.04] hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/[0.03] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-[8px] bg-red-500/10 dark:bg-red-500/15 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-red-500/20 transition-all">
                        <FileText className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9.5px] font-[700] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {item.subject}
                          </span>
                          <span className="text-[10px] font-[500] text-slate-400 dark:text-slate-500 hidden sm:inline">
                            {item.pages}
                          </span>
                        </div>
                        <h4 className="text-[12.5px] font-[700] text-slate-800 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {item.title}
                        </h4>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center shrink-0 ml-2 group-hover:bg-emerald-500 group-hover:text-white text-slate-400 transition-all">
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Bottom CTA Button */}
            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-white/[0.05]">
              <Link href="/syllabus" className="block">
                <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 text-white h-[46px] rounded-[12px] font-[700] text-[14px] flex items-center justify-center gap-2 group border-none shadow-[0_4px_16px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] transition-all">
                  Explore Full Syllabus
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
