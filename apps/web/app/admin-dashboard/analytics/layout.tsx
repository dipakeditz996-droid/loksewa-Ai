"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  BarChart3, Users, FileText, HelpCircle, GraduationCap, 
  Bot, Store, LayoutDashboard
} from "lucide-react";
import { DateRangeFilter } from "@/components/analytics/DateRangeFilter";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    { name: "Overview", href: "/admin-dashboard/analytics", icon: LayoutDashboard, exact: true },
    { name: "Students", href: "/admin-dashboard/analytics/students", icon: Users, exact: false },
    { name: "Exams", href: "/admin-dashboard/analytics/exams", icon: FileText, exact: false },
    { name: "Questions", href: "/admin-dashboard/analytics/questions", icon: HelpCircle, exact: false },
    { name: "Study Plans", href: "/admin-dashboard/analytics/study-plans", icon: GraduationCap, exact: false },
    { name: "AI Tutor", href: "/admin-dashboard/analytics/ai-tutor", icon: Bot, exact: false },
    { name: "Marketplace", href: "/admin-dashboard/analytics/marketplace", icon: Store, exact: false },
    { name: "Reports", href: "/admin-dashboard/analytics/reports", icon: BarChart3, exact: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header / Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 pt-4 shrink-0">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-[#D4A72C]" />
                Analytics & Reports
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Monitor platform performance, student activity and learning outcomes.
              </p>
            </div>
          </div>
          
          <div className="flex gap-6 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = tab.exact 
                ? pathname === tab.href 
                : pathname.startsWith(tab.href);
                
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative whitespace-nowrap",
                    isActive 
                      ? "text-[#0B2545]" 
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4", isActive ? "text-[#D4A72C]" : "text-slate-400")} />
                  {tab.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#D4A72C] rounded-t-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto h-full space-y-6">
          <DateRangeFilter onExport={() => alert("Exporting report...")} />
          {children}
        </div>
      </div>
    </div>
  );
}
