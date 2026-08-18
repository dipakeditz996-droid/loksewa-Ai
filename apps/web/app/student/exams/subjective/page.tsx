import Link from "next/link";
import { PenTool, Clock, FileText, CheckCircle, UploadCloud, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SubjectiveExamsPage() {
  const pendingExams = [
    { id: "sub-1", title: "Second Paper: Governance Systems", dueDate: "Today, 11:59 PM", marks: 100, time: "3 Hours" },
    { id: "sub-2", title: "Third Paper: Contemporary Issues", dueDate: "Tomorrow, 11:59 PM", marks: 100, time: "3 Hours" },
  ];

  const submittedExams = [
    { id: "sub-3", title: "First Paper Essay: Nepal's Economy", submittedAt: "Aug 10, 2026", status: "Evaluated", score: "68/100" },
    { id: "sub-4", title: "Section Officer Third Paper Mock", submittedAt: "Aug 8, 2026", status: "Under Review", score: "Pending" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in-50 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Subjective Exams</h1>
          <p className="text-muted-foreground mt-1 font-light">Submit written assignments and get expert evaluation.</p>
        </div>
        <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/10">
          <FileText className="h-4 w-4" /> View Model Answers
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-6 bg-muted/50 border border-border/50">
          <TabsTrigger value="pending">Pending Assignments</TabsTrigger>
          <TabsTrigger value="submitted">Submitted & Evaluated</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pendingExams.map((exam) => (
              <Card key={exam.id} className="border-border bg-card shadow-sm hover:border-primary/40 transition-all flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                      Due Soon
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{exam.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <Clock className="h-4 w-4" /> Due: {exam.dueDate}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div>
                      <span className="block text-xs uppercase tracking-wider mb-1">Total Marks</span>
                      <span className="font-semibold text-foreground">{exam.marks}</span>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wider mb-1">Duration</span>
                      <span className="font-semibold text-foreground">{exam.time}</span>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wider mb-1">Format</span>
                      <span className="font-semibold text-foreground">PDF Upload</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-border/50 bg-muted/10">
                  <Link href={`/student/exams/subjective/${exam.id}`} className="w-full">
                    <Button className="w-full gap-2 shadow-[0_0_15px_rgba(0,212,255,0.15)] bg-primary text-primary-foreground hover:bg-primary/90">
                      <PenTool className="h-4 w-4" /> Start Assignment
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="submitted" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {submittedExams.map((exam) => (
              <Card key={exam.id} className="border-border bg-card shadow-sm flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className={
                      exam.status === "Evaluated" 
                        ? "bg-green-500/10 text-green-500 border-green-500/30" 
                        : "bg-blue-500/10 text-blue-500 border-blue-500/30"
                    }>
                      {exam.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Submitted: {exam.submittedAt}</span>
                  </div>
                  <CardTitle className="text-lg">{exam.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-end gap-2">
                    {exam.status === "Evaluated" ? (
                      <>
                        <span className="text-3xl font-bold text-primary">{exam.score.split('/')[0]}</span>
                        <span className="text-muted-foreground mb-1">/ {exam.score.split('/')[1]} Marks</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-5 w-5" />
                        <span>Awaiting teacher evaluation</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-border/50 bg-muted/10">
                  <Button variant={exam.status === "Evaluated" ? "default" : "outline"} className="w-full" disabled={exam.status !== "Evaluated"}>
                    {exam.status === "Evaluated" ? "View Feedback" : "View Submission"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
