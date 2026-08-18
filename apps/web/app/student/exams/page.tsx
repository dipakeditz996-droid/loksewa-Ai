"use client";

import Link from "next/link";
import { FileText, Clock, Target, ArrowRight, Play, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { studentExamsApi } from "@/lib/api/student-exams";

export default function ExamsListingPage() {
  const { data: exams, isLoading } = useQuery({
    queryKey: ['student-exams'],
    queryFn: studentExamsApi.getExams
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeExams = exams || [];
  // Future: Fetch past attempts using a different endpoint, for now we mock past exams or filter if backend provided them
  const pastExams: any[] = []; 

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in-50 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Mock Exams</h1>
          <p className="text-muted-foreground mt-1">Simulate the real examination environment.</p>
        </div>
        <Button variant="outline" className="gap-2">
          View Exam Syllabus
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active & Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past Results</TabsTrigger>
          <TabsTrigger value="custom">Custom Exams</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-6">
          {activeExams.length === 0 ? (
            <Card className="border-border/60 border-dashed flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mb-4 opacity-50" />
              <h3 className="font-medium text-lg mb-1">No Active Exams</h3>
              <p className="text-sm">Check back later or browse other categories.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeExams.map((exam: any) => (
                <Card key={exam.id} className="border-border/60 flex flex-col hover:border-primary/30 transition-colors">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant={exam.exam_type === "mock" ? "default" : "secondary"}>
                        {exam.exam_type.toUpperCase()}
                      </Badge>
                      {exam.has_attempted && (
                        <Badge variant="outline" className="text-primary border-primary/30">
                          Attempted
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl line-clamp-2">{exam.title}</CardTitle>
                    <CardDescription className="text-primary font-medium mt-1">
                      {exam.category_name} - {exam.exam_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{exam.time_limit} min</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span>{exam.total_questions} Qs</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-border/50">
                    <Link href={`/student/exams/${exam.id}`} className="w-full">
                      <Button className="w-full gap-2" variant={exam.has_attempted ? "secondary" : "default"}>
                        {exam.has_attempted ? "View Details" : <><Play className="h-4 w-4" /> View Details</>}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past" className="space-y-6">
          <div className="text-center p-12 text-muted-foreground border rounded-xl border-dashed">
             Results module coming soon...
          </div>
        </TabsContent>
        
        <TabsContent value="custom">
          <Card className="border-border/60 p-12 flex flex-col items-center justify-center text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Custom Exam Builder</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Generate personalized mock exams based on your weak topics and preferred difficulty.
            </p>
            <Button className="mt-6">Launch Builder</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
