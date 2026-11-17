"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { publicApi, type PublicExamination } from "@/lib/api/public-api";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_LABELS: Record<PublicExamination["status"], string> = {
  DRAFT: "Draft",
  UPCOMING: "Upcoming",
  LIVE: "Live",
  COMPLETED: "Completed",
};

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

export function MockExamSection({ examinations: initialExams }: MockExamSectionProps) {
  const { user } = useAuth();
  const [exams, setExams] = useState<PublicExamination[]>(
    initialExams && initialExams.length > 0 ? initialExams : STATIC_EXAMINATIONS
  );

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

  // Display top 6 examinations for landing page layout
  const displayExams = exams.slice(0, 6);

  return (
    <section className="py-12 sm:py-14 lg:py-16 bg-white dark:bg-[#020611] relative overflow-hidden">
      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#163E6B]/10 dark:bg-white/10 border border-[#163E6B]/20 dark:border-white/20 mb-4 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#163E6B] dark:text-[#D4A72C]" />
            <span className="text-[10.5px] font-[800] uppercase tracking-widest text-[#163E6B] dark:text-[#D4A72C]">
              Mock Examinations
            </span>
          </div>

          <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight mb-3 leading-[1.1]">
            Available <span className="text-gradient-gold">Examinations</span>
          </h2>

          <p className="text-[16px] sm:text-[17px] text-slate-600 dark:text-slate-300 max-w-[620px] mx-auto font-[500] leading-relaxed">
            Choose an assessment based on your target exam and preparation level. Full-length timed mock exams replicating the exact competitive engineering exam environment.
          </p>
        </div>

        {/* Examinations Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayExams.map((exam) => {
            const startHref = user
              ? `/student/exams/${exam.id}`
              : `/login?redirect=${encodeURIComponent(`/student/exams/${exam.id}`)}`;

            return (
              <Dialog key={exam.id}>
                <DialogTrigger asChild>
                  <div className="p-6 rounded-[20px] bg-slate-50/70 dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.08] hover:border-[#163E6B]/40 dark:hover:border-white/25 hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col h-full relative overflow-hidden">
                    {/* Top Type Badge & Status Indicator */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-[800] uppercase tracking-wider">
                        {exam.type}
                      </div>
                      {exam.status === "LIVE" || exam.status === "UPCOMING" ? (
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                          </span>
                        </div>
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                      )}
                    </div>

                    {/* Title & Level */}
                    <h3 className="text-[17px] sm:text-lg font-[800] text-slate-900 dark:text-white mb-1.5 group-hover:text-[#163E6B] dark:group-hover:text-[#D4A72C] transition-colors leading-tight">
                      {exam.title}
                    </h3>
                    <p className="text-sm font-[600] text-slate-500 dark:text-slate-400 mb-6">
                      {exam.level || "General"} • {exam.paper}
                    </p>

                    {/* Questions & Duration stats */}
                    <div className="grid grid-cols-2 gap-3 mb-6 mt-auto">
                      <div className="bg-white dark:bg-[#04080F] p-3 rounded-[12px] border border-slate-200/60 dark:border-white/5">
                        <div className="text-[10px] font-[800] text-slate-400 uppercase tracking-wider mb-1">
                          Questions
                        </div>
                        <div className="text-sm font-[800] text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#163E6B] dark:text-[#D4A72C]" />{" "}
                          {exam.questions}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-[#04080F] p-3 rounded-[12px] border border-slate-200/60 dark:border-white/5">
                        <div className="text-[10px] font-[800] text-slate-400 uppercase tracking-wider mb-1">
                          Duration
                        </div>
                        <div className="text-sm font-[800] text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#163E6B] dark:text-[#D4A72C]" />{" "}
                          {exam.duration}m
                        </div>
                      </div>
                    </div>

                    {/* Bottom Status & CTA Action */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/70 dark:border-white/5">
                      <span
                        className={`text-xs font-[800] px-2.5 py-1 rounded-[6px] ${
                          exam.status === "LIVE"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : exam.status === "UPCOMING"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                            : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400"
                        }`}
                      >
                        {STATUS_LABELS[exam.status]}
                      </span>

                      <span className="text-sm font-[800] text-[#163E6B] dark:text-[#D4A72C] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        {exam.status === "COMPLETED" ? "View Details" : "Start Exam"}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                    </div>
                  </div>
                </DialogTrigger>

                {/* Exam Detail Preview Modal */}
                <DialogContent className="max-w-2xl bg-white dark:bg-[#0B1521] border-slate-200 dark:border-white/10 rounded-[24px] p-0 overflow-hidden shadow-2xl">
                  <div className="bg-slate-50 dark:bg-[#0A1420] p-6 md:p-8 border-b border-slate-200 dark:border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A72C]/10 rounded-bl-full pointer-events-none"></div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#163E6B]/10 dark:bg-white/10 text-[#163E6B] dark:text-white text-xs font-[800] uppercase tracking-wider mb-4 border border-[#163E6B]/20 dark:border-white/20">
                      Exam Overview
                    </div>
                    <DialogTitle className="text-2xl md:text-3xl font-[900] text-slate-900 dark:text-white mb-2 leading-tight">
                      {exam.title}
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 dark:text-slate-400 font-[500]">
                      {exam.level || "General"} • {exam.type} • {exam.paper}
                    </DialogDescription>
                  </div>

                  <div className="p-6 md:p-8">
                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-slate-50 dark:bg-[#0A1118] p-4 rounded-[14px] border border-slate-100 dark:border-white/5 text-center">
                        <div className="text-xs font-[800] text-slate-500 uppercase mb-1">
                          Questions
                        </div>
                        <div className="text-2xl font-[900] text-slate-900 dark:text-white">
                          {exam.questions}
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-[#0A1118] p-4 rounded-[14px] border border-slate-100 dark:border-white/5 text-center">
                        <div className="text-xs font-[800] text-slate-500 uppercase mb-1">
                          Duration
                        </div>
                        <div className="text-2xl font-[900] text-slate-900 dark:text-white">
                          {exam.duration}m
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-[#0A1118] p-4 rounded-[14px] border border-slate-100 dark:border-white/5 text-center col-span-2 md:col-span-1">
                        <div className="text-xs font-[800] text-slate-500 uppercase mb-1">
                          Status
                        </div>
                        <div className="text-xl font-[900] text-emerald-600 dark:text-emerald-400">
                          {STATUS_LABELS[exam.status]}
                        </div>
                      </div>
                    </div>

                    {/* Subjects covered */}
                    {exam.subjects && exam.subjects.length > 0 && (
                      <div className="mb-8">
                        <h4 className="text-xs font-[800] text-slate-900 dark:text-white mb-3 uppercase tracking-wider">
                          Subjects Covered
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {exam.subjects.map((sub, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[8px] text-xs font-[600] text-slate-700 dark:text-slate-300"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exam Instructions */}
                    <div className="mb-8 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-[14px] p-5">
                      <h4 className="text-xs font-[800] text-amber-900 dark:text-amber-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Examination Rules & Guidelines
                      </h4>
                      <ul className="space-y-2 text-xs font-[500] text-amber-800 dark:text-amber-200/70">
                        <li className="flex items-start gap-2">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                          Read each question carefully before submitting your answer.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                          You can navigate freely between questions using the question palette.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                          Timed simulation replicates the real exam; auto-submits when time expires.
                        </li>
                      </ul>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link href={startHref} className="flex-1">
                        <Button className="w-full h-12 rounded-[12px] bg-[#163E6B] dark:bg-[#D4A72C] hover:bg-[#163E6B]/90 dark:hover:bg-[#D4A72C]/90 text-white dark:text-[#0A1118] font-[800] text-[15px] shadow-[0_0_20px_rgba(22,62,107,0.25)] dark:shadow-[0_0_20px_rgba(212,167,44,0.3)]">
                          Start Examination <PlayCircle className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-12 px-6 rounded-[12px] border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-300 font-[700]"
                        >
                          Cancel
                        </Button>
                      </DialogTrigger>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>

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
