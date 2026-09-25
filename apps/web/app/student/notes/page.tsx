"use client";

import React, { Suspense } from "react";
import SyllabusNotesPortal from "@/components/student/SyllabusNotesPortal";

export default function StudentNotesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-[#1A2E44] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <SyllabusNotesPortal
        initialSection="syllabus"
        pageTitle="Syllabus & Notes"
        pageSubtitle="Official PSC curriculum documents, syllabus frameworks, topicwise detailed notes, and revision materials."
      />
    </Suspense>
  );
}
