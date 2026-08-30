"use client";

import React from "react";
import { Calendar, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "1y";

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last Year" },
];

interface DateRangeFilterProps {
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  onExport?: () => void;
  exporting?: boolean;
}

export function DateRangeFilter({ period, onPeriodChange, onExport, exporting }: DateRangeFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between w-full">
      <div className="flex flex-wrap gap-2 items-center bg-white border border-slate-200 rounded-lg p-1">
        <Calendar className="w-4 h-4 text-slate-400 ml-2" />
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              period === p.value
                ? "bg-[#0B2545] text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {onExport && (
        <Button
          variant="outline"
          className="bg-white gap-2 text-[#0B2545] border-[#0B2545]/20 hover:bg-[#0B2545]/5"
          onClick={onExport}
          disabled={exporting}
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      )}
    </div>
  );
}
