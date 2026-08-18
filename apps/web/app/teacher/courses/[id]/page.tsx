"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Clock, Users, CheckCircle2, ChevronDown, ChevronRight, FileText, Video, PenTool, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumIcon } from "@/components/ui/premium-icon";
import { teacherCourseService, Course } from "@/lib/api/teacher-courses";
import { toast } from "react-hot-toast";

export default function TeacherCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<number, boolean>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (params.id) {
      loadCourseDetail(params.id as string);
    }
  }, [params.id]);

  const loadCourseDetail = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await teacherCourseService.getCourseDetail(id);
      setCourse(data);
      
      // Auto-expand the first subject and its first chapter
      if (data.exam_details?.subjects && data.exam_details.subjects.length > 0) {
        const firstSubject = data.exam_details.subjects[0];
        if (firstSubject) {
          setExpandedSubjects({ [firstSubject.id]: true });
          if (firstSubject.chapters && firstSubject.chapters.length > 0) {
            const firstChapter = firstSubject.chapters[0];
            if (firstChapter) {
              setExpandedChapters({ [firstChapter.id]: true });
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to load course details:", error);
      toast.error("Failed to load course details.");
      router.push("/teacher/courses");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubject = (id: number) => {
    setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleChapter = (id: number) => {
    setExpandedChapters(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground font-medium">Loading course workspace...</p>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in-50 duration-500 pb-24">
      
      {/* Top Navigation */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="text-muted-foreground hover:text-foreground pl-0 group"
        onClick={() => router.push('/teacher/courses')}
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Courses
      </Button>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border border-border/50 bg-card rounded-2xl p-6 shadow-sm relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <PremiumIcon icon={LayoutDashboard} size="xl" color="blue" />
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{course.title}</h1>
              <Badge className={course.status === 'published' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-muted text-muted-foreground'}>
                {course.status === 'published' ? 'Active' : 'Draft'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm max-w-2xl">
              {course.description || "No description provided."}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full md:w-auto">
          <Button variant="outline" className="border-border/50 text-foreground">
            View Analytics
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Edit Metadata
          </Button>
        </div>
      </div>

      {/* Main Content Workspace */}
      <Tabs defaultValue="curriculum" className="w-full">
        <TabsList className="bg-muted/50 p-1 border border-border/50">
          <TabsTrigger value="curriculum" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Curriculum
          </TabsTrigger>
          <TabsTrigger value="students" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Students
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Evaluations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="curriculum" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Academic Content
              </h2>
              <p className="text-sm text-muted-foreground">Manage subjects, chapters, and topics linked to this course.</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2 h-9">
              <CheckCircle2 className="h-4 w-4" /> Expand All
            </Button>
          </div>

          <div className="space-y-4">
            {(!course.exam_details?.subjects || course.exam_details.subjects.length === 0) ? (
              <div className="text-center py-12 border border-dashed rounded-xl border-border/50">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-medium">No Curriculum Found</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">This course does not have any academic content linked to it.</p>
              </div>
            ) : (
              course.exam_details.subjects.map((subject) => (
                <Card key={subject.id} className="border-border/50 overflow-hidden shadow-sm">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleSubject(subject.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{subject.title} <span className="text-muted-foreground font-normal text-sm ml-2">({subject.code})</span></h3>
                        <p className="text-xs text-muted-foreground">{subject.chapters?.length || 0} Chapters</p>
                      </div>
                    </div>
                    {expandedSubjects[subject.id] ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                  </div>

                  {expandedSubjects[subject.id] && (
                    <div className="border-t border-border/50 bg-muted/10 p-2 sm:p-4 space-y-3">
                      {(!subject.chapters || subject.chapters.length === 0) ? (
                        <p className="text-sm text-muted-foreground italic pl-4">No chapters found for this subject.</p>
                      ) : (
                        subject.chapters.map((chapter, index) => (
                          <div key={chapter.id} className="border border-border/50 rounded-lg bg-background overflow-hidden">
                            <div 
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                              onClick={() => toggleChapter(chapter.id)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded">Ch {index + 1}</span>
                                <h4 className="font-medium text-sm">{chapter.title}</h4>
                              </div>
                              {expandedChapters[chapter.id] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            </div>

                            {expandedChapters[chapter.id] && (
                              <div className="border-t border-border/50 divide-y divide-border/50">
                                {(!chapter.topics || chapter.topics.length === 0) ? (
                                  <div className="p-3 pl-12 text-sm text-muted-foreground italic">No topics found.</div>
                                ) : (
                                  chapter.topics.map((topic, tIndex) => (
                                    <div key={topic.id} className="p-3 pl-4 sm:pl-12 flex items-center justify-between hover:bg-muted/10 group transition-colors">
                                      <div className="flex items-center gap-3">
                                        <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        <span className="text-sm">{topic.title}</span>
                                      </div>
                                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary">
                                          <Video className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary">
                                          <PenTool className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>View and manage students enrolled in this course.</CardDescription>
            </CardHeader>
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
              <PremiumIcon icon={Users} size="lg" color="blue" className="mb-4" />
              <h3 className="font-semibold mb-1">Student Management</h3>
              <p className="text-sm text-muted-foreground max-w-md">Student enrollment and progress tracking module will be available in the next platform update.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluations" className="mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Pending Evaluations</CardTitle>
              <CardDescription>Exams and assignments awaiting your review.</CardDescription>
            </CardHeader>
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
              <PremiumIcon icon={PenTool} size="lg" color="amber" className="mb-4" />
              <h3 className="font-semibold mb-1">Centralized Evaluation</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">Please use the main Evaluation Command Center to grade subjective exams for this course.</p>
              <Link href="/teacher/evaluations">
                <Button variant="outline" className="gap-2">
                  Go to Evaluations <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
