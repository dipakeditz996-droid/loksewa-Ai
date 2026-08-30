"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Users, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RetryImage } from "@/components/ui/retry-image";
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
        <p className="font-medium text-muted-foreground">Loading your courses...</p>
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-20 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No courses assigned yet</h3>
          <p className="mt-2 max-w-md text-[13px] text-muted-foreground">
            Courses assigned to you by the administrator will appear here.
            Check back later or contact support if you expect to see courses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_1px_rgba(16,24,40,0.02)] transition-shadow hover:shadow-md"
            >
              <div className="relative flex h-36 items-center justify-center overflow-hidden border-b border-border bg-primary/10">
                {course.thumbnail ? (
                  <RetryImage src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
                ) : (
                  <BookOpen className="h-10 w-10 text-primary/30" />
                )}
                <StatusPill
                  status={course.status === "published" ? "active" : "draft"}
                  label={course.status === "published" ? "Active" : "Draft"}
                  className="absolute right-3 top-3"
                />
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="line-clamp-2 min-h-[40px] text-[15px] font-bold text-foreground">
                  {course.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] text-muted-foreground">
                  {course.description || "No description provided."}
                </p>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    <span>{course.exam_details?.subjects?.length || 0} Subjects</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-[#946B00] dark:text-[#F2C94C]" />
                    <span>Students</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#0F7A69] dark:text-[#4ADE9C]" />
                    <span>{new Date(course.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end border-t border-border pt-4">
                  <Link href={`/teacher/courses/${course.id}`}>
                    <Button size="sm" className="gap-1.5 rounded-lg bg-primary/10 text-primary shadow-none hover:bg-[#0B2545] hover:text-white">
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
