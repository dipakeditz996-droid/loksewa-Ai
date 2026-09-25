"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Trophy, BarChart3, TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LeaderboardContent } from "@/components/student/leaderboard/LeaderboardContent";
import { StudentAnalyticsContent } from "@/components/student/analytics/StudentAnalyticsContent";

function LeaderboardAnalyticsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "analytics" ? "analytics" : "leaderboard";

  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", val);
    router.push(`/student/leaderboard-analytics?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-[#D4A72C]/10 text-[#D4A72C] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            Competitive Insights
          </span>
        </div>
        <h1 className="text-3xl font-[800] text-primary dark:text-foreground tracking-tight">
          Leaderboard & Analytics
        </h1>
        <p className="text-muted-foreground mt-1 font-medium max-w-2xl text-sm sm:text-base">
          Track competitive rankings among Loksewa aspirants and analyze your preparation strengths, weaknesses, and progress metrics.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="bg-muted/70 p-1 border border-border/60 rounded-xl h-auto flex flex-wrap sm:inline-flex">
          <TabsTrigger
            value="leaderboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-primary dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Trophy className="w-4 h-4 text-[#D4A72C]" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-primary dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <BarChart3 className="w-4 h-4 text-[#D4A72C]" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-4 focus-visible:outline-none">
          <LeaderboardContent />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 focus-visible:outline-none">
          <StudentAnalyticsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function LeaderboardAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex justify-center items-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <LeaderboardAnalyticsPageInner />
    </Suspense>
  );
}
