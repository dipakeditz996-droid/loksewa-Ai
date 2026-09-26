import React from "react";
import { PageSkeleton } from "@/components/ui/loading-states";

export default function StudentLoading() {
  return <PageSkeleton layout="grid" className="max-w-7xl mx-auto py-6" />;
}

