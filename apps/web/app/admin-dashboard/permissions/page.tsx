"use client";

import React from "react";
import { Shield, AlertCircle } from "lucide-react";

export default function PermissionsMatrixPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#D4A72C]" />
            Permissions Matrix
          </h1>
          <p className="text-slate-500 text-sm mt-1">Granular access control and permission assignments for roles.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <Shield className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-[#0B2545] mb-2">Permissions Matrix API</h2>
        <p className="text-slate-500 max-w-md mb-6">
          The backend API for granular role-based permissions matrix management is not implemented.
        </p>
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Pending Backend Integration</span>
        </div>
      </div>

    </div>
  );
}
