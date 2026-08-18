"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  BookOpen, LayoutDashboard, PlusCircle, UploadCloud, FolderTree, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MATERIAL_NAV = [
  { title: "Overview", href: "/admin-dashboard/study-materials", icon: LayoutDashboard, exact: true },
  { title: "Add Material", href: "/admin-dashboard/study-materials/new", icon: PlusCircle },
  { title: "Bulk Upload", href: "/admin-dashboard/study-materials/bulk-upload", icon: UploadCloud },
  { title: "Categories & Collections", href: "/admin-dashboard/study-materials/categories", icon: FolderTree },
];

export default function StudyMaterialsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] relative bg-slate-50">
      
      {/* Top Header Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 md:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
          
          {/* Title & Tabs */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <div>
              <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-[#D4A72C]" />
                Study Materials
              </h1>
              <p className="text-slate-500 text-sm mt-1">Create, organize and manage learning resources.</p>
            </div>

            <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
              {MATERIAL_NAV.map(item => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                      active ? "bg-white text-[#0B2545] shadow-sm" : "text-slate-600 hover:text-[#0B2545]"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", active ? "text-[#D4A72C]" : "text-slate-400")} />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mobile Nav Toggle */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="md:hidden ml-auto"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 border-t border-slate-100 mt-4 space-y-1">
            {MATERIAL_NAV.map(item => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    active ? "bg-slate-100 text-[#0B2545]" : "text-slate-600"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", active ? "text-[#D4A72C]" : "text-slate-400")} />
                  {item.title}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 pb-24">
        {children}
      </main>

    </div>
  );
}
