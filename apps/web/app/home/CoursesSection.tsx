"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, Loader2, Users, Star } from "lucide-react";
import { ApiExamCategory } from "@/lib/api/admin-academic-api";

// ── Static curated fallback ────────────────────────────────────────────────────
const STATIC_COURSES = [
  {
    id: 1,
    name: "Section Officer",
    description: "Comprehensive preparation for Section Officer (Sakha Adhikrit) under PSC Nepal.",
    subjects: ["Constitutional Law", "Public Admin", "General Knowledge", "Current Affairs"],
    questionCount: "2,400+",
    difficulty: "Advanced",
    students: "12K+",
    rating: 4.9,
    accent: "from-blue-500 to-violet-600",
    tag: "Most Popular",
  },
  {
    id: 2,
    name: "Kharidar",
    description: "Complete Kharidar exam preparation with structured syllabus and practice sets.",
    subjects: ["General Studies", "Math & Reasoning", "Current Affairs", "Nepal Knowledge"],
    questionCount: "1,800+",
    difficulty: "Intermediate",
    students: "18K+",
    rating: 4.8,
    accent: "from-emerald-500 to-cyan-500",
    tag: "High Demand",
  },
  {
    id: 3,
    name: "Nayab Subba",
    description: "Targeted preparation for Nayab Subba (Lekha Service & General) examinations.",
    subjects: ["Accounting", "General Admin", "Nepal Laws", "Aptitude"],
    questionCount: "1,500+",
    difficulty: "Intermediate",
    students: "9K+",
    rating: 4.7,
    accent: "from-[#D4A72C] to-orange-500",
    tag: "New Content",
  },
  {
    id: 4,
    name: "Sub-Engineer",
    description: "Technical & general preparation for Sub-Engineer across various departments.",
    subjects: ["Civil Engineering", "General Knowledge", "Aptitude", "Current Affairs"],
    questionCount: "1,200+",
    difficulty: "Advanced",
    students: "6K+",
    rating: 4.8,
    accent: "from-red-500 to-pink-600",
    tag: "Expert Level",
  },
];

interface Props {
  examCategories?: ApiExamCategory[] | null;
}

export function CoursesSection({ examCategories }: Props) {
  // Transform API data if available, otherwise use static fallback
  const courses = (examCategories && examCategories.length > 0)
    ? examCategories.slice(0, 4).map((cat, i) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || `Comprehensive preparation for ${cat.name} under PSC Nepal.`,
        subjects: ["Constitutional Law", "General Knowledge", "Current Affairs", "Aptitude"],
        questionCount: "1,000+",
        difficulty: i < 2 ? "Advanced" : "Intermediate",
        students: `${(cat.position_count || 1) * 1000}+`,
        rating: 4.8,
        accent: STATIC_COURSES[i % STATIC_COURSES.length]?.accent || "from-blue-600 to-indigo-600",
        tag: i === 0 ? "Most Popular" : i === 1 ? "High Demand" : "Available",
      }))
    : STATIC_COURSES;

  return (
    <section className="py-24 bg-slate-50 dark:bg-[#04080F] relative overflow-hidden">

      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="eyebrow-pill inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10.5px] font-[800] uppercase tracking-widest text-blue-500 dark:text-blue-400">Courses</span>
            </div>
            <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight leading-[1.1]">
              Explore{" "}
              <span className="text-gradient-blue-violet">preparation courses.</span>
            </h2>
          </div>
          <Link href="/courses">
            <Button variant="outline" className="border-slate-300 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 bg-transparent h-[44px] px-6 rounded-[10px] font-[600] text-[14px] flex items-center gap-2 group whitespace-nowrap">
              View All Courses
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Course cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {courses.map((course) => (
            <Link key={course.id} href="/courses" className="group block">
              <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[20px] overflow-hidden hover:border-slate-300 dark:hover:border-white/[0.12] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] card-hover h-full flex flex-col">

                {/* Gradient header */}
                <div className={`relative h-[110px] bg-gradient-to-br ${course.accent} flex flex-col justify-between p-4`}>
                  {/* Tag */}
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-[800] text-white/90 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full uppercase tracking-wide">
                      {course.tag}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  {/* Course name */}
                  <div className="text-[20px] font-[900] text-white leading-tight">{course.name}</div>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-[1.6] mb-4 flex-1">
                    {course.description}
                  </p>

                  {/* Subjects */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {course.subjects.slice(0, 3).map((s) => (
                      <span key={s} className="text-[10px] font-[600] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.05] px-2 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                    {course.subjects.length > 3 && (
                      <span className="text-[10px] font-[600] text-slate-400 bg-slate-100 dark:bg-white/[0.05] px-2 py-0.5 rounded-full">
                        +{course.subjects.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between mb-4 text-[11.5px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{course.students}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-[#D4A72C] text-[#D4A72C]" />
                      <span className="font-[600] text-slate-700 dark:text-slate-200">{course.rating}</span>
                    </div>
                    <div className="font-[600] text-slate-600 dark:text-slate-300">{course.questionCount}</div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                    <span className={`text-[11px] font-[700] px-2 py-0.5 rounded-full ${
                      course.difficulty === "Advanced"
                        ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10"
                        : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                    }`}>
                      {course.difficulty}
                    </span>
                    <span className="text-[12px] font-[700] text-[#D4A72C] flex items-center gap-1 group-hover:gap-2 transition-all">
                      View Course <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
