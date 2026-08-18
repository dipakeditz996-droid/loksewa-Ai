"use client";

import React, { useState } from "react";
import { Calendar, ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface DateRangeFilterProps {
  onExport?: () => void;
}

export function DateRangeFilter({ onExport }: DateRangeFilterProps) {
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [compare, setCompare] = useState("Previous Period");

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between w-full">
      <div className="flex flex-wrap gap-3 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-white gap-2 font-medium">
              <Calendar className="w-4 h-4 text-slate-500" />
              {dateRange}
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => setDateRange("Today")}>Today</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange("Yesterday")}>Yesterday</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange("Last 7 Days")}>Last 7 Days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange("Last 30 Days")}>Last 30 Days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange("Last 90 Days")}>Last 90 Days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange("This Year")}>This Year</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDateRange("Custom Range...")}>Custom Range...</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-sm text-slate-400">compare to</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="bg-transparent border-none gap-2 font-medium text-slate-600 hover:bg-slate-100">
              {compare}
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setCompare("Previous Period")}>Previous Period</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCompare("Previous Year")}>Previous Year</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCompare("None")}>None</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {onExport && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-white gap-2 text-[#0B2545] border-[#0B2545]/20 hover:bg-[#0B2545]/5">
              <Download className="w-4 h-4" /> Export Report
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Export as PDF</DropdownMenuItem>
            <DropdownMenuItem>Export as CSV</DropdownMenuItem>
            <DropdownMenuItem>Export as Excel</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
