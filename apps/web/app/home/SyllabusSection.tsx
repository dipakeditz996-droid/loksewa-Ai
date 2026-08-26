// @ts-nocheck
"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Map, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { ApiExamCategory } from "@/lib/api/admin-academic-api";

const STATIC_HIERARCHY = [
  {
    exam: "Section Officer",
    papers: [
      {
        name: "Paper I — General Studies",
        subjects: [
          {
            name: "Constitutional Law",
            chapters: ["Fundamental Rights", "Directive Principles", "State Organs", "Constitutional Bodies"],
            progress: 72,
            isWeak: false,
          },
          {
            name: "Public Administration",
            chapters: ["Administrative Theory", "Organization", "Personnel", "Financial Admin"],
            progress: 45,
            isWeak: true,
          },
        ],
      },
      {
        name: "Paper II — Specific Knowledge",
        subjects: [
          {
            name: "General Knowledge & Current Affairs",
            chapters: ["Nepal History", "Geography", "Economy", "International Relations"],
            progress: 81,
            isWeak: false,
          },
        ],
      },
    ],
  },
];

interface Props {
  examCategories?: ApiExamCategory[] | null;
}

export function SyllabusSection({ examCategories }: Props) {
  // Use first static example (will connect to real syllabus API progressively)
  const data = STATIC_HIERARCHY[0];

  return (
    <section className="py-24 bg-white dark:bg-[#020611] relative overflow-hidden">

      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
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
            <Button variant="outline" className="border-slate-300 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 bg-transparent h-[44px] px-6 rounded-[10px] font-[600] text-[14px] flex items-center gap-2 group whitespace-nowrap">
              Explore Syllabus
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Hierarchy visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT: Hierarchy tree */}
          <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_50px_rgba(0,0,0,0.5)]">

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[11px] font-[600] text-slate-400 mb-5">
              {["Exam", "Paper", "Subject", "Chapter", "Topic"].map((item, i, arr) => (
                <React.Fragment key={item}>
                  <span className={i === 0 ? "text-[#D4A72C]" : i === arr.length - 1 ? "text-slate-600 dark:text-slate-300" : ""}>{item}</span>
                  {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />}
                </React.Fragment>
              ))}
            </div>

            {/* Exam header */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-white/[0.05]">
              <div className="w-9 h-9 rounded-[10px] bg-[#D4A72C]/10 flex items-center justify-center">
                <Map className="w-4.5 h-4.5 text-[#D4A72C]" />
              </div>
              <div>
                <div className="text-[15px] font-[800] text-slate-800 dark:text-white">{data?.exam}</div>
                <div className="text-[11px] text-slate-400">Loksewa Aayog — PSC Nepal</div>
              </div>
            </div>

            {/* Papers & Subjects */}
            {data?.papers?.map((paper: any, pi: number) => (
              <div key={pi} className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <div className="text-[12.5px] font-[700] text-slate-600 dark:text-slate-300">{paper.name}</div>
                </div>

                <div className="ml-4 space-y-3">
                  {paper.subjects.map((subject) => (
                    <div
                      key={subject.name}
                      className={`p-3.5 rounded-[14px] border ${
                        subject.isWeak
                          ? "bg-red-50 dark:bg-red-500/[0.05] border-red-100 dark:border-red-500/[0.1]"
                          : "bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {subject.isWeak
                            ? <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          }
                          <span className="text-[13px] font-[700] text-slate-800 dark:text-white">{subject.name}</span>
                        </div>
                        <span className={`text-[11px] font-[700] ${subject.isWeak ? "text-red-500" : "text-emerald-500"}`}>
                          {subject.progress}%
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden mb-2.5">
                        <div
                          className={`h-full rounded-full ${subject.isWeak ? "bg-red-500" : "bg-emerald-500"}`}
                          style={{ width: `${subject.progress}%` }}
                        />
                      </div>
                      {/* Chapters */}
                      <div className="flex flex-wrap gap-1.5">
                        {subject.chapters.map((ch) => (
                          <span key={ch} className="text-[10px] font-[600] text-slate-500 dark:text-slate-400 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] px-2 py-0.5 rounded-full">
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT: Info cards */}
          <div className="flex flex-col gap-5">
            {/* Hierarchy explanation */}
            <div className="bg-slate-50 dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[24px] p-6">
              <div className="text-[11px] font-[800] uppercase tracking-widest text-slate-400 mb-4">Loksewa Academic Hierarchy</div>
              <div className="space-y-3">
                {[
                  { level: "Exam", desc: "Section Officer, Kharidar, Nayab Subba...", color: "bg-[#D4A72C]" },
                  { level: "Paper", desc: "General Studies, Specific Knowledge...", color: "bg-blue-500" },
                  { level: "Subject", desc: "Constitutional Law, Public Admin...", color: "bg-violet-500" },
                  { level: "Chapter", desc: "Fundamental Rights, State Organs...", color: "bg-emerald-500" },
                  { level: "Topic", desc: "Articles 12–23, Constitutional Bodies...", color: "bg-pink-500" },
                ].map((item, i) => (
                  <div key={item.level} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0 mt-1`} />
                      {i < 4 && <div className="w-0.5 h-6 bg-slate-200 dark:bg-white/[0.08] mt-1" />}
                    </div>
                    <div>
                      <div className="text-[13px] font-[700] text-slate-800 dark:text-white">{item.level}</div>
                      <div className="text-[11.5px] text-slate-400 dark:text-slate-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Exam Positions", value: "20+", color: "text-[#D4A72C]" },
                { label: "Subjects Covered", value: "100%", color: "text-emerald-500" },
                { label: "Topics Mapped", value: "1,200+", color: "text-blue-500" },
                { label: "Questions Linked", value: "250K+", color: "text-violet-500" },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[16px] p-4 text-center">
                  <div className={`text-[28px] font-[900] ${s.color} mb-1`}>{s.value}</div>
                  <div className="text-[11px] font-[600] text-slate-500 dark:text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Link href="/syllabus" className="block">
              <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 text-white h-[50px] rounded-[12px] font-[700] text-[15px] flex items-center justify-center gap-2 group border-none shadow-[0_8px_25px_rgba(16,185,129,0.3)]">
                Explore Full Syllabus
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
