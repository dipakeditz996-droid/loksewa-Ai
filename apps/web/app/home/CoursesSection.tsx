"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, Users, Layers } from "lucide-react";
import { PublicCourse } from "@/lib/api/public-api";

// ── Static curated fallback (shown only when no published courses exist yet) ──
const STATIC_COURSES = [
  {
    id: -1,
    name: "Section Officer",
    description: "Comprehensive preparation for Section Officer (Sakha Adhikrit) under PSC Nepal.",
    accent: "from-blue-500 to-violet-600",
    tag: "Coming Soon",
  },
  {
    id: -2,
    name: "Kharidar",
    description: "Complete Kharidar exam preparation with structured syllabus and practice sets.",
    accent: "from-emerald-500 to-cyan-500",
    tag: "Coming Soon",
  },
  {
    id: -3,
    name: "Nayab Subba",
    description: "Targeted preparation for Nayab Subba (Lekha Service & General) examinations.",
    accent: "from-[#D4A72C] to-orange-500",
    tag: "Coming Soon",
  },
  {
    id: -4,
    name: "Sub-Engineer",
    description: "Technical & general preparation for Sub-Engineer across various departments.",
    accent: "from-red-500 to-pink-600",
    tag: "Coming Soon",
  },
];

const ACCENTS = [
  "from-blue-500 to-violet-600",
  "from-emerald-500 to-cyan-500",
  "from-[#D4A72C] to-orange-500",
  "from-red-500 to-pink-600",
];

interface Props {
  courses?: PublicCourse[] | null;
}

export function CoursesSection({ courses: apiCourses }: Props) {
  const hasRealCourses = !!apiCourses && apiCourses.length > 0;

  // Real courses (with real subject/enrollment counts and a real starting
  // price), or a clearly-labeled "coming soon" fallback while the catalog
  // is still empty — never invented ratings/student counts.
  const courses = hasRealCourses
    ? apiCourses!.slice(0, 4).map((c, i) => ({
        id: c.id,
        name: c.title,
        description: c.short_description || c.description || `Comprehensive preparation for ${c.title}.`,
        subjectCount: c.subject_count,
        enrolledCount: c.enrolled_count,
        durationMonths: c.duration_months,
        startingPrice: c.starting_price,
        accent: ACCENTS[i % ACCENTS.length],
        tag: c.featured ? "Featured" : null,
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
          {courses.map((course: any) => (
            <Link key={course.id} href="/courses" className="group block">
              <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[20px] overflow-hidden hover:border-slate-300 dark:hover:border-white/[0.12] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] card-hover h-full flex flex-col">

                {/* Gradient header */}
                <div className={`relative h-[110px] bg-gradient-to-br ${course.accent} flex flex-col justify-between p-4`}>
                  {/* Tag */}
                  <div className="flex justify-between items-start">
                    {course.tag ? (
                      <span className="text-[10px] font-[800] text-white/90 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full uppercase tracking-wide">
                        {course.tag}
                      </span>
                    ) : <span />}
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

                  {/* Real stats — subjects covered, students enrolled, duration */}
                  {hasRealCourses && (
                    <div className="flex items-center justify-between mb-4 text-[11.5px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1" title="Subjects covered">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{course.subjectCount} Subjects</span>
                      </div>
                      {course.enrolledCount > 0 && (
                        <div className="flex items-center gap-1" title="Students enrolled">
                          <Users className="w-3.5 h-3.5" />
                          <span>{course.enrolledCount} enrolled</span>
                        </div>
                      )}
                      {course.durationMonths > 0 && (
                        <div className="font-[600] text-slate-600 dark:text-slate-300">
                          {course.durationMonths}mo
                        </div>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                    <span className="text-[13px] font-[700] text-slate-700 dark:text-slate-200">
                      {hasRealCourses && course.startingPrice
                        ? `From Rs. ${Number(course.startingPrice).toLocaleString()}`
                        : ""}
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
