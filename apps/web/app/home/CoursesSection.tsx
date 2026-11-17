import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  Layers,
  Landmark,
  BadgeCheck,
  GraduationCap,
  Library,
} from "lucide-react";
import { PublicCategory, PublicCourse } from "@/lib/api/public-api";

// ── Static curated fallback (canonical database categories) ──
const STATIC_CATEGORIES: PublicCategory[] = [
  {
    id: 24,
    name: "PSC Exams",
    description:
      "Public Service Commission examinations and technical engineering preparation programs.",
    order: 1,
    course_count: 7,
    published_course_count: 3,
  },
  {
    id: 25,
    name: "License Exams",
    description:
      "Engineering license examination preparation for NEC and Diploma professional certifications.",
    order: 2,
    course_count: 9,
    published_course_count: 5,
  },
  {
    id: 23,
    name: "Entrance Exams",
    description:
      "Undergraduate and postgraduate engineering entrance examinations preparation.",
    order: 3,
    course_count: 2,
    published_course_count: 2,
  },
  {
    id: 26,
    name: "University Exams",
    description:
      "Curriculum-aligned engineering university semester examinations preparation.",
    order: 4,
    course_count: 0,
    published_course_count: 0,
  },
];

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  "PSC Exams":
    "Public Service Commission examinations and technical engineering preparation programs.",
  "License Exams":
    "Engineering license examination preparation for NEC and Diploma professional certifications.",
  "Entrance Exams":
    "Undergraduate and postgraduate engineering entrance examinations preparation.",
  "University Exams":
    "Curriculum-aligned engineering university semester examinations preparation.",
};

const ACCENTS = [
  "from-blue-600 to-indigo-700",
  "from-emerald-600 to-teal-700",
  "from-violet-600 to-purple-700",
  "from-amber-600 to-orange-700",
];

// Helper to choose the most appropriate icon for each canonical category
function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("psc") || lower.includes("public service") || lower.includes("loksewa")) {
    return Landmark;
  }
  if (lower.includes("license") || lower.includes("nec") || lower.includes("diploma")) {
    return BadgeCheck;
  }
  if (lower.includes("entrance") || lower.includes("ioe")) {
    return GraduationCap;
  }
  if (lower.includes("university") || lower.includes("semester") || lower.includes("academic")) {
    return Library;
  }
  return BookOpen;
}

// Helper to get category tag / badge
function getCategoryTag(name: string, courseCount: number) {
  const lower = name.toLowerCase();
  if (courseCount === 0) return "Coming Soon";
  if (lower.includes("license") || lower.includes("psc")) return "Popular";
  if (lower.includes("entrance")) return "Trending";
  return null;
}

interface Props {
  categories?: PublicCategory[] | null;
  courses?: PublicCourse[] | null;
}

export function CoursesSection({ categories: apiCategories, courses: apiCourses }: Props) {
  // Deduplicate and resolve canonical categories:
  // 1. If explicit category array provided and non-empty, use it.
  // 2. If courses array provided, aggregate by canonical category.
  // 3. Otherwise fall back to STATIC_CATEGORIES.
  let resolvedCategories: PublicCategory[] = [];

  if (apiCategories && apiCategories.length > 0) {
    resolvedCategories = apiCategories;
  } else if (apiCourses && apiCourses.length > 0) {
    const catMap = new Map<number, PublicCategory>();
    for (const c of apiCourses) {
      const catId = c.exam?.category_id || c.category_id;
      const catName = c.exam?.category_name || c.category_name;
      if (catId && catName) {
        if (!catMap.has(catId)) {
          catMap.set(catId, {
            id: catId,
            name: catName,
            description: "",
            order: c.order ?? 0,
            course_count: 0,
            published_course_count: 0,
          });
        }
        const cat = catMap.get(catId)!;
        cat.course_count += 1;
        if (c.status === "published") {
          cat.published_course_count = (cat.published_course_count || 0) + 1;
        }
      }
    }
    resolvedCategories = Array.from(catMap.values()).sort(
      (a, b) => a.order - b.order || a.id - b.id
    );
  }

  if (resolvedCategories.length === 0) {
    resolvedCategories = STATIC_CATEGORIES;
  }

  // Ensure each canonical category appears exactly once
  const uniqueCategories = Array.from(
    new Map(resolvedCategories.map((c) => [c.id, c])).values()
  );

  return (
    <section className="py-12 sm:py-14 lg:py-16 bg-slate-50 dark:bg-[#04080F] relative overflow-hidden">
      <div className="absolute inset-0 bg-neural-grid-light dark:bg-neural-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px section-divider-light dark:section-divider" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-10">
          <div>
            <div className="eyebrow-pill inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10.5px] font-[800] uppercase tracking-widest text-blue-500 dark:text-blue-400">
                PREPARATION CATEGORIES
              </span>
            </div>
            <h2 className="text-[32px] md:text-[44px] font-[900] text-slate-900 dark:text-white tracking-tight leading-[1.1]">
              Explore{" "}
              <span className="text-gradient-blue-violet">preparation categories.</span>
            </h2>
          </div>
          <Link href="/courses">
            <Button
              variant="outline"
              className="border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:text-slate-900 dark:hover:text-[#2563EB] hover:bg-slate-100 dark:hover:bg-white/10 hover:border-[#2563EB]/50 dark:hover:border-[#2563EB]/50 bg-transparent transition-all h-[44px] px-6 rounded-[10px] font-[600] text-[14px] flex items-center gap-2 group whitespace-nowrap shadow-sm"
            >
              Explore All Categories
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {uniqueCategories.map((category, i) => {
            const Icon = getCategoryIcon(category.name);
            const tag = getCategoryTag(category.name, category.course_count);
            const accent = ACCENTS[i % ACCENTS.length];
            const description =
              category.description?.trim() ||
              DEFAULT_DESCRIPTIONS[category.name] ||
              `Comprehensive preparation programs and study resources for ${category.name}.`;

            return (
              <Link
                key={category.id}
                href={`/courses?category=${category.id}`}
                className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-[20px]"
              >
                <div className="bg-white dark:bg-[#060E18] border border-slate-200 dark:border-white/[0.06] rounded-[20px] overflow-hidden hover:border-slate-300 dark:hover:border-white/[0.12] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] card-hover h-full flex flex-col transition-all duration-300">
                  {/* Gradient header */}
                  <div
                    className={`relative h-[110px] bg-gradient-to-br ${accent} flex flex-col justify-between p-4`}
                  >
                    {/* Tag & Icon */}
                    <div className="flex justify-between items-start">
                      {tag ? (
                        <span className="text-[10px] font-[800] text-white/90 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full uppercase tracking-wide">
                          {tag}
                        </span>
                      ) : (
                        <span />
                      )}
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    {/* Category name */}
                    <div className="text-[20px] font-[900] text-white leading-tight">
                      {category.name}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-[1.6] mb-4 flex-1">
                      {description}
                    </p>

                    {/* Course Count Info */}
                    <div className="flex items-center justify-between mb-4 text-[11.5px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5" title="Available courses">
                        <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-[600] text-slate-700 dark:text-slate-200">
                          {category.course_count}{" "}
                          {category.course_count === 1 ? "Course" : "Courses"}
                        </span>
                      </div>
                      {category.course_count === 0 ? (
                        <span className="text-[10.5px] font-[600] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          Upcoming
                        </span>
                      ) : category.published_course_count !== undefined &&
                        category.published_course_count > 0 ? (
                        <span className="text-[10.5px] font-[600] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {category.published_course_count} Active
                        </span>
                      ) : null}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                      <span className="text-[12px] font-[600] text-slate-500 dark:text-slate-400">
                        Browse catalog
                      </span>
                      <span className="text-[12px] font-[700] text-[#2563EB] flex items-center gap-1 group-hover:gap-2 transition-all">
                        Explore Category <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export const PreparationCategoriesSection = CoursesSection;
