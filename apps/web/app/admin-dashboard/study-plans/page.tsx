"use client";

import React from "react";
import { AlertCircle, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function StudyPlansOverviewPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-[#0B2545] hidden sm:block">Plan Overview</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href="/admin-dashboard/study-plans/templates">
            <Button className="w-full bg-[#0B2545] hover:bg-[#0B2545]/90 text-white font-semibold">
              View Templates
            </Button>
          </Link>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <CalendarDays className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-[#0B2545] mb-2">Feature Pending API Integration</h2>
        <p className="text-slate-500 max-w-md mb-6">
          The backend API does not currently support listing or managing individual student study plans from the admin dashboard. This module is marked as a backend gap and will be implemented in a future release.
        </p>
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Pending Backend Integration</span>
        </div>
      </div>
    </div>
  );
}
