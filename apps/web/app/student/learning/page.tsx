"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BookOpen, CreditCard } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MyCoursesContent } from "@/components/student/learning/MyCoursesContent";
import { StudentPurchasesContent } from "@/components/student/learning/StudentPurchasesContent";

function MyCoursesFallbackSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-11 w-72 bg-muted/70 rounded-xl"></div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted/80 rounded-lg"></div>
          <div className="h-4 w-96 bg-muted/60 rounded"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-[24px] border border-border shadow-sm p-5 space-y-4">
            <div className="h-44 bg-muted/80 rounded-[16px]"></div>
            <div className="h-6 bg-muted/80 rounded w-3/4"></div>
            <div className="h-4 bg-muted/60 rounded w-full"></div>
            <div className="space-y-2 pt-2">
              <div className="h-2 bg-muted/80 rounded w-full"></div>
              <div className="h-4 bg-muted/60 rounded w-1/4"></div>
            </div>
            <div className="h-10 bg-muted/80 rounded-[12px] w-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyLearningTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "purchases" ? "purchases" : "courses";

  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", val);
    router.push(`/student/learning?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
      <TabsList className="bg-muted/70 p-1 border border-border/60 rounded-xl h-auto flex flex-wrap sm:inline-flex">
        <TabsTrigger 
          value="courses" 
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-primary dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <BookOpen className="w-4 h-4 text-[#D4A72C]" />
          Courses
        </TabsTrigger>
        <TabsTrigger 
          value="purchases" 
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-primary dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <CreditCard className="w-4 h-4 text-[#D4A72C]" />
          Purchases & Subscriptions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="courses" className="mt-4 focus-visible:outline-none">
        <MyCoursesContent />
      </TabsContent>

      <TabsContent value="purchases" className="mt-4 focus-visible:outline-none">
        <StudentPurchasesContent />
      </TabsContent>
    </Tabs>
  );
}

export default function MyLearningPage() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Immediate layout shell: zero network delay, zero layout shift */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-[#D4A72C]/10 text-[#D4A72C] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Learning Hub
          </span>
        </div>
        <h1 className="text-3xl font-[800] text-primary dark:text-foreground tracking-tight">
          My Learning
        </h1>
        <p className="text-muted-foreground mt-1 font-medium max-w-2xl text-sm sm:text-base">
          Track and resume your enrolled preparation courses, view authorized modules, and monitor your subscription billing history.
        </p>
      </div>

      <Suspense fallback={<MyCoursesFallbackSkeleton />}>
        <MyLearningTabs />
      </Suspense>
    </div>
  );
}
