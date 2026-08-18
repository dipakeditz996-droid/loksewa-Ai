import Link from "next/link";
import { ChevronLeft, Info, UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function SubjectiveSubmitPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/student/exams/subjective">
          <Button variant="ghost" size="icon" className="-ml-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 mb-1">
            Second Paper: Governance
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Write a comprehensive note on Federalism in Nepal.</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
              <CardTitle className="text-lg">Your Response</CardTitle>
              <CardDescription>Type your answer or upload a scanned PDF.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Textarea 
                placeholder="Start typing your answer here..." 
                className="min-h-[400px] border-0 rounded-none focus-visible:ring-0 resize-none p-6 text-base leading-relaxed bg-transparent"
              />
            </CardContent>
            <CardFooter className="border-t border-border/50 bg-muted/10 p-4 flex justify-between">
              <span className="text-sm text-muted-foreground">Words: 0 / 1000 limit</span>
              <Button variant="outline" className="gap-2">
                <UploadCloud className="h-4 w-4" /> Upload PDF instead
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" /> Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <p>1. Your answer must critically analyze the current implementation of federalism.</p>
              <p>2. Provide examples from recent constitutional developments.</p>
              <p>3. Do not exceed the word limit.</p>
              
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg mt-4 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-amber-600 dark:text-amber-400">Plagiarism or AI-generated content will result in immediate disqualification.</span>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full h-14 text-lg gap-2 shadow-[0_0_15px_rgba(0,212,255,0.15)] bg-primary text-primary-foreground hover:bg-primary/90">
            <CheckCircle2 className="h-5 w-5" /> Submit Assignment
          </Button>
        </div>
      </div>
    </div>
  );
}
