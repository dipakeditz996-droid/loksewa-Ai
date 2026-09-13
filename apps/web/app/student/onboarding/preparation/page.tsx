"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicApi } from "@/lib/api/public-api";
import { studentSettingsApi } from "@/lib/api/student-settings";
import Link from "next/link";
import bgImage from "@/media/signup.png";

// Finds the exam node matching `examId` anywhere in the hierarchy tree
// (categories -> root exams -> nested children) and returns its courses.
function findCoursesForExam(categories: any[], examId: number): any[] | null {
  for (const cat of categories) {
    for (const exam of cat.exams || []) {
      const stack = [exam];
      while (stack.length) {
        const node = stack.pop();
        if (node.id === examId) return node.courses || [];
        stack.push(...(node.children || []));
      }
    }
  }
  return null;
}

export default function PreparationSelectionPage() {
  const router = useRouter();

  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // True while checking whether the student's registration-time preparation
  // choice (StudentProfile.target_position) already matches real courses -
  // if it does, this page redirects straight to Packages instead of asking
  // the student to pick their preparation a second time.
  const [checkingAutoSelect, setCheckingAutoSelect] = useState(true);

  // Path tracks the current drill-down state.
  // [category, exam_level1, exam_level2, ...]
  const [path, setPath] = useState<any[]>([]);

  // For Flexible selection mode (multiple courses)
  const [selectedCourses, setSelectedCourses] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      publicApi.getCourseHierarchy(),
      studentSettingsApi.getProfile().catch(() => null),
    ]).then(([hierarchyRes, profile]) => {
      if (cancelled) return;
      const categories = hierarchyRes || [];
      setHierarchy(categories);
      setLoading(false);

      const targetPosition = profile?.target_position;
      if (targetPosition) {
        const matchedCourses = findCoursesForExam(categories, targetPosition);
        if (matchedCourses && matchedCourses.length > 0) {
          localStorage.setItem("onboarding_selected_courses", JSON.stringify(matchedCourses));
          router.replace("/student/onboarding/packages");
          return;
        }
      }
      // No stored preparation, or it doesn't match any course yet -
      // fall back to letting the student pick manually below.
      setCheckingAutoSelect(false);
    }).catch(() => {
      if (cancelled) return;
      setHierarchy([]);
      setLoading(false);
      setCheckingAutoSelect(false);
    });

    return () => { cancelled = true; };
  }, [router]);

  const handleSelectNode = (node: any, depth: number) => {
    const newPath = path.slice(0, depth);
    newPath.push(node);
    setPath(newPath);
  };

  const handleToggleCourse = (course: any) => {
    setSelectedCourses(prev => {
      const exists = prev.find(c => c.id === course.id);
      if (exists) {
        return prev.filter(c => c.id !== course.id);
      } else {
        return [...prev, course];
      }
    });
  };

  const currentOptions = () => {
    if (path.length === 0) {
      return hierarchy;
    }
    const currentNode = path[path.length - 1];
    return currentNode.children || currentNode.exams || [];
  };

  const currentCourses = () => {
    if (path.length === 0) return [];
    const currentNode = path[path.length - 1];
    return currentNode.courses || [];
  };

  const handleContinue = () => {
    // Store selected courses in localStorage or context, then redirect to packages page
    if (selectedCourses.length > 0) {
      localStorage.setItem("onboarding_selected_courses", JSON.stringify(selectedCourses));
      router.push("/student/onboarding/packages");
    }
  };

  return (
    <div className="min-h-screen relative flex font-sans overflow-hidden bg-[#0A1118] text-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-[25%_top] lg:bg-[center_top] bg-no-repeat" style={{ backgroundImage: `url(${bgImage.src})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/95 lg:bg-gradient-to-r lg:from-black/50 lg:via-black/20 lg:to-black/80 mix-blend-multiply" />
      </div>

      <div className="container relative z-10 w-full mx-auto px-6 md:px-12 py-8 flex flex-col min-h-screen">
        <div className="flex justify-start w-full mb-8">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity w-fit mt-4">
            <div className="bg-transparent border border-white/80 p-1.5 rounded-[8px] flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <span className="font-[800] text-[22px] tracking-tight text-white drop-shadow-md leading-none flex items-center">Loksewa<span className="text-[#D4A72C]">AI</span></span>
            </div>
          </Link>
        </div>

        <div className="w-full flex justify-center flex-1 py-10">
          <div className="w-full max-w-4xl bg-black/40 backdrop-blur-[24px] border border-white/10 rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] flex flex-col">
            
            <div className="p-8 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-[26px] font-bold text-white tracking-tight leading-tight">Choose Your <span className="text-[#D4A72C]">Preparation</span></h2>
                <p className="text-[14px] text-white/60 font-medium mt-1">Select one or more courses you want to prepare for.</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-white/50 uppercase tracking-wider">Step 1 of 3</span>
                <div className="flex gap-1 mt-2">
                  <div className="h-1.5 w-8 bg-[#D4A72C] rounded-full"></div>
                  <div className="h-1.5 w-8 bg-white/10 rounded-full"></div>
                  <div className="h-1.5 w-8 bg-white/10 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="flex flex-1 min-h-[400px]">
              {/* Left sidebar: path breadcrumbs */}
              <div className="w-1/3 bg-black/20 p-6 border-r border-white/5">
                <h3 className="text-[12px] font-semibold text-white/40 uppercase tracking-widest mb-4">Your Selection Path</h3>
                
                <div className="space-y-2">
                  <button 
                    onClick={() => setPath([])}
                    className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-medium transition-colors flex items-center justify-between ${path.length === 0 ? 'bg-[#D4A72C]/10 text-[#D4A72C] border border-[#D4A72C]/20' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                  >
                    Start Here
                    {path.length === 0 && <ChevronRight className="w-4 h-4" />}
                  </button>

                  {path.map((node, i) => (
                    <button 
                      key={i}
                      onClick={() => setPath(path.slice(0, i + 1))}
                      className={`w-full text-left px-4 py-3 rounded-xl text-[14px] font-medium transition-colors flex items-center justify-between ${path.length - 1 === i ? 'bg-[#D4A72C]/10 text-[#D4A72C] border border-[#D4A72C]/20' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                    >
                      {node.name}
                      {path.length - 1 === i && <ChevronRight className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right content area: options & courses */}
              <div className="w-2/3 p-6 flex flex-col">
                {loading || checkingAutoSelect ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[#D4A72C] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Render sub-categories / exams */}
                    {currentOptions().length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-[13px] font-semibold text-white/60 mb-4">
                          {path.length === 0 ? "Select a Category" : "Select an Option"}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {currentOptions().map((node: any) => (
                            <button
                              key={node.id}
                              onClick={() => handleSelectNode(node, path.length)}
                              className="px-4 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                            >
                              <div className="font-semibold text-[15px] text-white/90 group-hover:text-white transition-colors">{node.name}</div>
                              {node.description && <div className="text-[12px] text-white/40 mt-1 line-clamp-2">{node.description}</div>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Render Courses */}
                    {currentCourses().length > 0 && (
                      <div>
                        <h3 className="text-[13px] font-semibold text-white/60 mb-4">Available Courses</h3>
                        <div className="grid grid-cols-1 gap-3">
                          {currentCourses().map((course: any) => {
                            const isSelected = selectedCourses.some(c => c.id === course.id);
                            return (
                              <button
                                key={course.id}
                                onClick={() => handleToggleCourse(course)}
                                className={`flex items-start p-4 rounded-xl border transition-all text-left relative overflow-hidden ${isSelected ? 'border-[#D4A72C] bg-[#D4A72C]/10' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}
                              >
                                {isSelected && (
                                  <div className="absolute top-0 right-0 bg-[#D4A72C] text-black p-1 rounded-bl-xl">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                )}
                                {course.thumbnail && (
                                  <img src={course.thumbnail} alt={course.title} className="w-16 h-16 object-cover rounded-lg mr-4 bg-white/10" />
                                )}
                                <div className="flex-1">
                                  <div className={`font-bold text-[16px] ${isSelected ? 'text-[#D4A72C]' : 'text-white'}`}>{course.title}</div>
                                  <div className="text-[13px] text-white/50 mt-1">{course.short_description}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {currentOptions().length === 0 && currentCourses().length === 0 && (
                      <div className="text-center py-10 text-white/40 text-[14px]">
                        No options or courses available here.
                      </div>
                    )}
                  </div>
                )}
                
                {/* Footer Action */}
                <div className="pt-6 border-t border-white/10 mt-auto flex items-center justify-between">
                  <div className="text-[14px] text-white/60">
                    {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} selected
                  </div>
                  <Button 
                    onClick={handleContinue}
                    disabled={selectedCourses.length === 0}
                    className="h-[44px] px-8 bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-90 text-white text-[15px] font-bold rounded-xl transition-all flex items-center gap-2"
                  >
                    Continue to Packages <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
