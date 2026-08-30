"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookMarked, Clock, FileText, BarChart3, ChevronRight } from "lucide-react";
import { PublicNote } from "@/lib/api/public-api";

// Shown only until real free published materials exist.
const STATIC_NOTES = [
  {
    id: -1,
    title: "Constitution of Nepal 2072 — Complete Guide",
    description: "Detailed breakdown of all parts, articles, and fundamental rights.",
    material_type: "notes",
    difficulty: "intermediate",
    estimated_reading_time: 25,
    subject: "Constitutional Law",
  },
  {
    id: -2,
    title: "Public Administration Principles",
    description: "Core theories, administrative behavior, and modern approaches.",
    material_type: "notes",
    difficulty: "beginner",
    estimated_reading_time: 18,
    subject: "Public Admin",
  },
  {
    id: -3,
    title: "Current Affairs 2080-81",
    description: "National and international events curated for Loksewa exams.",
    material_type: "study_guide",
    difficulty: "beginner",
    estimated_reading_time: 30,
    subject: "General Knowledge",
  },
  {
    id: -4,
    title: "Economic Survey Summary",
    description: "Key highlights and data points from the latest economic survey.",
    material_type: "reference",
    difficulty: "advanced",
    estimated_reading_time: 12,
    subject: "Economy",
  },
];

interface Props {
  notes?: PublicNote[] | null;
}

export function NotesSection({ notes }: Props) {
  // Transform API data if available, otherwise use static fallback
  const displayNotes = (notes && notes.length > 0)
    ? notes.slice(0, 4).map(n => ({
        id: n.id,
        title: n.title,
        description: n.description || "Comprehensive study material.",
        material_type: n.material_type,
        difficulty: n.difficulty,
        estimated_reading_time: n.estimated_reading_time,
        subject: n.subject_name || "General Studies",
      }))
    : STATIC_NOTES;

  return (
    <section className="py-24 bg-white dark:bg-[#020611] relative overflow-hidden">
      
      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />
      <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06] rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <BookMarked className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10.5px] font-[800] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Expert Notes</span>
            </div>
            <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight leading-[1.1]">
              Curated materials. <br className="hidden md:block" />
              <span className="text-gradient-gold">Zero fluff.</span>
            </h2>
          </div>
          <Link href="/notes">
            <Button variant="outline" className="border-slate-300 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 bg-transparent h-[44px] px-6 rounded-[10px] font-[600] text-[14px] flex items-center gap-2 group whitespace-nowrap">
              Browse All Notes
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayNotes.map((note) => (
            <Link key={note.id} href="/notes" className="group block">
              <div className="bg-slate-50 dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[20px] p-5 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all card-hover flex items-start gap-5">
                
                {/* Icon block */}
                <div className="w-14 h-14 rounded-[14px] bg-white dark:bg-[#04080F] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6 text-emerald-500" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-[700] uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] px-2 py-0.5 rounded-full">
                      {note.subject}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-[800] text-slate-900 dark:text-white mb-1.5 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {note.title}
                  </h3>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-[1.5] mb-3 line-clamp-2">
                    {note.description}
                  </p>
                  
                  {/* Meta */}
                  <div className="flex items-center gap-4 text-[11px] font-[600] text-slate-400 dark:text-slate-500 capitalize">
                    <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {note.material_type.replace(/_/g, " ")}</div>
                    <div className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> {note.difficulty}</div>
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {note.estimated_reading_time} min</div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/[0.05] flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </div>

              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
