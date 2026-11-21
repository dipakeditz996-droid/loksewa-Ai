"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { publicApi, type PublicExamination } from "@/lib/api/public-api";
import { useDynamicExams } from "@/hooks/useDynamicExams";
import { DynamicExamCard } from "@/components/exams/DynamicExamCard";

// Curated fallback matching published database examinations
const STATIC_EXAMINATIONS: PublicExamination[] = [
  {
    id: 59,
    title: "Model Exam 03 - Civil Sub Engineer",
    level: "Civil Sub Engineer",
    type: "Mock Test",
    paper: "Mixed",
    questions: 50,
    duration: 60,
    subjects: ["Civil Engineering", "General Studies", "Building Construction"],
    status: "LIVE",
  },
  {
    id: 58,
    title: "Model Exam 02 - Civil Sub Engineer",
    level: "Civil Sub Engineer",
    type: "Mock Test",
    paper: "Mixed",
    questions: 50,
    duration: 60,
    subjects: ["Civil Engineering", "Surveying & Leveling", "Highway Engineering"],
    status: "LIVE",
  },
  {
    id: 57,
    title: "Model Exam 01 - Civil Sub Engineer",
    level: "Civil Sub Engineer",
    type: "Mock Test",
    paper: "Mixed",
    questions: 50,
    duration: 60,
    subjects: ["Civil Engineering", "Fluid Mechanics", "Sanitary Engineering"],
    status: "LIVE",
  },
  {
    id: 56,
    title: "Koshi Province [2083.02.09] Assistant Civil Sub-Engineer",
    level: "Assistant Civil Sub-Engineer",
    type: "Subjective Exam",
    paper: "Subjective",
    questions: 10,
    duration: 180,
    subjects: ["Civil Engineering", "Drafting & Estimation", "Construction Management"],
    status: "LIVE",
  },
];

interface MockExamSectionProps {
  examinations?: PublicExamination[] | null;
}

type FilterTab = "ALL" | "LIVE" | "UPCOMING" | "COMPLETED";

export function MockExamSection({ examinations: initialExams }: MockExamSectionProps) {
  const [exams, setExams] = useState<PublicExamination[]>(
    initialExams && initialExams.length > 0 ? initialExams : STATIC_EXAMINATIONS
  );
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  useEffect(() => {
    if (initialExams && initialExams.length > 0) {
      setExams(initialExams);
      return;
    }

    let mounted = true;
    publicApi.getExaminations().then((data) => {
      if (!mounted) return;
      if (data && data.length > 0) {
        setExams(data);
      }
    });

    return () => {
      mounted = false;
    };
  }, [initialExams]);

  const { liveExams, upcomingExams, completedExams, allSortedExams, counts } =
    useDynamicExams(exams);

  // Filter exams based on active tab
  const displayedExams = (
    activeTab === "LIVE"
      ? liveExams
      : activeTab === "UPCOMING"
      ? upcomingExams
      : activeTab === "COMPLETED"
      ? completedExams
      : allSortedExams
  ).slice(0, 6);

  return (
    <section className="py-12 sm:py-14 lg:py-16 bg-white dark:bg-[#020611] relative overflow-hidden">
      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#163E6B]/10 dark:bg-white/10 border border-[#163E6B]/20 dark:border-white/20 mb-4 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#163E6B] dark:text-[#D4A72C]" />
            <span className="text-[10.5px] font-[800] uppercase tracking-widest text-[#163E6B] dark:text-[#D4A72C]">
              Mock Examinations
            </span>
          </div>

          <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-3 leading-[1.1]">
            Available <span className="text-gradient-gold">Examinations</span>
          </h2>

          <p className="text-[16px] sm:text-[17px] text-slate-600 dark:text-slate-300 max-w-[620px] mx-auto font-[500] leading-relaxed mb-6">
            Choose an assessment based on your target exam and preparation level. Full-length timed mock exams replicating the exact competitive engineering exam environment.
          </p>

          {/* Status summary pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-[800] transition-all flex items-center gap-1.5 ${
                activeTab === "ALL"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
              }`}
            >
              All Exams ({counts.total})
            </button>

            {counts.live > 0 && (
              <button
                onClick={() => setActiveTab("LIVE")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-[800] transition-all flex items-center gap-1.5 ${
                  activeTab === "LIVE"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Now ({counts.live})
              </button>
            )}

            {counts.upcoming > 0 && (
              <button
                onClick={() => setActiveTab("UPCOMING")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-[800] transition-all flex items-center gap-1.5 ${
                  activeTab === "UPCOMING"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Upcoming ({counts.upcoming})
              </button>
            )}

            {counts.completed > 0 && (
              <button
                onClick={() => setActiveTab("COMPLETED")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-[800] transition-all flex items-center gap-1.5 ${
                  activeTab === "COMPLETED"
                    ? "bg-slate-700 text-white dark:bg-slate-600 shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ended ({counts.completed})
              </button>
            )}
          </div>
        </div>

        {/* Examinations Cards Grid */}
        {displayedExams.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-white/5 rounded-[20px] border border-slate-200 dark:border-white/10">
            <p className="text-sm font-[600] text-slate-500 dark:text-slate-400">
              No examinations found in this category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedExams.map((exam) => (
              <DynamicExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        )}

        {/* Bottom CTA to view all exams */}
        <div className="flex items-center justify-center mt-10">
          <Link href="/exams">
            <Button className="h-12 px-8 rounded-[12px] bg-[#163E6B] hover:bg-[#163E6B]/90 dark:bg-[#D4A72C] dark:hover:bg-[#D4A72C]/90 text-white dark:text-[#0A1118] font-[800] text-[15px] shadow-[0_0_20px_rgba(22,62,107,0.2)] dark:shadow-[0_0_20px_rgba(212,167,44,0.3)] transition-all flex items-center gap-2">
              Explore All Examinations
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
