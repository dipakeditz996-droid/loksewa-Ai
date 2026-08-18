"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LifeBuoy, MessageSquare, FolderTree, BarChart3, Plus
} from "lucide-react";

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide tabs inside ticket detail view to maximize screen space
  // Matching dynamic route [id] which is anything that is not the base, categories, or analytics.
  const isDetailView = pathname.match(/\/admin-dashboard\/support\/[a-zA-Z0-9_-]+$/) && 
    !pathname.includes("/categories") && 
    !pathname.includes("/analytics");

  const tabs = [
    {
      name: "Tickets",
      href: "/admin-dashboard/support",
      icon: MessageSquare,
      exact: true
    },
    {
      name: "Categories & Settings",
      href: "/admin-dashboard/support/categories",
      icon: FolderTree,
      exact: false
    },
    {
      name: "Analytics",
      href: "/admin-dashboard/support/analytics",
      icon: BarChart3,
      exact: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header / Navigation */}
      {!isDetailView && (
        <div className="bg-white border-b border-slate-200 px-6 pt-4 shrink-0">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
                  <LifeBuoy className="w-6 h-6 text-[#D4A72C]" />
                  Help & Support
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Manage student support requests, tickets and assistance.
                </p>
              </div>
              <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#0B2545] hover:bg-[#0B2545]/90 text-white rounded-lg text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" /> Create Ticket
              </button>
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
      )}

      {/* Main Content Area */}
      <div className={cn("flex-1 overflow-y-auto", isDetailView ? "" : "p-6")}>
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
