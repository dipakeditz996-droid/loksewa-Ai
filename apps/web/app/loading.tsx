import React from "react";
import { PageSkeleton } from "@/components/ui/loading-states";

export default function GlobalLoading() {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-start">
      <PageSkeleton layout="grid" className="max-w-7xl mx-auto py-8" />
    </div>
  );
}

