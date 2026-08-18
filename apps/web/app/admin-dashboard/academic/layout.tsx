"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "Overview", href: "/admin-dashboard/academic" },
  { name: "Subjects", href: "/admin-dashboard/academic/subjects" },
  { name: "Chapters", href: "/admin-dashboard/academic/chapters" },
  { name: "Topics", href: "/admin-dashboard/academic/topics" },
  { name: "Exam Categories", href: "/admin-dashboard/academic/exam-categories" },
  { name: "Positions", href: "/admin-dashboard/academic/positions" },
  { name: "Syllabus", href: "/admin-dashboard/academic/syllabus" },
  { name: "Tags", href: "/admin-dashboard/academic/tags" },
];

export default function AcademicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // If we are deep inside something like questions or exams which aren't strictly part of this secondary nav
  // but exist under academic, we can still show the tabs or hide them.
  // The prompt asked to create the tabs for Academic Management.
  
  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 pt-4">
        <h1 className="text-2xl font-bold text-[#0B2545] tracking-tight mb-4">Academic Management</h1>
        <div className="flex overflow-x-auto no-scrollbar space-x-6">
          {tabs.map((tab) => {
            // Exact match for Overview, prefix match for others
            const isActive = tab.href === "/admin-dashboard/academic" 
              ? pathname === tab.href 
              : pathname.startsWith(tab.href);
              
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "pb-3 text-sm font-medium transition-colors relative whitespace-nowrap",
                  isActive
                    ? "text-[#D4A72C]"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {tab.name}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#D4A72C] rounded-t-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 p-6 md:p-8 bg-slate-50 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
