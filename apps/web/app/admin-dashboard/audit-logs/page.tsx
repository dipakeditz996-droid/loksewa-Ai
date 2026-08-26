"use client";

import React from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";

export default function AdminAuditLogsOverviewPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-[#0B2545] hidden sm:block">Audit Logs</h2>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <ShieldAlert className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-[#0B2545] mb-2">Feature Pending API Integration</h2>
        <p className="text-slate-500 max-w-md mb-6">
          BACKEND GAP — AUTHORITATIVE AUDIT LOG API NOT AVAILABLE. The backend currently does not expose endpoints to fetch, search, or paginate system audit logs. This security-sensitive module is awaiting formal backend API integration.
        </p>
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Pending Backend Integration</span>
        </div>
      </div>
    </div>
  );
}
