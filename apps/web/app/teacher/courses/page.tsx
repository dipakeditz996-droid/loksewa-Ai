"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Users, Clock, ArrowRight, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { teacherCourseService, Course } from "@/lib/api/teacher-courses";
import { toast } from "react-hot-toast";
import { PageHeader, StatusPill } from "@/components/teacher/portal";

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const data = await teacherCourseService.getMyCourses();
      setCourses(data);
    } catch (error) {
      console.error("Failed to load courses:", error);
      toast.error("Failed to load your assigned courses.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center p-12">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#0B2545] border-t-transparent"></div>
        <p className="font-medium text-[#667085]">Loading your courses...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">

      <PageHeader
        title="My Courses"
        description="Manage your assigned courses and study materials."
      />

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E7EBF3] bg-white py-20 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF2F8]">
            <BookOpen className="h-7 w-7 text-[#0B2545]" />
          </div>
          <h3 className="text-lg font-bold text-[#101828]">No courses assigned yet</h3>
          <p className="mt-2 max-w-md text-[13px] text-[#667085]">
            Courses assigned to you by the administrator will appear here.
            Check back later or contact support if you expect to see courses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#E7EBF3] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_1px_rgba(16,24,40,0.02)] transition-shadow hover:shadow-md"
            >
              <div className="relative flex h-36 items-center justify-center overflow-hidden border-b border-[#EEF1F6] bg-[#EEF2F8]">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
                ) : (
                  <BookOpen className="h-10 w-10 text-[#0B2545]/30" />
                )}
                <StatusPill
                  status={course.status === "published" ? "active" : "draft"}
                  label={course.status === "published" ? "Active" : "Draft"}
                  className="absolute right-3 top-3"
                />
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="line-clamp-2 min-h-[40px] text-[15px] font-bold text-[#101828]">
                  {course.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] text-[#667085]">
                  {course.description || "No description provided."}
                </p>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-medium text-[#475467]">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-[#0B2545]" />
                    <span>{course.exam_details?.subjects?.length || 0} Subjects</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-[#946B00]" />
                    <span>Students</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#0F7A69]" />
                    <span>{new Date(course.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#EEF1F6] pt-4">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A98AE] hover:text-[#0B2545]">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A98AE] hover:text-[#0B2545]">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                  <Link href={`/teacher/courses/${course.id}`}>
                    <Button size="sm" className="gap-1.5 rounded-lg bg-[#EEF2F8] text-[#0B2545] shadow-none hover:bg-[#0B2545] hover:text-white">
                      Manage Course <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
