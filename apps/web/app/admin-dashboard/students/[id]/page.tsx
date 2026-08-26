"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentProfilePage() {
  return (
    <div className="p-8 max-w-4xl mx-auto min-h-[60vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
        <UserCircle className="w-10 h-10 text-blue-500" />
      </div>
      <h1 className="text-3xl font-bold text-slate-800 mb-4">API Integration Pending</h1>
      <p className="text-slate-500 text-lg mb-8 max-w-lg">
        The student profile detail view is currently being integrated with the real backend API. 
        Mock data has been purged from production.
      </p>
      <Link href="/admin-dashboard/students">
        <Button size="lg" className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Return to Students
        </Button>
      </Link>
    </div>
  );
}
