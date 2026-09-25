"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Award, MessageSquarePlus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StudentResultsContent } from "@/components/student/results/StudentResultsContent";
import { StudentFeedbackContent } from "@/components/student/feedback/StudentFeedbackContent";

function ResultsFeedbackPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "feedback" ? "feedback" : "results";

  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", val);
    router.push(`/student/results-feedback?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-[#D4A72C]/10 text-[#D4A72C] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            Evaluation Hub
          </span>
        </div>
        <h1 className="text-3xl font-[800] text-primary dark:text-foreground tracking-tight">
          Results & Feedback
        </h1>
        <p className="text-muted-foreground mt-1 font-medium max-w-2xl text-sm sm:text-base">
          Review your examination scores, finalized answer evaluations, and personalized feedback notes from teachers.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="bg-muted/70 p-1 border border-border/60 rounded-xl h-auto flex flex-wrap sm:inline-flex">
          <TabsTrigger 
            value="results" 
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-primary dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Award className="w-4 h-4 text-[#D4A72C]" />
            Results
          </TabsTrigger>
          <TabsTrigger 
            value="feedback" 
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-primary dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <MessageSquarePlus className="w-4 h-4 text-[#D4A72C]" />
            Teacher Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-4 focus-visible:outline-none">
          <StudentResultsContent />
        </TabsContent>

        <TabsContent value="feedback" className="mt-4 focus-visible:outline-none">
          <StudentFeedbackContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ResultsFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex justify-center items-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <ResultsFeedbackPageInner />
    </Suspense>
  );
}
