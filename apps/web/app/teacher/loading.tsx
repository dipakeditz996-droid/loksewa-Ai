import React from "react";
import { PageSkeleton } from "@/components/ui/loading-states";

export default function TeacherLoading() {
  return <PageSkeleton layout="table" className="p-6 max-w-7xl mx-auto" />;
}

