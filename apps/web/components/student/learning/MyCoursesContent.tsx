"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Target,
  Clock,
  ArrowRight,
  PlayCircle,
  Trophy,
  BookMarked,
  GraduationCap,
  RefreshCw,
  Compass,
  Lock,
  CheckCircle2,
  Sparkles,
  Layers,
  Search,
  X,
  ChevronRight,
  AlertCircle,
  Check,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  courseEnrollmentApi,
  MyLearningData,
  MyCourse,
  CourseAccessState,
} from "@/lib/api/enrollment";
import { publicApi } from "@/lib/api/public-api";
import { studentSettingsApi } from "@/lib/api/student-settings";
import { useStudentContext } from "@/contexts/StudentContext";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

interface HierarchyCourseNode {
  id: number;
  title: string;
  slug: string;
  short_description?: string;
  thumbnail?: string | null;
  status: string;
  is_coming_soon: boolean;
  has_plans: boolean;
}

interface HierarchyExamNode {
  id: number;
  name: string;
  description?: string;
  children?: HierarchyExamNode[];
  courses?: HierarchyCourseNode[];
}

interface HierarchyCategoryNode {
  id: number;
  name: string;
  description?: string;
  exams?: HierarchyExamNode[];
}

export function MyCoursesContent() {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { activeCourse, selectCourse, isSwitching } = useStudentContext();

  // Active view filters (category & level)
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [filterLevelId, setFilterLevelId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [browseModalOpen, setBrowseModalOpen] = useState(false);
  const [setPrefModalOpen, setSetPrefModalOpen] = useState(false);

  // Hierarchy drill-down state for Browse modal
  const [modalCategory, setModalCategory] = useState<HierarchyCategoryNode | null>(null);
  const [modalLevel, setModalLevel] = useState<HierarchyExamNode | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [savingPref, setSavingPref] = useState(false);

  // Query structured My Learning data
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<MyLearningData>({
    queryKey: ["my-learning-data", filterCategoryId, filterLevelId, searchQuery],
    queryFn: () =>
      courseEnrollmentApi.getMyLearning({
        category_id: filterCategoryId ?? undefined,
        level_id: filterLevelId ?? undefined,
        search: searchQuery.trim() || undefined,
      }),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  // Query central academic hierarchy for Browse Another Course modal
  const { data: hierarchyData } = useQuery({
    queryKey: ["course-hierarchy-browse"],
    queryFn: () => publicApi.getCourseHierarchy(),
    staleTime: 5 * 60 * 1000,
  });
  const hierarchy: HierarchyCategoryNode[] = Array.isArray(hierarchyData) ? (hierarchyData as HierarchyCategoryNode[]) : [];

  const isBrowsingCustom =
    filterCategoryId !== null || filterLevelId !== null;

  const handleResetToRegistered = () => {
    setFilterCategoryId(null);
    setFilterLevelId(null);
    setSearchQuery("");
  };

  const prefetchCourse = (courseId: number) => {
    queryClient.prefetchQuery({
      queryKey: ["course-detail", courseId],
      queryFn: () => courseEnrollmentApi.getCourseDetails(courseId),
      staleTime: 120 * 1000,
    });
  };

  const handleSaveRegistrationPreference = async (catId: number, levelId: number) => {
    setSavingPref(true);
    try {
      await studentSettingsApi.updateProfile({
        target_category: catId,
        target_position: levelId,
      });
      toast.success("Target preparation preferences updated successfully!");
      setSetPrefModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["my-learning-data"] });
      queryClient.invalidateQueries({ queryKey: ["student-context"] });
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      toast.error(error?.detail || error?.message || "Failed to update target preparation.");
    } finally {
      setSavingPref(false);
    }
  };

  // Levels for modal category selection
  const modalAvailableLevels = useMemo(() => {
    if (!modalCategory) return [];
    return modalCategory.exams || [];
  }, [modalCategory]);

  // Courses for modal level selection
  const modalAvailableCourses = useMemo(() => {
    if (!modalLevel) return [];
    const directCourses = modalLevel.courses || [];
    const childCourses = (modalLevel.children || []).flatMap((c: HierarchyExamNode) => c.courses || []);
    const all = [...directCourses, ...childCourses];
    if (!modalSearch.trim()) return all;
    const q = modalSearch.toLowerCase();
    return all.filter((c: HierarchyCourseNode) => c.title.toLowerCase().includes(q));
  }, [modalLevel, modalSearch]);

  const renderAccessBadge = (state?: CourseAccessState) => {
    switch (state) {
      case "enrolled":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-[11px] gap-1 shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Enrolled
          </Badge>
        );
      case "active_subscription":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold text-[11px] gap-1 shadow-2xs">
            <Sparkles className="w-3 h-3 text-blue-600" /> Active Package
          </Badge>
        );
      case "free_trial":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-[11px] gap-1 shadow-2xs">
            <Sparkles className="w-3 h-3 text-amber-600" /> Free Tier / Trial
          </Badge>
        );
      case "coin_unlocked":
        return (
          <Badge className="bg-amber-50 text-amber-900 border-amber-300 font-semibold text-[11px] gap-1 shadow-2xs">
            🪙 Coin Unlocked
          </Badge>
        );
      case "locked":
      default:
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 font-medium text-[11px] gap-1 shadow-2xs">
            <Lock className="w-3 h-3 text-slate-400" /> Locked
          </Badge>
        );
    }
  };

  const renderCourseCard = (item: MyCourse) => {
    const isContextActive =
      item.is_active_context ||
      (activeCourse && activeCourse.id === item.course.id) ||
      (data?.active_course_id && data.active_course_id === item.course.id);

    return (
      <div
        key={`${item.course.id}-${item.enrollment_id}`}
        onMouseEnter={() => prefetchCourse(item.course.id)}
        className={`bg-card rounded-[24px] border transition-all duration-300 overflow-hidden group flex flex-col ${isContextActive
          ? "border-primary/50 shadow-md ring-2 ring-primary/20"
          : item.has_access
            ? "border-border shadow-sm hover:shadow-lg"
            : "border-border/80 bg-slate-50/50 dark:bg-card/40 opacity-95 hover:opacity-100 shadow-xs"
          }`}
      >
        <div className="relative h-44 bg-muted/80 overflow-hidden">
          {item.course.thumbnail ? (
            <Image
              src={item.course.thumbnail}
              alt={item.course.title}
              fill
              unoptimized
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${!item.has_access ? "grayscale-30 contrast-90" : ""
                }`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2545] to-[#163E6B] text-white">
              <GraduationCap className="w-12 h-12 mb-2 opacity-50" />
              <span className="font-bold opacity-70">Preparation Course</span>
            </div>
          )}

          {/* Badges on Thumbnail */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[85%]">
            {item.course.level && (
              <span className="bg-card/90 backdrop-blur-sm text-primary dark:text-foreground text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                {item.course.level.name}
              </span>
            )}
            {item.course.category && !item.course.level && (
              <span className="bg-card/90 backdrop-blur-sm text-primary dark:text-foreground text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                {item.course.category.name}
              </span>
            )}
          </div>

          <div className="absolute top-3 right-3">
            {renderAccessBadge(item.access_state)}
          </div>

          {/* Hover Play Button for Accessible Courses */}
          {item.has_access && (
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Link
                href={`/student/courses/${item.course.id}`}
                aria-label={`Start course ${item.course.title}`}
                className="w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors text-white shadow-md"
              >
                <PlayCircle className="w-6 h-6" />
              </Link>
            </div>
          )}
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isContextActive && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <Check className="w-2.5 h-2.5" /> Current Active
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-primary dark:text-foreground leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {item.has_access ? (
                <Link href={`/student/courses/${item.course.id}`}>
                  {item.course.title}
                </Link>
              ) : (
                item.course.title
              )}
            </h3>

            <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
              {item.course.short_description ||
                "Comprehensive syllabus preparation, mock examinations, topic drills, and study notes."}
            </p>
          </div>

          <div className="mt-auto space-y-3.5 pt-3.5 border-t border-border/50">
            {item.has_access ? (
              <>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" /> Syllabus Progress
                    </span>
                    <span className="text-xs font-bold text-primary dark:text-foreground">
                      {item.progress.percentage}%
                    </span>
                  </div>
                  <Progress
                    value={item.progress.percentage}
                    className="h-1.5 bg-muted/80"
                  />
                  <div className="flex justify-between items-center mt-1 text-[10px] font-medium text-muted-foreground">
                    <span>
                      {item.progress.completed_topics} / {item.progress.total_topics} topics completed
                    </span>
                    {item.expires_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Ends {new Date(item.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    className="flex-1 bg-primary text-primary-foreground hover:bg-[#163E6B] text-white font-semibold rounded-[12px] h-9 text-xs shadow-xs"
                  >
                    <Link href={`/student/courses/${item.course.id}`}>
                      Resume Learning <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>

                  {!isContextActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSwitching}
                      onClick={() => selectCourse(item.course.id)}
                      className="text-[11px] font-semibold rounded-[12px] h-9 px-2.5 border-border"
                      title="Set as primary active learning context across dashboard"
                    >
                      Set Active
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Package or course subscription required to access.
                </p>
                <Button
                  asChild
                  className="w-full bg-[#0B2545] hover:bg-[#163E6B] text-white font-semibold rounded-[12px] h-9 text-xs shadow-xs"
                >
                  <Link
                    href={`/student/buy-course/plans?course_id=${item.course.id}&course_name=${encodeURIComponent(
                      item.course.title
                    )}&exam_id=${item.course.exam?.id || ""}`}
                  >
                    Unlock Course <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Scope & Control Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isBrowsingCustom ? "Active Scope Filter" : "My Registered Preparation"}
            </span>
            {isBrowsingCustom ? (
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold text-xs gap-1">
                <Compass className="w-3.5 h-3.5 text-amber-700" /> Browsing Discovery
              </Badge>
            ) : data?.is_preference_set ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-xs gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Tailored Context
              </Badge>
            ) : null}
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-primary dark:text-foreground tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#D4A72C]" />
              {data?.selected_level?.name ? (
                <>
                  <span>{data.selected_category?.name}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[#0B2545] dark:text-[#D4A72C]">{data.selected_level.name}</span>
                </>
              ) : data?.registered_level?.name ? (
                <>
                  <span>{data.registered_category?.name}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[#0B2545] dark:text-[#D4A72C]">{data.registered_level.name}</span>
                </>
              ) : (
                <span>All Available Courses</span>
              )}
            </h2>
          </div>

          <p className="text-xs text-muted-foreground">
            {isBrowsingCustom
              ? "Exploring courses in this level. Your persistent registration preferences remain safely preserved."
              : "Showing preparation courses belonging to your registration target. Enrolled courses and available plans are shown below."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isBrowsingCustom && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToRegistered}
              className="rounded-xl text-xs font-semibold border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 h-9"
            >
              <X className="w-3.5 h-3.5 mr-1 text-amber-700" /> Reset to My Focus
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setModalCategory(null);
              setModalLevel(null);
              setModalSearch("");
              setBrowseModalOpen(true);
            }}
            className="rounded-xl text-xs font-semibold border-border hover:bg-muted text-primary dark:text-foreground h-9 px-3.5 shadow-2xs"
          >
            <Compass className="w-4 h-4 mr-1.5 text-[#D4A72C]" />
            Browse Another Course
          </Button>

          <Button
            asChild
            className="rounded-xl text-xs font-bold bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-95 text-white h-9 px-4 shadow-[0_4px_14px_rgba(212,167,44,0.3)]"
          >
            <Link href="/student/buy-course">
              <GraduationCap className="w-4 h-4 mr-1.5" />
              Buy Another Course
            </Link>
          </Button>
        </div>
      </div>

      {/* Missing Registration Preferences Banner */}
      {data && !data.is_preference_set && !isBrowsingCustom && (
        <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/70 text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-blue-950">Set Your Target Preparation</h4>
              <p className="text-xs text-blue-800/90 mt-0.5 max-w-xl">
                You haven&apos;t designated a target Exam Category and Level yet. Personalize your My Learning view so only your target syllabus, notes, and mock tests are presented.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setSetPrefModalOpen(true)}
            className="bg-[#0B2545] hover:bg-[#163E6B] text-white text-xs font-semibold rounded-xl h-9 shrink-0 px-4"
          >
            Choose Preparation Focus
          </Button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses in this preparation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl bg-card border-border"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
          {data?.courses?.length ?? 0} course{data?.courses?.length !== 1 ? "s" : ""} in view
        </span>
      </div>

      {/* Loading State */}
      {(isLoading || authLoading) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-[24px] border border-border p-5 animate-pulse space-y-4">
              <div className="h-44 bg-muted/80 rounded-[16px]"></div>
              <div className="h-6 bg-muted/80 rounded w-3/4"></div>
              <div className="h-4 bg-muted/60 rounded w-full"></div>
              <div className="h-10 bg-muted/80 rounded-[12px] w-full"></div>
            </div>
          ))}
        </div>
      )}

      {/* Unauthenticated State */}
      {!authLoading && !user && (
        <div className="bg-card border border-border rounded-[24px] p-8 text-center max-w-lg mx-auto shadow-sm">
          <BookOpen className="w-12 h-12 text-[#D4A72C] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground">Sign In to View Your Learning</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Please log in with your student account to view enrolled preparation courses and explore study materials.
          </p>
          <Link href="/login?redirect=/student/learning">
            <Button className="mt-4 bg-[#0B2545] hover:bg-[#163E6B] text-white font-bold h-9 text-xs rounded-xl">
              Sign In Now
            </Button>
          </Link>
        </div>
      )}

      {/* Error State */}
      {!authLoading && user && isError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 p-8 rounded-[20px] text-center">
          <Trophy className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold">Failed to load courses</h3>
          <p className="mt-1 text-xs">
            {error instanceof Error ? error.message : "An error occurred while fetching your course catalog. Please refresh."}
          </p>
          <Button onClick={() => refetch()} className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold h-9 text-xs rounded-xl">
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
        </div>
      )}

      {/* Primary Courses Grid */}
      {!isLoading && !authLoading && user && !isError && (
        <>
          {data?.courses && data.courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.courses.map((item) => renderCourseCard(item))}
            </div>
          ) : (
            <div className="bg-card border border-border shadow-xs rounded-[24px] p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <BookMarked className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-bold text-primary dark:text-foreground mb-1">
                {searchQuery ? "No matching courses found" : "No courses in this preparation yet"}
              </h3>
              <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
                {searchQuery
                  ? "Try adjusting your search keywords."
                  : "Explore another exam category or level to discover available preparation courses."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBrowseModalOpen(true)}
                className="rounded-xl text-xs font-semibold h-9"
              >
                <Compass className="w-4 h-4 mr-1.5 text-[#D4A72C]" /> Browse Other Preparations
              </Button>
            </div>
          )}

          {/* Other Enrolled Courses Section (Outside current level) */}
          {data?.other_enrolled_courses && data.other_enrolled_courses.length > 0 && (
            <div className="pt-8 space-y-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-primary dark:text-foreground flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#D4A72C]" /> Other Enrolled Preparations
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Courses you previously enrolled in or unlocked from other exam categories and levels.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  {data.other_enrolled_courses.length} Active
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.other_enrolled_courses.map((item) => renderCourseCard(item))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── MODAL: Browse Another Course (Discovery) ─── */}
      <Dialog open={browseModalOpen} onOpenChange={setBrowseModalOpen}>
        <DialogContent className="max-w-2xl p-6 rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#0B2545]">
              <Compass className="w-5 h-5 text-[#D4A72C]" /> Browse Central Course Catalog
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Explore preparation courses across Loksewa PSC, License, and Entrance exams without altering your registered focus.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Step 1: Category Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Select Exam Category:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {hierarchy.map((cat: HierarchyCategoryNode) => {
                  const isSelected = modalCategory?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setModalCategory(cat);
                        setModalLevel(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all text-xs ${isSelected
                        ? "bg-[#0B2545] text-white border-[#0B2545] font-bold shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                    >
                      <div className="truncate">{cat.name}</div>
                      <div className={`text-[10px] ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                        {cat.exams?.length || 0} levels
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Level Picker */}
            {modalCategory && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Select Level ({modalCategory.name}):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {modalAvailableLevels.map((lvl: HierarchyExamNode) => {
                    const isSelected = modalLevel?.id === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setModalLevel(lvl)}
                        className={`p-3 rounded-xl border text-left transition-all text-xs ${isSelected
                          ? "bg-[#D4A72C] text-[#0A1118] border-[#D4A72C] font-bold shadow-xs"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                      >
                        <div className="truncate">{lvl.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {(lvl.courses?.length || 0) + (lvl.children?.length || 0)} preparations
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Courses List */}
            {modalLevel && modalCategory && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    3. Courses in {modalLevel.name} ({modalAvailableCourses.length}):
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterCategoryId(modalCategory.id);
                      setFilterLevelId(modalLevel.id);
                      setBrowseModalOpen(false);
                      toast.success(`Showing courses for ${modalCategory.name} › ${modalLevel.name}`);
                    }}
                    className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold"
                  >
                    Filter My Learning view to this level →
                  </Button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {modalAvailableCourses.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No courses configured under this level yet.
                    </div>
                  ) : (
                    modalAvailableCourses.map((c: HierarchyCourseNode) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{c.title}</div>
                          {c.short_description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {c.short_description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">ID: #{c.id}</span>
                            <span>{modalCategory.name} › {modalLevel.name}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            asChild
                            size="sm"
                            className="bg-[#0B2545] text-white hover:bg-[#163E6B] text-xs h-8 rounded-lg"
                          >
                            <Link
                              href={`/student/buy-course/plans?course_id=${c.id}&course_name=${encodeURIComponent(
                                c.title
                              )}&exam_id=${modalLevel.id}`}
                            >
                              View Plans & Enroll
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Set Target Preparation Focus ─── */}
      <Dialog open={setPrefModalOpen} onOpenChange={setSetPrefModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0B2545]">
              Choose Your Primary Preparation Focus
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This sets your default academic category and level across your dashboard, study materials, and tests.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Exam Category</label>
              <div className="grid grid-cols-2 gap-2">
                {hierarchy.map((cat: HierarchyCategoryNode) => {
                  const isSelected = modalCategory?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setModalCategory(cat);
                        setModalLevel(null);
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs ${isSelected
                        ? "bg-[#0B2545] text-white font-bold"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                    >
                      <div className="truncate">{cat.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {modalCategory && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Level</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {modalAvailableLevels.map((lvl: HierarchyExamNode) => {
                    const isSelected = modalLevel?.id === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setModalLevel(lvl)}
                        className={`p-2.5 rounded-xl border text-left text-xs ${isSelected
                          ? "bg-[#D4A72C] text-[#0A1118] font-bold"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                      >
                        <div className="truncate">{lvl.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              disabled={!modalCategory || !modalLevel || savingPref}
              onClick={() => {
                if (modalCategory && modalLevel) {
                  handleSaveRegistrationPreference(modalCategory.id, modalLevel.id);
                }
              }}
              className="w-full bg-[#0B2545] hover:bg-[#163E6B] text-white font-semibold rounded-xl h-10 text-xs mt-2"
            >
              {savingPref ? "Saving Preference..." : "Save Preparation Focus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
