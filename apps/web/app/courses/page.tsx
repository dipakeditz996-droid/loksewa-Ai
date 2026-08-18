"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Target, ArrowRight, Search, SlidersHorizontal, Star, Sparkles, ChevronDown, CheckCircle2, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { mockCourses } from "@/lib/mock/public-data";
import { Badge } from "@/components/ui/badge";
import { LoksewaBadgeIcon } from "@/components/ui/loksewa-badge-icon";
import Image from "next/image";

export default function CoursesPage() {
  const [activeCategory, setActiveCategory] = useState("All Courses");

  // Format price helper
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(price);
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-slate-50 dark:bg-[#040B14] min-h-screen pt-[80px]">
        
        {/* 1. PREMIUM HERO SECTION */}
        <section className="relative overflow-hidden bg-[#0A1118] border-b border-white/5 py-16 md:py-32">
          
          {/* Background Image & Layers */}
          <div className="absolute inset-0 z-0">
            {/* 1. Base Image */}
            <div 
              className="absolute inset-0 opacity-[0.35] blur-[1px] bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url('/media/course.jpg')` }}
            ></div>
            
            {/* 2. Single Dark Navy Overlay */}
            <div className="absolute inset-0 bg-[#0A1118]/65 mix-blend-multiply"></div>
            
            {/* 3. Subtle Vignette to keep center clear */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0A1118_100%)] opacity-80"></div>
            
            {/* 4. Atmospheric Blue/Gold Lighting (Far Left & Far Right) */}
            <div className="absolute top-[-10%] left-[-15%] w-[800px] h-[800px] bg-[#163E6B]/60 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>
            <div className="absolute bottom-[-10%] right-[-15%] w-[900px] h-[900px] bg-[#D4A72C]/25 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>
            
            {/* 5. Existing Grid Texture (very low opacity) */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] mix-blend-overlay"></div>
            
            {/* Bottom Gradient Blend */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#040B14] to-transparent"></div>
          </div>
          
          <div className="container relative z-10 mx-auto px-4 max-w-[1200px] flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6">
              <LoksewaBadgeIcon className="w-4 h-4 text-[#D4A72C]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
                Curated Loksewa Preparation
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-[900] tracking-tight text-white mb-6">
              Master Your Loksewa Preparation.
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-3xl leading-relaxed mb-12">
              Explore structured preparation programs, expert-curated materials, practice questions, mock exams, and performance-focused learning paths.
            </p>
            
            {/* 2. PREMIUM SEARCH EXPERIENCE */}
            <div className="w-full max-w-3xl flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <div className="absolute inset-0 bg-[#D4A72C]/20 rounded-[12px] blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                <div className="relative flex items-center bg-white/5 border border-white/10 rounded-[12px] overflow-hidden backdrop-blur-xl focus-within:bg-white/10 focus-within:border-white/20 transition-all shadow-lg">
                  <Search className="absolute left-4 w-5 h-5 text-slate-400" />
                  <Input 
                    placeholder="Search courses, exams, subjects, or topics..." 
                    className="w-full pl-12 pr-16 h-[54px] bg-transparent border-none text-white placeholder:text-slate-500 focus-visible:ring-0 text-[15px]" 
                  />
                  <div className="absolute right-4 px-2 py-1 rounded bg-white/10 text-xs font-mono text-slate-400 border border-white/5 hidden sm:block">
                    ⌘ K
                  </div>
                </div>
              </div>
              <Button className="h-[54px] px-6 rounded-[12px] bg-white/5 border border-white/10 hover:bg-white/10 text-white font-[600] flex items-center gap-2 transition-all">
                <SlidersHorizontal className="w-4 h-4 text-slate-300" />
                Filters
              </Button>
            </div>
          </div>
        </section>

        {/* 4. CATEGORY QUICK NAVIGATION */}
        <section className="border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#0A1118] sticky top-[72px] z-40 shadow-sm">
          <div className="container mx-auto px-4 max-w-[1200px]">
            <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-hide">
              {["All Courses", "Administration", "Engineering", "Health", "Education", "Banking", "General Knowledge"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-[14px] font-[600] transition-all duration-300 ${
                    activeCategory === cat 
                      ? "bg-[#0B2545] text-white dark:bg-[#163E6B] dark:text-white shadow-md border border-transparent" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white border border-slate-200 dark:border-transparent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 max-w-[1200px] py-12">
          
          {/* 8. FEATURED COURSE */}
          {activeCategory === "All Courses" && (
            <div className="mb-16">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-[#D4A72C]" />
                <h2 className="text-xl font-[800] text-slate-900 dark:text-white">Recommended for You</h2>
              </div>
              
              <div className="group relative bg-white dark:bg-[#0B1521] rounded-[24px] border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-500 hover:border-[#163E6B]/30 hover:shadow-[0_20px_40px_-15px_rgba(22,62,107,0.15)]">
                {/* Image side */}
                <div className="w-full md:w-[45%] lg:w-[40%] relative overflow-hidden bg-[#0A1118]">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#163E6B]/80 to-[#0A1118] z-10 mix-blend-multiply group-hover:scale-105 transition-transform duration-700"></div>
                  <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20 z-10"></div>
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <BookOpen className="w-24 h-24 text-white/10" />
                  </div>
                  <div className="absolute top-6 left-6 z-30 flex flex-wrap gap-2">
                    <Badge className="bg-[#D4A72C] text-[#0A1118] hover:bg-[#D4A72C] font-bold border-none uppercase tracking-wider text-[10px] px-2.5 py-1">Featured</Badge>
                    <Badge className="bg-white/20 text-white hover:bg-white/20 backdrop-blur-md font-bold border border-white/10 uppercase tracking-wider text-[10px] px-2.5 py-1">Officer Level</Badge>
                  </div>
                </div>
                
                {/* Content side */}
                <div className="flex-1 p-8 md:p-10 flex flex-col justify-center relative z-20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-[700] text-[#163E6B] dark:text-[#8BA4C4] uppercase tracking-wider">Complete Preparation</span>
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs font-bold">4.9</span>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl md:text-3xl font-[800] text-slate-900 dark:text-white leading-tight mb-4 group-hover:text-[#163E6B] dark:group-hover:text-[#D4A72C] transition-colors">
                    Loksewa Officer (Section Officer) Complete Preparation
                  </h3>
                  
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8 text-[15px]">
                    Master the Section Officer curriculum with our comprehensive AI-powered learning path. Includes structured video lessons, exhaustive study notes, smart mock exams, and personalized performance tracking.
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <div className="flex flex-col gap-1">
                      <span className="text-2xl font-[800] text-slate-900 dark:text-white">8</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subjects</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-2xl font-[800] text-slate-900 dark:text-white">2.5k+</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MCQs</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-2xl font-[800] text-slate-900 dark:text-white">45</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mock Tests</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-2xl font-[800] text-slate-900 dark:text-white">1.2k</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-auto pt-6 border-t border-slate-100 dark:border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-[900] text-slate-900 dark:text-white tracking-tight">{formatPrice(4999)}</span>
                        <span className="text-sm font-semibold text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600">{formatPrice(6499)}</span>
                      </div>
                    </div>
                    <Button className="h-[48px] px-8 rounded-[12px] bg-[#0B2545] dark:bg-[#D4A72C] hover:bg-[#163E6B] dark:hover:bg-[#D4A72C]/90 text-white dark:text-[#0A1118] font-[700] text-[15px] transition-all shadow-md flex items-center gap-2 group/btn">
                      View Course <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 10. RESULTS HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-[800] text-slate-900 dark:text-white">Preparation Programs</h2>
              <p className="text-[14px] font-[500] text-slate-500 dark:text-slate-400 mt-1">{mockCourses.length} courses available</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockCourses.map((course) => (
              <div key={course.id} className="group flex flex-col bg-white dark:bg-[#0B1521] rounded-[20px] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-[#163E6B]/10 transition-all duration-300 hover:-translate-y-1">
                
                {/* 6. COURSE CARD DESIGN - Rich Header Image */}
                <div className="relative h-[200px] overflow-hidden bg-[#0A1118]">
                  {/* Dynamic Abstract Gradient background */}
                  <div className={`absolute inset-0 opacity-80 mix-blend-multiply group-hover:scale-105 transition-transform duration-700 ${
                    course.id === "1" ? "bg-gradient-to-br from-[#0B2545] to-[#163E6B]" :
                    course.id === "2" ? "bg-gradient-to-br from-[#163E6B] to-[#2563EB]" :
                    course.id === "3" ? "bg-gradient-to-br from-[#0B2545] to-[#D4A72C]" :
                    course.id === "4" ? "bg-gradient-to-br from-[#0f172a] to-[#334155]" :
                    "bg-gradient-to-br from-[#0A1118] to-[#163E6B]"
                  }`}></div>
                  
                  {/* Overlay patterns */}
                  <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1118]/90 via-transparent to-transparent"></div>
                  
                  {/* Center Icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500">
                    <BookOpen className="w-20 h-20 text-white" />
                  </div>
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                    {course.badges?.map((badge, idx) => (
                      <Badge key={idx} className={`${
                        badge === "Best Seller" || badge === "Popular" || badge === "Trending"
                          ? "bg-[#D4A72C] text-[#0A1118] hover:bg-[#D4A72C]"
                          : badge === "Coming Soon"
                          ? "bg-slate-800 text-white border border-slate-600"
                          : "bg-white/20 text-white border border-white/20 backdrop-blur-md"
                      } font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 border-none shadow-sm`}>
                        {badge}
                      </Badge>
                    ))}
                  </div>

                  {/* Status */}
                  <div className="absolute top-4 right-4 z-10">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 group-hover:bg-black/60 transition-colors">
                      <BookMarked className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 p-6 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-[700] text-[#163E6B] dark:text-[#8BA4C4] uppercase tracking-wider">{course.category}</span>
                  </div>
                  
                  <h3 className="text-[18px] font-[800] text-slate-900 dark:text-white leading-[1.3] mb-3 group-hover:text-[#163E6B] dark:group-hover:text-[#D4A72C] transition-colors line-clamp-2">
                    {course.title}
                  </h3>
                  
                  <p className="text-[14px] text-slate-600 dark:text-slate-400 line-clamp-2 mb-6 leading-relaxed">
                    {course.description}
                  </p>
                  
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-slate-100 dark:border-white/5 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-slate-50 dark:bg-white/5">
                        <BookOpen className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-[700] text-slate-900 dark:text-white leading-none">{course.subjects}</span>
                        <span className="text-[10px] font-[600] text-slate-500 uppercase mt-1">Subjects</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-slate-50 dark:bg-white/5">
                        <Target className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-[700] text-slate-900 dark:text-white leading-none">{course.questions}+</span>
                        <span className="text-[10px] font-[600] text-slate-500 uppercase mt-1">MCQs</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-slate-50 dark:bg-white/5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-[700] text-slate-900 dark:text-white leading-none">{course.mockTests}</span>
                        <span className="text-[10px] font-[600] text-slate-500 uppercase mt-1">Exams</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Footer Stats & Price */}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-[14px] font-[700] text-slate-900 dark:text-white">{course.rating || "4.8"}</span>
                        <span className="text-[12px] text-slate-500">({course.students})</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[20px] font-[800] text-slate-900 dark:text-white tracking-tight leading-none">{formatPrice(course.price || 2999)}</span>
                        {course.originalPrice && (
                          <span className="text-[12px] font-[600] text-slate-400 line-through mt-1">{formatPrice(course.originalPrice)}</span>
                        )}
                      </div>
                    </div>
                    
                    <Button className={`w-full h-[44px] rounded-[10px] font-[700] text-[14px] transition-all flex items-center justify-center gap-2 group/btn ${
                      course.status === "Coming Soon" 
                        ? "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 cursor-not-allowed" 
                        : "bg-white dark:bg-white/5 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 hover:bg-[#0B2545] hover:border-[#0B2545] hover:text-white dark:hover:bg-white/10 dark:hover:border-white/20 shadow-sm"
                    }`}>
                      {course.status === "Coming Soon" ? "Coming Soon" : "View Course"} 
                      {course.status !== "Coming Soon" && <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* 13. EMPTY STATE (Hidden by default since we have mock data, but structure is here) */}
          {mockCourses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-slate-200 dark:border-white/5 rounded-[24px] bg-white/50 dark:bg-white/5 backdrop-blur-sm">
              <div className="w-20 h-20 bg-slate-100 dark:bg-[#0B1521] rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-2xl font-[800] text-slate-900 dark:text-white mb-2">No preparation programs found</h3>
              <p className="text-[15px] text-slate-500 dark:text-slate-400 max-w-md mb-8">
                We couldn't find any courses matching your current filters and search terms. Try adjusting them to see more results.
              </p>
              <Button className="h-[44px] px-6 rounded-[10px] bg-[#0B2545] dark:bg-white text-white dark:text-[#0A1118] font-[700]">
                Clear All Filters
              </Button>
            </div>
          )}

          <div className="mt-16 flex justify-center">
            <Button variant="outline" className="h-[48px] px-8 rounded-[12px] font-[700] text-[15px] border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5">
              Load More Programs
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
