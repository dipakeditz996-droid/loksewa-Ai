"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BookOpen,
  Target,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  BookMarked,
  Layers,
  Landmark,
  BadgeCheck,
  GraduationCap,
  Library,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoksewaBadgeIcon } from "@/components/ui/loksewa-badge-icon";
import { publicApi, type PublicCategory, type PublicCourse } from "@/lib/api/public-api";

// Fallback canonical categories
const STATIC_CATEGORIES: PublicCategory[] = [
  {
    id: 24,
    name: "PSC Exams",
    description: "Public Service Commission examinations and technical engineering preparation programs.",
    order: 1,
    course_count: 7,
    published_course_count: 3,
  },
  {
    id: 25,
    name: "License Exams",
    description: "Engineering license examination preparation for NEC and Diploma professional certifications.",
    order: 2,
    course_count: 9,
    published_course_count: 5,
  },
  {
    id: 23,
    name: "Entrance Exams",
    description: "Undergraduate and postgraduate engineering entrance examinations preparation.",
    order: 3,
    course_count: 2,
    published_course_count: 2,
  },
  {
    id: 26,
    name: "University Exams",
    description: "Curriculum-aligned engineering university semester examinations preparation.",
    order: 4,
    course_count: 0,
    published_course_count: 0,
  },
];

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

function CoursesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>(STATIC_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Read category from URL params
  const categoryParam = searchParams.get("category") || searchParams.get("category_id");

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(() => {
    if (!categoryParam) return null;
    const num = Number(categoryParam);
    return isNaN(num) ? null : num;
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const [coursesData, categoriesData] = await Promise.all([
        publicApi.getCourses(),
        publicApi.getCategories(),
      ]);

      if (coursesData) {
        setCourses(coursesData);
      } else {
        setHasError(true);
      }

      if (categoriesData && categoriesData.length > 0) {
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error("Failed to fetch catalog data:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Synchronize state when URL param changes
  useEffect(() => {
    if (categoryParam) {
      const num = Number(categoryParam);
      if (!isNaN(num)) {
        setSelectedCategoryId(num);
      } else {
        // Find by name match
        const matched = categories.find(
          (c) => c.name.toLowerCase() === decodeURIComponent(categoryParam).toLowerCase()
        );
        if (matched) setSelectedCategoryId(matched.id);
      }
    } else {
      setSelectedCategoryId(null);
    }
  }, [categoryParam, categories]);

  const handleSelectCategory = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId === null) {
      params.delete("category");
      params.delete("category_id");
    } else {
      params.set("category", String(categoryId));
      params.delete("category_id");
    }
    const qs = params.toString();
    router.replace(`/courses${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const selectedCategoryObj = useMemo(() => {
    if (selectedCategoryId === null) return null;
    return categories.find((c) => c.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  // Filter courses by category and search query
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Category filter
      if (selectedCategoryId !== null) {
        const courseCatId = course.exam?.category_id || course.category_id;
        const courseCatName = course.exam?.category_name || course.category_name;

        const matchesId = courseCatId === selectedCategoryId;
        const matchesName =
          selectedCategoryObj &&
          courseCatName &&
          courseCatName.toLowerCase() === selectedCategoryObj.name.toLowerCase();

        if (!matchesId && !matchesName) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = course.title.toLowerCase().includes(q);
        const matchesDesc = (course.short_description || course.description || "")
          .toLowerCase()
          .includes(q);
        const matchesExam = (course.exam?.title || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesExam) {
          return false;
        }
      }

      return true;
    });
  }, [courses, selectedCategoryId, selectedCategoryObj, searchQuery]);

  // Format price helper
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <>
      <main className="flex-1 bg-slate-50 dark:bg-[#040B14] min-h-screen pt-[72px]">
        {/* 1. PREMIUM HERO SECTION */}
        <section className="relative overflow-hidden bg-[#0A1118] border-b border-white/5 py-10 md:py-16">
          {/* Background Image & Layers */}
          <div className="absolute inset-0 z-0">
            <div
              className="absolute inset-0 opacity-[0.35] blur-[1px] bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url('/media/course.webp')` }}
            />
            <div className="absolute inset-0 bg-[#0A1118]/65 mix-blend-multiply" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0A1118_100%)] opacity-80" />
            <div className="absolute top-[-10%] left-[-15%] w-[800px] h-[800px] bg-[#163E6B]/60 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-[-10%] right-[-15%] w-[900px] h-[900px] bg-[#D4A72C]/25 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] mix-blend-overlay" />
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#040B14] to-transparent" />
          </div>

          <div className="container relative z-10 mx-auto px-4 max-w-[1200px] flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6">
              <LoksewaBadgeIcon className="w-4 h-4 text-[#D4A72C]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
                Curated Engineering Preparation
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-[900] tracking-tight text-white mb-6">
              Explore Preparation Categories & Courses
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-3xl leading-relaxed mb-10">
              Browse canonical preparation programs across PSC Exams, License Certifications, and
              Entrance Tests. Select your category to view targeted courses and study materials.
            </p>

            {/* 2. PREMIUM SEARCH EXPERIENCE */}
            <div className="w-full max-w-3xl flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <div className="absolute inset-0 bg-[#D4A72C]/20 rounded-[12px] blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center bg-white/5 border border-white/10 rounded-[12px] overflow-hidden backdrop-blur-xl focus-within:bg-white/10 focus-within:border-white/20 transition-all shadow-lg">
                  <Search className="absolute left-4 w-5 h-5 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses, exams, subjects, or topics..."
                    className="w-full pl-12 pr-16 h-[54px] bg-transparent border-none text-white placeholder:text-slate-500 focus-visible:ring-0 text-[15px]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. CATEGORY TABS NAVIGATION */}
        <section className="border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#070D16]/80 backdrop-blur-md sticky top-[72px] z-30">
          <div className="container mx-auto px-4 max-w-[1200px]">
            <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
              <span className="text-[12px] font-[700] uppercase tracking-wider text-slate-400 mr-2 shrink-0 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                Categories:
              </span>

              {/* All Categories Pill */}
              <button
                onClick={() => handleSelectCategory(null)}
                className={`px-4 py-2 rounded-full text-[13px] font-[700] transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
                  selectedCategoryId === null
                    ? "bg-[#0B2545] dark:bg-white text-white dark:text-[#0A1118] border-transparent shadow-sm"
                    : "bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>All Categories</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                    selectedCategoryId === null
                      ? "bg-white/20 dark:bg-black/10 text-white dark:text-[#0A1118]"
                      : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {courses.length}
                </span>
              </button>

              {/* Canonical Category Pills */}
              {categories.map((category) => {
                const Icon = getCategoryIcon(category.name);
                const isSelected = selectedCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleSelectCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-[13px] font-[700] transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
                      isSelected
                        ? "bg-[#0B2545] dark:bg-white text-white dark:text-[#0A1118] border-transparent shadow-sm"
                        : "bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{category.name}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-white/20 dark:bg-black/10 text-white dark:text-[#0A1118]"
                          : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {category.course_count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 max-w-[1200px] py-8 sm:py-10">
          {/* Active Filter Notice */}
          {selectedCategoryObj && (
            <div className="mb-8 p-4 rounded-[16px] bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  {(() => {
                    const Icon = getCategoryIcon(selectedCategoryObj.name);
                    return <Icon className="w-5 h-5 text-blue-500" />;
                  })()}
                </div>
                <div>
                  <div className="text-[11px] font-[800] uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Selected Preparation Category
                  </div>
                  <h3 className="text-[17px] font-[800] text-slate-900 dark:text-white">
                    {selectedCategoryObj.name}
                  </h3>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => handleSelectCategory(null)}
                className="h-[36px] px-3 text-[13px] font-[600] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/20 self-start sm:self-auto"
              >
                Clear Category Filter <X className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          )}

          {/* 4. RESULTS HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-[800] text-slate-900 dark:text-white">
                {selectedCategoryObj ? `${selectedCategoryObj.name} Courses` : "Preparation Programs"}
              </h2>
              <p className="text-[14px] font-[500] text-slate-500 dark:text-slate-400 mt-1">
                {filteredCourses.length}{" "}
                {filteredCourses.length === 1 ? "course available" : "courses available"}
                {selectedCategoryObj ? ` under ${selectedCategoryObj.name}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[13px] font-[600] text-slate-500 dark:text-slate-400">Sort by:</span>
              <div className="relative">
                <select className="appearance-none bg-white dark:bg-[#0B1521] border border-slate-200 dark:border-white/10 rounded-[10px] h-[40px] pl-4 pr-10 text-[14px] font-[600] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#163E6B] shadow-sm cursor-pointer">
                  <option>Most Popular</option>
                  <option>Highest Rated</option>
                  <option>Newest</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 5. COURSE GRID */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="group flex flex-col bg-white dark:bg-[#0B1521] rounded-[20px] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-[#163E6B]/10 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Rich Header Banner */}
                  <div className="relative h-[200px] overflow-hidden bg-[#0A1118]">
                    <div
                      className={`absolute inset-0 opacity-80 mix-blend-multiply group-hover:scale-105 transition-transform duration-700 ${
                        course.id === 1
                          ? "bg-gradient-to-br from-[#0B2545] to-[#163E6B]"
                          : course.id === 2
                          ? "bg-gradient-to-br from-[#163E6B] to-[#2563EB]"
                          : course.id === 3
                          ? "bg-gradient-to-br from-[#0B2545] to-[#D4A72C]"
                          : "bg-gradient-to-br from-[#0A1118] to-[#163E6B]"
                      }`}
                    />
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1118]/90 via-transparent to-transparent" />

                    <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500">
                      <BookOpen className="w-20 h-20 text-white" />
                    </div>

                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                      {course.featured && (
                        <Badge className="bg-[#D4A72C] text-[#0A1118] hover:bg-[#D4A72C] font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 border-none shadow-sm">
                          Featured
                        </Badge>
                      )}
                      {course.is_coming_soon && (
                        <Badge className="bg-slate-800 text-white border border-slate-600 font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 shadow-sm">
                          Coming Soon
                        </Badge>
                      )}
                      {course.exam?.category_name && (
                        <Badge className="bg-white/20 text-white border border-white/10 font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 backdrop-blur-sm">
                          {course.exam.category_name}
                        </Badge>
                      )}
                    </div>

                    <div className="absolute top-4 right-4 z-10">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 group-hover:bg-black/60 transition-colors">
                        <BookMarked className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1 p-6 relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[12px] font-[700] text-[#163E6B] dark:text-[#8BA4C4] uppercase tracking-wider">
                        {course.exam?.category_name || "General Preparation"}
                      </span>
                    </div>

                    <h3 className="text-[18px] font-[800] text-slate-900 dark:text-white leading-[1.3] mb-3 group-hover:text-[#163E6B] dark:group-hover:text-[#D4A72C] transition-colors line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-[14px] text-slate-600 dark:text-slate-400 line-clamp-2 mb-6 leading-relaxed">
                      {course.short_description ||
                        course.description ||
                        `Comprehensive preparation for ${course.title}.`}
                    </p>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-slate-100 dark:border-white/5 mb-6">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-slate-50 dark:bg-white/5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-[700] text-slate-900 dark:text-white leading-none">
                            {course.duration_months || 0}
                          </span>
                          <span className="text-[11px] font-[500] text-slate-400">Months</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-slate-50 dark:bg-white/5">
                          <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-[700] text-slate-900 dark:text-white leading-none">
                            {course.subject_count || 0}
                          </span>
                          <span className="text-[11px] font-[500] text-slate-400">Subjects</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-slate-50 dark:bg-white/5">
                          <Target className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-[700] text-slate-900 dark:text-white leading-none">
                            {course.enrolled_count || 0}
                          </span>
                          <span className="text-[11px] font-[500] text-slate-400">Enrolled</span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing & CTA */}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-[600] text-slate-400 uppercase tracking-wider">
                          Price
                        </span>
                        <span className="text-[18px] font-[800] text-slate-900 dark:text-white">
                          {course.is_coming_soon
                            ? "Coming Soon"
                            : course.starting_price
                            ? formatPrice(Number(course.starting_price))
                            : "Free Access"}
                        </span>
                      </div>

                      <Button
                        asChild
                        disabled={course.is_coming_soon}
                        className="h-[42px] px-5 rounded-[10px] bg-[#0B2545] dark:bg-white hover:bg-[#163E6B] dark:hover:bg-slate-100 text-white dark:text-[#0A1118] font-[700] text-[13px] transition-all shadow-sm flex items-center gap-2 group/btn"
                      >
                        {course.is_coming_soon ? (
                          <span>Coming Soon</span>
                        ) : (
                          <Link href={`/courses/${course.id}`}>
                            View Course{" "}
                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!isLoading && hasError && (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-red-200 dark:border-red-900/30 rounded-[24px] bg-red-50/50 dark:bg-red-950/10 backdrop-blur-sm">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Search className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-2xl font-[800] text-slate-900 dark:text-white mb-2">
                Couldn't load courses
              </h3>
              <p className="text-[15px] text-slate-500 dark:text-slate-400 max-w-md mb-8">
                We hit a problem reaching the server. Your courses are safe — this is a connection issue,
                not missing data.
              </p>
              <Button
                onClick={fetchData}
                className="h-[44px] px-6 rounded-[10px] bg-[#0B2545] dark:bg-white text-white dark:text-[#0A1118] font-[700]"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !hasError && filteredCourses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-slate-200 dark:border-white/5 rounded-[24px] bg-white/50 dark:bg-white/5 backdrop-blur-sm">
              <div className="w-20 h-20 bg-slate-100 dark:bg-[#0B1521] rounded-full flex items-center justify-center mb-6 shadow-inner">
                <BookOpen className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-2xl font-[800] text-slate-900 dark:text-white mb-2">
                {selectedCategoryObj
                  ? `No courses currently available in ${selectedCategoryObj.name}`
                  : "No preparation programs found"}
              </h3>
              <p className="text-[15px] text-slate-500 dark:text-slate-400 max-w-md mb-8">
                {selectedCategoryObj
                  ? `New programs and study materials for ${selectedCategoryObj.name} are currently being prepared. Check back soon or explore other categories.`
                  : "We couldn't find any courses matching your search criteria. Try adjusting your query or filters."}
              </p>
              <Button
                onClick={() => {
                  handleSelectCategory(null);
                  setSearchQuery("");
                }}
                className="h-[44px] px-6 rounded-[10px] bg-[#0B2545] dark:bg-white text-white dark:text-[#0A1118] font-[700]"
              >
                View All Categories
              </Button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function CoursesLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={<CoursesLoading />}>
      <CoursesContent />
    </Suspense>
  );
}
