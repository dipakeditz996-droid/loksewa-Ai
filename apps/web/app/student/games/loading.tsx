import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GamesLoading() {
  return (
    <div className="min-h-screen bg-[#051024] pb-12 text-white">
      {/* 1. Header Shell */}
      <div className="bg-[#0B1A38] border-b border-white/5 relative overflow-hidden">
        <div className="p-5 md:p-8 max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-2xl bg-white/10" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-48 bg-white/10" />
                <Skeleton className="h-4 w-72 bg-white/5" />
              </div>
            </div>

            {/* Quick Stat Skeletons */}
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-28 rounded-xl bg-white/5" />
              ))}
            </div>
          </div>

          {/* Progress bar skeleton */}
          <div className="mt-8 bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32 bg-white/10" />
              <Skeleton className="h-4 w-24 bg-white/10" />
            </div>
            <Skeleton className="h-3 w-full rounded-full bg-white/5" />
          </div>
        </div>
      </div>

      {/* 2. Body Grid Skeleton */}
      <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-8 mt-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main Area */}
          <div className="xl:col-span-2 space-y-8">
            {/* Featured Challenge Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-40 bg-white/10" />
              <Skeleton className="h-64 w-full rounded-2xl bg-white/5" />
            </div>

            {/* Game Modes Grid Skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-5 w-32 bg-white/10" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-52 w-full rounded-2xl bg-white/5" />
                ))}
              </div>
            </div>

            {/* Performance Chart Skeleton */}
            <Skeleton className="h-64 w-full rounded-2xl bg-white/5" />
          </div>

          {/* Right Sidebar Skeleton */}
          <div className="space-y-8">
            <Skeleton className="h-48 w-full rounded-2xl bg-white/5" />
            <Skeleton className="h-64 w-full rounded-2xl bg-white/5" />
            <Skeleton className="h-56 w-full rounded-2xl bg-white/5" />
          </div>

        </div>
      </div>
    </div>
  );
}
