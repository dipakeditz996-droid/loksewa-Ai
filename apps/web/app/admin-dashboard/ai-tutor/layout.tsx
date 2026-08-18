"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Brain, Settings2, FileCode2, BookOpen, 
  BarChart3, ShieldAlert
} from "lucide-react";

export default function AITutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Overview",
      href: "/admin-dashboard/ai-tutor/overview",
      icon: Brain,
      exact: true
    },
    {
      name: "Configuration",
      href: "/admin-dashboard/ai-tutor/configuration",
      icon: Settings2,
      exact: false
    },
    {
      name: "Prompts",
      href: "/admin-dashboard/ai-tutor/prompts",
      icon: FileCode2,
      exact: false
    },
    {
      name: "Knowledge Base",
      href: "/admin-dashboard/ai-tutor/knowledge",
      icon: BookOpen,
      exact: false
    },
    {
      name: "Usage Analytics",
      href: "/admin-dashboard/ai-tutor/usage",
      icon: BarChart3,
      exact: false
    },
    {
      name: "Safety & Logs",
      href: "/admin-dashboard/ai-tutor/safety",
      icon: ShieldAlert,
      exact: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header / Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 pt-4 shrink-0">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
              <Brain className="w-6 h-6 text-[#D4A72C]" />
              AI Tutor Management
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Configure AI behavior, manage knowledge sources, and monitor usage.
            </p>
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
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
