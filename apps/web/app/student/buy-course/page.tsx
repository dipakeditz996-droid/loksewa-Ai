"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  BookOpen,
  Search,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApi } from "@/lib/api/public-api";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseNode {
  id: number;
  title: string;
  slug: string;
  short_description?: string;
  status?: string;
}

interface ExamNode {
  id: number;
  name: string;
  description?: string;
  status?: string;
  courses?: CourseNode[];
  children?: ExamNode[];
}

interface CategoryNode {
  id: number;
  name: string;
  description?: string;
  exams?: ExamNode[];
}

interface BreadcrumbItem {
  id: number;
  name: string;
  type: "category" | "exam";
  node: CategoryNode | ExamNode;
}

// ─── Step Progress ────────────────────────────────────────────────────────────

function StepProgress({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Select Preparation" },
    { n: 2, label: "Choose Plan" },
    { n: 3, label: "Checkout" },
  ];
  return (
    <div className="flex items-center gap-0 w-full max-w-md mx-auto">
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  done
                    ? "bg-[#D4A72C] border-[#D4A72C] text-[#0A1118]"
                    : active
                    ? "bg-transparent border-[#D4A72C] text-[#D4A72C]"
                    : "bg-transparent border-border text-muted-foreground"
                }`}
              >
                {done ? "✓" : s.n}
              </div>
              <span
                className={`text-[10px] font-semibold hidden sm:block ${
                  active
                    ? "text-foreground"
                    : done
                    ? "text-[#D4A72C]"
                    : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 transition-colors ${
                  done ? "bg-[#D4A72C]" : "bg-border"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="animate-pulse bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="h-5 bg-muted rounded w-2/3" />
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-3/4" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BuyCoursePreparationPage() {
  const router = useRouter();

  const [hierarchy, setHierarchy] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Breadcrumb drill-down path
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    publicApi
      .getCourseHierarchy()
      .then((res) => {
        setHierarchy(res ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load preparations. Please refresh the page.");
        setLoading(false);
      });
  }, []);

  // Current level: what should be shown as selectable cards
  const currentLevel = useCallback((): CategoryNode[] | ExamNode[] => {
    if (breadcrumb.length === 0) return hierarchy;
    const last = breadcrumb[breadcrumb.length - 1];
    if (!last) return hierarchy;
    if (last.type === "category") {
      return (last.node as CategoryNode).exams ?? [];
    } else {
      return (last.node as ExamNode).children ?? [];
    }
  }, [breadcrumb, hierarchy]);

  // Courses available at current exam node
  const currentCourses = useCallback((): CourseNode[] => {
    if (breadcrumb.length === 0) return [];
    const last = breadcrumb[breadcrumb.length - 1];
    if (!last) return [];
    if (last.type === "exam") {
      return (last.node as ExamNode).courses ?? [];
    }
    return [];
  }, [breadcrumb]);

  const handleSelectCategory = (cat: CategoryNode) => {
    setBreadcrumb([{ id: cat.id, name: cat.name, type: "category", node: cat }]);
    setSearch("");
  };

  const handleSelectExam = (exam: ExamNode) => {
    setBreadcrumb((prev) => [
      ...prev,
      { id: exam.id, name: exam.name, type: "exam", node: exam },
    ]);
    setSearch("");
  };

  const handleBreadcrumbNav = (idx: number) => {
    setBreadcrumb((prev) => prev.slice(0, idx + 1));
    setSearch("");
  };

  const handleResetBreadcrumb = () => {
    setBreadcrumb([]);
    setSearch("");
  };

  // When user picks an exam that has courses → go to plans
  const handleSelectPreparation = (exam: ExamNode) => {
    const hasCourses = (exam.courses ?? []).length > 0;
    const hasChildren = (exam.children ?? []).length > 0;

    if (hasChildren) {
      handleSelectExam(exam);
      return;
    }

    if (hasCourses || !hasChildren) {
      // Navigate to plans with this exam's id
      router.push(`/student/buy-course/plans?exam_id=${exam.id}&exam_name=${encodeURIComponent(exam.name)}`);
    }
  };

  const levels = currentLevel();
  const courses = currentCourses();
  const lastCrumb = breadcrumb[breadcrumb.length - 1];

  // Search filtering
  const filterBySearch = <T extends { name: string }>(items: T[]): T[] => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  };

  const filteredLevels = filterBySearch(levels as any[]);
  const filteredCourses = courses.filter((c) => {
    if (!search.trim()) return true;
    return c.title.toLowerCase().includes(search.toLowerCase());
  });

  // Depth from breadcrumb
  const depth = breadcrumb.length; // 0 = categories, 1 = exam level1, 2+ = nested

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/student/learning"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Learning
        </Link>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#D4A72C]/10 text-[#D4A72C] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              New Enrollment
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary dark:text-foreground tracking-tight">
            Buy Another Course
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Select your preparation to see available subscription plans.
          </p>
        </div>

        <StepProgress current={1} />
      </div>

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1.5 text-sm flex-wrap">
          <button
            onClick={handleResetBreadcrumb}
            className="text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            All Preparations
          </button>
          {breadcrumb.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight className="w-3.5 h-3.5 text-border shrink-0" />
              {idx < breadcrumb.length - 1 ? (
                <button
                  onClick={() => handleBreadcrumbNav(idx)}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  {crumb.name}
                </button>
              ) : (
                <span className="text-foreground font-semibold">{crumb.name}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">{error}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Search */}
          {(filteredLevels.length > 0 || filteredCourses.length > 0 || search) && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search preparations..."
                className="pl-9 pr-9 h-10 rounded-xl bg-card border-border"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Section heading when drilling into exams */}
          {depth > 0 && lastCrumb && (
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                {lastCrumb.type === "category"
                  ? `${lastCrumb.name} — Select Level or Service`
                  : `${lastCrumb.name} — Select Preparation`}
              </h2>
              <p className="text-sm text-muted-foreground">
                {filteredCourses.length > 0
                  ? "Select your specific preparation below."
                  : "Drill down further or select a preparation."}
              </p>
            </div>
          )}

          {depth === 0 && !search && (
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                Select Your Exam Category
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose the category that best matches your preparation goal.
              </p>
            </div>
          )}

          {/* Exam / Category cards */}
          {filteredLevels.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLevels.map((node: any) => {
                const isExam = "children" in node || "courses" in node;
                const hasCourses =
                  isExam && (node.courses?.length ?? 0) > 0;
                const hasChildren =
                  isExam && (node.children?.length ?? 0) > 0;
                const isTerminal = isExam && hasCourses && !hasChildren;

                return (
                  <button
                    key={node.id}
                    onClick={() => {
                      if (!isExam) {
                        handleSelectCategory(node as CategoryNode);
                      } else {
                        if (isTerminal) {
                          handleSelectPreparation(node as ExamNode);
                        } else {
                          handleSelectExam(node as ExamNode);
                        }
                      }
                    }}
                    className="group text-left bg-card border border-border hover:border-[#D4A72C]/60 hover:shadow-[0_4px_20px_rgba(212,167,44,0.1)] rounded-2xl p-5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#D4A72C]/10 border border-[#D4A72C]/20 flex items-center justify-center shrink-0 group-hover:bg-[#D4A72C]/15 transition-colors">
                        <BookOpen className="w-5 h-5 text-[#D4A72C]" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#D4A72C] group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
                    </div>

                    <div className="mt-3 space-y-1">
                      <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight group-hover:text-[#D4A72C] transition-colors">
                        {node.name}
                      </h3>
                      {node.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {node.description}
                        </p>
                      )}
                    </div>

                    {isTerminal && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#D4A72C] bg-[#D4A72C]/10 px-2 py-0.5 rounded-full">
                          <ArrowRight className="w-3 h-3" />
                          View Plans
                        </span>
                      </div>
                    )}

                    {!isTerminal && isExam && hasChildren && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {node.children?.length} sub-preparation
                          {node.children?.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    {!isExam && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {(node as CategoryNode).exams?.length ?? 0} level
                          {((node as CategoryNode).exams?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Terminal courses list — allows direct selection if multiple courses exist */}
          {filteredCourses.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Available Courses
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCourses.map((course) => {
                  const examNode = lastCrumb?.node as ExamNode;
                  return (
                    <button
                      key={course.id}
                      onClick={() =>
                        router.push(
                          `/student/buy-course/plans?exam_id=${examNode?.id}&exam_name=${encodeURIComponent(examNode?.name ?? "")}&course_id=${course.id}&course_name=${encodeURIComponent(course.title)}`
                        )
                      }
                      className="group text-left bg-card border border-border hover:border-[#D4A72C]/60 hover:shadow-[0_4px_16px_rgba(212,167,44,0.1)] rounded-2xl p-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-foreground group-hover:text-[#D4A72C] transition-colors leading-tight">
                            {course.title}
                          </h4>
                          {course.short_description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {course.short_description}
                            </p>
                          )}
                        </div>
                        <div className="ml-3 flex items-center gap-1 text-[#D4A72C] shrink-0">
                          <span className="text-[10px] font-bold">Plans</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredLevels.length === 0 && filteredCourses.length === 0 && !loading && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">
                  {search ? "No preparations match your search" : "No preparations available"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {search
                    ? "Try a different search term."
                    : "Please check back later or contact support."}
                </p>
              </div>
              {search && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearch("")}
                  className="rounded-xl"
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

