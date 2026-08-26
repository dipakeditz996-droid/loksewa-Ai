"use client";

import { useState, useEffect } from "react";
import { BookOpen, Target, Clock, ArrowRight, PlayCircle, Trophy, BookMarked, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { courseEnrollmentApi, MyCourse } from "@/lib/api/enrollment";
import { Suspense } from "react";

function MyCoursesContent() {
  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await courseEnrollmentApi.getMyCourses();
        setCourses(data);
      } catch (err: any) {
        console.error("Failed to load courses:", err);
        setError("Failed to load your courses. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
    loadCourses();
  }, []);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#D4A72C]/10 text-[#D4A72C] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Learning Hub
            </span>
          </div>
          <h1 className="text-3xl font-[800] text-[#0B2545] tracking-tight">My Courses</h1>
          <p className="text-slate-500 mt-1 font-medium max-w-2xl">
            Continue learning and pick up right where you left off. Track your progress across all your enrolled courses.
          </p>
        </div>
        <Button variant="outline" asChild className="border-slate-200 text-[#0B2545] hover:bg-slate-50 shrink-0 font-semibold shadow-sm">
          <Link href="/student/marketplace">
            <Target className="w-4 h-4 mr-2" />
            Explore More Courses
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-5 animate-pulse">
              <div className="h-40 bg-slate-100 rounded-[16px] mb-4"></div>
              <div className="h-6 bg-slate-100 rounded mb-2 w-3/4"></div>
              <div className="h-4 bg-slate-100 rounded mb-4 w-full"></div>
              <div className="space-y-2 mb-4">
                <div className="h-2 bg-slate-100 rounded w-full"></div>
                <div className="h-4 bg-slate-100 rounded w-1/4"></div>
              </div>
              <div className="h-10 bg-slate-100 rounded-[12px] w-full"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded-[20px] text-center">
          <Trophy className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold">Oops! Something went wrong</h3>
          <p className="mt-1">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            Try Again
          </Button>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white border border-slate-200 shadow-sm rounded-[24px] p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <BookMarked className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-[#0B2545] mb-2">No active courses</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            You are not enrolled in any courses yet. Visit the marketplace to explore our preparation materials and start learning.
          </p>
          <Button asChild className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-bold rounded-[12px] px-8 py-6 h-auto shadow-[0_4px_14px_rgba(212,167,44,0.3)] hover:shadow-[0_6px_20px_rgba(212,167,44,0.4)] transition-all">
            <Link href="/student/marketplace">
              Browse Marketplace <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((item) => (
            <div 
              key={item.enrollment_id} 
              className="bg-white rounded-[24px] border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group flex flex-col"
            >
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                {item.course.thumbnail ? (
                  <img 
                    src={item.course.thumbnail} 
                    alt={item.course.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0B2545] to-[#163E6B] text-white">
                    <GraduationCap className="w-12 h-12 mb-2 opacity-50" />
                    <span className="font-bold opacity-70">Course</span>
                  </div>
                )}
                
                <div className="absolute top-3 left-3 flex gap-2">
                  {item.course.exam && (
                    <span className="bg-white/90 backdrop-blur-sm text-[#0B2545] text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                      {item.course.exam.title}
                    </span>
                  )}
                </div>
                
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Link href={`/student/courses/${item.course.id}`} className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors text-white">
                    <PlayCircle className="w-6 h-6" />
                  </Link>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[#0B2545] leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    <Link href={`/student/courses/${item.course.id}`}>
                      {item.course.title}
                    </Link>
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                    {item.course.short_description || "Continue your preparation for this course."}
                  </p>
                </div>
                
                <div className="mt-auto space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" /> Progress
                      </span>
                      <span className="text-xs font-bold text-[#0B2545]">{item.progress.percentage}%</span>
                    </div>
                    <Progress 
                      value={item.progress.percentage} 
                      className="h-1.5 bg-slate-100" 
                      indicatorClassName={item.progress.percentage === 100 ? "bg-green-500" : "bg-blue-500"} 
                    />
                    <div className="flex justify-between items-center mt-1.5 text-[10px] font-medium text-slate-400">
                      <span>{item.progress.completed_topics} / {item.progress.total_topics} topics</span>
                      {item.expires_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Ends {new Date(item.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button asChild className="w-full bg-[#0B2545] hover:bg-[#163E6B] text-white font-semibold rounded-[12px] h-10 shadow-sm transition-all group-hover:shadow-md">
                    <Link href={`/student/courses/${item.course.id}`}>
                      Resume Learning <ArrowRight className="w-4 h-4 ml-1.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyCoursesPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B2545]"></div></div>}>
      <MyCoursesContent />
    </Suspense>
  );
}
