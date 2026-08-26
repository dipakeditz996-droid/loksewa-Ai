"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

export default function AdminPendingPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <AlertCircle className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-[#0B2545] mb-2">Feature Pending API Integration</h2>
        <p className="text-slate-500 max-w-md mb-6">
          This admin module is currently a backend gap and will be integrated in a future phase.
        </p>
      </div>
    </div>
  );
}
