"use client";

import React from "react";
import { 
  Settings, Activity, Server, Database, Lock, Clock, History, AlertCircle, CheckCircle2 
} from "lucide-react";
import { mockSystemHealth, mockConfigHistory } from "@/lib/mock/admin-settings";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

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

      {/* System Health */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0B2545] flex items-center gap-2 border-b border-slate-200 pb-2">
          <Activity className="w-5 h-5 text-emerald-500" />
          System Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mockSystemHealth.map((component) => (
            <div key={component.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-3">
                <p className="font-semibold text-[#0B2545] text-sm">{component.name}</p>
                {component.status === "Operational" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : component.status === "Warning" ? (
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                )}
              </div>
              <div className="flex justify-between items-end mt-auto pt-2 border-t border-slate-50">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {component.lastChecked}
                </p>
                {component.latency && (
                  <p className="text-xs font-mono text-slate-400">{component.latency}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <Lock className="w-3 h-3" /> System health statuses shown here are mock representations for frontend preview.
        </p>
      </div>

      {/* Configuration Change History */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0B2545] flex items-center gap-2 border-b border-slate-200 pb-2">
          <History className="w-5 h-5 text-blue-500" />
          Recent Configuration Changes
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>Setting</TableHead>
                  <TableHead>Previous Value</TableHead>
                  <TableHead>New Value</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockConfigHistory.map((change) => (
                  <TableRow key={change.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-[#0B2545]">{change.setting}</TableCell>
                    <TableCell>
                      <span className="text-sm line-through text-slate-400 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                        {change.previousValue}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {change.newValue}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {change.changedBy === "Admin" ? (
                        <span className="font-semibold text-purple-600">{change.changedBy}</span>
                      ) : (
                        change.changedBy
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{change.timestamp}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

    </div>
  );
}
