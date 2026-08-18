"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Settings, Globe, GraduationCap, FileText, Brain, 
  Bell, Store, ShieldAlert, HardDrive, Palette, Wrench, Search,
  Menu, X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const SETTINGS_NAV = [
  { title: "Overview", href: "/admin-dashboard/settings", icon: Settings, exact: true },
  { title: "General", href: "/admin-dashboard/settings/general", icon: Globe },
  { title: "Academic", href: "/admin-dashboard/settings/academic", icon: GraduationCap },
  { title: "Exams", href: "/admin-dashboard/settings/exams", icon: FileText },
  { title: "AI Tutor", href: "/admin-dashboard/settings/ai", icon: Brain },
  { title: "Notifications", href: "/admin-dashboard/settings/notifications", icon: Bell },
  { title: "Marketplace", href: "/admin-dashboard/settings/marketplace", icon: Store },
  { title: "Security", href: "/admin-dashboard/settings/security", icon: ShieldAlert },
  { title: "Storage", href: "/admin-dashboard/settings/storage", icon: HardDrive },
  { title: "Appearance", href: "/admin-dashboard/settings/appearance", icon: Palette },
  { title: "Maintenance", href: "/admin-dashboard/settings/maintenance", icon: Wrench },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const filteredNav = SETTINGS_NAV.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const SettingsSidebar = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
        <h2 className="font-bold text-[#0B2545] text-lg mb-4 hidden md:block">Settings</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search settings..." 
            className="pl-9 bg-slate-50 border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {filteredNav.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active 
                    ? "bg-[#0B2545]/5 text-[#0B2545]" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon 
                  className={cn("w-4 h-4", active ? "text-[#D4A72C]" : "text-slate-400")} 
                  strokeWidth={active ? 2.5 : 2}
                />
                {item.title}
              </Link>
            );
          })}
          {filteredNav.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No matching settings.</p>
          )}
        </nav>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-60px)] relative">
      
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden p-4 border-b border-slate-200 bg-white sticky top-0 z-20 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#D4A72C]" />
          <span className="font-bold text-[#0B2545]">Platform Settings</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-[65px] left-0 right-0 bottom-0 z-30 bg-white">
          <SettingsSidebar />
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 sticky top-0 h-[calc(100vh-60px)]">
        <SettingsSidebar />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-slate-50">
        <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24">
          {children}
        </div>
      </main>
    </div>
  );
}
