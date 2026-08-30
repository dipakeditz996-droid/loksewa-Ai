"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Bell, Inbox, List, Plus, FileText, BarChart3, Settings
} from "lucide-react";

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't show tabs inside the multistep builder to give it full focus
  const isBuilder = pathname.includes("/notifications/create");

  const tabs = [
    {
      name: "Inbox",
      href: "/admin-dashboard/notifications/inbox",
      icon: Inbox,
      exact: true
    },
    {
      name: "Broadcasts",
      href: "/admin-dashboard/notifications",
      icon: List,
      exact: true
    },
    {
      name: "Templates",
      href: "/admin-dashboard/notifications/templates",
      icon: FileText,
      exact: false
    },
    {
      name: "Analytics",
      href: "/admin-dashboard/notifications/analytics",
      icon: BarChart3,
      exact: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header / Navigation */}
      {!isBuilder && (
        <div className="bg-white border-b border-slate-200 px-6 pt-4 shrink-0">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
                  <Bell className="w-6 h-6 text-[#D4A72C]" />
                  Notifications & Announcements
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Create, manage and monitor platform communications.
                </p>
              </div>
              <Link href="/admin-dashboard/notifications/create">
                <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#0B2545] hover:bg-[#0B2545]/90 text-white rounded-lg text-sm font-semibold transition-colors">
                  <Plus className="w-4 h-4" /> Create Notification
                </button>
              </Link>
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
      <div className={cn("flex-1 overflow-y-auto", isBuilder ? "" : "p-6")}>
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
