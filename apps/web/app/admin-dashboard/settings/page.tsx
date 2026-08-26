"use client";

import React from "react";
import { Settings, Server } from "lucide-react";

export default function SettingsOverviewPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#D4A72C]" />
          Platform Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Configure global platform behavior and system preferences.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-amber-100 p-4 rounded-full mb-4">
          <Server className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-[#0B2545] mb-2">Platform Settings are Externally Managed</h2>
        <p className="text-slate-500 max-w-md">
          Platform configurations such as feature toggles, environment variables, and integrations are managed at the infrastructure layer or via environment configuration. An interactive Admin Settings UI is not currently supported by the backend.
        </p>
      </div>
    </div>
  );
}
