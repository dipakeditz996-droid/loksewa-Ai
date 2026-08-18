"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Users, Clock, ArrowRight, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PremiumIcon } from "@/components/ui/premium-icon";
import { teacherCourseService, Course } from "@/lib/api/teacher-courses";
import { toast } from "react-hot-toast";

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
      <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground font-medium">Loading your courses...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in-50 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            My Courses
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your assigned courses and study materials.
          </p>
        </div>
      </div>

      {/* Course List */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-border/50 rounded-xl bg-card/30">
          <PremiumIcon icon={BookOpen} size="lg" color="amber" className="mb-4" />
          <h3 className="text-xl font-semibold mb-2">No courses assigned yet</h3>
          <p className="text-muted-foreground max-w-md">
            Courses assigned to you by the administrator will appear here. 
            Check back later or contact support if you expect to see courses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="border-border bg-card shadow-sm hover:shadow-md hover:border-primary/20 transition-all flex flex-col overflow-hidden group">
              <div className="h-40 bg-muted/30 relative overflow-hidden flex items-center justify-center border-b border-border/50">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0A1118] to-[#111A24]">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  </div>
                )}
                {!course.thumbnail && <BookOpen className="h-12 w-12 text-primary/40 absolute z-10" />}
                
                <Badge className="absolute top-3 right-3 bg-black/60 backdrop-blur-md hover:bg-black/80 text-white border-white/10">
                  {course.status === 'published' ? 'Active' : 'Draft'}
                </Badge>
              </div>
              
              <CardHeader className="pb-4">
                <CardTitle className="text-lg leading-tight line-clamp-2 min-h-[44px]">
                  {course.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 mt-2">
                  {course.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 pb-4">
                <div className="flex flex-wrap gap-y-3 gap-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span>{course.exam_details?.subjects?.length || 0} Subjects</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-amber-500" />
                    <span>Students</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-emerald-500" />
                    <span>{new Date(course.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-0 pb-4 border-t border-border/50 mt-auto bg-muted/10">
                <div className="w-full flex pt-4 justify-between items-center">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Video className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><FileText className="h-4 w-4" /></Button>
                  </div>
                  <Link href={`/teacher/courses/${course.id}`}>
                    <Button size="sm" className="gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 shadow-none transition-all">
                      Manage Course <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
