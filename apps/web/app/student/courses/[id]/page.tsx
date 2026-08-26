"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, Target, FileText, Bookmark, PlayCircle, Clock, ChevronLeft, Calendar, Trophy, GraduationCap, LayoutDashboard, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import Link from "next/link";
import { courseEnrollmentApi } from "@/lib/api/enrollment";
import { Suspense } from "react";

function CourseDetailContent() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string, 10);
  
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourse() {
      try {
        const data = await courseEnrollmentApi.getCourseDetails(courseId);
        setCourse(data);
      } catch (err: any) {
        console.error("Failed to load course details:", err);
        setError("Failed to load course details. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
    loadCourse();
  }, [courseId]);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8 animate-pulse">
        <div className="h-64 bg-slate-100 rounded-[24px]"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-[16px]"></div>)}
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <Trophy className="w-16 h-16 text-red-200 mb-4" />
        <h2 className="text-2xl font-bold text-[#0B2545] mb-2">Course Not Found</h2>
        <p className="text-slate-500 mb-6">{error || "The course you are looking for does not exist or you don't have access."}</p>
        <Button onClick={() => router.push('/student/courses')} className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118]">
          Back to My Courses
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-8 pb-20">
      <Button 
        variant="ghost" 
        onClick={() => router.push('/student/courses')}
        className="text-slate-500 hover:text-[#0B2545] p-0 h-auto hover:bg-transparent font-semibold flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" /> Back to My Courses
      </Button>

      {/* Course Hero */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row relative">
        {course.thumbnail ? (
          <div className="md:w-1/3 h-48 md:h-auto bg-slate-100 relative">
            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
              {course.exam && (
                <span className="bg-[#D4A72C] text-[#0A1118] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {course.exam.title}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="md:w-1/3 h-48 md:h-auto bg-gradient-to-br from-[#0B2545] to-[#163E6B] flex flex-col items-center justify-center text-white relative">
            <GraduationCap className="w-16 h-16 mb-2 opacity-50" />
            {course.exam && (
              <span className="absolute bottom-4 left-4 bg-[#D4A72C] text-[#0A1118] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {course.exam.title}
              </span>
            )}
          </div>
        )}
        
        <div className="p-6 md:p-8 md:w-2/3 flex flex-col justify-center">
          <h1 className="text-2xl md:text-3xl font-[800] text-[#0B2545] tracking-tight mb-3">
            {course.title}
          </h1>
          <p className="text-slate-600 mb-6 leading-relaxed">
            {course.description || course.short_description || "No description provided."}
          </p>
          
          <div className="flex flex-wrap gap-4 mt-auto">
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-[12px] border border-slate-100 text-sm font-semibold text-slate-700">
              <Clock className="w-4 h-4 text-blue-500" /> {course.duration_months} Months Duration
            </div>
            {course.is_enrolled && (
              <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-[12px] border border-green-100 text-sm font-semibold text-green-700">
                <Target className="w-4 h-4 text-green-600" /> Currently Enrolled
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="pt-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#0B2545]">Quick Access</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Link href="/student/syllabus" className="bg-white p-6 rounded-[20px] border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col items-start hover:border-blue-200">
          <div className="w-12 h-12 rounded-[14px] bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-bold text-[#0B2545] mb-1">Full Syllabus</h3>
          <p className="text-sm text-slate-500">
            {course.metadata?.subject_count ? `${course.metadata.subject_count} Subjects available` : "Track progress"}
          </p>
        </Link>
        
        <Link href="/student/notes" className="bg-white p-6 rounded-[20px] border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col items-start hover:border-purple-200">
          <div className="w-12 h-12 rounded-[14px] bg-purple-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Bookmark className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-bold text-[#0B2545] mb-1">Study Materials</h3>
          <p className="text-sm text-slate-500">
            {course.metadata?.materials_count ? `${course.metadata.materials_count} PDF/Video notes` : "Access your notes"}
          </p>
        </Link>
        
        <Link href="/student/practice" className="bg-white p-6 rounded-[20px] border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col items-start hover:border-orange-200">
          <div className="w-12 h-12 rounded-[14px] bg-orange-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Target className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="font-bold text-[#0B2545] mb-1">Topic Practice</h3>
          <p className="text-sm text-slate-500">
            Test your knowledge
          </p>
        </Link>
        
        <Link href="/student/exams" className="bg-white p-6 rounded-[20px] border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col items-start hover:border-green-200">
          <div className="w-12 h-12 rounded-[14px] bg-green-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-bold text-[#0B2545] mb-1">Mock Exams</h3>
          <p className="text-sm text-slate-500">
            {course.metadata?.mock_exams_count ? `${course.metadata.mock_exams_count} Full-length exams` : "Take timed tests"}
          </p>
        </Link>
      </div>

      {/* Course Curriculum */}
      {course.subjects && course.subjects.length > 0 && (
        <div className="pt-8 space-y-6">
          <h2 className="text-2xl font-bold text-[#0B2545]">Course Curriculum</h2>
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden p-2">
            <Accordion type="single" collapsible className="w-full">
              {course.subjects.map((subject: any, sIdx: number) => (
                <AccordionItem value={`subject-${subject.id}`} key={`subject-${subject.id}`} className="border-b-0 px-2">
                  <AccordionTrigger className="hover:no-underline py-4 px-4 rounded-[12px] hover:bg-slate-50 text-left">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#163E6B]/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-[#163E6B]">{sIdx + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0B2545] text-lg">{subject.title}</h4>
                        {subject.description && <p className="text-sm text-slate-500 font-normal mt-0.5">{subject.description}</p>}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-6 px-4">
                    {subject.units && subject.units.length > 0 ? (
                      <div className="space-y-6 pl-4 md:pl-14 pt-2">
                        {subject.units.map((unit: any, uIdx: number) => (
                          <div key={`unit-${unit.id}`} className="space-y-3">
                            <h5 className="font-semibold text-slate-700 flex items-center gap-2">
                              <span className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-500">Chapter {uIdx + 1}</span>
                              {unit.title}
                            </h5>
                            <div className="grid grid-cols-1 gap-2 pl-2 border-l-2 border-slate-100 ml-4">
                              {unit.topics && unit.topics.length > 0 ? (
                                unit.topics.map((topic: any) => (
                                  <div key={`topic-${topic.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-100 p-3 rounded-[12px] hover:border-blue-200 hover:shadow-sm transition-all gap-4">
                                    <div className="flex items-center gap-3">
                                      {topic.status === "completed" ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                      ) : topic.status === "in-progress" ? (
                                        <PlayCircle className="w-5 h-5 text-blue-500 shrink-0" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                                      )}
                                      <span className="font-medium text-[#0B2545] text-sm">{topic.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                                      <Button asChild size="sm" variant="outline" className="h-8 border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200">
                                        <Link href={`/student/notes?topic=${topic.id}`}>
                                          <FileText className="w-3.5 h-3.5 mr-1.5" /> Notes
                                        </Link>
                                      </Button>
                                      <Button asChild size="sm" variant="outline" className="h-8 border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200">
                                        <Link href={`/student/practice?topic=${topic.id}`}>
                                          <Target className="w-3.5 h-3.5 mr-1.5" /> Practice
                                        </Link>
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-slate-400 pl-4 py-2 italic">No topics available in this chapter.</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pl-14 text-slate-500 italic py-4">No chapters found for this subject.</div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default function CourseDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B2545]"></div></div>}>
      <CourseDetailContent />
    </Suspense>
  );
}
