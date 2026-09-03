"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, Hourglass, ArrowRight } from "lucide-react";

export default function AdminPendingPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link
        href="/admin-dashboard/students/pending-verification"
        className="block bg-white border border-slate-200 rounded-xl p-6 hover:border-[#D4A72C]/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-full shrink-0">
            <Hourglass className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-[#0B2545]">Pending Email Verification</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Students who registered but haven't confirmed their email - resend codes or generate recovery codes.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" />
        </div>
      </Link>

      <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <AlertCircle className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-[#0B2545] mb-2">Full Student Directory Pending API Integration</h2>
        <p className="text-slate-500 max-w-md mb-6">
          The general student list/search module is a separate, still-unbuilt admin feature.
        </p>
      </div>
    </div>
  );
}
